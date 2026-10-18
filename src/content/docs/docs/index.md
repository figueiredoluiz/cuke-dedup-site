---
title: Introduction
description: What CukeDedup is, what it analyzes, and the philosophy behind it.
---

CukeDedup is a fast static analyzer for duplicate, ambiguous, reusable, and unused
Cucumber/Gherkin step definitions. It reads project configuration and test code without executing
either one.

It supports:

- JavaScript, JSX, TypeScript, and TSX step definitions; experimental, opt-in Cucumber-Ruby support.
- Cucumber.js, Playwright-BDD, Cypress Cucumber, Jest-Cucumber, and Vitest Cucumber Plugin projects.
- Classic `.feature` files and Gherkin Markdown `.feature.md` files.
- Terminal, JSON, JSON Lines, HTML, and SARIF reports.
- Thresholds, baselines, changed-file analysis, suppressions, and ignore files.

## Why step-definition analysis matters

In a growing Cucumber suite, step definitions accumulate from many contributors over months and
years. Exact duplicates, normalized equivalents, copy-paste handlers, ambiguous steps, and dead
definitions slip in quietly — until refactoring a step library feels risky and feature files
behave unpredictably.

CukeDedup compares every discovered definition — matcher text, normalized forms, and handler
structure — and reports eight classes of findings with precise locations and suggested actions.

## Analysis, not guesswork

CukeDedup is an analysis tool, not an automatic guarantee of better test quality. Two principles
shape its behavior:

1. **Nothing is executed.** Framework configuration, imported modules, package scripts, matchers,
   and test code are read statically. Analyzed repository content is untrusted data.
2. **Incomplete analysis is reported, not hidden.** When evidence is missing, CukeDedup says so
   instead of treating the gap as a clean result. Machine reports expose incomplete or truncated
   status, and CI can reject degraded analysis with `--fail-on-incomplete`.

## Where to go next

- [Installation](/docs/installation/) — install with Cargo, npm, or from source.
- [Quick Start](/docs/quick-start/) — run your first analysis in under a minute.
- [Rules](/docs/rules/) — the eight detection rules and their severities.
- [Reports](/docs/reports/) — terminal, JSON, JSONL, HTML, and SARIF output.

CukeDedup is an independent project. It is not affiliated with or endorsed by the Cucumber project
or its maintainers. Before version 1.0, configuration and machine-report schemas may change between
minor releases — see [Safety and limitations](/docs/safety-and-limitations/).
