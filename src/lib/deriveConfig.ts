import {
  BodyState,
  ClosingStyle,
  DurationMinutes,
  GenerateConfig,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PrimarySense,
  SenseRotation,
  SilenceProfile,
} from "./promptBuilder";

export type PracticeType = "still_eyes_closed" | "still_eyes_open" | "moving" | "labeling";

export type Focus = "touch" | "hearing" | "sight" | "breath";

export type VoiceGender = "female" | "male";

const FEMALE_VOICES_BY_LANGUAGE: Record<string, string> = {
  es: "nova",
  fr: "nova",
};

const MALE_VOICES_BY_LANGUAGE: Record<string, string> = {
  es: "onyx",
  fr: "onyx",
};

export const resolveVoiceStyle = (gender: VoiceGender, language: string) => {
  if (gender === "male") {
    return MALE_VOICES_BY_LANGUAGE[language] ?? "ash";
  }
  return FEMALE_VOICES_BY_LANGUAGE[language] ?? "alloy";
};

export const derivePracticeConfig = (
  practiceType: PracticeType,
  durationMinutes: DurationMinutes,
): {
  practiceMode: PracticeMode;
  bodyState: BodyState;
  eyeState: "closed" | "open_focused" | "open_diffused";
  labelingMode: LabelingMode;
} => {
  if (practiceType === "still_eyes_closed") {
    return {
      practiceMode: "tactile",
      bodyState: "still_seated_closed_eyes",
      eyeState: "closed",
      labelingMode: "none",
    };
  }

  if (practiceType === "still_eyes_open") {
    return {
      practiceMode: "sitting",
      bodyState: "still_seated",
      eyeState: "open_diffused",
      labelingMode: "none",
    };
  }

  if (practiceType === "moving") {
    return {
      practiceMode: "moving",
      bodyState: "moving",
      eyeState: "open_focused",
      labelingMode: "none",
    };
  }

  const labelingMode = durationMinutes < 5 ? "breath_anchor" : "scan_and_label";
  return {
    practiceMode: durationMinutes < 5 ? "label_with_anchor" : "label_while_scanning",
    bodyState: "still_seated_closed_eyes",
    eyeState: "closed",
    labelingMode,
  };
};

export const deriveDurationConfig = (
  durationMinutes: DurationMinutes,
): {
  silenceProfile: SilenceProfile;
  normalizationFrequency: NormalizationFrequency;
  closingStyle: ClosingStyle;
} => {
  if (durationMinutes === 1 || durationMinutes === 2) {
    return {
      silenceProfile: "none",
      normalizationFrequency: "once",
      closingStyle: "minimal",
    };
  }
  if (durationMinutes === 5) {
    return {
      silenceProfile: "short_pauses",
      normalizationFrequency: "periodic",
      closingStyle: "pq_framed",
    };
  }
  return {
    silenceProfile: "extended_silence",
    normalizationFrequency: "repeated",
    closingStyle: "pq_framed_with_progression",
  };
};

export const deriveSenseRotation = (
  practiceType: PracticeType,
  durationMinutes: DurationMinutes,
): SenseRotation => {
  if (durationMinutes >= 5 && practiceType !== "labeling") {
    return "guided_rotation";
  }
  return "none";
};

export const derivePrimarySense = (focus: Focus, eyeState: "closed" | "open_focused" | "open_diffused"): PrimarySense => {
  if (focus === "sight" && eyeState === "closed") {
    return "touch";
  }
  return focus;
};

export const deriveGenerateConfig = ({
  practiceType,
  focus,
  durationMinutes,
  language,
  voiceGender,
  ttsNewlinePauseSeconds,
}: {
  practiceType: PracticeType;
  focus: Focus;
  durationMinutes: DurationMinutes;
  language: string;
  voiceGender: VoiceGender;
  ttsNewlinePauseSeconds?: number;
}): GenerateConfig => {
  const practiceConfig = derivePracticeConfig(practiceType, durationMinutes);
  const durationConfig = deriveDurationConfig(durationMinutes);
  const primarySense = derivePrimarySense(focus, practiceConfig.eyeState);
  const senseRotation = deriveSenseRotation(practiceType, durationMinutes);

  return {
    practiceMode: practiceConfig.practiceMode,
    bodyState: practiceConfig.bodyState,
    eyeState: practiceConfig.eyeState,
    labelingMode: practiceConfig.labelingMode,
    durationMinutes,
    primarySense,
    silenceProfile: durationConfig.silenceProfile,
    normalizationFrequency: durationConfig.normalizationFrequency,
    closingStyle: durationConfig.closingStyle,
    senseRotation,
    languages: [language],
    voiceStyle: resolveVoiceStyle(voiceGender, language),
    ttsNewlinePauseSeconds,
  };
};
