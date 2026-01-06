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
import { DEFAULT_LOCALE, type Locale, translate } from "./i18n";

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

const DEFAULT_TTS_NEWLINE_PAUSE_SECONDS = 1.5;

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

export function validateGenerateConfig(
  payload: unknown,
  locale: Locale = DEFAULT_LOCALE,
): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_payload",
          message: translate(locale, "errors.invalid_payload"),
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
          message: translate(locale, "errors.invalid_practice_mode"),
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
          message: translate(locale, "errors.invalid_body_state"),
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
          message: translate(locale, "errors.invalid_eye_state"),
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
          message: translate(locale, "errors.invalid_primary_sense"),
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
          message: translate(locale, "errors.invalid_duration"),
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
          message: translate(locale, "errors.invalid_labeling_mode"),
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
          message: translate(locale, "errors.invalid_silence_profile"),
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
          message: translate(locale, "errors.invalid_normalization_frequency"),
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
          message: translate(locale, "errors.invalid_closing_style"),
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
          message: translate(locale, "errors.invalid_sense_rotation"),
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
          message: translate(locale, "errors.invalid_tts_newline_pause"),
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
          message: translate(locale, "errors.invalid_languages"),
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
          message: translate(locale, "errors.unsupported_language"),
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
          message: translate(locale, "errors.moving_requires_body_state"),
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
          message: translate(locale, "errors.moving_requires_eyes_open"),
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
          message: translate(locale, "errors.tactile_requires_body_state"),
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
          message: translate(locale, "errors.tactile_requires_eyes_closed"),
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
          message: translate(locale, "errors.sitting_requires_eyes_open"),
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
          message: translate(locale, "errors.moving_body_requires_moving_practice"),
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
          message: translate(locale, "errors.label_with_anchor_requires_breath_anchor"),
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
          message: translate(locale, "errors.label_scan_requires_scan_label"),
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
          message: translate(locale, "errors.labeling_mode_must_be_none"),
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
          message: translate(locale, "errors.extended_silence_requires_longer"),
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
          message: translate(locale, "errors.short_sessions_require_once"),
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
          message: translate(locale, "errors.five_minute_requires_periodic"),
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
          message: translate(locale, "errors.twelve_minute_requires_repeated"),
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
          message: translate(locale, "errors.short_sessions_require_minimal_closing"),
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
          message: translate(locale, "errors.five_minute_requires_pq_framed"),
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
          message: translate(locale, "errors.twelve_minute_requires_progression"),
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
