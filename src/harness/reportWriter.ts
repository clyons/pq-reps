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

  const details = payload.results
    .filter((result) => result.failures.length > 0)
    .map((result) => formatFailureDetails(result))
    .join('\n\n');

  return [header, tableHeader, ...rows, '', details].join('\n');
}

function formatFailureDetails(result: CaseResult): string {
  const lines = result.failures.map((failure) => {
    return `- **${failure.ruleId}** (${failure.severity}): ${failure.message} — ${failure.evidenceSnippet}`;
  });
  return [`## ${result.caseId}`, ...lines].join('\n');
}
