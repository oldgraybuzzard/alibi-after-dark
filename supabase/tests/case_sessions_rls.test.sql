begin;
select plan(21);

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
  $$insert into public.investigation_sessions (user_id, case_id, case_version)
    values ('11111111-1111-1111-1111-111111111111', 'midnight-ledger', 1)$$,
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
select lives_ok(
  $$insert into public.investigation_sessions (user_id, case_id, case_version)
    values ('11111111-1111-1111-1111-111111111111', 'midnight-ledger', 1)$$,
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
  $$select * from private.deduction_answers$$,
  '42501',
  null,
  'authenticated users cannot read private answer keys'
);
select lives_ok(
  $$insert into public.deduction_attempts (session_id, user_id, deduction_id, choice_id)
    select id, user_id, 'deduce-access', 'access-ellis' from public.investigation_sessions$$,
  'the owner can submit a deduction attempt'
);
select results_eq(
  $$select cardinality(solved_deduction_ids) from public.investigation_sessions$$,
  array[0],
  'a wrong answer does not change progress'
);
select lives_ok(
  $$insert into public.deduction_attempts (session_id, user_id, deduction_id, choice_id)
    select id, user_id, 'deduce-access', 'access-mara' from public.investigation_sessions$$,
  'the owner can submit the correct answer'
);
select results_eq(
  $$select solved_deduction_ids from public.investigation_sessions$$,
  array[array['deduce-access']::text[]],
  'a correct answer persists the solved deduction'
);
select lives_ok(
  $$insert into public.deduction_attempts (session_id, user_id, deduction_id, choice_id)
    select id, user_id, 'deduce-access', 'access-mara' from public.investigation_sessions$$,
  'repeating a correct answer is accepted'
);
select results_eq(
  $$select solved_deduction_ids from public.investigation_sessions$$,
  array[array['deduce-access']::text[]],
  'repeating a correct answer is idempotent'
);
do $$
begin
  perform set_config(
    'test.owner_session_id',
    (select id::text from public.investigation_sessions limit 1),
    true
  );
end;
$$;
select throws_ok(
  $$insert into public.investigation_sessions (user_id, case_id, case_version, solved_deduction_ids)
    values ('11111111-1111-1111-1111-111111111111', 'midnight-ledger', 1, array['forged'])$$,
  '42501',
  null,
  'authenticated users cannot set progress when starting sessions'
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
select throws_ok(
  $$insert into public.deduction_attempts (session_id, user_id, deduction_id, choice_id)
    values (
      current_setting('test.owner_session_id')::uuid,
      '22222222-2222-2222-2222-222222222222',
      'deduce-alibis',
      'alibis-ellis-nora'
    )$$,
  '42501',
  null,
  'another user cannot submit an attempt for the owner investigation'
);
select lives_ok(
  $$insert into public.investigation_sessions (user_id, case_id, case_version)
    values ('22222222-2222-2222-2222-222222222222', 'midnight-ledger', 1)$$,
  'another user can start their own investigation'
);
select results_eq(
  $$select count(*)::integer from public.investigation_sessions$$,
  array[1],
  'the other user sees only their own investigation'
);

select * from finish();
rollback;