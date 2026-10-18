---
title: 'Normalized Matcher'
description: 'Matchers become equivalent after normalization.'
sidebar:
  order: 2
---

# normalized-matcher

Matchers become equal after Unicode, whitespace, placeholder, and regular-expression
normalization, although their original source differs. Distinct matcher kinds or meaningful regex
flags remain distinct. Consolidate the definitions or rewrite the intended distinction so it
survives normalization.

## Language support

| JavaScript/TypeScript | Cucumber-Ruby                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Supported.            | Supported for Cucumber Expressions and the translated Ruby regex subset. Other regexes are indeterminate and the run is incomplete. |

Cucumber-Ruby support is experimental; see [Cucumber-Ruby](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/cucumber-ruby.md).

Back to the [rule index](/docs/rules/#normalized-matcher).
