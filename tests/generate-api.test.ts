import assert from "node:assert/strict";
import test from "node:test";
import { buildPrompt } from "../src/lib/promptBuilder";
import { validateGenerateConfig } from "../src/lib/generateValidation";

const validPayload = {
  practiceType: "still_eyes_open",
  focus: "breath",
  durationMinutes: 5,
  language: "en",
  voiceGender: "female",
};

function assertConfigMapping(result: ReturnType<typeof validateGenerateConfig>) {
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected ok validation result.");
  }

  const { config } = result.value;
  assert.equal(config.practiceMode, "sitting");
  assert.equal(config.bodyState, "still_seated");
  assert.equal(config.eyeState, "open_diffused");
  assert.equal(config.primarySense, "breath");
  assert.equal(config.durationMinutes, validPayload.durationMinutes);
  assert.equal(config.labelingMode, "none");
  assert.equal(config.silenceProfile, "short_pauses");
  assert.equal(config.normalizationFrequency, "periodic");
  assert.equal(config.closingStyle, "pq_framed");
  assert.equal(config.senseRotation, "guided_rotation");
  assert.deepEqual(config.languages, ["en"]);
  assert.equal(config.voiceStyle, "alloy");

  const prompt = buildPrompt(config);
  assert.match(prompt, /Practice mode: sitting\./);
  assert.match(prompt, /Body state: still_seated\./);
  assert.match(prompt, /Eye state: open_diffused\./);
  assert.match(prompt, /Primary sense: breath\./);
  assert.match(prompt, /Duration: 5 minutes\./);
  assert.doesNotMatch(prompt, /undefined/);
}

test("generate validation preserves request fields", () => {
  const result = validateGenerateConfig(validPayload);
  assertConfigMapping(result);
});
