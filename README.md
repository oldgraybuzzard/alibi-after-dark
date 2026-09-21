# Alibi After Dark

*Everyone has a story. Find the one that breaks.*

Alibi After Dark is a suspenseful detective game for one player or a group of friends. Investigate messages, witness statements, photos, and other evidence; compare stories; expose contradictions; and make an accusation supported by clues.

## Project status

Early development. The Next.js starter and a local case-generation prototype are implemented. The prototype includes a typed case contract, structural validation, a blind AI review, and private candidate files. A playable interface, multiplayer service, and deployment are not implemented yet.

Alibi After Dark is the working name. An initial user search found no exact App Store match; broader name, domain, and trademark checks remain open.

## The experience

- **Solo:** Explore the full case at your own pace, with a notebook and optional hints.
- **Group:** A host creates a private room for 2–6 players. Players receive different opening clues and bring evidence together on a shared case board.
- **Session length:** Target 20–30 minutes, without a forced countdown.
- **Tone:** Suspenseful and cinematic, with occasional humor. Exact content limits are still to be defined.
- **Resolution:** Identify the culprit, explain the method or motive, and select supporting evidence. The reveal explains the timeline and resolves the central contradictions.

The core loop is **discover evidence → form a theory → compare accounts → expose a contradiction → unlock a lead → make an accusation**.

Private clues should create conversation without making an absent player a permanent blocker. Shared clues remain accessible to the group, and essential evidence needs a recovery path.

## Automatically generated mysteries

The product must not depend on the owner writing each case. We build the reusable game engine, generation rules, evidence templates, and quality checks; the system produces individual mysteries and runs sessions without a human host.

Proposed content pipeline:

1. Generate a structured, fixed truth: events, culprit, motive, method, and timeline.
2. Derive suspects, statements, secrets, clues, and a deduction path from that truth.
3. Validate consistency, clue accessibility, and whether the intended solution is supported.
4. Revise or reject failing cases before they enter the playable catalog.
5. Save approved case versions and bind every session to one version.

Generate and validate cases in batches, then reuse them across sessions to control cost and enable review. Automated checks reduce risk; they do not guarantee every mystery is fair or enjoyable. Early playtesting and ongoing quality sampling are part of the plan.

The initial release will use constrained evidence and interview choices. Open-ended AI interrogation and personalized on-demand cases are later possibilities, subject to consistency and cost testing.

## First release scope

- A responsive web experience designed for phones and desktop browsers.
- Solo sessions and private cooperative rooms.
- A small catalog of automatically generated, validated cases.
- Evidence viewer, shared case board, guided interviews, progressive hints, and final accusation.
- Private room text chat with clue sharing.
- In-game alerts, unread indicators, and optional sound controls.
- Session persistence, reconnect support, and completed-case explanations.
- A basic internal workflow for inspecting, rejecting, and retiring generated cases.

## Platforms

Launch as a responsive, mobile-first web app that players can open on iPhone, Android, Mac, and Windows through a browser. Invitations use links or room codes; installation is not required. Test the supported browsers and devices before release.

Consider native iOS and Android apps after validating gameplay, repeat usage, and monetization. Keep Mac and Windows browser-based unless demand supports dedicated desktop apps. Shared backend services and game logic should support future clients; native interfaces may still require adaptation.

## Chat and notifications

Private in-game text chat and evidence sharing are the default for remote groups. People in the same room can talk aloud; remote players can optionally use their own phone call, FaceTime, Discord, or another external voice service. The game does not automatically access native messages or initiate calls.

The first release uses in-game alerts for chat, shared evidence, new leads, and game start, with unread indicators, room mute, and sound controls. Preserve missed activity so returning players can catch up. Essential progress must never depend on receiving a notification.

Push notifications are deferred. When added, verify current browser/device requirements, request permission in context, use spoiler-free summaries, group repeated updates, and suppress pushes while the player is active in the room. New-case announcements need a separate opt-in. Automatic SMS and email notifications are outside the initial scope.

Public matchmaking, built-in voice/video, asynchronous multi-day investigations, and connected seasons are also outside the initial scope.

## Commercial direction

Candidate model: one free introductory case followed by paid case packs or a membership. For group sessions, the host owns access and friends join free. Pricing and packaging require validation; neither is final.

Track generation and validation costs per accepted case, operating cost per session, completion, repeat play, and willingness to pay. Monetization should support uninterrupted investigations.

## Development

See [DEV_PLAN.md](DEV_PLAN.md) for milestones, architecture direction, acceptance criteria, and open decisions.

The selected starting stack is:

| Tool | Role |
| --- | --- |
| Next.js + TypeScript | Player interface and server application: lobby, case files, chat, evidence board, and accusations |
| Supabase | PostgreSQL database, authentication, file storage, and realtime updates for private rooms |
| Background AI generation service | Automatically generate and validate case content; OpenAI Responses API for the prototype; production worker infrastructure remains to be selected |
| GitHub | Source control and change history |

A custom game engine controls evidence access, progression, hints, and scoring. AI creates case content; the engine enforces consistent rules and session state. A 3D game engine is not needed for the planned experience.

The prototype uses the OpenAI Responses API, with `gpt-4.1-mini` as a configurable starting model. Hosting and production worker infrastructure remain open decisions. Never commit credentials or provider API keys.

### Local development

Use Node.js 22 or newer and install dependencies with `npm install`. Start the starter app with `npm run dev`.

```sh
npm test
npm run typecheck
npm run lint
npm run case:generate
```

`case:generate` reads `OPENAI_API_KEY` from the ignored `.env.local` file and makes paid API calls. It writes private case candidates and reports under ignored `.local/cases/`; passing candidates still need playtesting. Use `npm run case:export -- .local/cases/<case-id>.json` to create a player packet and a separate answer key for a passing candidate. See [case generation instructions](docs/CASE_GENERATION.md) for setup, limits, and the data boundary. No generation endpoint is exposed to players.

Technical references: [Next.js](https://nextjs.org/docs), [Supabase](https://supabase.com/docs), and [Supabase realtime authorization](https://supabase.com/docs/guides/realtime/authorization).

Repository: https://github.com/oldgraybuzzard/alibi-after-dark
