---
title: Understanding Results
description: How to read findings, severities, evidence, and the duplication threshold outcome.
---

Every finding carries the same structure across all report formats:

- **Rule and severity** — which of the [eight rules](/docs/rules/) fired, and whether it counts
  as an error or a warning. Exact collisions default to errors; heuristic findings default to
  warnings.
- **Primary location** — the `path:line:column` span where the finding is anchored.
- **Related locations** — the other definitions (or feature steps) involved in a pair or cluster
  finding.
- **Evidence** — why the finding exists: matcher differences, similarity scores, handler
  behavior, or usage facts.
- **Suggested action** — the remediation direction, such as keeping one definition, making
  matchers mutually exclusive, or replacing literal differences with a step parameter.
- **Semantic fingerprint** — a location-independent identity used by baselines and suppression
  accounting.

## Severity and exit codes

Findings alone do not fail a run. Exit code `1` is produced by the duplication threshold, an
active error-level rule, or the new-finding allowance. Warnings alone never produce exit code `1`.
Operational problems — discovery, parsing, or configuration failures — exit with `2`. See
[CI and baselines](/docs/ci-and-baselines/#exit-codes).

## Reading the duplication rate

The summary line reports how many definitions participate in active, error-level duplication
findings, as a percentage of every discovered definition:

```text
Duplication: 2 of 11 definitions (18.18%), threshold 5.00% — FAIL
```

Suppressed and baselined findings do not count toward the numerator, and a definition counts once
even when it participates in several findings. `ambiguous-step`, `overlapping-matcher`, and
`unused-definition` errors are independent policies and remain fatal regardless of the threshold.

## Incomplete analysis

CukeDedup reports incomplete analysis instead of treating missing evidence as clean. Machine
reports carry corpus completeness signals and truncation counts, and the HTML report shows an
incomplete-run alert. When findings depend on a complete corpus, existing findings remain valid —
but the absence of a finding proves nothing while the run is incomplete.

Use `--fail-on-incomplete` when CI must reject degraded analysis, and `--explain-discovery` to
inspect what was actually discovered.

## Suppressing accepted findings

Two suppression mechanisms exist, both requiring an explicit reason:

- **Configured suppressions** in `.cuke-dedup.json` — select by rule plus `path` and/or
  `matcher`. For pair findings, a path must contain every involved definition, so a directory
  exception cannot hide a conflict crossing into maintained code.
- **Inline directives** above a registration —
  `// cuke-dedup:ignore RULE -- reason` (JS/TS) or `# cuke-dedup:ignore RULE -- reason` (Ruby).
  The directive applies only to findings involving its attached definition.

Suppressed findings are listed in reports with their suppression state and do not count toward
the duplication threshold. See [Configuration](/docs/configuration/#suppressions).

## Baselines and changed-file analysis

For established suites, [baselines](/docs/ci-and-baselines/#semantic-baselines) suppress findings
that already exist in a committed semantic fingerprint file, and
[`--changed-since`](/docs/ci-and-baselines/#changed-file-analysis) reports only findings involving
files changed since a Git revision — while still comparing those files against the complete
corpus.
