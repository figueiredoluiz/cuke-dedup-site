---
title: Discovery and Frameworks
description: How CukeDedup discovers definitions and features across the five supported workflows.
---

CukeDedup combines safe built-in discovery with statically readable project configuration. It
never executes framework configuration, package scripts, or test code.

## Supported frameworks

| Workflow               | Recognized registrations                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Cucumber.js            | `@cucumber/cucumber` and legacy `cucumber`; ESM, CJS, aliases, namespaces, and static local re-exports. |
| Playwright-BDD         | `createBdd()` registrations and `playwright-bdd/decorators` class-method decorators.                    |
| Cypress Cucumber       | `@badeball/cypress-cucumber-preprocessor` and legacy `cypress-cucumber-preprocessor/steps`.             |
| Jest-Cucumber          | `jest-cucumber` inline `defineFeature` → scenario → step callbacks; handler-reuse rules.                |
| Vitest Cucumber Plugin | ESM `Given`, `When`, and `Then` exports from `vitest-cucumber-plugin`; global step registry.            |

Package entrypoints are matched exactly. Plain Playwright projects are supported when their
Gherkin bindings use Cucumber.js or Playwright-BDD. Classic `.feature` files and Gherkin Markdown
`.feature.md` files are both discovered.

## Discovery topics in the repository

Each area below has a dedicated page in the source repository:

- **Supported registrations** — registration forms recognized per framework, how imports and
  aliases establish provenance, and what remains unsupported.
  [Read `discovery/registrations.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/registrations.md)
- **Feature discovery** — how feature paths are read from Playwright-BDD, Cypress and Cucumber.js
  setup when `features` is not configured, and which parser each extension selects.
  [Read `discovery/features.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/features.md)
- **Corpus boundaries** — one analysis root is one comparison corpus; scoping monorepos and
  feature-local registries, and why filtering features alone does not restrict definitions.
  [Read `discovery/corpus-boundaries.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/corpus-boundaries.md)
- **Generated and non-source content** — compressed, binary and minified sources are excluded
  before parsing, marked incomplete and reported.
  [Read `discovery/generated-content.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/generated-content.md)
- **Static module resolution** — relative modules, `tsconfig`/`jsconfig` paths, package `imports`
  and workspaces; ESM and CommonJS barrels; which export shapes resolve, which are inert, and
  which mark the corpus incomplete.
  [Read `discovery/module-resolution.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/module-resolution.md)
- **Incomplete corpora** — what marks a corpus incomplete, how reports expose it, and the flags
  that turn incompleteness into a failure.
  [Read `discovery/incomplete-corpora.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/incomplete-corpora.md)
- **Cucumber-Ruby** — experimental, opt-in Ruby support: selection, trust withdrawal,
  registrations and providers, handler and assertion evidence, matcher translation, ownership,
  dependencies, usage and parameter types.
  [Read `discovery/cucumber-ruby.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/cucumber-ruby.md)

## Cucumber-Ruby (experimental)

Ruby support is experimental. Select a single Ruby suite explicitly with
`--definitions 'features/**/*.rb' --features 'features/**/*.feature'`, include its support files,
and review findings before acting on them. The supported subset and known limitations are listed
in the
[repository's Cucumber-Ruby page](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/cucumber-ruby.md).
