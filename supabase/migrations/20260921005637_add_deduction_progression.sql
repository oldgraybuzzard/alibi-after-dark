create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

drop function public.start_solo_investigation(text, integer);

grant insert (user_id, case_id, case_version)
	on public.investigation_sessions to authenticated;

create policy "Users can start their own admitted solo investigations"
on public.investigation_sessions for insert
to authenticated
with check (
	(select auth.uid()) = user_id
	and mode = 'solo'
	and status = 'active'
	and cardinality(solved_deduction_ids) = 0
	and cardinality(assigned_evidence_ids) = 0
	and cardinality(shared_evidence_ids) = 0
	and exists (
		select 1
		from public.case_catalog as catalog
		where catalog.case_id = investigation_sessions.case_id
			and catalog.version = investigation_sessions.case_version
			and catalog.admission_status in ('training', 'approved')
	)
);

create table private.deduction_answers (
	case_id text not null,
	case_version integer not null,
	deduction_id text not null,
	correct_choice_id text not null,
	primary key (case_id, case_version, deduction_id),
	foreign key (case_id, case_version)
		references public.case_catalog (case_id, version)
);

revoke all on table private.deduction_answers from public, anon, authenticated;

create table public.deduction_attempts (
	id bigint generated always as identity primary key,
	session_id uuid not null references public.investigation_sessions (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	deduction_id text not null check (deduction_id ~ '^[a-z][a-z0-9_-]{0,63}$'),
	choice_id text not null check (choice_id ~ '^[a-z][a-z0-9_-]{0,63}$'),
	created_at timestamptz not null default now()
);

create index deduction_attempts_user_id_idx
	on public.deduction_attempts using btree (user_id);

create index deduction_attempts_session_id_idx
	on public.deduction_attempts using btree (session_id);

alter table public.deduction_attempts enable row level security;

revoke all on table public.deduction_attempts from anon, authenticated;
revoke all on sequence public.deduction_attempts_id_seq from anon, authenticated;
grant insert on table public.deduction_attempts to authenticated;
grant usage on sequence public.deduction_attempts_id_seq to authenticated;

create policy "Users can submit attempts for their own active investigations"
on public.deduction_attempts for insert
to authenticated
with check (
	(select auth.uid()) = user_id
	and exists (
		select 1
		from public.investigation_sessions as session
		where session.id = deduction_attempts.session_id
			and session.user_id = (select auth.uid())
			and session.status = 'active'
	)
);

create function private.apply_correct_deduction_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.investigation_sessions as session
	set solved_deduction_ids = array_append(session.solved_deduction_ids, new.deduction_id),
		updated_at = now()
	from private.deduction_answers as answer
	where session.id = new.session_id
		and session.user_id = new.user_id
		and session.status = 'active'
		and answer.case_id = session.case_id
		and answer.case_version = session.case_version
		and answer.deduction_id = new.deduction_id
		and answer.correct_choice_id = new.choice_id
		and not new.deduction_id = any(session.solved_deduction_ids);

	return new;
end;
$$;

revoke all on function private.apply_correct_deduction_attempt() from public, anon, authenticated;

create trigger apply_correct_deduction_attempt
after insert on public.deduction_attempts
for each row execute function private.apply_correct_deduction_attempt();

insert into private.deduction_answers (
	case_id,
	case_version,
	deduction_id,
	correct_choice_id
)
values
	('midnight-ledger', 1, 'deduce-access', 'access-mara'),
	('midnight-ledger', 1, 'deduce-alibis', 'alibis-ellis-nora');
