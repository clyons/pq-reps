import { Duration, Eyes, Language, PromptConfig, Sense } from "./types";

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
