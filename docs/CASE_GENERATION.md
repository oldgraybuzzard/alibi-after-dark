# Case generation prototype

This is a local developer CLI, not a public generation endpoint or a playable game. Nothing is automatically published. Generated files contain answers and must remain outside `public/` and player responses.

## Run

Use Node.js 22 or newer, run `npm install`, and configure the ignored `.env.local`:

```dotenv
OPENAI_API_KEY=your-local-key
OPENAI_MODEL=gpt-4.1-mini
```

Do not commit credentials. `OPENAI_MODEL` is optional; the default is `gpt-4.1-mini` for the initial prototype, not a final quality/cost choice.

```sh
npm test
npm run typecheck
npm run lint
npm run case:generate
npm run case:generate -- "A missing award at a seaside film festival"
```

Generation makes paid API calls. One run creates one candidate with at most five calls: truth, dossier, blind review, and at most one dossier/review repair. SDK retries are disabled. Each call has a 6,000 output-token cap and a 90-second request timeout; the pipeline has a shared 180-second deadline. These are usage bounds, not a dollar budget. Successful responses contribute input/output token counts to the result; failed requests may still incur costs not captured in those counts.

Output is saved under ignored `.local/cases/` using a unique ID and restrictive file permissions. Exit 0 means `needs-playtest`, exit 2 means `quarantined`, and exit 1 means an operational/schema failure. Operational failures do not produce an admitted case. Full durable job recovery is deferred.

## Case contract

`lib/cases/schema.ts` defines schema version 3 (earlier development candidates must be regenerated):

- Immutable truth: suspects, secrets, culprit, motive, method, chronological events, and a private proof plan covering the crime window and observable exclusions for each innocent suspect.
- Dossier: opening, readable evidence, gated deductions, choices, tiered hints, and accusation criteria.
- Evidence release: `null` means opening evidence; a deduction ID gates later evidence.
- Opening delivery: shared or distributed. Solo sees all opening evidence; group assignment is future session-service work.
- Accusation: decisive evidence plus an evidence-based exclusion for every innocent suspect.

`validateCase` checks schema shape, duplicate IDs, reference validity, chronology, numeric crime/alibi coverage, required access credentials, exclusion coverage, answer references, and graph reachability. It does not prove narrative truth, timing consistency within prose, answer fairness, or 20–30 minute play duration.

The blind reviewer receives only public suspect descriptions, all clue content, and deduction questions/choices. It never receives the intended culprit, secrets, answer keys, or reveal. It also receives per-deduction packets containing only the declared supporting clues and must assess each answer against its packet. These assessments share the same review request as the full case, so they are not isolated blind calls; human review is still necessary. Its inferred culprit must match the immutable truth and it must report a unique solution without contradictions or unsupported assumptions. It must also independently cite real evidence excluding every innocent suspect. The private proof plan and intended exclusions are never supplied to this reviewer. The reviewer is a separate call to the configured model, not an independent human or a guarantee of correctness.

Repairs regenerate the dossier around the original truth. Invalid truth is quarantined immediately. Passing cases always need playtesting before catalog admission.

## Player data boundary

`playerView` uses an explicit allowlist of player-facing fields and filters unreleased/unassigned evidence. Its session-state arguments must be read from trusted server storage, never accepted directly from browser input. It is a projection helper, not authentication or a complete multiplayer authorization system. Database policies, server-only service boundaries, hint release, and answer submission will be implemented when the session service is built.

## Next acceptance steps

Generate at least three candidates, inspect the review reports, independently playtest them, and measure repair rate, review time, duration, and cost. Do not declare Phase 1 complete until those checks establish the quality of the cases. No catalog, Supabase integration, or playable UI is included in this prototype.

API reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Verification record

The initial implementation passed 16 offline tests, TypeScript checking, ESLint, and a production Next.js build. After API credits were added, live generation succeeded in producing a candidate. The first candidate was quarantined after two attempts because of circular clue dependencies (4 calls, 4,273 input tokens, 3,526 output tokens). Inspection also found an early confession.

The generation prompt now specifies a fixed acyclic eight-clue/two-deduction structure and prohibits confessions and omniscient timeline summaries as evidence. Individual stories, suspects, and artifacts remain generated. This constrained structure is a prototype quality measure; broader deduction patterns need separate validation. The second live candidate passed structural checks but was quarantined by blind review because innocent suspects were not ruled out convincingly (5 calls, 5,747 input tokens, 3,860 output tokens). Across these two runs, 9 calls used 10,020 input tokens and 7,386 output tokens. No candidate has yet passed all checks or been independently playtested. Next focus: stronger evidence-based exclusions for innocent suspects, followed by another bounded quality evaluation.

API billing: https://platform.openai.com/settings/organization/billing

## Playtest packet export

After a candidate passes all automated checks:

```sh
npm run case:export -- .local/cases/<case-id>.json
```

This writes `player-packet.md` and a separate `answer-key.md` under `.local/playtests/<case-id>/`. Quarantined candidates cannot be exported. The player packet deliberately exposes all clues for a paper-style fairness review; it does not simulate staged release, timing, hints, or multiplayer. Record your accusation before opening the answer key. Both files remain private and ignored by Git.

The version 2 pipeline adds a private proof plan and requires blind-review exclusions with valid evidence references. All 19 automated tests pass. The first version 2 live candidate was quarantined because its remote-message mechanism still relied on an unsupported assumption (5 calls; 7,387 input and 4,754 output tokens). An exploratory simpler-premise/model run is separate from a controlled model comparison.

## Additional quality gates

The reviewer now flags early answer giveaways, implausible evidence capabilities, and gaps in supposedly continuous alibis. It must return a supported answer for every deduction and cite only that deduction's declared clues. Missing, duplicate, incorrect, or unsupported assessments prevent admission.

A GPT-4.1 candidate (`case-da80392b-ada2-4701-ae99-732227f6e5a6`) initially passed automation but failed subsequent editorial inspection: endpoint photos were treated as continuous alibis, cell triangulation was implausibly precise, a camera directly revealed the act, and deduction evidence/choices were flawed. The saved case was retired to `quarantined` with its original automated result preserved; its previously exported packets are marked retired. This is a concrete reason not to equate model review with playtest readiness.

The updated regression suite contains 23 passing tests. The default model remains unchanged; exploratory runs used `OPENAI_MODEL=gpt-4.1` only for those runs. Changing both a model and a premise does not establish which change affected quality.

The later festival-prize candidate (`case-f4984adb-df36-4738-b32d-a5f4e3e21a0a`) also passed automation but failed editorial inspection and was quarantined. No current candidate is ready for playtesting. See [generation evaluation](GENERATION_EVALUATION.md) for costs in tokens, specific failures, and the next constraint-model work.
