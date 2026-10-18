---
title: Installation
description: Install CukeDedup with Cargo, npm, or from source — plus the Agent Skill.
---

## Cargo

```sh
cargo install cuke-dedup
```

## npm

In a JavaScript project, using Node.js 24 LTS (recommended):

```sh
npm install --save-dev cuke-dedup
npx cuke-dedup .
```

Node.js 20 remains the minimum compatible version and is tested in CI. Platform-specific native
binaries are installed automatically as optional dependencies for macOS, Linux, and Windows on
x64 and ARM64.

## Building from source

Requires Rust 1.90 or newer:

```sh
cargo build --release --locked
```

## GitHub Action

The Action downloads a native binary and verifies its checksum and build provenance — see
[CI and baselines](/docs/ci-and-baselines/).

## Agent Skill

CukeDedup includes an Agent Skill for safely interpreting and remediating JSONL findings:

```sh
npx skills add figueiredoluiz/cuke-dedup --skill cuke-dedup
```

From a local checkout, use `npx skills add ./skills --skill cuke-dedup`. The installer can target
supported coding agents or install globally; run `npx skills add --help` for agent and scope
options. Invoke it as `$cuke-dedup` where supported, or ask the agent to analyze and safely fix
duplicate Cucumber step definitions. The skill is distributed independently from the Cargo and npm
packages.

## Verifying a release

Release archives include SHA-256 checksums, keyless Sigstore bundles, and GitHub build provenance:

```sh
gh attestation verify <archive> \
  --repo figueiredoluiz/cuke-dedup \
  --signer-workflow figueiredoluiz/cuke-dedup/.github/workflows/release.yml
```

Published versions and release notes are maintained in
[GitHub Releases](https://github.com/figueiredoluiz/cuke-dedup/releases).
