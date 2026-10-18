---
title: CLI Reference
description: Every CukeDedup command, flag, and exit code.
---

```
Detect duplicate and reusable Cucumber step definitions

Usage: cuke-dedup [OPTIONS] [PATH] [COMMAND]

Commands:
  check  Analyze a repository for duplicate and reusable step definitions
  help   Print this message or the help of the given subcommand(s)

Arguments:
  [PATH]  Directory to analyze when no explicit command is used [default: .]
```

## Global options

| Option                                       | Description                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `-c, --config <FILE>`                        | Explicit CukeDedup JSON configuration file                                         |
| `--reporters <REPORTERS>`                    | Reporters to run (terminal, json, jsonl, html, sarif)                              |
| `--output <DIR>`                             | Directory in which file-based reports are written                                  |
| `--threshold <PERCENT>`                      | Maximum percentage of definitions allowed in active duplication errors             |
| `--require-features`                         | Fail with exit code 2 when no feature files are discovered                         |
| `--fail-on-incomplete`                       | Fail with exit code 2 when the corpus or comparison set is incomplete              |
| `--fail-on-unparseable`                      | Fail with exit code 2 when a discovered source file cannot be parsed               |
| `--require-definitions`                      | Fail with exit code 2 when no step definitions are extracted                       |
| `--max-candidate-comparisons <COUNT>`        | Maximum unique definition pairs retained, up to the hard safety ceiling            |
| `--max-structural-class-comparisons <COUNT>` | Maximum structural proposals per handler class, up to the hard safety ceiling      |
| `--definitions <DEFINITIONS>`                | Glob patterns selecting step-definition source files                               |
| `--features <FEATURES>`                      | Glob patterns selecting Gherkin feature files                                      |
| `--explain-discovery`                        | Print the effective feature source and every discovered input                      |
| `--print-config`                             | Print the merged effective configuration as JSON and exit                          |
| `--no-metrics`                               | Omit runtime timing metrics from machine reports for reproducible output           |
| `--emit-fingerprints <FILE>`                 | Write one JSON line of comparison fingerprints per analyzed definition to FILE     |
| `--emit-pairs <FILE>`                        | Write one JSON line of verification evidence per evaluated definition pair to FILE |
| `--exclude <EXCLUDE>`                        | Glob patterns excluded from discovery (repeatable, comma-separated)                |
| `--no-default-excludes`                      | Disable built-in exclusions such as node_modules and target                        |
| `--include-hidden`                           | Descend into dot-directories such as `.steps`                                      |
| `--rule <RULE=SEVERITY>`                     | Override a rule severity, for example `duplicate-matcher=warning`                  |
| `--changed-since <GIT_REF>`                  | Report only findings involving files changed since this Git revision               |
| `--baseline <BASELINE.json>`                 | Suppress findings already present in a versioned semantic baseline                 |
| `--baseline-from-ref <GIT_REF>`              | Compare with a fetched Git revision using the current analysis configuration       |
| `--update-baseline`                          | Rewrite the configured baseline from the current complete analysis                 |
| `--fail-on-new [<COUNT>]`                    | Fail when more than COUNT findings are new relative to the baseline                |
| `-h, --help`                                 | Print help                                                                         |
| `-V, --version`                              | Print version                                                                      |

## Examples

```
cuke-dedup .
cuke-dedup check .
cuke-dedup . --reporters terminal,json,html
cuke-dedup . --reporters jsonl
```

## Exit codes

| Code | Meaning                                                                                |
| ---- | -------------------------------------------------------------------------------------- |
| `0`  | The configured quality gate passed.                                                    |
| `1`  | The duplication threshold, an error rule, or the new-finding allowance failed.         |
| `2`  | Discovery, parsing, configuration, or another operational error prevented a valid run. |

Warnings alone do not produce exit code `1`. See [CI and baselines](/docs/ci-and-baselines/) for
changed-file checks, baselines, and the GitHub Action, and [Configuration](/docs/configuration/)
for the file-based equivalents of these flags.
