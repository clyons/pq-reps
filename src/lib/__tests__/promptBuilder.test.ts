import { describe, expect, it } from "vitest";

import { buildPrompt, buildPromptOutline } from "../promptBuilder";
import { Eyes, Sense } from "../types";

const senses: Sense[] = ["sight", "sound", "touch", "smell", "taste"];
const eyesStates: Eyes[] = ["open", "closed", "soft"];

const outlineToText = (outline: ReturnType<typeof buildPromptOutline>) =>
  outline.sections.flatMap((section) => section.lines).join(" ");

describe("buildPromptOutline", () => {
  it("returns the expected section structure and lines", () => {
    const outline = buildPromptOutline({
      sense: "sight",
      eyes: "soft",
      duration: { mode: "timed", seconds: 120, pauseSeconds: 8 },
      language: "en",
    });

    expect(outline.sections).toHaveLength(3);
    expect(outline.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Practice",
      "Closing",
    ]);

    const [setup, practice, closing] = outline.sections;
    expect(setup.lines).toEqual([
      "Keep a soft gaze with your eyes.",
      "Focus on sight.",
    ]);
    expect(practice.lines).toEqual([
      "Continue for 120 seconds. Pause for 8 seconds between rounds.",
    ]);
    expect(closing.lines).toEqual([
      "Notice how your body feels before ending the practice.",
    ]);
  });

  it("includes duration details for repetition mode", () => {
    const outline = buildPromptOutline({
      sense: "sound",
      eyes: "open",
      duration: { mode: "repetitions", count: 3, pauseSeconds: 5 },
      language: "en",
    });

    expect(outlineToText(outline)).toContain("Repeat this 3 times.");
    expect(outlineToText(outline)).toContain("Pause for 5 seconds");
  });

  it("includes duration details for timed mode", () => {
    const outline = buildPromptOutline({
      sense: "touch",
      eyes: "closed",
      duration: { mode: "timed", seconds: 90 },
      language: "en",
    });

    expect(outlineToText(outline)).toContain("Continue for 90 seconds.");
  });

  it("uses localized section titles and phrasing for Spanish", () => {
    const outline = buildPromptOutline({
      sense: "smell",
      eyes: "closed",
      duration: { mode: "repetitions", count: 4, pauseSeconds: 6 },
      language: "es",
    });

    expect(outline.sections.map((section) => section.title)).toEqual([
      "Preparación",
      "Práctica",
      "Cierre",
    ]);

    const text = outlineToText(outline);
    expect(text).toContain("Cierra los ojos suavemente.");
    expect(text).toContain("Enfoca tu atención en el olfato.");
    expect(text).toContain("Repite esto 4 veces. Pausa 6 segundos");
    expect(text).toContain(
      "Nota cómo se siente tu cuerpo antes de terminar la práctica.",
    );
  });

  senses.forEach((sense) => {
    eyesStates.forEach((eyes) => {
      it(`covers sense ${sense} with eyes ${eyes}`, () => {
        const outline = buildPromptOutline({
          sense,
          eyes,
          duration: { mode: "repetitions", count: 2 },
          language: "en",
        });

        const text = outlineToText(outline);
        expect(text).toContain(`Focus on ${sense}.`);

        if (eyes === "closed") {
          expect(text).toContain("Gently close your eyes.");
        }

        if (eyes === "soft") {
          expect(text).toContain("Keep a soft gaze with your eyes.");
        }

        if (eyes === "open") {
          expect(text).toContain("Keep your eyes open.");
        }
      });
    });
  });
});

describe("buildPrompt duration guidance", () => {
  const baseConfig = {
    languages: ["en"],
    practiceMode: "tactile" as const,
    bodyState: "still_seated_closed_eyes" as const,
    eyeState: "closed" as const,
    primarySense: "touch" as const,
    labelingMode: "none" as const,
    silenceProfile: "none" as const,
    normalizationFrequency: "once" as const,
    closingStyle: "minimal" as const,
  };

  it("adds concise pacing guidance for 1-minute sessions", () => {
    const prompt = buildPrompt({
      ...baseConfig,
      durationMinutes: 1,
    });

    expect(prompt).toContain("Pacing for 1 minute: use 2-3 short instruction beats");
    expect(prompt).toContain("pause cues should be 3-5 seconds max");
  });

  it("adds pacing arc guidance for 12-minute sessions", () => {
    const prompt = buildPrompt({
      ...baseConfig,
      durationMinutes: 12,
    });

    expect(prompt).toContain("Pacing for 12 minutes: build a clear arc");
    expect(prompt).toContain("checkpoints or gentle resets every 2-3 minutes");
    expect(prompt).toContain("extended silences (15-30 seconds)");
  });

  it("includes scenario-specific prompt guidance when provided", () => {
    const prompt = buildPrompt({
      ...baseConfig,
      durationMinutes: 1,
      scenarioId: "calm_me_now",
    });

    expect(prompt).toContain("Scenario: Calm me now.");
    expect(prompt).toContain("Goal: settle the listener quickly with immediate grounding.");
  });
});
