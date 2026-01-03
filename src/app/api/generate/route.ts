import { NextResponse } from "next/server";
import {
  buildPrompt,
  DURATION_BOUNDS,
  GenerateConfig,
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

type SuccessResponse = {
  script: string;
  metadata: {
    sense: Sense;
    languages: string[];
    durationSeconds: number;
    prompt: string;
    ttsProvider: string;
    voice: string;
  };
};

const ALLOWED_SENSES: Sense[] = ["calm", "energizing", "focus", "uplifting"];

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

  const config = validation.value;
  const prompt = buildPrompt(config);
  const pauseMarkerRegex = /\s*\[pause:(\d+(?:\.\d+)?)\]\s*/gi;

  try {
    const { script } = await generateScript({ prompt });
    console.info("AI-generated audio notice: This endpoint returns AI-generated speech.");
    const ttsResult = await synthesizeSpeech({
      script,
      language: config.languages[0],
      voice: config.voiceStyle,
    });

    const acceptHeader = request.headers.get("accept") ?? "";
    if (acceptHeader.includes("application/json")) {
      const displayScript = script.replace(pauseMarkerRegex, "\n\n").trim();
      const response: SuccessResponse = {
        script: displayScript,
        metadata: {
          sense: config.sense,
          languages: config.languages,
          durationSeconds: config.durationSeconds,
          prompt,
          ttsProvider: ttsResult.provider,
          voice: ttsResult.voice,
        },
      };
      return NextResponse.json(response);
    }

    return new Response(ttsResult.audio, {
      status: 200,
      headers: {
        "Content-Type": ttsResult.contentType,
        "Content-Disposition": "attachment; filename=\"pq-reps.wav\"",
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
