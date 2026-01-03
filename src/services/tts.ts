import { randomUUID } from "crypto";

export type TtsRequest = {
  script: string;
  voice?: string;
  language?: string;
};

export type TtsResponse = {
  audioUrl: string;
  provider: string;
};

export async function synthesizeSpeech(
  request: TtsRequest,
): Promise<TtsResponse> {
  void request;
  const token = randomUUID();

  return {
    audioUrl: `https://example.com/audio/${token}.mp3`,
    provider: "placeholder-tts",
  };
}
