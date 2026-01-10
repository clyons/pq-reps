import assert from "node:assert/strict";
import test from "node:test";
import { buildPrompt } from "../src/lib/promptBuilder";
import { validateGenerateConfig } from "../src/lib/generateValidation";

const validPayload = {
  practiceMode: "sitting",
  bodyState: "still_seated",
  eyeState: "open_focused",
  primarySense: "breath",
  durationMinutes: 5,
  labelingMode: "none",
  silenceProfile: "short_pauses",
  normalizationFrequency: "periodic",
  closingStyle: "pq_framed",
  senseRotation: "guided_rotation",
  languages: ["en", "es"],
  audience: "busy professionals",
  voiceStyle: "sage",
  customScenarioLine: "A short, neutral line for a morning reset.",
};

function assertConfigMapping(result: ReturnType<typeof validateGenerateConfig>) {
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected ok validation result.");
  }

  const { config } = result.value;
  assert.equal(config.practiceMode, validPayload.practiceMode);
  assert.equal(config.bodyState, validPayload.bodyState);
  assert.equal(config.eyeState, validPayload.eyeState);
  assert.equal(config.primarySense, validPayload.primarySense);
  assert.equal(config.durationMinutes, validPayload.durationMinutes);
  assert.equal(config.labelingMode, validPayload.labelingMode);
  assert.equal(config.silenceProfile, validPayload.silenceProfile);
  assert.equal(config.normalizationFrequency, validPayload.normalizationFrequency);
  assert.equal(config.closingStyle, validPayload.closingStyle);
  assert.equal(config.senseRotation, validPayload.senseRotation);
  assert.deepEqual(config.languages, validPayload.languages);
  assert.equal(config.audience, validPayload.audience);
  assert.equal(config.voiceStyle, validPayload.voiceStyle);
  assert.equal(config.customScenarioLine, validPayload.customScenarioLine);

  const prompt = buildPrompt(config);
  assert.match(
    prompt,
    /Practice mode: guided attention while seated with eyes open\./,
  );
  assert.match(prompt, /Body state: seated and still with eyes open\./);
  assert.match(prompt, /Eye state: open_focused\./);
  assert.match(prompt, /Primary sense: breath\./);
  assert.match(prompt, /Duration: 5 minutes\./);
  assert.match(prompt, /Custom scenario line: "A short, neutral line for a morning reset\."/);
  assert.doesNotMatch(prompt, /undefined/);
}

test("generate validation preserves request fields", () => {
  const result = validateGenerateConfig(validPayload);
  assertConfigMapping(result);
});

test("generate validation rejects disallowed custom scenario content", () => {
  const result = validateGenerateConfig({
    ...validPayload,
    customScenarioLine: "Visit http://example.com",
  });
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("Expected invalid validation result.");
  }
  assert.equal(result.error.error.code, "custom_scenario_line_disallowed");
});
