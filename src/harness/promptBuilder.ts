import type { PromptInputs } from './types.js';

export function buildUserPrompt(inputs: PromptInputs): string {
  return [
    'Generate a mental fitness script using the following inputs.',
    `Practice mode: ${inputs.practiceMode}.`,
    `Body state: ${inputs.bodyState}.`,
    `Eye state: ${inputs.eyeState}.`,
    `Primary sense: ${inputs.primarySense}.`,
    `Duration: ${inputs.durationMinutes} minutes.`,
    `Labeling mode: ${inputs.labelingMode}.`,
    `Silence profile: ${inputs.silenceProfile}.`,
    `Normalization frequency: ${inputs.normalizationFrequency}.`,
    `Closing style: ${inputs.closingStyle}.`,
    `Sense rotation: ${inputs.senseRotation}.`,
    `Language: ${inputs.language}.`,
    'Return only the script text with no extra commentary.'
  ].join('\n');
}
