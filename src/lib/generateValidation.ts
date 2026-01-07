import {
  ALLOWED_DURATIONS,
  BodyState,
  ClosingStyle,
  GenerateConfig,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  ScenarioId,
  SilenceProfile,
  SenseRotation,
  SUPPORTED_LANGUAGES,
  getScenarioById,
} from "./promptBuilder";
import {
  deriveDurationConfig,
  derivePracticeConfig,
  deriveSenseRotation,
} from "./practiceConfig";
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
    scenarioId?: ScenarioId;
  };

  const newlinePauseSecondsValue = config.ttsNewlinePauseSeconds;
  const parsedNewlinePauseSeconds =
    typeof newlinePauseSecondsValue === "number"
      ? newlinePauseSecondsValue
      : typeof newlinePauseSecondsValue === "string" && newlinePauseSecondsValue.trim() !== ""
        ? Number.parseFloat(newlinePauseSecondsValue)
        : undefined;

  const scenario = config.scenarioId ? getScenarioById(config.scenarioId) : undefined;
  if (config.scenarioId && !scenario) {
    return {
      ok: false,
      error: {
        error: {
          code: "invalid_scenario",
          message: translate(locale, "errors.invalid_scenario"),
        },
      },
    };
  }

  const scenarioPracticeConfig = scenario
    ? derivePracticeConfig(scenario.practiceType, scenario.durationMinutes)
    : undefined;
  const scenarioDurationConfig = scenario
    ? deriveDurationConfig(scenario.durationMinutes)
    : undefined;
  const scenarioSenseRotation = scenario
    ? deriveSenseRotation(scenario.practiceType, scenario.durationMinutes)
    : undefined;

  const resolvedConfig = {
    ...config,
    practiceMode: scenarioPracticeConfig?.practiceMode ?? config.practiceMode,
    bodyState: scenarioPracticeConfig?.bodyState ?? config.bodyState,
    eyeState: scenarioPracticeConfig?.eyeState ?? config.eyeState,
    primarySense: scenario?.primarySense ?? config.primarySense,
    durationMinutes: scenario?.durationMinutes ?? config.durationMinutes,
    labelingMode: scenarioPracticeConfig?.labelingMode ?? config.labelingMode,
    silenceProfile: scenarioDurationConfig?.silenceProfile ?? config.silenceProfile,
    normalizationFrequency:
      scenarioDurationConfig?.normalizationFrequency ?? config.normalizationFrequency,
    closingStyle: scenarioDurationConfig?.closingStyle ?? config.closingStyle,
    senseRotation: scenarioSenseRotation ?? config.senseRotation,
  } as Partial<GenerateConfig> & { scenarioId?: ScenarioId };

  if (
    !resolvedConfig.practiceMode ||
    !ALLOWED_PRACTICE_MODES.includes(resolvedConfig.practiceMode)
  ) {
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

  if (!resolvedConfig.bodyState || !ALLOWED_BODY_STATES.includes(resolvedConfig.bodyState)) {
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

  if (!resolvedConfig.eyeState || !ALLOWED_EYE_STATES.includes(resolvedConfig.eyeState)) {
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

  if (
    !resolvedConfig.primarySense ||
    !ALLOWED_PRIMARY_SENSES.includes(resolvedConfig.primarySense)
  ) {
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

  if (
    !resolvedConfig.durationMinutes ||
    !ALLOWED_DURATIONS.includes(resolvedConfig.durationMinutes)
  ) {
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

  if (
    !resolvedConfig.labelingMode ||
    !ALLOWED_LABELING_MODES.includes(resolvedConfig.labelingMode)
  ) {
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

  if (
    !resolvedConfig.silenceProfile ||
    !ALLOWED_SILENCE_PROFILES.includes(resolvedConfig.silenceProfile)
  ) {
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
    !resolvedConfig.normalizationFrequency ||
    !ALLOWED_NORMALIZATION_FREQUENCY.includes(resolvedConfig.normalizationFrequency)
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

  if (
    !resolvedConfig.closingStyle ||
    !ALLOWED_CLOSING_STYLES.includes(resolvedConfig.closingStyle)
  ) {
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

  if (
    resolvedConfig.senseRotation &&
    !ALLOWED_SENSE_ROTATIONS.includes(resolvedConfig.senseRotation)
  ) {
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

  if (!isStringArray(resolvedConfig.languages) || resolvedConfig.languages.length === 0) {
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

  const unsupported = resolvedConfig.languages.filter(
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

  if (resolvedConfig.practiceMode === "moving") {
    if (resolvedConfig.bodyState !== "moving") {
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
  if (resolvedConfig.eyeState === "closed") {
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

  if (resolvedConfig.practiceMode === "tactile") {
    if (resolvedConfig.bodyState !== "still_seated_closed_eyes") {
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
  if (resolvedConfig.eyeState !== "closed") {
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

  if (resolvedConfig.practiceMode === "sitting" && resolvedConfig.eyeState === "closed") {
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

  if (resolvedConfig.bodyState === "moving" && resolvedConfig.practiceMode !== "moving") {
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
    resolvedConfig.practiceMode === "label_with_anchor" &&
    resolvedConfig.labelingMode !== "breath_anchor"
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
    resolvedConfig.practiceMode === "label_while_scanning" &&
    resolvedConfig.labelingMode !== "scan_and_label"
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
    resolvedConfig.practiceMode !== "label_with_anchor" &&
    resolvedConfig.practiceMode !== "label_while_scanning" &&
    resolvedConfig.labelingMode !== "none"
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
    (resolvedConfig.durationMinutes === 1 || resolvedConfig.durationMinutes === 2) &&
    resolvedConfig.silenceProfile === "extended_silence"
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
    (resolvedConfig.durationMinutes === 1 || resolvedConfig.durationMinutes === 2) &&
    resolvedConfig.normalizationFrequency !== "once"
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

  if (
    resolvedConfig.durationMinutes === 5 &&
    resolvedConfig.normalizationFrequency !== "periodic"
  ) {
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

  if (
    resolvedConfig.durationMinutes === 12 &&
    resolvedConfig.normalizationFrequency !== "repeated"
  ) {
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
    (resolvedConfig.durationMinutes === 1 || resolvedConfig.durationMinutes === 2) &&
    resolvedConfig.closingStyle !== "minimal"
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

  if (resolvedConfig.durationMinutes === 5 && resolvedConfig.closingStyle !== "pq_framed") {
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
    resolvedConfig.durationMinutes === 12 &&
    resolvedConfig.closingStyle !== "pq_framed_with_progression"
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
        practiceMode: resolvedConfig.practiceMode,
        bodyState: resolvedConfig.bodyState,
        eyeState: resolvedConfig.eyeState,
        primarySense: resolvedConfig.primarySense,
        durationMinutes: resolvedConfig.durationMinutes,
        labelingMode: resolvedConfig.labelingMode,
        silenceProfile: resolvedConfig.silenceProfile,
        normalizationFrequency: resolvedConfig.normalizationFrequency,
        closingStyle: resolvedConfig.closingStyle,
        senseRotation: resolvedConfig.senseRotation,
        scenarioId: resolvedConfig.scenarioId,
        languages: resolvedConfig.languages,
        audience: resolvedConfig.audience,
        voiceStyle: resolvedConfig.voiceStyle,
        ttsNewlinePauseSeconds:
          parsedNewlinePauseSeconds ?? DEFAULT_TTS_NEWLINE_PAUSE_SECONDS,
      },
      outputMode: config.outputMode,
      debugTtsPrompt: config.debugTtsPrompt ?? false,
    },
  };
}
