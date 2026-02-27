-- ── announcements ────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid not null references public.profiles(id),
  title         text not null,
  body          text not null,
  starts_at     timestamptz,
  ends_at       timestamptz,
  image_url     text,
  audience_type text not null default 'all_teachers'
                  check (audience_type in ('all_teachers', 'selected_teachers')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── announcement_targets ─────────────────────────────────────────────────────
create table if not exists public.announcement_targets (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  teacher_id      uuid not null references public.profiles(id),
  unique (announcement_id, teacher_id)
);

-- ── announcement_comments ────────────────────────────────────────────────────
create table if not exists public.announcement_comments (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id       uuid not null references public.profiles(id),
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ── announcement_reads ───────────────────────────────────────────────────────
create table if not exists public.announcement_reads (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id),
  read_at         timestamptz not null default now(),
  unique (announcement_id, user_id)
);

-- ── updated_at trigger helper ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create trigger announcement_comments_updated_at
  before update on public.announcement_comments
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.announcements         enable row level security;
alter table public.announcement_targets  enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.announcement_reads    enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- announcements: admin sees all; teacher sees announcements addressed to them
create policy "announcements_select" on public.announcements
  for select using (
    public.is_admin()
    or audience_type = 'all_teachers'
    or exists (
      select 1 from public.announcement_targets
      where announcement_targets.announcement_id = announcements.id
        and announcement_targets.teacher_id = auth.uid()
    )
  );

create policy "announcements_insert" on public.announcements
  for insert with check (public.is_admin());

create policy "announcements_update" on public.announcements
  for update using (public.is_admin());

create policy "announcements_delete" on public.announcements
  for delete using (public.is_admin());

-- announcement_targets: visible if related announcement is visible
create policy "targets_select" on public.announcement_targets
  for select using (
    public.is_admin()
    or teacher_id = auth.uid()
  );

create policy "targets_insert" on public.announcement_targets
  for insert with check (public.is_admin());

create policy "targets_delete" on public.announcement_targets
  for delete using (public.is_admin());

-- announcement_comments: visible if announcement is visible; anyone can create if they can see it
create policy "comments_select" on public.announcement_comments
  for select using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_comments.announcement_id
    )
  );

create policy "comments_insert" on public.announcement_comments
  for insert with check (author_id = auth.uid());

create policy "comments_update" on public.announcement_comments
  for update using (
    author_id = auth.uid() or public.is_admin()
  );

-- announcement_reads: each user manages their own reads
create policy "reads_select" on public.announcement_reads
  for select using (user_id = auth.uid() or public.is_admin());

create policy "reads_insert" on public.announcement_reads
  for insert with check (user_id = auth.uid());

create policy "reads_delete" on public.announcement_reads
  for delete using (user_id = auth.uid());
