import { describe, expect, it } from "vitest";

import { buildPrompt } from "../promptBuilder.js";

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
