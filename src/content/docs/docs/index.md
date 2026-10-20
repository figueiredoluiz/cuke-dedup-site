---
title: "Introduction"
description: "CukeDedup is a fast static analyzer for duplicate, ambiguous, reusable, and unused Cucumber/Gherkin step definitions. It reads project configuration and..."
sidebar:
  label: "Introduction"
---

<!-- Synced from https://github.com/figueiredoluiz/cuke-dedup README.md at v0.13.0 (11a1ae2). Edits belong upstream. -->

CukeDedup is a fast static analyzer for duplicate, ambiguous, reusable, and unused
Cucumber/Gherkin step definitions. It reads project configuration and test code without executing
either one.

It supports:

- JavaScript, JSX, TypeScript, and TSX step definitions; experimental, opt-in Cucumber-Ruby support.
- Cucumber.js, Playwright-BDD, Cypress Cucumber, Jest-Cucumber, and Vitest Cucumber Plugin projects.
- Classic `.feature` files and Gherkin Markdown `.feature.md` files.
- Terminal, JSON, JSON Lines, HTML, and SARIF reports.
- Thresholds, baselines, changed-file analysis, suppressions, and ignore files.

Ruby support is experimental. Select a single Ruby suite explicitly with `--definitions 'features/**/*.rb' --features 'features/**/*.feature'`, include its support files, and review findings before acting on them. See the [supported subset and known limitations](/docs/discovery-and-frameworks/#cucumber-ruby).

## Install

With Cargo:

```sh
cargo install cuke-dedup
```

Or in a JavaScript project, using Node.js 24 LTS (recommended):

```sh
npm install --save-dev cuke-dedup
npx cuke-dedup .
```

Building from source requires Rust 1.90 or newer:

```sh
cargo build --release --locked
```

## Quick start

Run CukeDedup from the root of a test project:

```sh
cuke-dedup .
```

No configuration is required. CukeDedup respects `.gitignore` and `.cuke-dedupignore`, skips
common generated directories, discovers conventional Gherkin and JavaScript/TypeScript files, and
recognizes common `Given`, `When`, `Then`, and `defineStep` registrations and aliases.

Useful commands:

```sh
cuke-dedup . --threshold 5
cuke-dedup . --print-config
cuke-dedup . --reporters terminal,json,html,sarif
cuke-dedup . --reporters jsonl
cuke-dedup . --output reports/cuke-dedup
```

`cuke-dedup check .` is equivalent to `cuke-dedup .`. The explicit `check` form requires a path;
use `cuke-dedup ./check` to analyze a directory literally named `check`.

## Framework support

| Workflow | Recognized registrations |
| --- | --- |
| Cucumber.js | `@cucumber/cucumber` and legacy `cucumber`; ESM, CJS, aliases, namespaces, and static local re-exports. |
| Playwright-BDD | `createBdd()` registrations and `playwright-bdd/decorators` class-method decorators. |
| Cypress Cucumber | `@badeball/cypress-cucumber-preprocessor` and legacy `cypress-cucumber-preprocessor/steps`. |
| Jest-Cucumber | `jest-cucumber` inline `defineFeature` → scenario → step callbacks; handler-reuse rules. |
| Vitest Cucumber Plugin | ESM `Given`, `When`, and `Then` exports from `vitest-cucumber-plugin`; global step registry. |

Package entrypoints are matched exactly. Plain Playwright projects are supported when their
Gherkin bindings use Cucumber.js or Playwright-BDD.

See [Discovery and frameworks](/docs/discovery-and-frameworks/)
for configuration detection, monorepo boundaries, module resolution, and incomplete-corpus
behavior.

## Configuration

CukeDedup reads an explicit `--config` file, an auto-discovered CukeDedup configuration, or
supported framework configuration. CLI flags always have the highest precedence.

A minimal `.cuke-dedup.json` might be:

```json
{
  "definitions": ["features/steps/**/*.ts"],
  "features": ["features/**/*.{feature,feature.md}"],
  "exclude": ["dist/**"],
  "threshold": 5,
  "reporters": ["terminal", "html"]
}
```

Use `.cuke-dedupignore` for repository-specific exclusions:

```gitignore
features/generated/*
**/*.generated.ts
!features/generated/reviewed.generated.ts
```

See the [configuration reference](/docs/configuration/)
for precedence, every setting, glob semantics, suppressions, and discovery diagnostics.

## Findings and reports

CukeDedup detects eight classes of duplication, ambiguity, reuse, and unused definitions. Exact
collisions default to errors; heuristic findings default to warnings. See the
[rule reference](/docs/rules/) for the
meaning, default severity, and remediation guidance for every rule.

| Reporter | Best for |
| --- | --- |
| `terminal` | Interactive use and concise CI logs. |
| `json` | Structured integrations and complete result metadata. |
| `jsonl` | Streaming shell and agent workflows. |
| `html` | Searchable human review with light and dark themes. |
| `sarif` | GitHub code scanning and compatible platforms. |

JSON, HTML, and SARIF files default to `reports/cuke-dedup/`. See
[Reports](/docs/reports/) for schemas,
destinations, reproducibility, truncation signals, and reporter-specific behavior.

## GitHub Action

The Action downloads a native binary and verifies its checksum and build provenance:

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
    with:
      fetch-depth: 0
      persist-credentials: false
  - uses: figueiredoluiz/cuke-dedup@v0.13.0
    with:
      path: .
      threshold: 5
      reporters: terminal,json,html,sarif
```

For changed-file checks, baselines, report artifacts, outputs, and hardened pinning, see
[CI and baselines](/docs/ci-and-baselines/).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | The configured quality gate passed. |
| `1` | The duplication threshold, an error rule, or the new-finding allowance failed. |
| `2` | Discovery, parsing, configuration, or another operational error prevented a valid run. |

Warnings alone do not produce exit code `1`.

## Agent Skill

CukeDedup includes an Agent Skill for safely interpreting and remediating JSONL findings:

```sh
npx skills add figueiredoluiz/cuke-dedup --skill cuke-dedup
```

From a local checkout, use `npx skills add ./skills --skill cuke-dedup`.

The installer can target supported coding agents or install globally. Run
`npx skills add --help` for agent and scope options.

Invoke it as `$cuke-dedup` where supported, or ask the agent to analyze and safely fix duplicate
Cucumber step definitions. The skill lives in
[`skills/cuke-dedup`](https://github.com/figueiredoluiz/cuke-dedup/blob/v0.13.0/skills/cuke-dedup/SKILL.md)
and is distributed independently from the Cargo and npm packages.

## Documentation

- [Configuration](/docs/configuration/)
- [Discovery and frameworks](/docs/discovery-and-frameworks/)
- [Rules and duplication threshold](/docs/rules/)
- [Reports](/docs/reports/)
- [CI and baselines](/docs/ci-and-baselines/)
- [Safety and limitations](/docs/safety-and-limitations/)

## Compatibility

- Building from source requires Rust 1.90 or newer. Node.js 24 LTS is recommended for the npm launcher; Node.js 20 remains the minimum compatible version and is tested in CI.
- Definition extraction supports JavaScript and TypeScript, including JSX and common module variants, plus an explicitly selected subset of Cucumber-Ruby. See [Ruby support](/docs/discovery-and-frameworks/#cucumber-ruby).
- Static analysis cannot safely resolve every dynamic configuration, matcher, wrapper, or imported
  handler. CukeDedup reports incomplete analysis instead of treating missing evidence as clean.
- Before version 1.0, configuration and machine-report schemas may change between minor releases.

See [Safety and limitations](/docs/safety-and-limitations/)
for the complete compatibility contract and resource limits.

## Contributing and support

See [CONTRIBUTING.md](https://github.com/figueiredoluiz/cuke-dedup/blob/v0.13.0/CONTRIBUTING.md) for development commands, corpus guidance, and pull-request
expectations. Use the issue templates for reproducible bugs and focused feature requests. Report
vulnerabilities privately according to [SECURITY.md](https://github.com/figueiredoluiz/cuke-dedup/blob/v0.13.0/SECURITY.md). Bug reports should include a
minimal sanitized fixture with application-specific names, credentials, and source removed.

CukeDedup is an independent project. It is not affiliated with or endorsed by the Cucumber project
or its maintainers.

## Releases

Release archives include SHA-256 checksums, keyless Sigstore bundles, and GitHub build provenance.
Published versions and release notes are maintained in [GitHub Releases](https://github.com/figueiredoluiz/cuke-dedup/releases).

```sh
gh attestation verify <archive> \
  --repo figueiredoluiz/cuke-dedup \
  --signer-workflow figueiredoluiz/cuke-dedup/.github/workflows/release.yml
```

## License

[MIT](https://github.com/figueiredoluiz/cuke-dedup/blob/v0.13.0/LICENSE)
