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

export async function synthesizeSpeech(
  request: TtsRequest,
): Promise<TtsResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const voice = resolveVoice(request.voice, request.language);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input: request.script,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    audio: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    provider: "openai",
    voice,
  };
}
