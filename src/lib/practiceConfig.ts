import {
  BodyState,
  ClosingStyle,
  DurationMinutes,
  EyeState,
  LabelingMode,
  NormalizationFrequency,
  PracticeMode,
  PracticeType,
  SenseRotation,
  SilenceProfile,
} from "./promptBuilder.js";

export type PracticeConfig = {
  practiceMode: PracticeMode;
  bodyState: BodyState;
  eyeState: EyeState;
  labelingMode: LabelingMode;
};

export type DurationConfig = {
  silenceProfile: SilenceProfile;
  normalizationFrequency: NormalizationFrequency;
  closingStyle: ClosingStyle;
};

export const derivePracticeConfig = (
  practiceType: PracticeType,
  durationMinutes: DurationMinutes,
): PracticeConfig => {
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

  if (practiceType === "labeling") {
    return {
      practiceMode: "labeling",
      bodyState: "still_seated_closed_eyes",
      eyeState: "closed",
      labelingMode: "breath_anchor",
    };
  }

  if (practiceType === "lying_eyes_closed") {
    return {
      practiceMode: "lying",
      bodyState: "lying",
      eyeState: "closed",
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
): DurationConfig => {
  if (durationMinutes === 1) {
    return {
      silenceProfile: "none",
      normalizationFrequency: "once",
      closingStyle: "minimal",
    };
  }
  if (durationMinutes === 2) {
    return {
      silenceProfile: "short_pauses",
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
