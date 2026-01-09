export type PracticeMode = 'guided' | 'self-led' | 'check-in';
export type BodyState = 'still' | 'moving';
export type EyeState = 'open' | 'closed';
export type PrimarySense = 'touch' | 'hearing' | 'sight' | 'breath';
export type LabelingMode = 'none' | 'light' | 'explicit';
export type SilenceProfile = 'none' | 'light' | 'deep';
export type NormalizationFrequency = 'none' | 'once' | 'repeat';
export type ClosingStyle = 'stop' | 'soft' | 'formal';
export type SenseRotation = 'none' | 'light' | 'full';

export interface PromptInputs {
  practiceMode: PracticeMode;
  bodyState: BodyState;
  eyeState: EyeState;
  primarySense: PrimarySense;
  durationMinutes: number;
  labelingMode: LabelingMode;
  silenceProfile: SilenceProfile;
  normalizationFrequency: NormalizationFrequency;
  closingStyle: ClosingStyle;
  senseRotation: SenseRotation;
  language: string;
}

export interface TestCase {
  id: string;
  description?: string;
  prompt?: string;
  inputs?: PromptInputs;
  model?: string;
  temperature?: number;
  metadata?: Record<string, string>;
}

export interface TestCaseFile {
  cases: TestCase[];
}

export type FailureSeverity = 'fail' | 'warn';

export interface ValidationFailure {
  ruleId: string;
  severity: FailureSeverity;
  message: string;
  evidenceSnippet: string;
}

export interface ValidationResult {
  pass: boolean;
  failures: ValidationFailure[];
}

export interface RuleConfig {
  disallowedPreambles: string[];
  trademarks: string[];
  disallowedKeywords: Record<string, string[]>;
  openingDurationPhrases: string[];
  openingVerbs: string[];
  senseKeywords: Record<PrimarySense, string[]>;
  disallowedSenseKeywords: Record<PrimarySense, string[]>;
  normalizationKeywords: string[];
  driftKeywords: string[];
  returnKeywords: string[];
  silenceCuePhrases: string[];
  reentryPhrases: string[];
  closeEyesPhrases: string[];
  openEyesPhrases: string[];
  closingDisallowedPhrases: string[];
  acceptableFinalLines: string[];
  verbList: string[];
  noticeDominanceThreshold: number;
  closingMaxSentences: number;
}

export interface CaseResult {
  caseId: string;
  description?: string;
  promptPath: string;
  outputPath: string;
  status: 'pass' | 'fail' | 'warn';
  failures: ValidationFailure[];
  model: string;
  temperature?: number;
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  warned: number;
}

export interface ReportPayload {
  generatedAt: string;
  systemPromptPath: string;
  casesPath: string;
  outputDirectory: string;
  summary: ReportSummary;
  results: CaseResult[];
}
