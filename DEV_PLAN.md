# Alibi After Dark — Development Plan

## Objective

Build a commercially viable mystery game that is engaging alone and with friends, runs without a human host, and creates its case content automatically. The first milestone is proof that generated cases are coherent, solvable, and fun—not a large content library.

## Product constraints

- Support solo and private groups of 2–6 players using the same case truth.
- Target 20–30 minutes per case; allow discussion without a forced timer.
- Give players an intriguing clue within the opening minute and a useful deduction within the first few minutes.
- Build progress around deductions, not merely opening every document.
- Make each case self-contained with a complete explanation.
- Do not require the owner to author individual mysteries as a recurring production step.
- Keep a fixed case version throughout a session, including after reconnects or catalog updates.
- Avoid exposing hidden solutions or unreleased private evidence in client payloads.

## Platform and selected stack

Launch a mobile-first responsive web app for iPhone, Android, Mac, and Windows browsers. Friends join through a link or room code without installing an app. Native iOS/Android clients are a later phase after gameplay and commercial validation; dedicated desktop clients require demonstrated demand.

- **Next.js + TypeScript:** Player interface and server application.
- **Supabase:** PostgreSQL, authentication, storage for evidence assets, and realtime room updates.
- **Background AI generation service:** Case creation and validation through the OpenAI Responses API; production worker infrastructure remains open. The prototype uses configurable `gpt-4.1-mini`; evaluate quality and cost before finalizing the model.
- **GitHub:** Source control and change history.

Build a custom game engine for clue access, progression, hints, and scoring. Keep reusable case types and game rules separate from interface code so future clients can share the backend and logic. Native interfaces may require adaptation. No 3D game engine is planned.

Select hosting and background execution infrastructure before deployment. Case generation needs persistent job state, bounded retries, and recovery from interruption; do not assume a normal web request can run the full pipeline.

References: [Next.js documentation](https://nextjs.org/docs), [Supabase documentation](https://supabase.com/docs), and [realtime authorization](https://supabase.com/docs/guides/realtime/authorization).

Separate the system into:

| Component | Responsibility |
| --- | --- |
| Player application | Lobby, evidence viewer, notebook, case board, room chat, alerts, hints, accusation, reveal |
| Session service | Membership, permissions, progression, clue distribution, persisted chat, unread state, reconnects, group decisions |
| Case store | Immutable case versions, public artifacts, restricted solution data, validation reports |
| Generation worker | Background case creation, validation, bounded repair attempts, catalog admission |
| Internal review tools | Preview, feedback inspection, approval status, retirement, generation cost reporting |
| Access and billing | Host entitlements and payment integration after the gameplay pilot |

The server owns progression and evidence access. Use database row-level security and private realtime authorization to restrict room data to authorized members. Keep solution data and service credentials server-side. Persist chat and discoveries in the database; realtime delivery updates the interface but is not the only record of activity. Generation runs outside the live session path so provider latency or failure does not interrupt an accepted case.

## Phase 1 — Case model and generation prototype

**Implementation progress:** Added Zod case schemas, structural validation, a player-data projection, a local OpenAI generation CLI, blind review, one bounded dossier repair, and automated tests. Schema version 2 adds a private proof plan and requires independent evidence citations excluding every innocent suspect. A local exporter creates separate player and answer-key packets for passing cases. Review also checks each deduction against its declared clues and flags implausible evidence or early answer giveaways. Two automated passes failed editorial review and were retired; no candidate is ready for playtesting. See [generation evaluation](docs/GENERATION_EVALUATION.md). The next quality milestone is structured time/access constraints and isolated deduction review. Candidates remain private and marked `needs-playtest` or `quarantined`; passing automation does not admit them to a catalog. See [prototype instructions](docs/CASE_GENERATION.md). Three independently playtested candidates and measured quality/cost are still required to complete this phase.

Define a machine-readable case contract before building a large interface.

Include:

- Case identity, version, difficulty, tone, and estimated duration.
- Ground truth: culprit, motive, method, and ordered events.
- Suspects, statements, secrets, and links to supporting or contradicting evidence.
- Evidence artifacts with stable identifiers, visibility, release conditions, and plain-text equivalents.
- Leads, deduction requirements, interview choices, hint tiers, and final explanation.
- Accepted accusation criteria and the evidence needed to establish the answer.

Build a bounded generation pipeline: truth → evidence and deduction structure → narrative rendering → validation → repair or rejection. Use explicit time and cost limits; cases that exceed repair limits are quarantined.

Validation combines deterministic schema/reference/timeline checks with an independent model-based review and human playtesting. Check for circular unlocks, inaccessible essential clues, unsupported conclusions, plausible alternate culprits, and accidental spoilers. Model review is supporting evidence, not a proof of solvability.

Create development cases through this pipeline. “The Last Guest,” involving a missing host at a lakeside reunion whose phone continues sending messages, is an optional seed premise—not a requirement to manually write a case. Its solution must explain the phone behavior plausibly.

**Exit criteria:** At least three generated candidates pass recorded automated checks and an independent playtest. Testers can explain the answer using only available clues. Failures inform reusable generation rules rather than an ongoing requirement to hand-edit every case.

## Phase 2 — Playable solo investigation

Build one complete session flow:

1. Select a case and begin the opening hook.
2. Examine evidence and track observations.
3. Connect clues or answer a deduction prompt to unlock leads.
4. Explore authored-by-generation interview branches.
5. Request progressive hints when needed.
6. Submit culprit and supporting evidence.
7. View the explanation and submit feedback.

Use text, messages, receipts, and structured records first. Add photos or audio only when needed by the case design; provide accessible equivalents and ensure essential visual details survive rendering. Decorative assets must not contradict evidence.

Use structured accusation scoring for the first release. Optional written reasoning can be collected without making an unreliable free-text grader the sole authority on correctness.

**Exit criteria:** A tester can complete the full investigation, reload and resume, and understand the reveal. Hints recover stalled progress. The answer cannot be read from initial client data.

## Phase 3 — Cooperative rooms

Add host-created rooms, invite links/codes, display names, lobby readiness, and server-managed membership. Provisional behavior: the host starts the session and confirms the final accusation after players can indicate readiness.

Distribute different starting evidence, support explicit sharing to the common board, and synchronize discoveries. Show who contributed each discovery without turning cooperation into a speed contest.

Add persistent room text chat and a “share clue” action that grants the group access to that evidence and posts a reference in the conversation. Keep player chat visually distinct from fictional suspect messages. Reconnects must recover missed messages and discoveries without duplicating them. Define message length limits, rate limits, and retention behavior.

Support spoken conversation in person and optional external voice calls. Do not integrate device SMS or initiate calls. Built-in voice/video is deferred.

### In-game notifications

| Event | First-release behavior |
| --- | --- |
| New chat message | Unread indicator and optional sound |
| Shared evidence | Brief alert and case-board highlight |
| New lead | Group announcement |
| Host starts the game | In-game alert |
| Disconnect/reconnect | Quiet participant status change |

Provide room mute and separate sound controls without hiding saved activity. Restore unread state and missed updates when a player returns. Announce important updates accessibly without requiring sound. No essential clue or action may depend on notification delivery.

Push notifications are a later milestone. Before implementing them, verify browser/device support and installation requirements. Ask permission when a player requests a useful reminder; use spoiler-free wording, batch updates, suppress pushes during active play, and separate new-case opt-in from game alerts. SMS and email are not part of the initial notification system.

Define and implement host transfer, reconnect behavior, late joining, and recovery of essential clues when a player leaves. Recovery should happen through visible game rules so evidence does not disappear silently.

**Exit criteria:** Complete representative sessions with 2, 4, and 6 participants. Verify reconnects, simultaneous actions, host departure, clue recovery, chat persistence, shared-clue access, unread recovery, and mute/sound controls across representative phone and desktop browsers. Players outside the room cannot access its state; members cannot fetch unreleased clues or the solution.

## Phase 4 — Quality, operations, and pilot

Add catalog admission/retirement controls, issue reporting, generation job observability, and event instrumentation. Early review may be manual; routine generation and validation should become automated as measured quality allows. Retiring a case prevents new sessions without corrupting active sessions.

Evaluate:

| Question | Evidence |
| --- | --- |
| Does the opening engage players? | Time to first meaningful action and early abandonment |
| Are deductions fair? | Completion, hint usage, unsupported-solution reports, observed playtests |
| Does group play involve everyone? | Evidence contributions and participant feedback |
| Do players want another case? | Second-case starts and return play |
| Is automation economical? | Acceptance rate, repair attempts, review minutes, cost per accepted case |
| Can sessions be operated reliably? | Failures, reconnect outcomes, latency, cost per completed session |

Set numerical launch thresholds after an initial pilot baseline. Track solo and group results separately and avoid collecting unnecessary private player content.

**Exit criteria:** Pilot findings support another-case demand, manageable content review, and acceptable unit costs. Critical fairness, access-control, and session reliability issues are resolved.

## Phase 5 — Monetization and launch

Validate case packs versus membership before committing to pricing. Implement one free introduction, host-owned access, and free guest participation in paid rooms.

Add server-side entitlement checks, purchase restoration where applicable, clear cancellation/refund handling appropriate to the selected channel, support contact, privacy disclosures, retention/deletion behavior, and age/content positioning. Verify payment events are processed idempotently.

Finish name/domain checks and appropriate brand clearance before investing in final identity. Native store distribution and its payment requirements are a separate platform decision.

**Exit criteria:** Purchase, access, failed payment, cancellation, and recovery flows are tested in the chosen provider’s test environment. Launch readiness includes gameplay quality and operating cost evidence, not just working checkout.

## Verification strategy

Focus automated tests on case invariants, deduction reachability, evidence permissions, accusation scoring, session transitions, and payment entitlements when introduced. Use end-to-end checks for the solo loop and multiplayer join/chat/share/reconnect/finish flow, including room isolation and missed-activity recovery. Check responsive layouts, keyboard navigation, and accessible alerts on the chosen browser/device matrix. Playtest mystery fairness and enjoyment; those cannot be established by schema checks alone.

## Main risks and responses

| Risk | Response |
| --- | --- |
| Generated cases contain contradictions or multiple defensible answers | Structured truth, bounded generation, independent review, playtests, rejection and retirement |
| Cases feel repetitive | Vary deduction structures, settings, motives, and evidence patterns; track similarity |
| One player solves everything | Distribute meaningful evidence and test contribution balance |
| A missing player blocks progress | Recover essential clues and preserve shared discoveries |
| Generation or live AI costs consume revenue | Batch/reuse cases, cap retries, measure accepted-case cost, avoid mandatory live AI |
| Private evidence or answers leak | Server-side access control and scoped client responses |
| Content production still needs excessive owner labor | Measure review time and rejection rates; improve constraints before scaling |

## Decisions to resolve next

1. Define the supported browser/device matrix for the web-first release.
2. Select hosting and production background worker infrastructure; evaluate the prototype’s OpenAI model for quality and cost.
3. Define audience, content boundaries, and the first case difficulty.
4. Define guest identity and saved-progress requirements.
5. Implement the case schema and generation prototype before expanding the catalog or adding billing.

## Deferred features

Open-ended suspect chat, personalized cases generated on demand, public matchmaking, competitive modes, built-in voice/video, push notifications, SMS/email alerts, asynchronous multi-day play, connected seasons, and native apps. Revisit these after the core experience and content economics are demonstrated.

## Solo completion implementation update

Implemented final accusation submission, database-owned verdicts, immutable session completion, and a solution reveal that can be revisited from the library. Reasoning is optional and ungraded. Local RLS tests cover ownership and completion rules. Hosted migration rollout and an authenticated browser playthrough remain required before release; hints and group play remain subsequent work.

## Rollout verification update

Local SQL coverage passes 46 checks, including invalid-evidence rejection, failed-submission rollback, persisted notes, and final scoring for wrong evidence. All four migrations are deployed to the hosted Alibi project, migration history is aligned, and database checks confirm the training solution is configured. Hosted advisors report only the plan-level leaked-password-protection warning. The primary authenticated solo flow passes desktop and mobile browser acceptance, including persistence, scoring branches, and signed-out route protection. A separate-account isolation check remains. See [rollout and verification](docs/ROLLOUT.md) for the deployment record and browser checklist.

## Error recovery, hints, and constraint validation

Implemented controlled accusation fields with inline validation/save errors, plus three on-demand hints for each visible unsolved deduction. Hint access checks the owned active session on the server; hint display itself is not persisted across reloads. Added version-3 physical-crime constraints and regression checks before dossier generation. Browser testing of these changes and the second-account isolation check remain pending because the browser tool's security-policy verification failed. Existing SQL ownership tests continue to cover cross-account access.

User acceptance: on September 21, the user confirmed the corrected accusation layout looked good and completed the training case. The separate-account browser isolation check remains pending.
