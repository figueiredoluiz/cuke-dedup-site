---
title: Troubleshooting
description: Diagnose discovery, configuration, and report problems.
---

## No definitions were extracted

Symptom: `Analyzed 0 definitions`, or an exit code `2` when `--require-definitions` is set.

Your layout may not match conventional discovery. Inspect what CukeDedup actually sees:

```sh
cuke-dedup . --explain-discovery
```

Then select sources explicitly:

```sh
cuke-dedup . --definitions 'features/steps/**/*.ts' --features 'features/**/*.feature'
```

## My framework was not detected

Package entrypoints are matched exactly — registrations count only when imported from a supported
package. Check aliases, re-exports, and the effective configuration:

```sh
cuke-dedup . --print-config
```

The JSON includes configuration sources and warnings, so an invalid auto-discovered file is
visible. See [Discovery and frameworks](/docs/discovery-and-frameworks/).

## A wrapper function is not recognized

Only top-level, synchronous, single-statement wrappers forwarding matcher and handler to a known
registration are inferred. Nested, async, generator, conditional, or multi-statement wrappers must
be declared by name:

```json
{ "registrations": ["defineDomainStep"] }
```

See [Configuration](/docs/configuration/#custom-registration-wrappers).

## Lowercase given/when/then register nothing

Lowercase keyword calls are recognized only through resolved imports (for example from a
Playwright-BDD `createBdd()` factory) or proven Jest-Cucumber scenario callbacks — never as
ambient globals. To enable one as a global registration, name it in `registrations`.

## Ruby files were skipped

Ruby support is experimental and opt-in. A suffix-agnostic pattern like `features/**` selects
JS/TS sources and reports skipped Ruby files. Select the suite explicitly:

```sh
cuke-dedup . --definitions 'features/**/*.rb' --features 'features/**/*.feature'
```

## Parameterization findings on conflicting assertions

JS/TS local re-exports of `expect` are untrusted without configuration, so their expected values
do not count as behavior. If a `parameterization-candidate` looks wrong because two handlers
assert different values, declare the assertion factory:

```json
{ "assertionModules": ["./support/fixtures"] }
```

## The run is marked incomplete

Incomplete analysis means evidence is missing — existing findings stay valid, but absence of a
finding proves nothing. Use `--explain-discovery` to find unread sources, unresolved
registrations, or unparseable files, and `--fail-on-incomplete` in CI when degraded analysis must
fail. See [Safety and limitations](/docs/safety-and-limitations/).

## ANSI colors in CI logs

Terminal colors are applied only when stdout is a terminal. Force them off with:

```sh
NO_COLOR=1 cuke-dedup .
```

## A suppression does not match

Configured suppressions need at least a `path` or `matcher` plus a reason; for pair findings a
path must contain every involved definition. Reports surface unmatched suppressions so a stale
entry cannot silently expire. See [Configuration](/docs/configuration/#suppressions).
