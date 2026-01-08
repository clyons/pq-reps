import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { synthesizeSpeech } from "../../../services/tts.js";
import { getVoicePreviewScript } from "../../../services/voicePreview.js";

type VoicePreviewRequest = {
  language?: string;
  voice?: string;
};

const cacheDirectory = path.join(process.cwd(), ".cache", "voice-previews");

const getCachePath = (language: string, voice: string, script: string) => {
  const key = createHash("sha256").update(`${language}|${voice}|${script}`).digest("hex");
  return path.join(cacheDirectory, `${key}.wav`);
};

const sendAudioResponse = (audio: Buffer) =>
  new Response(audio, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VoicePreviewRequest;
    const language = body.language ?? "en";
    const voice = body.voice ?? "alloy";
    const script = getVoicePreviewScript(language);

    await fs.mkdir(cacheDirectory, { recursive: true });
    const cachePath = getCachePath(language, voice, script);

    try {
      const cachedAudio = await fs.readFile(cachePath);
      return sendAudioResponse(cachedAudio);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const ttsResult = await synthesizeSpeech({ script, language, voice });
    await fs.writeFile(cachePath, ttsResult.audio);
    return sendAudioResponse(ttsResult.audio);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: "voice_preview_failure",
          message: error instanceof Error ? error.message : "Unable to generate preview.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
