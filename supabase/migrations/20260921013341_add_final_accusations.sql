set local check_function_bodies = off;

create table "private"."case_solutions" (
  "case_id"                text    not null,
  "case_version"           integer not null,
  "culprit_id"             text    not null,
  "suspect_ids"            text[]  not null,
  "evidence_ids"           text[]  not null,
  "required_evidence_ids"  text[]  not null,
  "required_deduction_ids" text[]  not null,
  constraint "case_solutions_pkey" primary key (case_id, case_version)
);

alter table "private"."case_solutions"
  enable row level security;

create table "public"."accusations" (
  "session_id"   uuid                     not null,
  "user_id"      uuid                     not null,
  "suspect_id"   text                     not null,
  "evidence_ids" text[]                   not null,
  "reasoning"    text                     not null default ''::text,
  "is_correct"   boolean                  not null,
  "created_at"   timestamp with time zone not null default now(),
  constraint "accusations_pkey" primary key (session_id),
  constraint "accusations_reasoning_check" check ((char_length(reasoning) <= 2000))
);

alter table "public"."accusations"
  enable row level security;

create or replace function private.finish_investigation()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
 investigation public.investigation_sessions%rowtype;
 solution private.case_solutions%rowtype;
begin
 if auth.uid() is null or new.user_id is distinct from auth.uid() then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 select * into investigation from public.investigation_sessions where id = new.session_id and user_id = auth.uid() for update;
 if not found or investigation.status <> 'active' or investigation.mode <> 'solo' then
  raise exception 'Investigation unavailable' using errcode = '42501';
 end if;
 select * into solution from private.case_solutions where case_id = investigation.case_id and case_version = investigation.case_version;
 if not found or not (solution.required_deduction_ids <@ investigation.solved_deduction_ids) then
  raise exception 'Complete the deductions first' using errcode = '23514';
 end if;
 if new.suspect_id is null or not (new.suspect_id = any(solution.suspect_ids))
    or new.evidence_ids is null or array_position(new.evidence_ids, null) is not null
    or cardinality(new.evidence_ids) <> cardinality(solution.required_evidence_ids)
    or cardinality(new.evidence_ids) <> (select count(distinct id) from unnest(new.evidence_ids) id)
    or not (new.evidence_ids <@ solution.evidence_ids) then
  raise exception 'Choose a suspect and distinct case exhibits' using errcode = '23514';
 end if;
 new.is_correct := new.suspect_id = solution.culprit_id and solution.required_evidence_ids <@ new.evidence_ids;
 update public.investigation_sessions set status = 'completed', updated_at = now() where id = new.session_id;
 return new;
end;
$function$;

alter table "private"."case_solutions"
  add constraint "case_solutions_case_id_case_version_fkey" foreign key (case_id, case_version) references public.case_catalog(case_id, version);

alter table "public"."accusations"
  add constraint "accusations_session_id_fkey" foreign key (session_id) references public.investigation_sessions(id) on delete cascade;

alter table "public"."accusations"
  add constraint "accusations_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

create index accusations_user_id_idx on public.accusations using btree (user_id);

create trigger finish_investigation
  before insert on public.accusations
  for each row
  execute function private.finish_investigation();

create policy "Owners read accusations" on "public"."accusations"
  for select
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id));

create policy "Owners submit accusations" on "public"."accusations"
  for insert
  to "authenticated"
  with check ((( SELECT auth.uid() AS uid) = user_id));

-- Explicit grants also handle projects with broad public-schema defaults.
revoke all on function private.finish_investigation() from public, anon, authenticated;
revoke all on private.case_solutions from public, anon, authenticated;
revoke all on public.accusations from public, anon, authenticated;
grant select on public.accusations to authenticated;
grant insert(session_id,user_id,suspect_id,evidence_ids,reasoning) on public.accusations to authenticated;

insert into private.case_solutions values ('midnight-ledger',1,'mara-vale',array['mara-vale','ellis-rook','nora-quill'],array['archive-key-log','lobby-call-record','supply-cage-record','cabinet-snag','glove-fiber-report','full-camera-review'],array['glove-fiber-report','full-camera-review'],array['deduce-access','deduce-alibis']);
