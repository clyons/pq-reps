import { NextResponse } from "next/server";
import {
  buildPrompt,
  DURATION_BOUNDS,
  GenerateConfig,
  LegacyGenerateConfig,
  PracticeGenerateConfig,
  Sense,
  SUPPORTED_LANGUAGES,
} from "../../../lib/promptBuilder";
import { generateScript } from "../../../services/script";
import { synthesizeSpeech } from "../../../services/tts";

export const runtime = "nodejs";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

type OutputMode = "text" | "audio" | "text-audio";

type SuccessResponse = {
  script: string;
  metadata: {
    sense?: Sense;
    languages: string[];
    durationSeconds?: number;
    practiceMode?: string;
    bodyState?: string;
    eyeState?: string;
    primarySense?: string;
    durationMinutes?: number;
    labelingMode?: string;
    silenceProfile?: string;
    normalizationFrequency?: string;
    closingStyle?: string;
    senseRotation?: string;
    audience?: string;
    voiceStyle?: string;
    prompt: string;
    ttsProvider: string;
    voice: string;
  };
  audioBase64?: string;
  audioContentType?: string;
};

const ALLOWED_SENSES: Sense[] = ["calm", "energizing", "focus", "uplifting"];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

function isPracticePayload(payload: Record<string, unknown>): boolean {
  return (
    "practiceMode" in payload ||
    "bodyState" in payload ||
    "eyeState" in payload ||
    "primarySense" in payload ||
    "durationMinutes" in payload
  );
}

function validateConfig(payload: unknown): {
  ok: true;
  value: {
    config: GenerateConfig;
    outputMode?: OutputMode;
  };
} | {
  ok: false;
  error: ErrorResponse;
} {
  if (!isRecord(payload)) {
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

  const config = payload as Record<string, unknown> & { outputMode?: OutputMode };

  if (isPracticePayload(config)) {
    if (
      !isString(config.practiceMode) ||
      !isString(config.bodyState) ||
      !isString(config.eyeState) ||
      !isString(config.primarySense) ||
      !isNumber(config.durationMinutes) ||
      !isString(config.labelingMode) ||
      !isString(config.silenceProfile) ||
      !isString(config.normalizationFrequency) ||
      !isString(config.closingStyle)
    ) {
      return {
        ok: false,
        error: {
          error: {
            code: "invalid_practice_config",
            message: "Practice configuration fields must be provided with valid types.",
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

    const practiceConfig: PracticeGenerateConfig = {
      practiceMode: config.practiceMode,
      bodyState: config.bodyState,
      eyeState: config.eyeState,
      primarySense: config.primarySense,
      durationMinutes: config.durationMinutes,
      labelingMode: config.labelingMode,
      silenceProfile: config.silenceProfile,
      normalizationFrequency: config.normalizationFrequency,
      closingStyle: config.closingStyle,
      senseRotation: isString(config.senseRotation) ? config.senseRotation : undefined,
      languages: config.languages,
      audience: isString(config.audience) ? config.audience : undefined,
      voiceStyle: isString(config.voiceStyle) ? config.voiceStyle : undefined,
    };

    return {
      ok: true,
      value: {
        config: practiceConfig,
        outputMode: config.outputMode,
      },
    };
  }

  const legacyConfig = config as Partial<LegacyGenerateConfig>;

  if (!legacyConfig.sense || !ALLOWED_SENSES.includes(legacyConfig.sense)) {
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

  if (!isStringArray(legacyConfig.languages) || legacyConfig.languages.length === 0) {
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

  const unsupported = legacyConfig.languages.filter(
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

  if (typeof legacyConfig.durationSeconds !== "number") {
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
    legacyConfig.durationSeconds < DURATION_BOUNDS.minSeconds ||
    legacyConfig.durationSeconds > DURATION_BOUNDS.maxSeconds
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
      config: {
        sense: legacyConfig.sense,
        languages: legacyConfig.languages,
        durationSeconds: legacyConfig.durationSeconds,
        audience: legacyConfig.audience,
        topic: legacyConfig.topic,
        voiceStyle: legacyConfig.voiceStyle,
      },
      outputMode: config.outputMode,
    },
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON.",
          details: { error: (error as Error).message },
        },
      },
      { status: 400 },
    );
  }

  const validation = validateConfig(payload);
  if (!validation.ok) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { config, outputMode: requestedMode } = validation.value;
  const prompt = buildPrompt(config);
  const acceptHeader = request.headers.get("accept") ?? "";
  const outputMode =
    requestedMode ?? (acceptHeader.includes("application/json") ? "text" : "audio");

  if (requestedMode && !["text", "audio", "text-audio"].includes(requestedMode)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_output_mode",
          message: "Output mode must be one of: text, audio, text-audio.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { script } = await generateScript({ prompt });
    const metadataBase = {
      languages: config.languages,
      prompt,
    };

    if (outputMode === "text") {
      const response: SuccessResponse = {
        script,
        metadata: {
          ...metadataBase,
          ...(config as Partial<GenerateConfig>),
          ttsProvider: "none",
          voice: "n/a",
        },
      };
      return NextResponse.json(response);
    }

    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const ttsResult = await synthesizeSpeech({
      script,
      language: config.languages[0],
      voice: config.voiceStyle,
    });

    if (outputMode === "text-audio") {
      const response: SuccessResponse = {
        script,
        metadata: {
          ...metadataBase,
          ...(config as Partial<GenerateConfig>),
          ttsProvider: ttsResult.provider,
          voice: ttsResult.voice,
        },
        audioBase64: ttsResult.audio.toString("base64"),
        audioContentType: ttsResult.contentType,
      };
      return NextResponse.json(response);
    }

    return new Response(ttsResult.audio, {
      status: 200,
      headers: {
        "Content-Type": ttsResult.contentType,
        "Content-Disposition": "attachment; filename=\"pq-reps.mp3\"",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "tts_failure",
          message: "Failed to synthesize audio.",
          details: { error: (error as Error).message },
        },
      },
      { status: 500 },
    );
  }
}
