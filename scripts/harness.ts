#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildUserPrompt } from '../src/harness/promptBuilder.js';
import { OpenAIProvider, MockProvider } from '../src/harness/providers.js';
import { writeReports } from '../src/harness/reportWriter.js';
import { parseSimpleYaml } from '../src/harness/yaml.js';
import { validateScript } from '../src/harness/validator.js';
import type {
  CaseResult,
  PromptInputs,
  ReportPayload,
  RuleConfig,
  TestCase,
  TestCaseFile
} from '../src/harness/types.js';

interface CliOptions {
  systemPromptPath: string;
  casesPath: string;
  outputDir: string;
  model?: string;
  provider: 'mock' | 'openai';
  temperature?: number;
  rulesPath: string;
}

const DEFAULT_RULES_PATH = 'scripts/prompt-drift/rules.json';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = { provider: 'mock', rulesPath: DEFAULT_RULES_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
    const next = argv[i + 1];
    switch (arg) {
      case '--system':
        options.systemPromptPath = next;
        i += 1;
        break;
      case '--cases':
        options.casesPath = next;
        i += 1;
        break;
      case '--out':
        options.outputDir = next;
        i += 1;
        break;
      case '--model':
        options.model = next;
        i += 1;
        break;
      case '--provider':
        if (next !== 'mock' && next !== 'openai') {
          throw new Error('Provider must be "mock" or "openai".');
        }
        options.provider = next;
        i += 1;
        break;
      case '--temperature':
        options.temperature = Number(next);
        i += 1;
        break;
      case '--rules':
        options.rulesPath = next;
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.systemPromptPath || !options.casesPath || !options.outputDir) {
    printHelp();
    throw new Error('Missing required arguments.');
  }

  return options as CliOptions;
}

function printHelp(): void {
  console.log(`\nPrompt drift harness\n\n` +
    `Usage:\n` +
    `  node --import tsx scripts/harness.ts \\\n` +
    `    --system path/to/system.txt \\\n` +
    `    --cases path/to/test-cases.json \\\n` +
    `    --out path/to/output-dir \\\n` +
    `    [--model gpt-4o-mini] [--provider mock|openai] [--temperature 0.2] [--rules rules.json]\n\n` +
    `Defaults:\n` +
    `  --provider mock\n` +
    `  --rules ${DEFAULT_RULES_PATH}\n`
  );
}

function isYamlPath(path: string): boolean {
  return path.endsWith('.yaml') || path.endsWith('.yml');
}

async function readCases(path: string): Promise<TestCaseFile> {
  const raw = await readFile(path, 'utf-8');
  if (isYamlPath(path)) {
    return parseSimpleYaml(raw) as TestCaseFile;
  }
  return JSON.parse(raw) as TestCaseFile;
}

function ensureInputs(caseItem: TestCase): PromptInputs {
  if (!caseItem.inputs) {
    throw new Error(`Case ${caseItem.id} is missing inputs.`);
  }
  return caseItem.inputs;
}

function sanitizeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '_').replace(/_+/g, '_');
}

function getStatus(failures: CaseResult['failures']): CaseResult['status'] {
  const hasFail = failures.some((failure) => failure.severity === 'fail');
  if (hasFail) return 'fail';
  const hasWarn = failures.some((failure) => failure.severity === 'warn');
  if (hasWarn) return 'warn';
  return 'pass';
}

function printSummary(results: CaseResult[]): void {
  const header = ['Case', 'Status', 'Fail', 'Warn'];
  const rows = results.map((result) => {
    const failCount = result.failures.filter((failure) => failure.severity === 'fail').length;
    const warnCount = result.failures.filter((failure) => failure.severity === 'warn').length;
    return [result.caseId, result.status, String(failCount), String(warnCount)];
  });
  const widths = header.map((col, index) =>
    Math.max(col.length, ...rows.map((row) => row[index].length))
  );
  const formatRow = (row: string[]) =>
    row.map((cell, index) => cell.padEnd(widths[index])).join(' | ');

  console.log(formatRow(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('-|-'));
  rows.forEach((row) => console.log(formatRow(row)));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const systemPromptPath = resolve(options.systemPromptPath);
  const casesPath = resolve(options.casesPath);
  const outputDir = resolve(options.outputDir);
  const rulesPath = resolve(options.rulesPath);

  const [systemPrompt, casesFile, rulesFile] = await Promise.all([
    readFile(systemPromptPath, 'utf-8'),
    readCases(casesPath),
    readFile(rulesPath, 'utf-8')
  ]);

  const rules = JSON.parse(rulesFile) as RuleConfig;

  const outputsDir = join(outputDir, 'outputs');
  await mkdir(outputsDir, { recursive: true });

  const provider =
    options.provider === 'openai'
      ? new OpenAIProvider(process.env.OPENAI_API_KEY ?? '')
      : new MockProvider();

  if (options.provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for OpenAI provider.');
  }

  const results: CaseResult[] = [];

  for (const caseItem of casesFile.cases) {
    const inputs = ensureInputs(caseItem);
    const userPrompt = caseItem.prompt ?? buildUserPrompt(inputs);
    const model = caseItem.model ?? options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const temperature = caseItem.temperature ?? options.temperature;

    const fileName = `${sanitizeFileName(caseItem.id)}.txt`;
    const outputPath = join(outputsDir, fileName);

    let output = '';
    try {
      output = await provider.generate(systemPrompt, userPrompt, { model, temperature, inputs });
      await writeFile(outputPath, output, 'utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        caseId: caseItem.id,
        description: caseItem.description,
        promptPath: systemPromptPath,
        outputPath,
        status: 'fail',
        failures: [
          {
            ruleId: 'GENERATION_ERROR',
            severity: 'fail',
            message,
            evidenceSnippet: 'Generator error'
          }
        ],
        model,
        temperature
      });
      continue;
    }

    const validation = validateScript(output, inputs, rules);
    const failures = validation.failures;
    results.push({
      caseId: caseItem.id,
      description: caseItem.description,
      promptPath: systemPromptPath,
      outputPath,
      status: getStatus(failures),
      failures,
      model,
      temperature
    });
  }

  printSummary(results);

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    warned: results.filter((result) => result.status === 'warn').length,
    failed: results.filter((result) => result.status === 'fail').length
  };

  const reportPayload: ReportPayload = {
    generatedAt: new Date().toISOString(),
    systemPromptPath,
    casesPath,
    outputDirectory: outputDir,
    summary,
    results
  };

  await writeReports(outputDir, reportPayload);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
