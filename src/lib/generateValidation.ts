import {
  ALLOWED_DURATIONS,
  SUPPORTED_LANGUAGES,
} from "./promptBuilder";
import {
  Focus,
  PracticeType,
  VoiceGender,
  deriveGenerateConfig,
} from "./deriveConfig";

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type OutputMode = "text" | "audio" | "text-audio";

type ValidationResult = {
  ok: true;
  value: {
    config: ReturnType<typeof deriveGenerateConfig>;
    outputMode?: OutputMode;
    debugTtsPrompt?: boolean;
  };
} | {
  ok: false;
  error: ErrorResponse;
};

const DEFAULT_TTS_NEWLINE_PAUSE_SECONDS = 1;

const ALLOWED_PRACTICE_TYPES: PracticeType[] = [
  "still_eyes_closed",
  "still_eyes_open",
  "moving",
  "labeling",
];

const ALLOWED_FOCUS: Focus[] = ["touch", "hearing", "sight", "breath"];

const ALLOWED_VOICE_GENDER: VoiceGender[] = ["female", "male"];

export function validateGenerateConfig(payload: unknown): ValidationResult {
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

  const config = payload as {
    practiceType?: PracticeType;
    focus?: Focus;
    durationMinutes?: number;
    language?: string;
    voiceGender?: VoiceGender;
    ttsNewlinePauseSeconds?: number | string;
    outputMode?: OutputMode;
    debugTtsPrompt?: boolean;
  };

  const newlinePauseSecondsValue = config.ttsNewlinePauseSeconds;
  const parsedNewlinePauseSeconds =
    typeof newlinePauseSecondsValue === "number"
      ? newlinePauseSecondsValue
      : typeof newlinePauseSecondsValue === "string" && newlinePauseSecondsValue.trim() !== ""
        ? Number.parseFloat(newlinePauseSecondsValue)
        : undefined;

  if (!config.practiceType || !ALLOWED_PRACTICE_TYPES.includes(config.practiceType)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_practice_type",
          message: "Practice type must be one of the supported values.",
          details: { allowed: ALLOWED_PRACTICE_TYPES },
        },
      },
    };
  }

  if (!config.focus || !ALLOWED_FOCUS.includes(config.focus)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_focus",
          message: "Focus must be one of the supported values.",
          details: { allowed: ALLOWED_FOCUS },
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

  if (!config.language || typeof config.language !== "string") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_language",
          message: "Language must be provided.",
        },
      },
    };
  }

  if (!SUPPORTED_LANGUAGES.includes(config.language)) {
    return {
      ok: false,
      error: {
        error: {
          code: "unsupported_language",
          message: "One or more languages are not supported.",
          details: { unsupported: [config.language], supported: SUPPORTED_LANGUAGES },
        },
      },
    };
  }

  if (!config.voiceGender || !ALLOWED_VOICE_GENDER.includes(config.voiceGender)) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_voice_gender",
          message: "Voice gender must be one of the supported values.",
          details: { allowed: ALLOWED_VOICE_GENDER },
        },
      },
    };
  }

  if (
    parsedNewlinePauseSeconds !== undefined &&
    (!Number.isFinite(parsedNewlinePauseSeconds) || parsedNewlinePauseSeconds < 0)
  ) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_tts_newline_pause",
          message: "TTS newline pause seconds must be a non-negative number.",
        },
      },
    };
  }


  return {
    ok: true,
    value: {
      config: deriveGenerateConfig({
        practiceType: config.practiceType,
        focus: config.focus,
        durationMinutes: config.durationMinutes,
        language: config.language,
        voiceGender: config.voiceGender,
        ttsNewlinePauseSeconds:
          parsedNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
      }),
      outputMode: config.outputMode,
      debugTtsPrompt: config.debugTtsPrompt ?? false,
    },
  };
}
