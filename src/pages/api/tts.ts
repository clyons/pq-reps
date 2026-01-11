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
import { DEFAULT_TTS_NEWLINE_PAUSE_SECONDS } from "../../services/tts.js";
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
    const maxBytes = 2 * 1024 * 1024;
    const contentLengthHeader = req.headers["content-length"];
    const contentLength =
      typeof contentLengthHeader === "string"
        ? Number.parseInt(contentLengthHeader, 10)
        : Number.NaN;
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      const error = new Error("Payload too large.");
      (error as Error & { code: string }).code = "payload_too_large";
      reject(error);
      return;
    }

    let data = "";
    let totalBytes = 0;
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) {
        return;
      }
      totalBytes += chunk.length ?? 0;
      if (totalBytes > maxBytes) {
        const error = new Error("Payload too large.");
        (error as Error & { code: string }).code = "payload_too_large";
        aborted = true;
        req.destroy();
        reject(error);
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      if (aborted) {
        return;
      }
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

function isPayloadTooLargeError(
  error: unknown,
): error is Error & { code: "payload_too_large" } {
  return (
    error instanceof Error &&
    (error as Error & { code?: string }).code === "payload_too_large"
  );
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

  const abortController = new AbortController();
  const handleAbort = () => {
    if (!abortController.signal.aborted) {
      abortController.abort(new Error("Client disconnected."));
    }
  };
  req.on("aborted", handleAbort);
  req.on("close", handleAbort);

  let payload: unknown;
  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    if (isPayloadTooLargeError(error)) {
      sendJson(res, 413, {
        error: {
          code: "payload_too_large",
          message: translate(DEFAULT_LOCALE, "errors.payload_too_large"),
        },
      });
      return;
    }
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
    const newlinePauseSeconds =
      payload.ttsNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS;
    const ttsResult = wantsAudioStream
      ? await synthesizeSpeechStream({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds,
        }, {
          signal: abortController.signal,
        })
      : await synthesizeSpeech({
          script: payload.script,
          language: payload.language,
          voice: payload.voice,
          newlinePauseSeconds,
        }, {
          signal: abortController.signal,
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
