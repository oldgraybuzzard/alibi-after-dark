# Database rollout and solo acceptance

## Current verification

The local database has all three checked-in migrations. The database suite passes 46 checks, including owner isolation, deduction progression, final scoring, and rollback when a submission fails validation. These tests run inside transactions and do not retain test accounts or sessions.

Hosted migration status has **not** been verified. During the September 20, 2026 check, the CLI account listed only ACI Member App; it did not list the configured Alibi project (`rsqaelvcpfvqqjajmhnx`). An explicit migration dry run failed because the network did not support the direct IPv6 connection. A subsequent `supabase link --project-ref rsqaelvcpfvqqjajmhnx` attempt confirmed an explicit project-access denial: the CLI account lacks the necessary privileges. Reauthentication with an account that can access Alibi is required before migration. No hosted migration was applied. Browser acceptance is also pending: the browser tool could not verify its required security policy and denied access to the local preview.

## Apply to the hosted project

Follow the [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations). Run from the repository root. Authenticate the CLI with an account that can access the Alibi project; do not paste credentials into chat or commit them.

```sh
supabase login
supabase projects list
```

Confirm the Alibi project is listed and its reference matches the host in `NEXT_PUBLIC_SUPABASE_URL`. Do not select the unrelated ACI project. Then link using the pooler-capable default connection:

```sh
supabase link --project-ref rsqaelvcpfvqqjajmhnx
supabase migration list --linked
supabase db push --linked --dry-run --skip-vault
```

Review the dry run. Expected repository migrations, in order:

1. `20260921001711_create_case_catalog_and_solo_sessions.sql`
2. `20260921005637_add_deduction_progression.sql`
3. `20260921013341_add_final_accusations.sql`

Only unapplied migrations should be pending. If existing tables conflict or history differs, reconcile the actual schema before proceeding; do not reset the hosted database or mark migrations applied without verifying their contents.

```sh
supabase db push --linked --skip-vault
supabase migration list --linked
supabase db advisors --linked --level warn
```

Verify the expected catalog and answer configuration with a read-only query:

```sh
supabase db query --linked "select c.case_id, c.version, c.admission_status, s.case_id is not null as solution_configured from public.case_catalog c left join private.case_solutions s on s.case_id = c.case_id and s.case_version = c.version where c.case_id = 'midnight-ledger' and c.version = 1"
```

Expect one training case with `solution_configured = true`. Keep private tables and trigger functions inaccessible to player roles. Configure the application environment for this same project and verify authentication redirect URLs for the application origin.

## Local regression suite

With the existing local Supabase stack running:

```sh
supabase test db --local
npm test
npm run typecheck
npm run lint
npm run build
```

The SQL tests cover correct and incorrect suspects, a correct suspect with insufficient supporting evidence, duplicate/unknown/null exhibits, forged verdicts, oversized notes, failed-submission rollback, immutable completion, and rejection of deductions after completion.

## Browser acceptance checklist — pending

Use a dedicated test account and a second account for isolation checks. Run on desktop and a narrow phone viewport. Record failures rather than marking this complete based on the SQL suite.

- Sign in, start The Midnight Ledger, and confirm the initial page shows only opening exhibits and no solution.
- Submit an incorrect deduction; verify progress stays unchanged.
- Confirm one deduction, reload, return to the library, and resume the same session. Confirm progress and released evidence persist.
- Confirm both deductions. Verify the final accusation becomes available.
- Submit an invalid exhibit count; confirm the error is visible and the case remains active.
- Submit a suspect with exactly two exhibits and optional notes. Verify completion, saved notes, and solution reveal.
- Return to the library and reopen the completed result. Reload and verify it remains unchanged.
- Repeat in separate sessions with an incorrect suspect and with the correct suspect but wrong supporting exhibits. Neither should count as solved.
- Use a second account and a signed-out browser to open the first account's investigation URL. Neither may see the case data or reveal.
- Verify keyboard navigation, visible focus, pending buttons, readable errors, and no horizontal overflow on a phone viewport.

Progressive hints are the next gameplay feature once this release path is verified; interviews and cooperative rooms follow the development plan.
