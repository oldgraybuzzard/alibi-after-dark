# Generation quality evaluation — September 20, 2026

## Result

The generator and validation pipeline operate end to end, but none of the evaluated cases is ready for player testing. Two automated passes failed editorial inspection. Do not publish these cases or treat the model reviewer as a sufficient quality gate.

## Current iteration

| Candidate | Model | Calls | Input tokens | Output tokens | Final result |
| --- | --- | --- | --- | --- | --- |
| b54a36e9 | gpt-4.1-mini | 5 | 7,387 | 4,754 | Quarantined automatically: unsupported remote-message assumption |
| da80392b | gpt-4.1 | 3 | 4,597 | 3,438 | Automated pass retired: weak alibis, implausible location evidence, direct answer giveaway, flawed deductions |
| f4984adb | gpt-4.1 | 3 | 4,883 | 2,919 | Automated pass retired: alibi interval gap, unexplained safe access, conflicting witness timeline |

Total for this iteration: 11 API calls, 16,867 input tokens, 11,111 output tokens. These are recorded token counts, not dollar costs. Earlier runs are documented separately in CASE_GENERATION.md. Premises and prompts changed alongside models, so this is exploratory evaluation rather than a controlled model comparison.

## Improvements implemented

- Version 2 truth schema with a private evidence plan for the culprit and every innocent suspect.
- Structural checks for exclusion coverage and event references.
- Blind-review exclusions must cite real clues and cover the intended innocent suspects.
- Per-deduction evidence packets, answer checks, and citation restrictions.
- Narrative quality checks for early giveaways, implausible evidence, and weak alibis.
- Player packet export with a separate answer key; quarantined cases are rejected.
- 23 passing regression tests, TypeScript, lint, and production build.

## What the failures establish

Generating plausible prose is easier than generating a fair puzzle. Both generation and review can repeat the same faulty assumption. Merely adding more prompt instructions has not demonstrated reliable admission quality.

The next implementation should represent critical facts as structured constraints: numeric crime/alibi intervals, locations, travel limits, locks and required credentials, and evidence that supports each fact. Deterministic checks should verify interval coverage and access requirements before narrative rendering. Review should solve individual deductions in separate calls without access to future clues, and a reasoning-model comparison should use fixed premises and recorded criteria.

This keeps content generation automatic. The owner does not need to write or manually repair each mystery; failed generated content remains quarantined while reusable rules improve. Human playtests remain necessary to measure fun, pacing, and residual ambiguity. The 20–30-minute duration target remains unvalidated.
