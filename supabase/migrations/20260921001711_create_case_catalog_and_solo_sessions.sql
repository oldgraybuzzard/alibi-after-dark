create table public.case_catalog (
	case_id text not null,
	version integer not null check (version > 0),
	title text not null check (length(title) > 0),
	setting text not null check (length(setting) > 0),
	difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
	estimated_minutes integer not null check (estimated_minutes between 15 and 30),
	admission_status text not null check (admission_status in ('training', 'approved')),
	created_at timestamptz not null default now(),
	primary key (case_id, version)
);

create table public.investigation_sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	case_id text not null,
	case_version integer not null,
	mode text not null default 'solo' check (mode = 'solo'),
	status text not null default 'active' check (status in ('active', 'completed')),
	solved_deduction_ids text[] not null default '{}',
	assigned_evidence_ids text[] not null default '{}',
	shared_evidence_ids text[] not null default '{}',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	foreign key (case_id, case_version)
		references public.case_catalog (case_id, version)
);

create index investigation_sessions_user_id_idx
	on public.investigation_sessions using btree (user_id);

alter table public.case_catalog enable row level security;
alter table public.investigation_sessions enable row level security;

revoke all on table public.case_catalog from anon, authenticated;
revoke all on table public.investigation_sessions from anon, authenticated;
grant select on table public.case_catalog to authenticated;
grant select on table public.investigation_sessions to authenticated;

create policy "Authenticated users can read admitted cases"
on public.case_catalog for select
to authenticated
using (admission_status in ('training', 'approved'));

create policy "Users can read their own investigation sessions"
on public.investigation_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.start_solo_investigation(
	requested_case_id text,
	requested_case_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	session_id uuid;
	requesting_user_id uuid := auth.uid();
begin
	if requesting_user_id is null then
		raise exception 'Authentication required' using errcode = '42501';
	end if;

	insert into public.investigation_sessions (
		user_id,
		case_id,
		case_version
	)
	select
		requesting_user_id,
		catalog.case_id,
		catalog.version
	from public.case_catalog as catalog
	where catalog.case_id = requested_case_id
		and catalog.version = requested_case_version
		and catalog.admission_status in ('training', 'approved')
	returning id into session_id;

	if session_id is null then
		raise exception 'Case is not available' using errcode = 'P0002';
	end if;

	return session_id;
end;
$$;

revoke all on function public.start_solo_investigation(text, integer) from public;
grant execute on function public.start_solo_investigation(text, integer) to authenticated;

insert into public.case_catalog (
	case_id,
	version,
	title,
	setting,
	difficulty,
	estimated_minutes,
	admission_status
)
values (
	'midnight-ledger',
	1,
	'The Midnight Ledger',
	'The closed reading room of the Bellwether Hotel, 11:40 p.m.',
	'easy',
	20,
	'training'
);
