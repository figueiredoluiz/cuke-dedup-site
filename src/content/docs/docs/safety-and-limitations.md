---
title: Safety and Limitations
description: Static-analysis boundaries, input and work limits, report safety.
---

CukeDedup analyzes repositories that may contain malformed or adversarial input. It does not
execute project configuration, imported modules, package scripts, matchers, or test code. Explicit
resource limits keep failures visible and bound the work performed.

## Compatibility

- The minimum supported Rust version is 1.90.
- Node.js 24 LTS is recommended for the npm launcher. CI also tests Node.js 20 as the minimum
  compatible version; Node.js 20 has reached end of life upstream.
- Source adapters cover JavaScript and TypeScript, including JSX and common module variants.
  Experimental, opt-in Cucumber-Ruby requires explicit source selection; its supported subset and
  completion gaps remain separate from JS/TS support.
- Unsupported source languages are rejected rather than guessed.
- Classic Gherkin and Gherkin Markdown are supported, including declared Gherkin dialects.
- Before version 1.0, configuration and machine-report schemas may evolve between minor releases.

## Static-analysis boundaries

- Dynamic framework configuration may require explicit `features` or `definitions` patterns.
- Jest-Cucumber setup provenance is limited to statically resolved inline synchronous callbacks
  and immutable aliases. Its positional steps are excluded from global matcher and feature-usage
  rules. Vitest support covers the ESM `vitest-cucumber-plugin` package, not the separate
  `@amiceli/vitest-cucumber` API.
- Named handlers declared in the same file resolve to their bodies. Imported or unresolved handler
  references remain usable for matcher and usage rules but are not compared by name.
- JS/TS parse failures retain error-recovered definitions and warn as incomplete by default.
  `--fail-on-unparseable` makes those failures fatal; `--fail-on-incomplete` rejects all
  incompleteness. Unsupported regex constructs warn; malformed matcher escapes are operational
  errors.
- The pinned JavaScript and TypeScript/TSX grammars reject some valid syntax, including typed
  tagged templates, `export type * as … from`, and some deeply chained type assertions. Flow and
  pipeline proposals are unsupported by design. Unparseable modules never supply trusted
  registration exports; recovery may retain other registrations, but the run remains incomplete.
- Lowercase `given`/`when`/`then` are recognised through resolved imports or proven Jest-Cucumber
  scenario callbacks. They are never assumed to be ambient globals. Name one in the
  `registrations` configuration to explicitly enable it as a global registration.
- One analysis root is one corpus. Analyze independent monorepo packages separately.
- Regular expressions are matched against feature steps but are never reversed into invented
  overlap witnesses.
- Bounded fuzzy indexes preserve a deterministic sample in highly repetitive vocabularies but do
  not promise every possible pair after a work limit is reached.
- A handler produced by calling a generator function is not compared: the registered handler is a
  suspended object, not a function, and treating its body as behavior would invent meaning the
  code does not have. Each such registration warns and is excluded from handler rules.

When analysis is incomplete, existing findings remain valid but the absence of a finding proves
nothing. Machine reports expose the incomplete or truncated status. Pass `--fail-on-incomplete`
when CI must reject degraded analysis.

## Input limits

| Input                                                                      |                        Limit |
| -------------------------------------------------------------------------- | ---------------------------: |
| Definition source, feature file, imported registration module, or baseline |                   8 MiB each |
| Package, CukeDedup, framework, or static project configuration             |                   1 MiB each |
| Project-resolution metadata files                                          |   1,024 files / 16 MiB total |
| Project-resolution mappings                                                |                       16,384 |
| Workspace discovery entries                                                |                      100,000 |
| Content-classification prefix per discovered source                        |                       64 KiB |
| Imported registration modules                                              | 1,024 modules / 64 MiB total |
| Ruby files reached only through `require`/`require_relative`               |   1,024 files / 64 MiB total |
| Ruby provider and assertion proofs                                         |   1,024 files / 64 MiB total |
| Memoized module path/depth states                                          |                       16,384 |

Resolution confines imports and package targets to canonical analysis or package roots and shares
cached work between importing files.

## Matcher and Gherkin limits

- A matcher pattern or compiled program is limited to 1 MiB.
- Each matcher receives a 2 MiB lazy-DFA cache.
- Oversized matcher sets split recursively into bounded sets rather than falling back to a full
  definition-by-step loop.
- Gherkin Markdown conversion collects at most 10,000 ambiguous candidates, performs at most 128
  parser probes, and parses at most 64 MiB of synthesized input.

## Analysis limits

| Work                                                   |                       Limit |
| ------------------------------------------------------ | --------------------------: |
| Unique definition comparisons and static overlap pairs |                   2,000,000 |
| Structural proposals per handler class                 |                     250,000 |
| Retained overlap findings                              |                      10,000 |
| Trigram keys per definition / per run                  |             4,096 / 250,000 |
| Matcher-blocking posting proposals                     |                   2,000,000 |
| Combined handler events                                |                  10,000,000 |
| Pairwise or overlap suppression work                   |      100,000,000 units each |
| One matcher-edit or handler-LCS matrix                 | 100,000,000 estimated units |
| Aggregate verification and evidence work               |         1,000,000,000 units |

Project configuration and CLI flags may lower candidate and structural limits but cannot raise the
hard ceilings. Reaching a candidate-generation or verification limit preserves evaluated findings,
warns, and sets `analysis.truncated: true` with a nonzero skipped count. Exit status follows
finding severity unless `--fail-on-incomplete` is enabled. Baselines are never updated from
incomplete analysis.

## Report safety

Reports bound source snippets and cluster memberships, escape HTML, encode script-closing JSON
characters, and remove bidirectional, invisible-format, and Unicode Tag characters. JSONL content
still originates in the analyzed repository and must be treated as untrusted data rather than
agent instructions.

See [Reports](/docs/reports/) for presentation limits and
[Discovery and frameworks](/docs/discovery-and-frameworks/) for corpus-completeness rules.
