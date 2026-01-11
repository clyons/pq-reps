import type { IncomingMessage, ServerResponse } from "http";
import {
  buildPrompt,
  BodyState,
  ClosingStyle,
  DurationMinutes,
  EyeState,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  ScenarioId,
  SilenceProfile,
  SenseRotation,
  getScenarioById,
} from "../../lib/promptBuilder.js";
import { OutputMode, validateGenerateConfig } from "../../lib/generateValidation.js";
import { generateScript, SCRIPT_SYSTEM_PROMPT } from "../../services/script.js";
import {
  synthesizeSpeech,
  synthesizeSpeechStream,
  TtsScriptTooLargeError,
  TTS_SYSTEM_PROMPT,
} from "../../services/tts.js";
import {
  DEFAULT_LOCALE,
  resolveLocaleFromPayload,
  translate,
} from "../../lib/i18n/index.js";
import { logger } from "../../lib/logger.js";

type SuccessResponse = {
  script: string;
  metadata: {
    practiceMode: PracticeMode;
    bodyState: BodyState;
    eyeState: EyeState;
    primarySense: PrimarySense;
    durationMinutes: DurationMinutes;
    labelingMode: LabelingMode;
    silenceProfile: SilenceProfile;
    normalizationFrequency: NormalizationFrequency;
    closingStyle: ClosingStyle;
    senseRotation?: SenseRotation;
    scenarioId?: ScenarioId;
    scenarioLabel?: string;
    languages: string[];
    ttsNewlinePauseSeconds?: number;
    prompt: string;
    ttsProvider: string;
    voice: string;
  };
  ttsPrompt?: {
    model: string;
    voice: string;
    input: string;
    response_format: string;
    voiceStylePreference?: string;
    scriptSystemPrompt: string;
    scriptUserPrompt: string;
    ttsSystemPrompt: string;
  };
  audioBase64?: string;
  audioContentType?: string;
};

type StreamEvent = "status" | "done" | "error";

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
  durationMinutes,
  focus,
  now = new Date(),
  extension = "wav",
}: {
  voice: string;
  durationMinutes: number;
  focus: string;
  now?: Date;
  extension?: string;
}) => `pq-reps_${voice}_${durationMinutes}_${focus}_${formatTimestamp(now)}.${extension}`;

const resolveAudioExtension = (contentType: string) =>
  contentType.includes("mpeg") ? "mp3" : "wav";

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sendEventStreamHeaders(res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
}

function sendEvent(res: ServerResponse, event: StreamEvent, data: string) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
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

const isMissingOpenAiKeyError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("Missing OPENAI_API_KEY environment variable.");

const isClientDisconnectError = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) {
    const reason = signal.reason;
    if (reason instanceof Error && reason.message === "Client disconnected.") {
      return true;
    }
  }
  return error instanceof Error && error.message === "Client disconnected.";
};

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
  const validation = validateGenerateConfig(payload, locale);
  if (!validation.ok) {
    sendJson(res, 400, validation.error);
    return;
  }

  const { config, outputMode: requestedMode, debugTtsPrompt } = validation.value;
  const scenario = getScenarioById(config.scenarioId);
  const prompt = buildPrompt(config);
  const acceptHeader = req.headers.accept ?? "";
  const wantsStream = acceptHeader.includes("text/event-stream");
  const wantsAudioStream = req.headers["x-tts-streaming"] === "1";
  const outputMode =
    requestedMode ?? (acceptHeader.includes("application/json") ? "text" : "audio");

  if (requestedMode && !["text", "audio", "text-audio"].includes(requestedMode)) {
    sendJson(res, 400, {
      error: {
        code: "invalid_output_mode",
        message: translate(locale, "errors.invalid_output_mode"),
      },
    });
    return;
  }

  try {
    if (wantsStream) {
      sendEventStreamHeaders(res);
      sendEvent(res, "status", translate(locale, "status.generating_script"));
    }
    const scriptStart = Date.now();
    const { script } = await generateScript({ prompt }, { signal: abortController.signal });
    logger.info("generate_script_completed", {
      durationMs: Date.now() - scriptStart,
    });
    if (outputMode === "text") {
      const response = {
        script,
        metadata: {
          practiceMode: config.practiceMode,
          bodyState: config.bodyState,
          eyeState: config.eyeState,
          primarySense: config.primarySense,
          durationMinutes: config.durationMinutes,
          labelingMode: config.labelingMode,
          silenceProfile: config.silenceProfile,
          normalizationFrequency: config.normalizationFrequency,
          closingStyle: config.closingStyle,
          senseRotation: config.senseRotation,
          scenarioId: scenario?.id,
          scenarioLabel: scenario?.label,
          languages: config.languages,
          ttsNewlinePauseSeconds: config.ttsNewlinePauseSeconds,
          prompt,
          ttsProvider: "none",
          voice: "n/a",
        },
      } satisfies SuccessResponse;

      if (wantsStream) {
        sendEvent(res, "done", JSON.stringify(response));
        res.end();
        return;
      }

      sendJson(res, 200, response);
      return;
    }

    if (wantsStream) {
      sendEvent(res, "status", translate(locale, "status.synthesizing_audio"));
    }
    logger.info("ai_generated_audio_notice", {
      endpoint: "generate",
    });
    const ttsStart = Date.now();
    const ttsResult = wantsAudioStream && outputMode === "audio"
      ? await synthesizeSpeechStream({
          script,
          language: config.languages[0],
          voice: config.voiceStyle,
          newlinePauseSeconds: config.ttsNewlinePauseSeconds,
        }, {
          signal: abortController.signal,
        })
      : await synthesizeSpeech({
          script,
          language: config.languages[0],
          voice: config.voiceStyle,
          newlinePauseSeconds: config.ttsNewlinePauseSeconds,
        }, {
          signal: abortController.signal,
        });
    logger.info("synthesize_audio_completed", {
      durationMs: Date.now() - ttsStart,
    });
    const ttsPrompt = debugTtsPrompt
      ? {
          model: "gpt-4o-mini-tts",
          voice: ttsResult.voice,
          input: ttsResult.inputScript,
          response_format: "wav",
          voiceStylePreference: config.voiceStyle,
          scriptSystemPrompt: SCRIPT_SYSTEM_PROMPT,
          scriptUserPrompt: prompt,
          ttsSystemPrompt: TTS_SYSTEM_PROMPT,
        }
      : undefined;

    const response: SuccessResponse = {
      script,
      metadata: {
        practiceMode: config.practiceMode,
        bodyState: config.bodyState,
        eyeState: config.eyeState,
        primarySense: config.primarySense,
        durationMinutes: config.durationMinutes,
        labelingMode: config.labelingMode,
        silenceProfile: config.silenceProfile,
        normalizationFrequency: config.normalizationFrequency,
        closingStyle: config.closingStyle,
        senseRotation: config.senseRotation,
        scenarioId: scenario?.id,
        scenarioLabel: scenario?.label,
        languages: config.languages,
        ttsNewlinePauseSeconds: config.ttsNewlinePauseSeconds,
        prompt,
        ttsProvider: ttsResult.provider,
        voice: ttsResult.voice,
      },
      ttsPrompt,
    };

    if (wantsStream) {
      if ("audio" in ttsResult) {
        response.audioBase64 = ttsResult.audio.toString("base64");
      }
      response.audioContentType = ttsResult.contentType;
      sendEvent(res, "done", JSON.stringify({
        script,
        metadata: {
          practiceMode: config.practiceMode,
          bodyState: config.bodyState,
          eyeState: config.eyeState,
          primarySense: config.primarySense,
          durationMinutes: config.durationMinutes,
          labelingMode: config.labelingMode,
          silenceProfile: config.silenceProfile,
          normalizationFrequency: config.normalizationFrequency,
          closingStyle: config.closingStyle,
          senseRotation: config.senseRotation,
          scenarioId: scenario?.id,
          scenarioLabel: scenario?.label,
          languages: config.languages,
          ttsNewlinePauseSeconds: config.ttsNewlinePauseSeconds,
          prompt,
          ttsProvider: ttsResult.provider,
          voice: ttsResult.voice,
        },
        ttsPrompt,
        audioBase64:
          "audio" in ttsResult ? ttsResult.audio.toString("base64") : undefined,
        audioContentType: ttsResult.contentType,
      } satisfies SuccessResponse));
      res.end();
      return;
    }

    if (outputMode === "text-audio") {
      if ("audio" in ttsResult) {
        response.audioBase64 = ttsResult.audio.toString("base64");
      }
      response.audioContentType = ttsResult.contentType;
      sendJson(res, 200, response);
      return;
    }

    if ("stream" in ttsResult) {
      res.statusCode = 200;
      res.setHeader("Content-Type", ttsResult.contentType);
      res.setHeader("Transfer-Encoding", "chunked");
      const downloadFilename = buildDownloadFilename({
        voice: ttsResult.voice,
        durationMinutes: config.durationMinutes,
        focus: config.primarySense,
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
      durationMinutes: config.durationMinutes,
      focus: config.primarySense,
      extension: resolveAudioExtension(ttsResult.contentType),
    });
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    res.end(ttsResult.audio);
  } catch (error) {
    if (isClientDisconnectError(error, abortController.signal)) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }
    logger.error("generate_request_failed", {
      error: logger.formatError(error).message,
    });
    if (res.headersSent || res.writableEnded) {
      res.end();
      return;
    }
    if (wantsStream) {
      const message =
        error instanceof TtsScriptTooLargeError
          ? translate(locale, "errors.script_too_large")
          : translate(locale, "errors.generate_failure");
      sendEvent(res, "error", message);
      res.end();
      return;
    }
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
