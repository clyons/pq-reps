import type { IncomingMessage, ServerResponse } from "http";
import {
  synthesizeSpeech,
  synthesizeSpeechStream,
  TtsScriptTooLargeError,
} from "../../services/tts.js";
import {
  DEFAULT_LOCALE,
  resolveLocaleFromPayload,
  translate,
} from "../../lib/i18n/index.js";
import { DEFAULT_TTS_NEWLINE_PAUSE_SECONDS } from "../../lib/generateValidation.js";
import { logger } from "../../lib/logger.js";

type TtsPayload = {
  script: string;
  language: string;
  voice: string;
  ttsNewlinePauseSeconds?: number;
};

const formatTimestamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
};

const buildDownloadFilename = ({
  voice,
  extension = "wav",
  now = new Date(),
}: {
  voice: string;
  extension?: string;
  now?: Date;
}) => `pq-reps_${voice}_${formatTimestamp(now)}.${extension}`;

const resolveAudioExtension = (contentType: string) =>
  contentType.includes("mpeg") ? "mp3" : "wav";

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const isValidPayload = (payload: unknown): payload is TtsPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const { script, language, voice, ttsNewlinePauseSeconds } =
    payload as Partial<TtsPayload>;
  if (typeof script !== "string" || script.trim().length === 0) {
    return false;
  }
  if (typeof language !== "string" || language.trim().length === 0) {
    return false;
  }
  if (typeof voice !== "string" || voice.trim().length === 0) {
    return false;
  }
  if (
    typeof ttsNewlinePauseSeconds !== "undefined" &&
    typeof ttsNewlinePauseSeconds !== "number"
  ) {
    return false;
  }
  return true;
};

const isMissingOpenAiKeyError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("Missing OPENAI_API_KEY environment variable.");

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: {
        code: "method_not_allowed",
        message: translate(DEFAULT_LOCALE, "errors.method_not_allowed"),
      },
    });
    return;
  }

  let payload: unknown;
  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    sendJson(res, 400, {
      error: {
        code: "invalid_json",
        message: translate(DEFAULT_LOCALE, "errors.invalid_json"),
        details: { error: (error as Error).message },
      },
    });
    return;
  }

  const locale = resolveLocaleFromPayload(payload);

  if (!isValidPayload(payload)) {
    sendJson(res, 400, {
      error: {
        code: "invalid_payload",
        message: translate(locale, "errors.invalid_tts_payload"),
      },
    });
    return;
  }

  const wantsAudioStream = req.headers["x-tts-streaming"] === "1";

  try {
    logger.info("ai_generated_audio_notice", {
      endpoint: "tts",
    });
    const ttsResult = wantsAudioStream
      ? await synthesizeSpeechStream({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds:
            payload.ttsNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
        })
      : await synthesizeSpeech({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds:
            payload.ttsNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
        });

    if ("stream" in ttsResult) {
      res.statusCode = 200;
      res.setHeader("Content-Type", ttsResult.contentType);
      res.setHeader("Transfer-Encoding", "chunked");
      const downloadFilename = buildDownloadFilename({
        voice: ttsResult.voice,
        extension: resolveAudioExtension(ttsResult.contentType),
      });
      res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
      for await (const chunk of ttsResult.stream) {
        res.write(chunk);
      }
      res.end();
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", ttsResult.contentType);
    const downloadFilename = buildDownloadFilename({
      voice: ttsResult.voice,
      extension: resolveAudioExtension(ttsResult.contentType),
    });
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    res.end(ttsResult.audio);
  } catch (error) {
    logger.error("tts_request_failed", {
      error: logger.formatError(error).message,
    });
    if (error instanceof TtsScriptTooLargeError) {
      sendJson(res, 400, {
        error: {
          code: error.code,
          message: translate(locale, "errors.script_too_large"),
          details: {
            maxSegments: error.maxSegments,
            maxChars: error.maxChars,
            segmentCount: error.segmentCount,
            charCount: error.charCount,
          },
        },
      });
      return;
    }
    if (isMissingOpenAiKeyError(error)) {
      sendJson(res, 500, {
        error: {
          code: "missing_openai_key",
          message: translate(locale, "errors.missing_openai_key"),
        },
      });
      return;
    }
    sendJson(res, 500, {
      error: {
        code: "tts_failure",
        message: translate(locale, "errors.tts_failure"),
        details: { error: (error as Error).message },
      },
    });
  }
}
