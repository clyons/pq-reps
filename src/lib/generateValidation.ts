import {
  ALLOWED_DURATIONS,
  BodyState,
  ClosingStyle,
  GenerateConfig,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  SilenceProfile,
  SenseRotation,
  SUPPORTED_LANGUAGES,
} from "./promptBuilder";

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
    config: GenerateConfig;
    outputMode?: OutputMode;
    debugTtsPrompt?: boolean;
  };
} | {
  ok: false;
  error: ErrorResponse;
};

const DEFAULT_TTS_NEWLINE_PAUSE_SECONDS = 2;

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

const ALLOWED_EYE_STATES = ["closed", "open_focused", "open_diffused"] as const;

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

  const config = payload as Partial<GenerateConfig> & {
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

  if (
    (config.durationMinutes === 1 || config.durationMinutes === 2) &&
    config.silenceProfile === "extended_silence"
  ) {
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

  if (
    (config.durationMinutes === 1 || config.durationMinutes === 2) &&
    config.normalizationFrequency !== "once"
  ) {
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

  if (
    (config.durationMinutes === 1 || config.durationMinutes === 2) &&
    config.closingStyle !== "minimal"
  ) {
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
        audience: config.audience,
        voiceStyle: config.voiceStyle,
        ttsNewlinePauseSeconds:
          parsedNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
      },
      outputMode: config.outputMode,
      debugTtsPrompt: config.debugTtsPrompt ?? false,
    },
  };
}
