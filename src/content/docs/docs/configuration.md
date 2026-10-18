---
title: Configuration
description: Precedence, every setting, glob semantics, ignore files, suppressions, diagnostics.
---

CukeDedup works without configuration. Add a project configuration only when the built-in
discovery or policy does not match the repository.

## Precedence

Values are resolved in this order, from highest to lowest priority:

```text
CLI flags
explicit --config
auto-discovered CukeDedup configuration
detected framework configuration
built-in defaults
```

`--config/-c <file>` bypasses automatic discovery. A missing or malformed explicit file is fatal.
A relative `--config` path is resolved from the analyzed root, not from the shell's working
directory, like relative output and baseline paths:

```sh
cuke-dedup packages/billing --config .cuke-dedup.json   # reads packages/billing/.cuke-dedup.json
```

Without `--config`, CukeDedup stops at the first valid source in this order:

```text
.cuke-dedup.json
.config/cuke-dedup.json
.config/.cuke-dedup.json
cuke-dedup.config.json
package.json#cukeDedup
```

An invalid auto-discovered file produces a warning, then discovery continues to the next source.
JavaScript projects may use the `cukeDedup` key in `package.json`; other projects should prefer
`.cuke-dedup.json`.

## Complete example

```json
{
  "definitions": ["features/steps/**/*.ts"],
  "features": ["features/**/*.{feature,feature.md}"],
  "exclude": ["dist/**"],
  "excludeDefaults": true,
  "includeHidden": false,
  "threshold": 5,
  "nearDuplicateHandlerSimilarity": 0.7,
  "requireDefinitions": true,
  "requireFeatures": true,
  "failOnIncomplete": false,
  "failOnUnparseable": false,
  "registrations": ["defineDomainStep"],
  "parameterTypes": { "colour": "red|green|amber" },
  "maxCandidateComparisons": 2000000,
  "maxStructuralClassComparisons": 250000,
  "noMetrics": false,
  "reporters": ["terminal", "json", "html", "sarif"],
  "output": "reports/cuke-dedup",
  "rules": {
    "duplicate-matcher": "error",
    "duplicate-handler": "error",
    "near-duplicate-step": "warning",
    "unused-definition": "off"
  },
  "suppressions": [
    {
      "rule": "duplicate-handler",
      "path": "features/steps/legacy.ts",
      "matcher": "the legacy flow is complete",
      "reason": "Kept distinct while the legacy flow is retired"
    }
  ]
}
```

Collection values—`definitions`, `features`, `exclude`, `reporters`, and `suppressions`—replace
the corresponding value from a lower-precedence layer. Scalar settings and individual rule
severities merge by setting or rule name. Configured excludes replace lower-precedence custom
excludes, but built-in generated-directory exclusions remain a separate policy.

## Discovery patterns

`definitions`, `features`, `exclude`, and suppression `path` values use `globset` syntax against
root-relative paths normalized with `/`.

- `*` and `?` may cross `/`.
- `**` makes a recursive directory boundary explicit to readers.
- Character classes such as `[ab]` are supported.
- Brace alternatives such as `{js,ts}` are supported.
- Backslash escaping is supported.

Opt-in languages, currently Ruby, are selected only by a `definitions` pattern that depends on
their suffix, such as `features/**/*.rb`. A suffix-agnostic pattern such as `features/**` selects
JS/TS sources and reports the Ruby files it skipped in a warning.

These patterns differ from `.gitignore` and `.cuke-dedupignore`, which use directory-scoped
gitignore semantics.

`excludeDefaults: false` permits an explicitly selected workspace under `node_modules`, `target`,
or another protected directory. `includeHidden: true` permits traversal into dot-directories.
Their CLI equivalents are `--no-default-excludes` and `--include-hidden`. Explicit definition
patterns do not implicitly weaken either safety default.

## Ignore files

A repository may put `.cuke-dedupignore` at the analysis root or in any descendant directory.
Each file applies to its own subtree and follows gitignore syntax:

- Blank lines and `#` comments are ignored.
- A leading `/` anchors the rule to the ignore file's directory.
- A trailing `/` selects directories.
- `!` negates an earlier matching rule.

Example:

```text
# Generated feature sources
features/generated/*
**/*.generated.ts

# Keep one reviewed generated definition
!features/generated/reviewed.generated.ts
```

`.cuke-dedupignore` applies in addition to `.gitignore`, built-in exclusions, and configured
`exclude` patterns. `--no-default-excludes` disables only the built-in list. A configured exclude
is a hard exclusion and cannot be negated from an ignore file.

## Custom registration wrappers

`registrations` names local functions that register steps. CukeDedup already infers a top-level,
synchronous, single-statement wrapper that forwards its leading parameters directly to a known
registration:

```ts
function step(text, handler) {
  Given(text, handler);
}
```

Nested, asynchronous, generator, conditional, multi-statement, reordered, rewritten, or
dynamically constructed wrappers cannot be inferred safely. Declare those names when they still
take the matcher first and handler second.

`registrations` also enables bare registration names that are not ambient by default, including
lowercase `given`/`when`/`then` used as globals. Without an entry here they are recognised only
through a resolved import (see [Safety and limitations](/docs/safety-and-limitations/)).

`registrations` applies to JS/TS sources only.

## Trusted assertion modules

`assertionModules` names module specifiers whose `expect` export is a real assertion factory.

For JS/TS, CukeDedup recognizes `@playwright/test`, `playwright/test`, `@jest/globals`, `expect`,
`vitest`, `chai`, and `bun:test` without configuration, and it also trusts the ambient `expect`
that Jest, Vitest, and Playwright inject. Chain recognition is shape-based, so Chai's
`expect(x).to.equal(y)` is understood exactly as Jest's `expect(x).toBe(y)` is; only the origin of
the factory is listed.

Declare a module when the factory reaches your steps another way:

```json
{
  "assertionModules": ["./support/fixtures"]
}
```

A local module that re-exports `expect` is the common case:

```ts
// support/fixtures.ts
export { expect } from '@playwright/test';
```

Without configuration, JS/TS local re-exports remain untrusted: their expected values do not count
as behavior, so conflicting assertions may produce a `parameterization-candidate`. Configuration
restores that distinction for both `import` and `require`.

Configure only actual assertion factories; trusting unrelated modules can manufacture similarity
evidence. Ruby trust rules, including `rubyLoadPaths`, are covered in the
[repository documentation](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/configuration.md#ruby-dependency-sources).

## Custom parameter types

`parameterTypes` maps a project-defined Cucumber Expression parameter type to the regular
expression it accepts. This mirrors `defineParameterType` without executing project code:

```json
{
  "parameterTypes": {
    "colour": "red|green|amber"
  }
}
```

An undeclared type uses a permissive fallback that prevents a false `unused-definition` finding
but cannot prove ambiguity or overlap. Declaring it restores exact analysis. Invalid expressions
fail configuration rather than silently disabling checks.

## Suppressions

Every configured suppression must select at least a `path` or `matcher` and include a non-empty
reason of at most 512 Unicode characters.

- When both selectors are present, both must match the same definition.
- For pair findings, a path must contain every involved definition.
- A matcher must select at least one involved definition.

This prevents a directory exception from hiding a conflict that crosses into maintained code.

A source-local suppression can instead be placed immediately above a registration:

```ts
// cuke-dedup:ignore duplicate-handler -- retained for an external compatibility contract
Given('the legacy flow completes', legacyHandler);
```

Ruby uses the same directive in a `#` comment:

```ruby
# cuke-dedup:ignore duplicate-handler -- retained for an external compatibility contract
Given('the legacy flow completes') { legacy_flow }
```

Malformed directives and oversized reasons are operational errors. A directive applies only to
findings involving its attached definition.

## CLI overrides and diagnostics

Discovery and rule options can be overridden directly:

```sh
cuke-dedup . \
  --config .cuke-dedup.json \
  --definitions 'features/steps/**/*.ts' \
  --features 'features/**/*.feature' \
  --exclude 'generated/legacy.ts' \
  --exclude 'vendor' \
  --threshold 5 \
  --require-definitions \
  --rule duplicate-matcher=warning
```

`--exclude` may be repeated or receive comma-separated patterns. The analysis-bound overrides
`--max-candidate-comparisons` and `--max-structural-class-comparisons` are the CLI equivalents of
the `maxCandidateComparisons` and `maxStructuralClassComparisons` config keys and are subject to
the same hard safety ceilings.

Use `--explain-discovery` to show effective pattern origins, selected parsers, matching patterns,
and definition inputs without changing report output. Use `--print-config` to print the fully
merged and validated configuration as JSON, including its sources and warnings, then exit without
running discovery.

See [Discovery and frameworks](/docs/discovery-and-frameworks/) for framework-derived defaults and
incomplete-corpus behavior, and [Rules](/docs/rules/) for severity configuration.
