import { buildPrompt } from '../lib/promptBuilder.js';
import type { GenerateConfig } from '../lib/promptBuilder.js';
import type { PromptInputs } from './types.js';

export function buildUserPrompt(inputs: PromptInputs): string {
  const config: GenerateConfig = {
    languages: inputs.languages?.length ? inputs.languages : [inputs.language],
    practiceMode: inputs.practiceMode,
    bodyState: inputs.bodyState,
    eyeState: inputs.eyeState,
    primarySense: inputs.primarySense,
    durationMinutes: inputs.durationMinutes as GenerateConfig['durationMinutes'],
    labelingMode: inputs.labelingMode,
    silenceProfile: inputs.silenceProfile,
    normalizationFrequency: inputs.normalizationFrequency,
    closingStyle: inputs.closingStyle,
    senseRotation: inputs.senseRotation,
    scenarioId: inputs.scenarioId,
    audience: inputs.audience,
    voiceStyle: inputs.voiceStyle,
    customScenarioLine: inputs.customScenarioLine,
    ttsNewlinePauseSeconds: inputs.ttsNewlinePauseSeconds
  };

  return buildPrompt(config);
}
