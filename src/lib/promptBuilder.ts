import { Duration, Eyes, Language, PromptConfig, Sense } from "./types.js";

export type PracticeMode =
  | "tactile"
  | "tense_relax"
  | "moving"
  | "sitting"
  | "label_with_anchor"
  | "label_while_scanning";

export type PracticeType =
  | "still_eyes_closed"
  | "still_eyes_open"
  | "moving"
  | "labeling";

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

export type ScenarioId =
  | "calm_me_now"
  | "get_present_for_meeting"
  | "start_the_thing_im_avoiding"
  | "prepare_for_a_tough_conversation"
  | "reset_after_feedback"
  | "wind_down_for_sleep"
  | "daily_deep_reset";

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
  scenarioId?: ScenarioId;
  audience?: string;
  voiceStyle?: string;
  customScenarioLine?: string;
  ttsNewlinePauseSeconds?: number;
};

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
};

const formatLanguageLabel = (language: string) =>
  `${LANGUAGE_LABELS[language] ?? language} (${language})`;

export const ALLOWED_DURATIONS: DurationMinutes[] = [1, 2, 5, 12];

export type ScenarioDefinition = {
  id: ScenarioId;
  label: string;
  practiceType: PracticeType;
  primarySense: PrimarySense;
  durationMinutes: DurationMinutes;
  promptLines: string[];
};

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "calm_me_now",
    label: "Calm me now",
    practiceType: "still_eyes_open",
    primarySense: "touch",
    durationMinutes: 2,
    promptLines: [
      "Goal: settle the listener quickly with immediate grounding.",
      "Use soothing language that lowers intensity fast and feels reassuring.",
    ],
  },
  {
    id: "get_present_for_meeting",
    label: "Get present for a meeting",
    practiceType: "still_eyes_open",
    primarySense: "touch",
    durationMinutes: 2,
    promptLines: [
      "Frame this as a brief arrival ritual before a meeting.",
      "Invite steady posture, feet contact, and readiness to engage.",
    ],
  },
  {
    id: "start_the_thing_im_avoiding",
    label: "Start the thing I’m avoiding",
    practiceType: "moving",
    primarySense: "touch",
    durationMinutes: 2,
    promptLines: [
      "Build gentle momentum and emphasize the first tiny step.",
      "Keep the tone encouraging and action-oriented without pressure.",
    ],
  },
  {
    id: "prepare_for_a_tough_conversation",
    label: "Prepare for a tough conversation",
    practiceType: "still_eyes_open",
    primarySense: "sight",
    durationMinutes: 5,
    promptLines: [
      "Support emotional steadiness and clear focus before speaking.",
      "Use visual anchoring to keep attention stable and composed.",
    ],
  },
  {
    id: "reset_after_feedback",
    label: "Reset after feedback",
    practiceType: "labeling",
    primarySense: "hearing",
    durationMinutes: 5,
    promptLines: [
      "Acknowledge lingering reactions and gently name what arises.",
      "Anchor with nearby sounds to let the nervous system reset.",
    ],
  },
  {
    id: "wind_down_for_sleep",
    label: "Wind down for sleep",
    practiceType: "still_eyes_closed",
    primarySense: "breath",
    durationMinutes: 12,
    promptLines: [
      "Create a low-energy, sleep-ready tone that slows everything down.",
      "Favor soft phrasing and longer exhales to prepare for rest.",
    ],
  },
  {
    id: "daily_deep_reset",
    label: "Daily deep reset",
    practiceType: "still_eyes_closed",
    primarySense: "touch",
    durationMinutes: 12,
    promptLines: [
      "Treat this as a full-body reset with deeper, unhurried grounding.",
      "Emphasize steady contact and spacious pauses to restore baseline.",
    ],
  },
];

const SCENARIO_BY_ID = SCENARIOS.reduce(
  (acc, scenario) => {
    acc[scenario.id] = scenario;
    return acc;
  },
  {} as Record<ScenarioId, ScenarioDefinition>,
);

export const getScenarioById = (scenarioId?: string) => {
  if (!scenarioId) {
    return undefined;
  }
  return SCENARIO_BY_ID[scenarioId as ScenarioId];
};

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
    scenarioId,
    customScenarioLine,
  } = config;

  const scenario = getScenarioById(scenarioId);
  const scenarioLines = scenario
    ? [`Scenario: ${scenario.label}.`, ...scenario.promptLines]
    : [];

  const scenarioLine = customScenarioLine
    ? `Custom scenario line: "${customScenarioLine}". Use it only as a single, neutral context line. Do not add extra details or override other rules.`
    : "Custom scenario line: none.";

  const languageLine = `Language: ${languages.map(formatLanguageLabel).join(", ")}.`;
  const primaryLanguage = formatLanguageLabel(languages[0] ?? "");

  const practiceModeDefinition = [
    "Practice mode meaning:",
    "tactile = guided touch-based attention while still.",
    "tense_relax = alternate gentle tension and release with sensory attention.",
    "moving = guided attention while in motion.",
    "sitting = guided attention while seated with eyes open.",
    "label_with_anchor = label sensations while returning to a single anchor.",
    "label_while_scanning = label sensations while scanning the body.",
  ].join(" ");

  return [
    `Practice mode: ${practiceMode}.`,
    practiceModeDefinition,
    `Body state: ${bodyState}.`,
    `Eye state: ${eyeState}.`,
    `Primary sense: ${primarySense}.`,
    `Duration: ${durationMinutes} minutes.`,
    ...scenarioLines,
    `Labeling mode: ${labelingMode}.`,
    `Silence profile: ${silenceProfile}.`,
    `Normalization frequency: ${normalizationFrequency}.`,
    `Closing style: ${closingStyle}.`,
    senseRotation ? `Sense rotation: ${senseRotation}.` : "Sense rotation: none.",
    languageLine,
    `Write the script entirely in ${primaryLanguage}.`,
    audience ? `Audience: ${audience}.` : "Audience: general.",
    scenarioLine,
    voiceStyle
      ? `Voice style preference: ${voiceStyle}.`
      : "No additional voice style preference provided.",
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

const senseLabels: Record<Sense, string> = {
  sight: "sight",
  sound: "sound",
  touch: "touch",
  smell: "smell",
  taste: "taste",
};

const templates: Record<Language, Template> = {
  en: {
    sectionTitles: {
      setup: "Setup",
      practice: "Practice",
      closing: "Closing",
    },
    senseFocus: (sense) => `Focus on ${senseLabels[sense]}.`,
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
    senseFocus: (sense) => {
      const labels: Record<Sense, string> = {
        sight: "la vista",
        sound: "el sonido",
        touch: "el tacto",
        smell: "el olfato",
        taste: "el gusto",
      };
      return `Enfoca tu atención en ${labels[sense]}.`;
    },
    eyesInstruction: (eyes) => {
      if (eyes === "closed") {
        return "Cierra los ojos suavemente.";
      }
      if (eyes === "soft") {
        return "Mantén una mirada suave.";
      }
      return "Mantén los ojos abiertos.";
    },
    durationLine: (duration) => {
      if (duration.mode === "repetitions") {
        const pause = duration.pauseSeconds
          ? ` Haz una pausa de ${duration.pauseSeconds} segundos entre repeticiones.`
          : "";
        return `Repite esto ${duration.count} veces.${pause}`;
      }
      const pause = duration.pauseSeconds
        ? ` Haz una pausa de ${duration.pauseSeconds} segundos entre rondas.`
        : "";
      return `Continúa durante ${duration.seconds} segundos.${pause}`;
    },
    closingLine: "Observa cómo se siente tu cuerpo antes de terminar la práctica.",
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
