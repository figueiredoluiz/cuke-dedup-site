---
title: Rules
description: The eight detection rules, their severities, and the duplication threshold.
---

Configure a rule as `off`, `warning`, or `error`. The CLI also accepts `warn` as an alias for
`warning`.

| Rule                                                                        | Default | Meaning                                                                  |
| --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| [`duplicate-matcher`](/docs/reference/duplicate-matcher/)                   | Error   | Definitions use the same effective matcher.                              |
| [`normalized-matcher`](/docs/reference/normalized-matcher/)                 | Error   | Matchers become equivalent after normalization.                          |
| [`ambiguous-step`](/docs/reference/ambiguous-step/)                         | Error   | A concrete feature step matches multiple definitions.                    |
| [`overlapping-matcher`](/docs/reference/overlapping-matcher/)               | Warning | Two matchers accept the same step text, even if no feature exercises it. |
| [`duplicate-handler`](/docs/reference/duplicate-handler/)                   | Error   | Different matchers have the same alpha-normalized handler.               |
| [`near-duplicate-step`](/docs/reference/near-duplicate-step/)               | Warning | Matcher wording is close and handler behavior substantially overlaps.    |
| [`parameterization-candidate`](/docs/reference/parameterization-candidate/) | Warning | Handler structures differ primarily in literal values.                   |
| [`unused-definition`](/docs/reference/unused-definition/)                   | Warning | No discovered feature step uses the definition.                          |

Each rule has its own reference page with meaning, evidence, remediation, and language support —
see the **Rules Reference** section in the sidebar.

## Framework-specific behavior

Jest-Cucumber's inline scenario steps are positional rather than global matcher registrations.
`duplicate-matcher`, `normalized-matcher`, `ambiguous-step`, `overlapping-matcher`, and
`unused-definition` do not apply to them. The three handler-reuse rules still apply across Jest
scenarios, and `duplicate-handler` can report identical matcher text. Handler pairs involving
Jest-Cucumber or Vitest Cucumber Plugin must belong to the same framework, preserving their
different argument conventions.

## Language support

Rules run on the shared representation, but each source language supplies different evidence.
Cucumber-Ruby support is experimental; its details are in
[Discovery and frameworks](/docs/discovery-and-frameworks/#cucumber-ruby-experimental).

Inline suppressions: JavaScript/TypeScript `// cuke-dedup:ignore RULE -- REASON`, Cucumber-Ruby
`# cuke-dedup:ignore RULE -- REASON`.

## Exact groups and fuzzy pairs

Exact matcher and handler groups with up to four definitions produce a linear spanning set of pair
findings. Larger groups produce one bounded cluster finding with the complete member count and an
explicit truncation signal. Duplication thresholds still count every member.

Fuzzy and structural-similarity rules remain pair findings so individual scores and comparisons
are visible. Candidate blocking and work limits are described in
[Safety and limitations](/docs/safety-and-limitations/).

## Duplication threshold

`threshold` is the percentage of discovered definitions permitted to participate in active,
error-level duplication findings. It accepts `0` through `100` and defaults to `0`.

```sh
cuke-dedup . --threshold 5
```

The numerator contains unique definition locations involved in these error-level rules:

- `duplicate-matcher`
- `normalized-matcher`
- `duplicate-handler`
- `near-duplicate-step`, when configured as an error
- `parameterization-candidate`, when configured as an error

A definition is counted once even when it participates in several findings. Suppressed and
baselined findings do not count. The denominator is every discovered definition, including those
without findings.

The threshold passes when the unrounded percentage is less than or equal to the configured value.
Active `ambiguous-step`, `overlapping-matcher`, and `unused-definition` errors remain independently
fatal because they represent policies other than duplication tolerance. An empty project has a
0% duplication rate.

See [Configuration](/docs/configuration/) for per-rule severities and suppressions.
