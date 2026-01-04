import { createHash } from "crypto";

export type TtsRequest = {
  script: string;
  voice?: string;
  language?: string;
  newlinePauseSeconds?: number;
};

export type TtsResponse = {
  audio: Buffer;
  contentType: string;
  provider: string;
  voice: string;
  inputScript: string;
};

export type TtsStreamResponse = {
  stream: AsyncGenerator<Buffer>;
  contentType: string;
  provider: string;
  voice: string;
  inputScript: string;
};

export const MAX_TTS_SEGMENTS = 32;
export const MAX_TTS_CHARS = 4000;
export const TTS_SYSTEM_PROMPT = [
  "You are delivering a Positive Intelligence (PQ) Reps script as a trained PQ Coach.",
  "The goal is to sound like Shirzad Chamine's instructional style: calm, grounded, and practical.",
  "Delivery & Expression:",
  "- Use a neutral accent appropriate to the selected language/region; clear, standard pronunciation",
  "- Very narrow and steady emotional range; calm, reassuring, emotionally neutral",
  "- Gentle, mostly flat intonation with slight downward inflection at sentence ends",
  "- Sound like a calm, experienced mindfulness teacher guiding a practical exercise",
  "- Slow, steady pace with natural pauses between phrases and instructions",
  "- Warm, composed, matter-of-fact delivery; avoid hype or sentimental softness",
  "- Do not whisper; keep a soft but fully voiced delivery",
].join("\n");

export class TtsScriptTooLargeError extends Error {
  code = "script_too_large" as const;
  maxSegments: number;
  maxChars: number;
  segmentCount: number;
  charCount: number;

  constructor(details: {
    maxSegments: number;
    maxChars: number;
    segmentCount: number;
    charCount: number;
  }) {
    super(
      `Script exceeds TTS limits (segments: ${details.segmentCount}/${details.maxSegments}, ` +
        `chars: ${details.charCount}/${details.maxChars}).`,
    );
    this.name = "TtsScriptTooLargeError";
    this.maxSegments = details.maxSegments;
    this.maxChars = details.maxChars;
    this.segmentCount = details.segmentCount;
    this.charCount = details.charCount;
  }
}

type WavFormat = {
  audioData: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

const DEFAULT_VOICE = "alloy";
const SUPPORTED_VOICES = new Set(["alloy", "ash", "nova", "onyx"]);

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  en: "alloy",
  es: "nova",
  fr: "nova",
  de: "alloy",
};

const resolveVoice = (voice: string | undefined, language?: string): string => {
  if (voice && SUPPORTED_VOICES.has(voice)) {
    return voice;
  }
  if (voice) {
    console.warn(
      `Unsupported voice "${voice}" requested. Falling back to default voice.`,
    );
  }
  return LANGUAGE_VOICE_MAP[language ?? ""] ?? DEFAULT_VOICE;
};

const PAUSE_MARKER_REGEX = /\[pause:(\d+(?:\.\d+)?)\]/gi;

const insertNewlinePauses = (script: string, pauseSeconds?: number): string => {
  if (!pauseSeconds || pauseSeconds <= 0) {
    return script;
  }
  return script.replace(/\r?\n/g, `\n[pause:${pauseSeconds}]\n`);
};

const tokenizeScript = (script: string) => {
  const tokens: Array<{ type: "text"; value: string } | { type: "pause"; value: number }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PAUSE_MARKER_REGEX.exec(script)) !== null) {
    const [marker, secondsText] = match;
    const textChunk = script.slice(lastIndex, match.index);
    if (textChunk.trim()) {
      tokens.push({ type: "text", value: textChunk.trim() });
    }
    const pauseSeconds = Number.parseFloat(secondsText);
    if (!Number.isNaN(pauseSeconds) && pauseSeconds > 0) {
      tokens.push({ type: "pause", value: pauseSeconds });
    }
    lastIndex = match.index + marker.length;
  }

  const remainingText = script.slice(lastIndex);
  if (remainingText.trim()) {
    tokens.push({ type: "text", value: remainingText.trim() });
  }

  return tokens;
};

const parseWav = (audio: Buffer): WavFormat => {
  if (audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Unsupported WAV data received from TTS.");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let audioData: Buffer | null = null;

  while (offset + 8 <= audio.length) {
    const chunkId = audio.toString("ascii", offset, offset + 4);
    const chunkSize = audio.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      const audioFormat = audio.readUInt16LE(chunkStart);
      if (audioFormat !== 1) {
        throw new Error("Unsupported WAV format from TTS.");
      }
      channels = audio.readUInt16LE(chunkStart + 2);
      sampleRate = audio.readUInt32LE(chunkStart + 4);
      bitsPerSample = audio.readUInt16LE(chunkStart + 14);
    } else if (chunkId === "data") {
      audioData = audio.subarray(chunkStart, chunkStart + chunkSize);
    }

    offset = chunkStart + chunkSize;
  }

  if (!audioData || !sampleRate || !channels || !bitsPerSample) {
    throw new Error("Incomplete WAV data received from TTS.");
  }

  return {
    audioData,
    sampleRate,
    channels,
    bitsPerSample,
  };
};

const buildWav = (format: Omit<WavFormat, "audioData">, audioData: Buffer): Buffer => {
  const header = Buffer.alloc(44);
  const dataSize = audioData.length;
  const byteRate = (format.sampleRate * format.channels * format.bitsPerSample) / 8;
  const blockAlign = (format.channels * format.bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, audioData]);
};

const buildStreamingWavHeader = (format: Omit<WavFormat, "audioData">): Buffer => {
  const header = Buffer.alloc(44);
  const dataSizePlaceholder = 0xffffffff;
  const byteRate = (format.sampleRate * format.channels * format.bitsPerSample) / 8;
  const blockAlign = (format.channels * format.bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(dataSizePlaceholder, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSizePlaceholder, 40);

  return header;
};

const chunkBuffer = async function* (
  buffer: Buffer,
  chunkSize = 64 * 1024,
): AsyncGenerator<Buffer> {
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + chunkSize, buffer.length);
    yield buffer.subarray(offset, end);
    offset = end;
  }
};

const createSilenceBuffer = (
  seconds: number,
  format: Omit<WavFormat, "audioData">,
): Buffer => {
  const bytesPerSample = format.bitsPerSample / 8;
  const totalSamples = Math.round(seconds * format.sampleRate);
  const totalBytes = totalSamples * format.channels * bytesPerSample;
  return Buffer.alloc(totalBytes, 0);
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldRetryStatus = (status: number) =>
  status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;

type TtsResponseFormat = "wav";

const RESPONSE_FORMAT_TO_CONTENT_TYPE: Record<TtsResponseFormat, string> = {
  wav: "audio/wav",
};

const synthesizeTtsSegment = async (
  apiKey: string,
  voice: string,
  script: string,
  responseFormat: TtsResponseFormat,
): Promise<Buffer> => {
  const timeoutValue = Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "", 10);
  const timeoutMs = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 60000;
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice,
          input: script,
          instructions: TTS_SYSTEM_PROMPT,
          response_format: responseFormat,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (shouldRetryStatus(response.status) && attempt < maxRetries) {
          const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
          const delayMs = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 500 * (attempt + 1);
          await sleep(delayMs);
          continue;
        }
        throw new Error(`OpenAI TTS failed: ${response.status} ${errorText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error(`OpenAI request timed out after ${timeoutMs} ms`);
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error("OpenAI request failed.");
      }

      if (attempt < maxRetries) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error("OpenAI request failed.");
};

const prepareTtsRequest = (request: TtsRequest) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const voice = resolveVoice(request.voice, request.language);
  const inputScript = insertNewlinePauses(request.script, request.newlinePauseSeconds);
  const scriptHash = createHash("sha256")
    .update(inputScript)
    .digest("hex")
    .slice(0, 12);

  console.info("OpenAI API call: audio.speech", {
    model: "gpt-4o-mini-tts",
    voice,
    scriptLength: inputScript.length,
    scriptHash,
  });

  const tokens = tokenizeScript(inputScript);
  if (tokens.length === 0) {
    throw new Error("Script is empty after parsing pause markers.");
  }

  const textSegments = tokens.filter(
    (token): token is { type: "text"; value: string } => token.type === "text",
  );
  const totalChars = textSegments.reduce((sum, token) => sum + token.value.length, 0);

  if (textSegments.length > MAX_TTS_SEGMENTS || totalChars > MAX_TTS_CHARS) {
    throw new TtsScriptTooLargeError({
      maxSegments: MAX_TTS_SEGMENTS,
      maxChars: MAX_TTS_CHARS,
      segmentCount: textSegments.length,
      charCount: totalChars,
    });
  }

  return {
    apiKey,
    voice,
    inputScript,
    tokens,
  };
};

export async function synthesizeSpeech(
  request: TtsRequest,
): Promise<TtsResponse> {
  const { apiKey, voice, inputScript, tokens } = prepareTtsRequest(request);

  const audioChunks: Buffer[] = [];
  let format: Omit<WavFormat, "audioData"> | null = null;
  let pendingPauseSeconds = 0;

  for (const token of tokens) {
    if (token.type === "pause") {
      if (format) {
        audioChunks.push(createSilenceBuffer(token.value, format));
      } else {
        pendingPauseSeconds += token.value;
      }
      continue;
    }

    const wavBuffer = await synthesizeTtsSegment(apiKey, voice, token.value, "wav");
    const wavData = parseWav(wavBuffer);

    if (!format) {
      format = {
        sampleRate: wavData.sampleRate,
        channels: wavData.channels,
        bitsPerSample: wavData.bitsPerSample,
      };
      if (pendingPauseSeconds > 0) {
        audioChunks.push(createSilenceBuffer(pendingPauseSeconds, format));
        pendingPauseSeconds = 0;
      }
    } else if (
      wavData.sampleRate !== format.sampleRate ||
      wavData.channels !== format.channels ||
      wavData.bitsPerSample !== format.bitsPerSample
    ) {
      throw new Error("TTS returned inconsistent WAV formats for segments.");
    }

    audioChunks.push(wavData.audioData);
  }

  if (!format) {
    throw new Error("No spoken audio segments were generated.");
  }

  const combinedAudio = buildWav(format, Buffer.concat(audioChunks));

  return {
    audio: combinedAudio,
    contentType: RESPONSE_FORMAT_TO_CONTENT_TYPE.wav,
    provider: "openai",
    voice,
    inputScript,
  };
}

export async function synthesizeSpeechStream(
  request: TtsRequest,
  options?: { chunkSize?: number },
): Promise<TtsStreamResponse> {
  const { apiKey, voice, inputScript, tokens } = prepareTtsRequest(request);
  const chunkSize = options?.chunkSize;
  const responseFormat: TtsResponseFormat = "wav";

  const stream = (async function* () {
    let format: Omit<WavFormat, "audioData"> | null = null;
    let pendingPauseSeconds = 0;
    let headerSent = false;
    let hasAudio = false;

    for (const token of tokens) {
      if (token.type === "pause") {
        if (format) {
          yield* chunkBuffer(createSilenceBuffer(token.value, format), chunkSize);
        } else {
          pendingPauseSeconds += token.value;
        }
        continue;
      }

      const audioBuffer = await synthesizeTtsSegment(apiKey, voice, token.value, responseFormat);
      hasAudio = true;

      const wavData = parseWav(audioBuffer);

      if (!format) {
        format = {
          sampleRate: wavData.sampleRate,
          channels: wavData.channels,
          bitsPerSample: wavData.bitsPerSample,
        };
        if (!headerSent) {
          headerSent = true;
          yield* chunkBuffer(buildStreamingWavHeader(format), chunkSize);
        }
        if (pendingPauseSeconds > 0) {
          yield* chunkBuffer(createSilenceBuffer(pendingPauseSeconds, format), chunkSize);
          pendingPauseSeconds = 0;
        }
      } else if (
        wavData.sampleRate !== format.sampleRate ||
        wavData.channels !== format.channels ||
        wavData.bitsPerSample !== format.bitsPerSample
      ) {
        throw new Error("TTS returned inconsistent WAV formats for segments.");
      }

      yield* chunkBuffer(wavData.audioData, chunkSize);
    }

    if (!hasAudio || !format) {
      throw new Error("No spoken audio segments were generated.");
    }
  })();

  return {
    stream,
    contentType: RESPONSE_FORMAT_TO_CONTENT_TYPE[responseFormat],
    provider: "openai",
    voice,
    inputScript,
  };
}
