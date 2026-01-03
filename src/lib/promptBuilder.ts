import { Duration, Eyes, Language, PromptConfig, Sense } from "./types";

export type Sense = "calm" | "energizing" | "focus" | "uplifting";

export type LegacyGenerateConfig = {
  sense: Sense;
  languages: string[];
  durationSeconds: number;
  audience?: string;
  topic?: string;
  voiceStyle?: string;
};

export type PracticeGenerateConfig = {
  practiceMode: string;
  bodyState: string;
  eyeState: string;
  primarySense: string;
  durationMinutes: number;
  labelingMode: string;
  silenceProfile: string;
  normalizationFrequency: string;
  closingStyle: string;
  senseRotation?: string;
  languages: string[];
  audience?: string;
  voiceStyle?: string;
};

export type GenerateConfig = LegacyGenerateConfig | PracticeGenerateConfig;

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
];

export const DURATION_BOUNDS = {
  minSeconds: 30,
  maxSeconds: 900,
};

export function buildPrompt(config: GenerateConfig): string {
  if ("practiceMode" in config || "durationMinutes" in config) {
    return [
      `Practice mode: ${config.practiceMode}.`,
      `Body state: ${config.bodyState}.`,
      `Eye state: ${config.eyeState}.`,
      `Primary sense: ${config.primarySense}.`,
      `Duration: ${config.durationMinutes} minutes.`,
      `Labeling mode: ${config.labelingMode}.`,
      `Silence profile: ${config.silenceProfile}.`,
      `Normalization frequency: ${config.normalizationFrequency}.`,
      `Closing style: ${config.closingStyle}.`,
      `Sense rotation: ${config.senseRotation ?? "none"}.`,
      `Language: ${config.languages.join(", ")}.`,
      config.audience ? `Audience: ${config.audience}.` : "Audience: general.",
      config.voiceStyle
        ? `Voice style preference: ${config.voiceStyle}. Use only if it does not conflict with tone rules.`
        : "No additional voice style preference provided.",
      "Use these inputs exactly. Do not invent additional modes, senses, or counts.",
    ].join("\n");
  }

  const {
    sense,
    languages,
    durationSeconds,
    audience,
    topic,
    voiceStyle,
  } = config;

  const durationRule =
    durationSeconds >= 300
      ? "You may mention exact rep counts if it helps pacing."
      : "Do not mention exact rep counts because the duration is under 5 minutes.";

  return [
    `Selected sense: ${sense}.`,
    `Target duration: ${durationSeconds} seconds.`,
    `Language: ${languages.join(", ")}.`,
    audience ? `Audience: ${audience}.` : "Audience: general.",
    topic
      ? `Topic: ${topic}. Keep it subtle and aligned with PQ Reps guidance.`
      : "No topic provided.",
    voiceStyle
      ? `Voice style preference: ${voiceStyle}. Use only if it does not conflict with tone rules.`
      : "No additional voice style preference provided.",
    durationRule,
    "If you include any movement guidance, include the required safety disclaimer.",
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
