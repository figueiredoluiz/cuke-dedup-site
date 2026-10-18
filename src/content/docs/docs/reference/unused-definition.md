---
title: 'Unused Definition'
description: 'No discovered feature step uses the definition.'
sidebar:
  order: 8
---

# unused-definition

No successfully parsed concrete feature step matches a definition. This rule is disabled when the
feature corpus is absent or incomplete because the run cannot prove non-use. Remove the
definition, add the missing scenario, or suppress it when external or generated features provide
the usage.

## Language support

| JavaScript/TypeScript | Cucumber-Ruby                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Feature-file usage.   | Feature-file usage and literal `step` calls; dynamic `step`/`steps` calls disable the rule. |

Cucumber-Ruby support is experimental; see [Cucumber-Ruby](https://github.com/figueiredoluiz/cuke-dedup/blob/main/docs/discovery/cucumber-ruby.md).

Back to the [rule index](/docs/rules/#unused-definition).
