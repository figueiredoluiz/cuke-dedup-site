---
title: Contributing
description: Bug reports, development setup, checks, and pull-request expectations.
---

Thanks for helping. This page covers what you need to open a pull request. Maintainer detail
(gates, coverage rules, corpus and benchmark tooling) is in the repository's
[`docs/development.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/development.md);
release steps are in
[`docs/releasing.md`](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/releasing.md).

## Reporting a bug

Include a small `.feature` file and a step-definition sample. Remove application secrets and
identifiers first. Use the
[issue templates](https://github.com/figueiredoluiz/cuke-dedup/issues) for reproducible bugs and
focused feature requests, and report vulnerabilities privately according to
[SECURITY.md](https://github.com/figueiredoluiz/cuke-dedup/blob/main/SECURITY.md).

## Setup

| Tool                 | Version                                  | Notes                                                         |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Rust (rustup)        | `1.98.1` pinned in `rust-toolchain.toml` | Development, rust-analyzer and release builds.                |
| Rust MSRV            | `1.90` in `Cargo.toml`                   | CI tests it separately, plus current stable.                  |
| Node.js              | 24 LTS                                   | npm launcher and check scripts. CI also tests Node.js 20.     |
| Python 3             | any                                      | Release packaging and docstring checks (`python` on Windows). |
| Gitleaks, actionlint | current                                  | Secret scan and workflow lint in the hooks.                   |

Install the check tools and enable the hooks:

```sh
npm ci --prefix scripts/check/tools
git config core.hooksPath .githooks
```

The pre-commit hook scans the staged patch for secrets and runs the quick gate. The pre-push hook
runs the full gate on a clean checkout of the pushed commit. Fetch `origin main` before pushing.

## Running the checks

| Command                                                  | What it does                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `scripts/check/preflight.sh`                             | Whitespace, `rustfmt`, Ruby keyword table, checker unit tests, language boundaries, docs parity. Fastest feedback. |
| `scripts/check/check.sh --quick`                         | Preflight plus clippy and the test suite. Runs in pre-commit.                                                      |
| `scripts/check/check.sh`                                 | The complete gate CI runs. Runs in pre-push.                                                                       |
| `cargo test --all-targets --all-features --locked`       | Unit and integration tests only.                                                                                   |
| `cargo build --release --locked && npm run corpus:check` | End-to-end corpus, recall and reporter parity. Needs a fresh release build.                                        |

Build the release binary before any corpus or benchmark command; the checkers run whatever binary
is on disk.

## Making a change

- Keep the boundaries: source adapter → shared IR → analysis → reporters.
- Every bug fix adds a focused regression test. Prefer small inline fixtures. Never commit
  third-party repositories or private code.
- Output is deterministic. Keep ordering and the JSON schema unless the change introduces a
  documented schema version. A reporter change keeps active finding counts, rule, message and
  location evidence, and threshold results equal across terminal, JSON, JSONL, HTML and SARIF.
- Commit subjects use Conventional Commits with a scope, `type(scope): summary`, for example
  `fix(gherkin): keep outline headers after a stray angle bracket`.

## Corpus cases

End-to-end fixtures live in
[`fixtures/corpus`](https://github.com/figueiredoluiz/cuke-dedup/tree/main/fixtures/corpus); exact
findings that must stay detectable, deliberate non-findings and budgeted known misses live in
[`fixtures/recall`](https://github.com/figueiredoluiz/cuke-dedup/tree/main/fixtures/recall). Add a
case for parser, discovery, policy or reporting regressions, and state in a comment which property
the case pins. Never add a known miss to make CI pass.

## Pull requests

- Describe the user-visible problem, the chosen behaviour and the validation you ran.
- One behaviour class per pull request. Maintainers may ask to split a change that mixes parser,
  rule, reporter and distribution work.
- CI runs on Linux, macOS and Windows: tests at the MSRV and on stable, coverage, clippy and
  rustdoc, dependency policy, secret history scan, the parser fuzz target, clean-room Cargo and
  npm installs, the corpus and reporter parity, the npm launcher, and release packaging.

The project maintainer has final responsibility for scope, compatibility and release decisions.
