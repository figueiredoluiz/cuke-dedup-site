---
title: Quick Start
description: Run your first CukeDedup analysis with zero configuration.
---

Run CukeDedup from the root of a test project:

```sh
cuke-dedup .
```

No configuration is required. CukeDedup respects `.gitignore` and `.cuke-dedupignore`, skips common
generated directories, discovers conventional Gherkin and JavaScript/TypeScript files, and
recognizes common `Given`, `When`, `Then`, and `defineStep` registrations and aliases.

## Useful commands

```sh
cuke-dedup . --threshold 5
cuke-dedup . --print-config
cuke-dedup . --reporters terminal,json,html,sarif
cuke-dedup . --reporters jsonl
cuke-dedup . --output reports/cuke-dedup
```

`cuke-dedup check .` is equivalent to `cuke-dedup .`. The explicit `check` form requires a path;
use `cuke-dedup ./check` to analyze a directory literally named `check`.

## Reading the output

The terminal report lists findings grouped by rule, each with a severity, a primary location
(`path:line:column`), related locations, evidence, and a suggested action. It ends with totals,
the duplication rate against the threshold, and detection time.

Exit codes: `0` means the configured quality gate passed, `1` means the duplication threshold, an
error rule, or the new-finding allowance failed, and `2` means an operational error prevented a
valid run. Warnings alone never produce exit code `1` — see
[CI and baselines](/docs/ci-and-baselines/).

## Next steps

- Add a [`.cuke-dedup.json`](/docs/configuration/) when the built-in discovery does not match your
  repository layout.
- Learn the [detection rules](/docs/rules/) and how to read findings.
- Choose [report formats](/docs/reports/) for humans, tooling, or code scanning.
