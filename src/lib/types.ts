export type Sense = "sight" | "sound" | "touch" | "smell" | "taste";

export type Eyes = "open" | "closed" | "soft";

export type Language = "en" | "es";

export type Duration =
  | {
      mode: "repetitions";
      count: number;
      pauseSeconds?: number;
    }
  | {
      mode: "timed";
      seconds: number;
      pauseSeconds?: number;
    };

export interface PromptConfig {
  sense: Sense;
  eyes: Eyes;
  duration: Duration;
  language: Language;
}
