begin;
select plan(13);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

set local role anon;
select throws_ok(
  $$select * from public.case_catalog$$,
  '42501',
  null,
  'signed-out visitors cannot read the catalog'
);
select throws_ok(
  $$select * from public.investigation_sessions$$,
  '42501',
  null,
  'signed-out visitors cannot read sessions'
);
select throws_ok(
  $$select public.start_solo_investigation('midnight-ledger', 1)$$,
  '42501',
  null,
  'signed-out visitors cannot start sessions'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select title from public.case_catalog where case_id = 'midnight-ledger' and version = 1$$,
  array['The Midnight Ledger'],
  'authenticated users can read admitted catalog metadata'
);
select ok(
  public.start_solo_investigation('midnight-ledger', 1) is not null,
  'the start function creates an investigation'
);
select results_eq(
  $$select count(*)::integer from public.investigation_sessions$$,
  array[1],
  'the owner can read the created investigation'
);
select results_eq(
  $$select status || ':' || mode || ':' || cardinality(solved_deduction_ids) || ':' || cardinality(assigned_evidence_ids) || ':' || cardinality(shared_evidence_ids) from public.investigation_sessions$$,
  array['active:solo:0:0:0'],
  'new investigations have canonical empty progress'
);
select throws_ok(
  $$insert into public.investigation_sessions (user_id, case_id, case_version) values ('11111111-1111-1111-1111-111111111111', 'midnight-ledger', 1)$$,
  '42501',
  null,
  'authenticated users cannot insert session rows directly'
);
select throws_ok(
  $$update public.investigation_sessions set solved_deduction_ids = array['forged']$$,
  '42501',
  null,
  'authenticated users cannot forge progress directly'
);
select throws_ok(
  $$delete from public.investigation_sessions$$,
  '42501',
  null,
  'authenticated users cannot delete sessions directly'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$select id from public.investigation_sessions$$,
  'another user cannot read the owner investigation'
);
select ok(
  public.start_solo_investigation('midnight-ledger', 1) is not null,
  'another user can start their own investigation'
);
select results_eq(
  $$select count(*)::integer from public.investigation_sessions$$,
  array[1],
  'the other user sees only their own investigation'
);

select * from finish();
rollback;