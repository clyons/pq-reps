import { createHash } from "crypto";

export type TtsRequest = {
  script: string;
  voice?: string;
  language?: string;
};

export type TtsResponse = {
  audio: Buffer;
  contentType: string;
  provider: string;
  voice: string;
};

type WavFormat = {
  audioData: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

const DEFAULT_VOICE = "marin";
const SUPPORTED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
]);

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  en: "marin",
  es: "cedar",
  fr: "cedar",
  de: "marin",
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

const createSilenceBuffer = (
  seconds: number,
  format: Omit<WavFormat, "audioData">,
): Buffer => {
  const bytesPerSample = format.bitsPerSample / 8;
  const totalSamples = Math.round(seconds * format.sampleRate);
  const totalBytes = totalSamples * format.channels * bytesPerSample;
  return Buffer.alloc(totalBytes, 0);
};

const synthesizeWavSegment = async (
  apiKey: string,
  voice: string,
  script: string,
): Promise<Buffer> => {
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
      response_format: "wav",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

export async function synthesizeSpeech(
  request: TtsRequest,
): Promise<TtsResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const voice = resolveVoice(request.voice, request.language);
  const scriptHash = createHash("sha256")
    .update(request.script)
    .digest("hex")
    .slice(0, 12);

  console.info("OpenAI API call: audio.speech", {
    model: "gpt-4o-mini-tts",
    voice,
    scriptLength: request.script.length,
    scriptHash,
  });

  const tokens = tokenizeScript(request.script);
  if (tokens.length === 0) {
    throw new Error("Script is empty after parsing pause markers.");
  }

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

    const wavBuffer = await synthesizeWavSegment(apiKey, voice, token.value);
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
    contentType: "audio/wav",
    provider: "openai",
    voice,
  };
}
