import reportJson from '../data/sample-report.json';

// Types mirror the real CukeDedup JSON reporter, schema version 3. The
// fixture is an actual report produced by `cuke-dedup . --reporters json`,
// so these components can later consume real analyzer output unchanged.

export type Severity = 'error' | 'warning';

export type RuleId =
  | 'duplicate-matcher'
  | 'normalized-matcher'
  | 'ambiguous-step'
  | 'overlapping-matcher'
  | 'duplicate-handler'
  | 'near-duplicate-step'
  | 'parameterization-candidate'
  | 'unused-definition';

export interface SourceSpan {
  path: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface FindingEvidence {
  matcherSimilarity: number | null;
  handlerSimilarity: number | null;
  matcherDifference: string | null;
  handlerEvidence: string | null;
}

export interface ReportFinding {
  rule: RuleId;
  severity: Severity;
  message: string;
  primary: SourceSpan;
  related: SourceSpan[];
  relatedLocationsTruncated: boolean;
  evidence: FindingEvidence;
  suggestedAction: string;
  suppression: string | null;
}

export interface ReportSummary {
  definitionsAnalyzed: number;
  featureStepsAnalyzed: number;
  findings: number;
  errors: number;
  warnings: number;
  suppressed: number;
  byRule: Partial<Record<RuleId, number>>;
  duplication: {
    threshold: number;
    duplicatedDefinitions: number;
    totalDefinitions: number;
    percentage: number;
    passed: boolean;
    rules: string[];
  };
}

export interface SampleReport {
  schemaVersion: string;
  summary: ReportSummary;
  corpus: {
    definitionFiles: number;
    featureFiles: number;
    incomplete: boolean;
  };
  findings: ReportFinding[];
  findingsTruncated: number;
}

export const sampleReport = reportJson as SampleReport;

export const ruleLabels: Record<RuleId, string> = {
  'duplicate-matcher': 'Duplicate matcher',
  'normalized-matcher': 'Normalized matcher',
  'ambiguous-step': 'Ambiguous step',
  'overlapping-matcher': 'Overlapping matcher',
  'duplicate-handler': 'Duplicate handler',
  'near-duplicate-step': 'Near-duplicate step',
  'parameterization-candidate': 'Parameterization candidate',
  'unused-definition': 'Unused definition',
};

export const ruleDescriptions: Record<RuleId, string> = {
  'duplicate-matcher': 'Definitions use the same effective matcher.',
  'normalized-matcher': 'Matchers become equivalent after normalization.',
  'ambiguous-step': 'A concrete feature step matches multiple definitions.',
  'overlapping-matcher': 'Two matchers accept the same step text, even if no feature exercises it.',
  'duplicate-handler': 'Different matchers have the same alpha-normalized handler.',
  'near-duplicate-step': 'Matcher wording is close and handler behavior substantially overlaps.',
  'parameterization-candidate': 'Handler structures differ primarily in literal values.',
  'unused-definition': 'No discovered feature step uses the definition.',
};

export const formatPercent = (value: number): string => `${value.toFixed(2)}%`;
