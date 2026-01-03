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
  SilenceProfile,
  SenseRotation,
} from "../../lib/promptBuilder";
import { OutputMode, validateGenerateConfig } from "../../lib/generateValidation";
import { generateScript } from "../../services/script";
import { synthesizeSpeech, TtsScriptTooLargeError } from "../../services/tts";

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
    languages: string[];
    prompt: string;
    ttsProvider: string;
    voice: string;
  };
  audioBase64?: string;
  audioContentType?: string;
};

type StreamEvent = "status" | "done" | "error";

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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: {
        code: "method_not_allowed",
        message: "Only POST requests are supported.",
      },
    });
    return;
  }

  let payload: unknown;
  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    if (isPayloadTooLargeError(error)) {
      sendJson(res, 413, {
        error: {
          code: "payload_too_large",
          message: "Request body exceeds the maximum allowed size.",
        },
      });
      return;
    }
    sendJson(res, 400, {
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
        details: { error: (error as Error).message },
      },
    });
    return;
  }

  const validation = validateGenerateConfig(payload);
  if (!validation.ok) {
    sendJson(res, 400, validation.error);
    return;
  }

  const { config, outputMode: requestedMode } = validation.value;
  const prompt = buildPrompt(config);
  const acceptHeader = req.headers.accept ?? "";
  const wantsStream = acceptHeader.includes("text/event-stream");
  const outputMode =
    requestedMode ?? (acceptHeader.includes("application/json") ? "text" : "audio");

  if (requestedMode && !["text", "audio", "text-audio"].includes(requestedMode)) {
    sendJson(res, 400, {
      error: {
        code: "invalid_output_mode",
        message: "Output mode must be one of: text, audio, text-audio.",
      },
    });
    return;
  }

  try {
    if (wantsStream) {
      sendEventStreamHeaders(res);
      sendEvent(res, "status", "generating script…");
    }
    const { script } = await generateScript({ prompt });
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
          languages: config.languages,
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
      sendEvent(res, "status", "synthesizing audio…");
    }
    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const ttsResult = await synthesizeSpeech({
      script,
      language: config.languages[0],
      voice: config.voiceStyle,
    });

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
        languages: config.languages,
        prompt,
        ttsProvider: ttsResult.provider,
        voice: ttsResult.voice,
      },
    };

    if (wantsStream) {
      response.audioBase64 = ttsResult.audio.toString("base64");
      response.audioContentType = ttsResult.contentType;
      sendEvent(res, "done", JSON.stringify(response));
      res.end();
      return;
    }

    if (outputMode === "text-audio") {
      response.audioBase64 = ttsResult.audio.toString("base64");
      response.audioContentType = ttsResult.contentType;
      sendJson(res, 200, response);
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", ttsResult.contentType);
    res.setHeader("Content-Disposition", "attachment; filename=\"pq-reps.wav\"");
    res.end(ttsResult.audio);
  } catch (error) {
    if (wantsStream) {
      const message =
        error instanceof TtsScriptTooLargeError
          ? "Script exceeds the maximum length supported for TTS."
          : "Failed to generate a response.";
      sendEvent(res, "error", message);
      res.end();
      return;
    }
    if (error instanceof TtsScriptTooLargeError) {
      sendJson(res, 400, {
        error: {
          code: error.code,
          message: "Script exceeds the maximum length supported for TTS.",
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
    sendJson(res, 500, {
      error: {
        code: "tts_failure",
        message: "Failed to synthesize audio.",
        details: { error: (error as Error).message },
      },
    });
  }
}
