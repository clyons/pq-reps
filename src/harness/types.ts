export type PracticeMode =
  | 'tactile'
  | 'tense_relax'
  | 'moving'
  | 'sitting'
  | 'lying'
  | 'label_with_anchor'
  | 'label_while_scanning';
export type BodyState =
  | 'still_seated'
  | 'still_seated_closed_eyes'
  | 'lying'
  | 'moving';
export type EyeState = 'closed' | 'open_focused' | 'open_diffused';
export type PrimarySense =
  | 'touch'
  | 'hearing'
  | 'sight'
  | 'breath'
  | 'body_weight'
  | 'smell'
  | 'taste';
export type LabelingMode = 'none' | 'breath_anchor' | 'scan_and_label';
export type SilenceProfile = 'none' | 'short_pauses' | 'extended_silence';
export type NormalizationFrequency = 'once' | 'periodic' | 'repeated';
export type ClosingStyle = 'minimal' | 'pq_framed' | 'pq_framed_with_progression';
export type SenseRotation = 'none' | 'guided_rotation' | 'free_choice';
export type ScenarioId =
  | 'calm_me_now'
  | 'get_present_for_meeting'
  | 'start_the_thing_im_avoiding'
  | 'prepare_for_a_tough_conversation'
  | 'reset_after_feedback'
  | 'wind_down_for_sleep'
  | 'daily_deep_reset';

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
  languages?: string[];
  scenarioId?: ScenarioId;
  audience?: string;
  voiceStyle?: string;
  customScenarioLine?: string;
  ttsNewlinePauseSeconds?: number;
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
  systemPrompt: string;
  userPrompt: string;
  inputs: PromptInputs;
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
