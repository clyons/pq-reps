import type {
  PromptInputs,
  RuleConfig,
  ValidationFailure,
  ValidationResult
} from './types.js';

interface SentenceInfo {
  index: number;
  text: string;
}

const toLower = (value: string) => value.toLowerCase();

const normalizeLine = (line: string) => line.trim();

const sentencePattern = /[^.!?]+[.!?]+|[^.!?]+$/g;

function splitSentences(text: string): SentenceInfo[] {
  const matches = text.match(sentencePattern) ?? [];
  return matches
    .map((sentence, index) => ({ index, text: sentence.trim() }))
    .filter((sentence) => sentence.text.length > 0);
}

function findLineEvidence(lines: string[], matcher: (line: string) => boolean): string {
  const index = lines.findIndex((line) => matcher(line));
  if (index === -1) return 'Line ?';
  return `Line ${index + 1}: ${normalizeLine(lines[index])}`;
}

function findSentenceEvidence(sentences: SentenceInfo[], index: number): string {
  const sentence = sentences[index];
  if (!sentence) return 'Sentence ?';
  return `Sentence ${sentence.index + 1}: ${sentence.text}`;
}

function addFailure(
  failures: ValidationFailure[],
  ruleId: string,
  severity: ValidationFailure['severity'],
  message: string,
  evidenceSnippet: string
): void {
  failures.push({ ruleId, severity, message, evidenceSnippet });
}

function includesAny(text: string, phrases: string[]): boolean {
  const lower = toLower(text);
  return phrases.some((phrase) => lower.includes(toLower(phrase)));
}

function countOccurrences(text: string, token: string): number {
  const matches = text.match(new RegExp(token, 'gi'));
  return matches ? matches.length : 0;
}

function isIntentionalPause(value: number): boolean {
  return value >= 3;
}

export function validateScript(
  script: string,
  inputs: PromptInputs | undefined,
  config: RuleConfig
): ValidationResult {
  const failures: ValidationFailure[] = [];
  const trimmed = script.trim();
  const lines = script.split(/\r?\n/);
  const sentences = splitSentences(script);

  if (!trimmed) {
    addFailure(failures, 'OUTPUT_EMPTY', 'fail', 'Output is empty.', 'Line 1: <empty>');
    return { pass: false, failures };
  }

  if (/^\s*[\[{]/.test(script)) {
    addFailure(
      failures,
      'OUTPUT_NOT_PLAINTEXT',
      'fail',
      'Output appears to be JSON or structured data.',
      findLineEvidence(lines, (line) => /[\[{]/.test(line))
    );
  }

  if (/```/.test(script) || /^#+\s/m.test(script)) {
    addFailure(
      failures,
      'OUTPUT_MARKDOWN',
      'fail',
      'Output contains markdown formatting.',
      findLineEvidence(lines, (line) => /```|^#+\s/.test(line))
    );
  }

  if (includesAny(trimmed.slice(0, 80), config.disallowedPreambles)) {
    addFailure(
      failures,
      'OUTPUT_PREAMBLE',
      'fail',
      'Output includes a preamble outside the script.',
      findLineEvidence(lines, (line) => includesAny(line, config.disallowedPreambles))
    );
  }

  if (includesAny(script, config.trademarks)) {
    addFailure(
      failures,
      'TRADEMARK_MENTION',
      'fail',
      'Output includes trademarked terms.',
      findLineEvidence(lines, (line) => includesAny(line, config.trademarks))
    );
  }

  Object.entries(config.disallowedKeywords).forEach(([category, keywords]) => {
    if (includesAny(script, keywords)) {
      addFailure(
        failures,
        `DISALLOWED_${category.toUpperCase()}`,
        'fail',
        `Output includes disallowed ${category} language.`,
        findLineEvidence(lines, (line) => includesAny(line, keywords))
      );
    }
  });

  if (sentences.length > 0) {
    const firstSentence = sentences[0].text;
    const secondSentence = sentences[1]?.text ?? '';
    if (
      includesAny(firstSentence, config.openingDurationPhrases) ||
      /\b\d+\s*minute(s)?\b/i.test(firstSentence)
    ) {
      addFailure(
        failures,
        'OPENING_NO_DURATION',
        'fail',
        'Opening includes duration framing.',
        findSentenceEvidence(sentences, 0)
      );
    }

    if (inputs) {
      const openingWindow = `${firstSentence} ${secondSentence}`;
      const hasVerb = includesAny(openingWindow, config.openingVerbs);
      const senseKeywords = config.senseKeywords[inputs.primarySense];
      const hasSense = includesAny(openingWindow, senseKeywords);
      if (!hasVerb || !hasSense) {
        addFailure(
          failures,
          'OPENING_PHYSICAL_INSTRUCTION',
          'fail',
          'Opening does not place attention in the primary sense.',
          findSentenceEvidence(sentences, 0)
        );
      }
    }
  }

  if (inputs) {
    const disallowedForSense = config.disallowedSenseKeywords[inputs.primarySense] ?? [];
    if (includesAny(script, disallowedForSense)) {
      addFailure(
        failures,
        'SENSE_INTEGRITY',
        'fail',
        `Script references senses outside ${inputs.primarySense}.`,
        findLineEvidence(lines, (line) => includesAny(line, disallowedForSense))
      );
    }

    if (inputs.primarySense !== 'breath' && /\bbreath(e|ing)?\b/i.test(script)) {
      addFailure(
        failures,
        'SENSE_BREATH_EXCLUSION',
        'fail',
        'Script mentions breath outside breath-focused sessions.',
        findLineEvidence(lines, (line) => /\bbreath(e|ing)?\b/i.test(line))
      );
    }

    const noticeCount = countOccurrences(script, 'notice');
    if (inputs.durationMinutes < 5 && noticeCount > 2) {
      addFailure(
        failures,
        'NOTICE_LIMIT',
        'fail',
        'Notice appears too frequently for short sessions.',
        `Count: ${noticeCount}`
      );
    }

    const sentenceNoticeCounts = sentences.map((sentence) => countOccurrences(sentence.text, 'notice'));
    for (let i = 0; i < sentenceNoticeCounts.length; i += 1) {
      const window = sentenceNoticeCounts.slice(i, i + 6);
      const total = window.reduce((sum, count) => sum + count, 0);
      if (total >= 3) {
        addFailure(
          failures,
          'NOTICE_CLUSTER',
          'fail',
          'Notice repeats too often in a short span.',
          findSentenceEvidence(sentences, i)
        );
        break;
      }
    }

    const totalVerbCount = config.verbList.reduce(
      (sum, verb) => sum + countOccurrences(script, verb),
      0
    );
    if (totalVerbCount > 0) {
      const noticeRatio = noticeCount / totalVerbCount;
      if (noticeRatio > config.noticeDominanceThreshold) {
        addFailure(
          failures,
          'NOTICE_DOMINANCE',
          'warn',
          'Notice is the dominant verb in the script.',
          `Notice ratio: ${noticeRatio.toFixed(2)}`
        );
      }
    }

    if (inputs.normalizationFrequency === 'once') {
      const normalizationSentences = sentences.filter((sentence) => {
        const text = sentence.text.toLowerCase();
        const hasNormalization = includesAny(text, config.normalizationKeywords);
        const hasDrift = includesAny(text, config.driftKeywords);
        return hasNormalization && hasDrift;
      });

      if (normalizationSentences.length !== 1) {
        addFailure(
          failures,
          'NORMALIZATION_COUNT',
          'fail',
          'Normalization should appear exactly once.',
          `Count: ${normalizationSentences.length}`
        );
      } else {
        const normalizationIndex = normalizationSentences[0].index;
        const nextWindow = sentences
          .slice(normalizationIndex + 1, normalizationIndex + 3)
          .map((sentence) => sentence.text)
          .join(' ');
        if (!includesAny(nextWindow, config.returnKeywords)) {
          addFailure(
            failures,
            'NORMALIZATION_RETURN',
            'fail',
            'Normalization must be followed by a return-to-sensation instruction.',
            findSentenceEvidence(sentences, normalizationIndex)
          );
        }
      }
    }

    const pauseTokens = Array.from(script.matchAll(/\[pause:([^\]]+)\]/gi));
    const invalidPauseTokens = pauseTokens.filter((token) => {
      const value = token[1];
      return Number.isNaN(Number(value));
    });
    if (invalidPauseTokens.length > 0) {
      addFailure(
        failures,
        'PAUSE_FORMAT',
        'fail',
        'Pause markers must be numeric tokens like [pause:3].',
        invalidPauseTokens.map((token) => token[0]).join(', ')
      );
    }

    const pauses = pauseTokens
      .map((token) => Number(token[1]))
      .filter((value) => !Number.isNaN(value));
    const intentionalPauses = pauses.filter((value) => isIntentionalPause(value));

    if (inputs.silenceProfile === 'none' && intentionalPauses.length > 0) {
      addFailure(
        failures,
        'SILENCE_FORBIDDEN',
        'fail',
        'Intentional silences are not allowed for silence profile none.',
        `Found ${intentionalPauses.length} intentional pauses.`
      );
    }

    pauseTokens.forEach((token) => {
      const value = Number(token[1]);
      if (!isIntentionalPause(value)) return;
      const tokenText = token[0];
      const lineIndex = lines.findIndex((line) => line.includes(tokenText));
      const previousLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
      const nextLine = lines.slice(lineIndex + 1).find((line) => line.trim().length > 0) ?? '';
      if (!includesAny(previousLine, config.silenceCuePhrases)) {
        addFailure(
          failures,
          'SILENCE_CUE_REQUIRED',
          'fail',
          'Intentional silence must be preceded by a silence cue sentence.',
          `Line ${lineIndex + 1}: ${normalizeLine(lines[lineIndex] ?? '')}`
        );
      }
      if (!includesAny(nextLine, config.reentryPhrases) && !includesAny(nextLine, config.returnKeywords)) {
        addFailure(
          failures,
          'SILENCE_REENTRY_REQUIRED',
          'fail',
          'Intentional silence must be followed by a re-entry instruction.',
          `Line ${lineIndex + 1}: ${normalizeLine(lines[lineIndex] ?? '')}`
        );
      }
    });

    if (inputs.durationMinutes <= 1) {
      if (intentionalPauses.length > 1) {
        addFailure(
          failures,
          'SILENCE_LIMIT_SHORT',
          'fail',
          '1-minute sessions may include at most one intentional silence.',
          `Count: ${intentionalPauses.length}`
        );
      }
      intentionalPauses.forEach((value) => {
        if (value < 3 || value > 10) {
          addFailure(
            failures,
            'SILENCE_DURATION_SHORT',
            'fail',
            '1-minute session silence must be between 3 and 10 seconds.',
            `Pause: ${value}`
          );
        }
      });
    } else if (inputs.durationMinutes >= 2 && inputs.durationMinutes <= 5) {
      if (intentionalPauses.length > 2) {
        addFailure(
          failures,
          'SILENCE_LIMIT_MEDIUM',
          'fail',
          '2–5 minute sessions may include at most two intentional silences.',
          `Count: ${intentionalPauses.length}`
        );
      }
    } else if (inputs.durationMinutes >= 12) {
      if (!intentionalPauses.some((value) => value >= 15)) {
        addFailure(
          failures,
          'SILENCE_MIN_LONG',
          'fail',
          '12-minute sessions require at least one intentional silence >= 15s.',
          `Pauses: ${intentionalPauses.join(', ')}`
        );
      }
      intentionalPauses.forEach((value) => {
        if (value > 30) {
          addFailure(
            failures,
            'SILENCE_MAX_LONG',
            'fail',
            '12-minute sessions should not exceed 30s silence.',
            `Pause: ${value}`
          );
        }
      });
    }

    if (inputs.bodyState === 'moving') {
      const safetyLine =
        'Follow this guidance only to the extent that it is safe in your physical environment.';
      if (!script.includes(safetyLine)) {
        addFailure(
          failures,
          'MOVEMENT_SAFETY_REQUIRED',
          'fail',
          'Movement sessions must include the safety guidance line.',
          safetyLine
        );
      }
    }

    if (inputs.eyeState === 'closed') {
      const earlySentences = sentences.slice(0, 3).map((sentence) => sentence.text).join(' ');
      if (!includesAny(earlySentences, config.closeEyesPhrases)) {
        addFailure(
          failures,
          'EYES_CLOSED_OPENING',
          'fail',
          'Closed-eye sessions must instruct closing eyes early.',
          findSentenceEvidence(sentences, 0)
        );
      }
      const lastSentences = sentences.slice(-3).map((sentence) => sentence.text).join(' ');
      if (!includesAny(lastSentences, config.openEyesPhrases)) {
        addFailure(
          failures,
          'EYES_CLOSED_REOPEN',
          'fail',
          'Closed-eye sessions must invite reopening eyes before the end.',
          findSentenceEvidence(sentences, sentences.length - 1)
        );
      }
    } else if (inputs.eyeState === 'open') {
      const lastSentences = sentences.slice(-3).map((sentence) => sentence.text).join(' ');
      if (includesAny(lastSentences, config.openEyesPhrases)) {
        addFailure(
          failures,
          'EYES_OPEN_NO_REOPEN',
          'fail',
          'Open-eye sessions must not instruct opening eyes at the end.',
          findSentenceEvidence(sentences, sentences.length - 1)
        );
      }
    }

    const lastParagraph = script.split(/\n\s*\n/).pop() ?? '';
    const lastParagraphSentences = splitSentences(lastParagraph);
    if (lastParagraphSentences.length > config.closingMaxSentences) {
      addFailure(
        failures,
        'CLOSING_TOO_LONG',
        'fail',
        'Closing paragraph is longer than expected.',
        `Closing sentences: ${lastParagraphSentences.length}`
      );
    }

    if (includesAny(script, config.closingDisallowedPhrases)) {
      addFailure(
        failures,
        'CLOSING_DISALLOWED_PHRASE',
        'fail',
        'Closing includes disallowed phrasing.',
        findLineEvidence(lines, (line) => includesAny(line, config.closingDisallowedPhrases))
      );
    }

    const lastLine = [...lines].reverse().find((line) => line.trim().length > 0) ?? '';
    const normalizedLastLine = lastLine.trim().replace(/\s+/g, ' ');
    const acceptableMatch = config.acceptableFinalLines.some((line) => {
      const normalized = line.trim().replace(/\s+/g, ' ');
      return toLower(normalized) === toLower(normalizedLastLine);
    });
    if (!acceptableMatch) {
      addFailure(
        failures,
        'CLOSING_FINAL_LINE',
        'fail',
        'Script must end with an approved final line.',
        `Last line: ${normalizedLastLine}`
      );
    }
  }

  const hasFail = failures.some((failure) => failure.severity === 'fail');
  return { pass: !hasFail, failures };
}
