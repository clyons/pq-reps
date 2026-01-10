import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CaseResult, ReportPayload } from './types.js';

export async function writeReports(outputDir: string, payload: ReportPayload): Promise<void> {
  const reportsDir = join(outputDir, 'reports');
  await mkdir(reportsDir, { recursive: true });

  const jsonPath = join(reportsDir, 'report.json');
  await writeFile(jsonPath, JSON.stringify(payload, null, 2));

  const mdPath = join(reportsDir, 'report.md');
  await writeFile(mdPath, toMarkdownReport(payload));
}

function toMarkdownReport(payload: ReportPayload): string {
  const header = [
    '# Prompt Drift Report',
    '',
    `Generated: ${payload.generatedAt}`,
    `System prompt: ${payload.systemPromptPath}`,
    `Cases file: ${payload.casesPath}`,
    `Output directory: ${payload.outputDirectory}`,
    '',
    `Total: ${payload.summary.total}`,
    `Passed: ${payload.summary.passed}`,
    `Warnings: ${payload.summary.warned}`,
    `Failed: ${payload.summary.failed}`,
    ''
  ].join('\n');

  const tableHeader = [
    '| Case ID | Status | Failures |',
    '| --- | --- | --- |'
  ].join('\n');

  const rows = payload.results.map((result) => {
    const failCount = result.failures.filter((failure) => failure.severity === 'fail').length;
    const warnCount = result.failures.filter((failure) => failure.severity === 'warn').length;
    const failures = [failCount ? `${failCount} fail` : null, warnCount ? `${warnCount} warn` : null]
      .filter(Boolean)
      .join(', ');
    return `| ${result.caseId} | ${result.status} | ${failures || '0'} |`;
  });

  const details = payload.results.map((result) => formatCaseDetails(result)).join('\n\n');

  return [header, tableHeader, ...rows, '', details].join('\n');
}

function formatCaseDetails(result: CaseResult): string {
  const lines = [
    `## ${result.caseId}`,
    '',
    `Status: ${result.status}`,
    `Model: ${result.model}`,
    `Temperature: ${result.temperature ?? 'default'}`,
    `Output: ${result.outputPath}`,
    ''
  ];

  if (result.failures.length > 0) {
    lines.push('Failures:');
    result.failures.forEach((failure) => {
      lines.push(
        `- **${failure.ruleId}** (${failure.severity}): ${failure.message} — ${failure.evidenceSnippet}`
      );
    });
    lines.push('');
  }

  lines.push('Inputs:');
  lines.push('```json');
  lines.push(JSON.stringify(result.inputs, null, 2));
  lines.push('```', '');
  lines.push('System prompt:');
  lines.push('```text');
  lines.push(result.systemPrompt.trim());
  lines.push('```', '');
  lines.push('User prompt:');
  lines.push('```text');
  lines.push(result.userPrompt.trim());
  lines.push('```');

  return lines.join('\n');
}
