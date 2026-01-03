import type { IncomingMessage, ServerResponse } from "http";
import {
  buildPrompt,
  DURATION_BOUNDS,
  GenerateConfig,
  Sense,
  SUPPORTED_LANGUAGES,
} from "../../lib/promptBuilder";
import { synthesizeSpeech } from "../../services/tts";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

type SuccessResponse = {
  script: string;
  audioUrl: string;
  metadata: {
    sense: Sense;
    languages: string[];
    durationSeconds: number;
    prompt: string;
    ttsProvider: string;
  };
};

const ALLOWED_SENSES: Sense[] = ["calm", "energizing", "focus", "uplifting"];

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function validateConfig(payload: unknown): {
  ok: true;
  value: GenerateConfig;
} | {
  ok: false;
  error: ErrorResponse;
} {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_payload",
          message: "Payload must be a JSON object.",
        },
      },
    };
  }

  const config = payload as Partial<GenerateConfig>;

  if (!config.sense || !ALLOWED_SENSES.includes(config.sense)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_sense",
          message: "Sense must be one of the supported values.",
          details: { allowed: ALLOWED_SENSES },
        },
      },
    };
  }

  if (!isStringArray(config.languages) || config.languages.length === 0) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_languages",
          message: "Languages must be a non-empty array of strings.",
        },
      },
    };
  }

  const unsupported = config.languages.filter(
    (lang) => !SUPPORTED_LANGUAGES.includes(lang),
  );

  if (unsupported.length > 0) {
    return {
      ok: false,
      error: {
        error: {
          code: "unsupported_language",
          message: "One or more languages are not supported.",
          details: { unsupported, supported: SUPPORTED_LANGUAGES },
        },
      },
    };
  }

  if (typeof config.durationSeconds !== "number") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_duration",
          message: "Duration must be provided as a number of seconds.",
        },
      },
    };
  }

  if (
    config.durationSeconds < DURATION_BOUNDS.minSeconds ||
    config.durationSeconds > DURATION_BOUNDS.maxSeconds
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "duration_out_of_bounds",
          message: "Duration must be within allowed bounds.",
          details: { bounds: DURATION_BOUNDS },
        },
      },
    };
  }

  return {
    ok: true,
    value: {
      sense: config.sense,
      languages: config.languages,
      durationSeconds: config.durationSeconds,
      audience: config.audience,
      topic: config.topic,
      voiceStyle: config.voiceStyle,
    },
  };
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
    sendJson(res, 400, {
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
        details: { error: (error as Error).message },
      },
    });
    return;
  }

  const validation = validateConfig(payload);
  if (!validation.ok) {
    sendJson(res, 400, validation.error);
    return;
  }

  const config = validation.value;
  const prompt = buildPrompt(config);
  const script = [
    `Hook (${config.sense}): Imagine ${config.topic ?? "a new possibility"} taking shape.`,
    "Body: Describe the journey in simple, vivid language.",
    `Closing CTA: Take one step today toward that ${config.topic ?? "goal"}.`,
  ].join(" ");

  try {
    const ttsResult = await synthesizeSpeech({
      script,
      language: config.languages[0],
      voice: config.voiceStyle,
    });

    const response: SuccessResponse = {
      script,
      audioUrl: ttsResult.audioUrl,
      metadata: {
        sense: config.sense,
        languages: config.languages,
        durationSeconds: config.durationSeconds,
        prompt,
        ttsProvider: ttsResult.provider,
      },
    };

    sendJson(res, 200, response);
  } catch (error) {
    sendJson(res, 500, {
      error: {
        code: "tts_failure",
        message: "Failed to synthesize audio.",
        details: { error: (error as Error).message },
      },
    });
  }
}
