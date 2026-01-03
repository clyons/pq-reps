import { Duration, Eyes, Language, PromptConfig, Sense } from "./types";

export type PracticeMode =
  | "tactile"
  | "tense_relax"
  | "moving"
  | "sitting"
  | "label_with_anchor"
  | "label_while_scanning";

export type BodyState =
  | "still_seated"
  | "still_seated_closed_eyes"
  | "moving";

export type EyeState = "closed" | "open_focused" | "open_diffused";

export type PrimarySense =
  | "touch"
  | "hearing"
  | "sight"
  | "breath"
  | "body_weight"
  | "smell"
  | "taste";

export type SenseRotation = "none" | "guided_rotation" | "free_choice";

export type LabelingMode = "none" | "breath_anchor" | "scan_and_label";

export type DurationMinutes = 1 | 2 | 5 | 12;

export type SilenceProfile = "none" | "short_pauses" | "extended_silence";

export type NormalizationFrequency = "once" | "periodic" | "repeated";

export type ClosingStyle =
  | "minimal"
  | "pq_framed"
  | "pq_framed_with_progression";

export type GenerateConfig = {
  languages: string[];
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
  audience?: string;
  voiceStyle?: string;
  ttsNewlinePauseSeconds?: number;
};

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
];

export const ALLOWED_DURATIONS: DurationMinutes[] = [1, 2, 5, 12];

export function buildPrompt(config: GenerateConfig): string {
  const {
    languages,
    practiceMode,
    bodyState,
    eyeState,
    primarySense,
    durationMinutes,
    labelingMode,
    silenceProfile,
    normalizationFrequency,
    closingStyle,
    senseRotation,
    audience,
    voiceStyle,
  } = config;

  const durationSeconds = durationMinutes * 60;
  const durationRule =
    durationSeconds >= 300
      ? "You may mention exact rep counts if it helps pacing."
      : "Do not mention exact rep counts because the duration is under 5 minutes.";

  return [
    `Practice mode: ${practiceMode}.`,
    `Body state: ${bodyState}.`,
    `Eye state: ${eyeState}.`,
    `Primary sense: ${primarySense}.`,
    `Duration: ${durationMinutes} minutes.`,
    `Labeling mode: ${labelingMode}.`,
    `Silence profile: ${silenceProfile}.`,
    `Normalization frequency: ${normalizationFrequency}.`,
    `Closing style: ${closingStyle}.`,
    senseRotation ? `Sense rotation: ${senseRotation}.` : "Sense rotation: none.",
    `Language: ${languages.join(", ")}.`,
    audience ? `Audience: ${audience}.` : "Audience: general.",
    voiceStyle
      ? `Voice style preference: ${voiceStyle}. Use only if it does not conflict with tone rules.`
      : "No additional voice style preference provided.",
    "Use these inputs exactly. Do not invent additional modes, senses, or counts.",
  ].join("\n");
}

export interface PromptSection {
  title: string;
  lines: string[];
}

export interface PromptOutline {
  language: Language;
  sections: PromptSection[];
}

type Template = {
  sectionTitles: {
    setup: string;
    practice: string;
    closing: string;
  };
  senseFocus: (sense: Sense) => string;
  eyesInstruction: (eyes: Eyes) => string;
  durationLine: (duration: Duration) => string;
  closingLine: string;
};

const senseLabels: Record<Language, Record<Sense, string>> = {
  en: {
    sight: "sight",
    sound: "sound",
    touch: "touch",
    smell: "smell",
    taste: "taste",
  },
  es: {
    sight: "la vista",
    sound: "el sonido",
    touch: "el tacto",
    smell: "el olfato",
    taste: "el gusto",
  },
};

const templates: Record<Language, Template> = {
  en: {
    sectionTitles: {
      setup: "Setup",
      practice: "Practice",
      closing: "Closing",
    },
    senseFocus: (sense) => `Focus on ${senseLabels.en[sense]}.`,
    eyesInstruction: (eyes) => {
      if (eyes === "closed") {
        return "Gently close your eyes.";
      }
      if (eyes === "soft") {
        return "Keep a soft gaze with your eyes.";
      }
      return "Keep your eyes open.";
    },
    durationLine: (duration) => {
      if (duration.mode === "repetitions") {
        const pause = duration.pauseSeconds
          ? ` Pause for ${duration.pauseSeconds} seconds between repetitions.`
          : "";
        return `Repeat this ${duration.count} times.${pause}`;
      }
      const pause = duration.pauseSeconds
        ? ` Pause for ${duration.pauseSeconds} seconds between rounds.`
        : "";
      return `Continue for ${duration.seconds} seconds.${pause}`;
    },
    closingLine: "Notice how your body feels before ending the practice.",
  },
  es: {
    sectionTitles: {
      setup: "Preparación",
      practice: "Práctica",
      closing: "Cierre",
    },
    senseFocus: (sense) => `Enfoca tu atención en ${senseLabels.es[sense]}.`,
    eyesInstruction: (eyes) => {
      if (eyes === "closed") {
        return "Cierra los ojos suavemente.";
      }
      if (eyes === "soft") {
        return "Mantén una mirada suave con los ojos.";
      }
      return "Mantén los ojos abiertos.";
    },
    durationLine: (duration) => {
      if (duration.mode === "repetitions") {
        const pause = duration.pauseSeconds
          ? ` Pausa ${duration.pauseSeconds} segundos entre repeticiones.`
          : "";
        return `Repite esto ${duration.count} veces.${pause}`;
      }
      const pause = duration.pauseSeconds
        ? ` Pausa ${duration.pauseSeconds} segundos entre rondas.`
        : "";
      return `Continúa por ${duration.seconds} segundos.${pause}`;
    },
    closingLine: "Nota cómo se siente tu cuerpo antes de terminar la práctica.",
  },
};

export const buildPromptOutline = (config: PromptConfig): PromptOutline => {
  const template = templates[config.language];

  return {
    language: config.language,
    sections: [
      {
        title: template.sectionTitles.setup,
        lines: [
          template.eyesInstruction(config.eyes),
          template.senseFocus(config.sense),
        ],
      },
      {
        title: template.sectionTitles.practice,
        lines: [template.durationLine(config.duration)],
      },
      {
        title: template.sectionTitles.closing,
        lines: [template.closingLine],
      },
    ],
  };
};
