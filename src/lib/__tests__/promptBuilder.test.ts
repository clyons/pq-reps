import { describe, expect, it } from "vitest";

import { buildPromptOutline } from "../promptBuilder";
import { Eyes, Sense } from "../types";

const senses: Sense[] = ["sight", "sound", "touch", "smell", "taste"];
const eyesStates: Eyes[] = ["open", "closed", "soft"];

const outlineToText = (outline: ReturnType<typeof buildPromptOutline>) =>
  outline.sections.flatMap((section) => section.lines).join(" ");

describe("buildPromptOutline", () => {
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
