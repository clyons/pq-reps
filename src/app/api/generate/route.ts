import { NextResponse } from "next/server";
import {
  ALLOWED_DURATIONS,
  buildPrompt,
  BodyState,
  ClosingStyle,
  DurationMinutes,
  EyeState,
  GenerateConfig,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  SilenceProfile,
  SenseRotation,
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

const ALLOWED_PRACTICE_MODES: PracticeMode[] = [
  "tactile",
  "tense_relax",
  "moving",
  "sitting",
  "label_with_anchor",
  "label_while_scanning",
];

const ALLOWED_BODY_STATES: BodyState[] = [
  "still_seated",
  "still_seated_closed_eyes",
  "moving",
];

const ALLOWED_EYE_STATES: EyeState[] = ["closed", "open_focused", "open_diffused"];

const ALLOWED_PRIMARY_SENSES: PrimarySense[] = [
  "touch",
  "hearing",
  "sight",
  "breath",
  "body_weight",
  "smell",
  "taste",
];

const ALLOWED_LABELING_MODES: LabelingMode[] = [
  "none",
  "breath_anchor",
  "scan_and_label",
];

const ALLOWED_SILENCE_PROFILES: SilenceProfile[] = [
  "none",
  "short_pauses",
  "extended_silence",
];

const ALLOWED_NORMALIZATION_FREQUENCY: NormalizationFrequency[] = [
  "once",
  "periodic",
  "repeated",
];

const ALLOWED_CLOSING_STYLES: ClosingStyle[] = [
  "minimal",
  "pq_framed",
  "pq_framed_with_progression",
];

const ALLOWED_SENSE_ROTATIONS: SenseRotation[] = [
  "none",
  "guided_rotation",
  "free_choice",
];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
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

  const config = payload as Partial<GenerateConfig> & { outputMode?: OutputMode };

  if (!config.practiceMode || !ALLOWED_PRACTICE_MODES.includes(config.practiceMode)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_practice_mode",
          message: "Practice mode must be one of the supported values.",
          details: { allowed: ALLOWED_PRACTICE_MODES },
        },
      },
    };
  }

  if (!config.bodyState || !ALLOWED_BODY_STATES.includes(config.bodyState)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_body_state",
          message: "Body state must be one of the supported values.",
          details: { allowed: ALLOWED_BODY_STATES },
        },
      },
    };
  }

  if (!config.eyeState || !ALLOWED_EYE_STATES.includes(config.eyeState)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_eye_state",
          message: "Eye state must be one of the supported values.",
          details: { allowed: ALLOWED_EYE_STATES },
        },
      },
    };
  }

  if (!config.primarySense || !ALLOWED_PRIMARY_SENSES.includes(config.primarySense)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_primary_sense",
          message: "Primary sense must be one of the supported values.",
          details: { allowed: ALLOWED_PRIMARY_SENSES },
        },
      },
    };
  }

  if (!config.durationMinutes || !ALLOWED_DURATIONS.includes(config.durationMinutes)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_duration",
          message: "Duration must be one of the supported minute values.",
          details: { allowed: ALLOWED_DURATIONS },
        },
      },
    };
  }

  if (!config.labelingMode || !ALLOWED_LABELING_MODES.includes(config.labelingMode)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_labeling_mode",
          message: "Labeling mode must be one of the supported values.",
          details: { allowed: ALLOWED_LABELING_MODES },
        },
      },
    };
  }

  if (!config.silenceProfile || !ALLOWED_SILENCE_PROFILES.includes(config.silenceProfile)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_silence_profile",
          message: "Silence profile must be one of the supported values.",
          details: { allowed: ALLOWED_SILENCE_PROFILES },
        },
      },
    };
  }

  if (
    !config.normalizationFrequency ||
    !ALLOWED_NORMALIZATION_FREQUENCY.includes(config.normalizationFrequency)
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_normalization_frequency",
          message: "Normalization frequency must be one of the supported values.",
          details: { allowed: ALLOWED_NORMALIZATION_FREQUENCY },
        },
      },
    };
  }

  if (!config.closingStyle || !ALLOWED_CLOSING_STYLES.includes(config.closingStyle)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_closing_style",
          message: "Closing style must be one of the supported values.",
          details: { allowed: ALLOWED_CLOSING_STYLES },
        },
      },
    };
  }

  if (config.senseRotation && !ALLOWED_SENSE_ROTATIONS.includes(config.senseRotation)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_sense_rotation",
          message: "Sense rotation must be one of the supported values.",
          details: { allowed: ALLOWED_SENSE_ROTATIONS },
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

  if (config.practiceMode === "moving") {
    if (config.bodyState !== "moving") {
      return {
        ok: false,
        error: {
          error: {
            code: "invalid_body_state",
            message: "Moving practice mode requires a moving body state.",
          },
        },
      };
    }
    if (config.eyeState === "closed") {
      return {
        ok: false,
        error: {
          error: {
            code: "invalid_eye_state",
            message: "Moving practice mode requires eyes open.",
          },
        },
      };
    }
  }

  if (config.practiceMode === "tactile") {
    if (config.bodyState !== "still_seated_closed_eyes") {
      return {
        ok: false,
        error: {
          error: {
            code: "invalid_body_state",
            message: "Tactile practice mode requires still seated with eyes closed.",
          },
        },
      };
    }
    if (config.eyeState !== "closed") {
      return {
        ok: false,
        error: {
          error: {
            code: "invalid_eye_state",
            message: "Tactile practice mode requires eyes closed.",
          },
        },
      };
    }
  }

  if (config.practiceMode === "sitting" && config.eyeState === "closed") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_eye_state",
          message: "Sitting practice mode requires eyes open.",
        },
      },
    };
  }

  if (config.bodyState === "moving" && config.practiceMode !== "moving") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_practice_mode",
          message: "Moving body state requires moving practice mode.",
        },
      },
    };
  }

  if (
    config.practiceMode === "label_with_anchor" &&
    config.labelingMode !== "breath_anchor"
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_labeling_mode",
          message: "Label with anchor mode requires breath anchor labeling.",
        },
      },
    };
  }

  if (
    config.practiceMode === "label_while_scanning" &&
    config.labelingMode !== "scan_and_label"
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_labeling_mode",
          message: "Label while scanning mode requires scan and label.",
        },
      },
    };
  }

  if (
    config.practiceMode !== "label_with_anchor" &&
    config.practiceMode !== "label_while_scanning" &&
    config.labelingMode !== "none"
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_labeling_mode",
          message: "Labeling mode must be none for non-label practice modes.",
        },
      },
    };
  }

  if (config.durationMinutes === 2 && config.silenceProfile === "extended_silence") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_silence_profile",
          message: "Extended silence is only allowed for 5 or 12 minute sessions.",
        },
      },
    };
  }

  if (config.durationMinutes === 2 && config.normalizationFrequency !== "once") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_normalization_frequency",
          message: "Short sessions require normalization frequency of once.",
        },
      },
    };
  }

  if (config.durationMinutes === 5 && config.normalizationFrequency !== "periodic") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_normalization_frequency",
          message: "5-minute sessions require periodic normalization.",
        },
      },
    };
  }

  if (config.durationMinutes === 12 && config.normalizationFrequency !== "repeated") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_normalization_frequency",
          message: "12-minute sessions require repeated normalization.",
        },
      },
    };
  }

  if (config.durationMinutes === 2 && config.closingStyle !== "minimal") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_closing_style",
          message: "2-minute sessions require minimal closing style.",
        },
      },
    };
  }

  if (config.durationMinutes === 5 && config.closingStyle !== "pq_framed") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_closing_style",
          message: "5-minute sessions require PQ-framed closing style.",
        },
      },
    };
  }

  if (
    config.durationMinutes === 12 &&
    config.closingStyle !== "pq_framed_with_progression"
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_closing_style",
          message: "12-minute sessions require PQ framing with progression.",
        },
      },
    };
  }

  return {
    ok: true,
    value: {
      config: {
        languages: config.languages,
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
        audience: config.audience,
        voiceStyle: config.voiceStyle,
      },
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
  const pauseMarkerRegex = /\s*\[pause:(\d+(?:\.\d+)?)\]\s*/gi;
  const acceptHeader = request.headers.get("accept") ?? "";
  const outputMode: OutputMode =
    requestedMode ?? (acceptHeader.includes("application/json") ? "text" : "audio");

  try {
    const { script } = await generateScript({ prompt });
    if (outputMode === "text") {
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

    if (acceptHeader.includes("application/json")) {
      const displayScript = script.replace(pauseMarkerRegex, "\n\n").trim();
      const response: SuccessResponse = {
        script: displayScript,
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

      if (outputMode === "text-audio") {
        return NextResponse.json({
          ...response,
          audioBase64: ttsResult.audio.toString("base64"),
          audioContentType: ttsResult.contentType,
        });
      }

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
