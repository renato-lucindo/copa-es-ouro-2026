create table public.competition_publications (
  slug text primary key,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  constraint competition_publications_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint competition_publications_snapshot_object
    check (jsonb_typeof(snapshot) = 'object')
);

alter table public.competition_publications enable row level security;
alter table public.competition_publications force row level security;

revoke all on table public.competition_publications from public, anon, authenticated;
grant select on table public.competition_publications to anon, authenticated;

create policy "competition publications are publicly readable"
on public.competition_publications
for select
to anon, authenticated
using (true);

comment on table public.competition_publications is
  'Snapshots públicos e versionados. Escritas ocorrem somente pelo seed operacional autorizado.';
