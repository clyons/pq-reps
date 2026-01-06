import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { synthesizeSpeech } from "../../services/tts";
import { getVoicePreviewScript } from "../../services/voicePreview";
import {
  DEFAULT_LOCALE,
  resolveLocaleFromPayload,
  translate,
} from "../../lib/i18n";

type VoicePreviewRequest = {
  language?: string;
  voice?: string;
};

const cacheDirectory = path.join(process.cwd(), ".cache", "voice-previews");

const getCachePath = (language: string, voice: string, script: string) => {
  const key = createHash("sha256").update(`${language}|${voice}|${script}`).digest("hex");
  return path.join(cacheDirectory, `${key}.wav`);
};

const readJsonBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as VoicePreviewRequest;
};

const sendAudioResponse = (res: ServerResponse, audio: Buffer) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(audio);
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "method_not_allowed",
          message: translate(DEFAULT_LOCALE, "errors.method_not_allowed"),
        },
      }),
    );
    return;
  }

  let locale = DEFAULT_LOCALE;
  try {
    const requestBody = await readJsonBody(req);
    locale = resolveLocaleFromPayload(requestBody);
    const { language = "en", voice = "alloy" } = requestBody;
    const script = getVoicePreviewScript(language);
    await fs.mkdir(cacheDirectory, { recursive: true });
    const cachePath = getCachePath(language, voice, script);

    try {
      const cachedAudio = await fs.readFile(cachePath);
      sendAudioResponse(res, cachedAudio);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const ttsResult = await synthesizeSpeech({ script, language, voice });
    await fs.writeFile(cachePath, ttsResult.audio);
    sendAudioResponse(res, ttsResult.audio);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "voice_preview_failure",
          message: translate(locale, "errors.voice_preview_failure"),
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      }),
    );
  }
};

export default handler;
