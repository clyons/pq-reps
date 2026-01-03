export type Sense = "calm" | "energizing" | "focus" | "uplifting";

export type GenerateConfig = {
  sense: Sense;
  languages: string[];
  durationSeconds: number;
  audience?: string;
  topic?: string;
  voiceStyle?: string;
};

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ja",
  "ko",
  "zh",
];

export const DURATION_BOUNDS = {
  minSeconds: 30,
  maxSeconds: 900,
};

export function buildPrompt(config: GenerateConfig): string {
  const {
    sense,
    languages,
    durationSeconds,
    audience,
    topic,
    voiceStyle,
  } = config;

  return [
    "You are a creative narrator for short-form audio scripts.",
    `Sense: ${sense}.`,
    `Languages: ${languages.join(", ")}.`,
    `Target duration: ${durationSeconds} seconds.`,
    audience ? `Audience: ${audience}.` : "Audience: general.",
    topic ? `Topic: ${topic}.` : "Topic: motivational prompt.",
    voiceStyle ? `Voice style: ${voiceStyle}.` : "Voice style: warm and natural.",
    "Structure: hook, body, and closing CTA.",
    "Keep pacing aligned with target duration.",
  ].join(" ");
}
