import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SCRIPT_SYSTEM_PROMPT } from '../src/services/script.js';

export async function exportScriptSystemPrompt(outputPath: string): Promise<string> {
  const resolvedPath = resolve(outputPath);
  const promptText = Array.isArray(SCRIPT_SYSTEM_PROMPT)
    ? SCRIPT_SYSTEM_PROMPT.join('\n')
    : String(SCRIPT_SYSTEM_PROMPT);
  const payload = `${promptText}\n`;

  await writeFile(resolvedPath, payload, 'utf-8');
  return resolvedPath;
}
