#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SCRIPT_SYSTEM_PROMPT } from '../src/services/script.js';

const DEFAULT_OUTPUT_PATH = 'scripts/prompt-drift/system.txt';

interface CliOptions {
  outputPath: string;
}

function printHelp(): void {
  console.log(`\nExport script system prompt\n\n` +
    `Usage:\n` +
    `  node --import tsx scripts/export-script-system-prompt.ts [--out path/to/system.txt]\n\n` +
    `Defaults:\n` +
    `  --out ${DEFAULT_OUTPUT_PATH}\n`
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { outputPath: DEFAULT_OUTPUT_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
    const next = argv[i + 1];
    switch (arg) {
      case '--out':
        if (!next) {
          throw new Error('Missing value for --out.');
        }
        options.outputPath = next;
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = resolve(options.outputPath);
  const promptText = Array.isArray(SCRIPT_SYSTEM_PROMPT)
    ? SCRIPT_SYSTEM_PROMPT.join('\n')
    : String(SCRIPT_SYSTEM_PROMPT);
  const payload = `${promptText}\n`;

  try {
    await writeFile(outputPath, payload, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write system prompt to ${outputPath}: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
