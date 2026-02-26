-- ─────────────────────────────────────────────────────────────────────────────
-- MUSIC LAB — INITIAL SCHEMA
-- Tables: profiles, students, student_parents, student_teacher_assignments,
--         lessons, student_notes, recordings, student_songs,
--         announcements, announcement_targets, announcement_comments,
--         announcement_reads
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PROFILES ──────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('admin', 'teacher')),
  first_name   text not null default '',
  last_name    text not null default '',
  phone        text,
  email        text,
  photo_url    text,
  social_links text,     -- changed from jsonb → text (see migration 20260226000001)
  birth_date   date,
  created_at   timestamptz not null default now()
);
comment on table public.profiles is 'User metadata and role for every auth.users account.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. STUDENTS ──────────────────────────────────────────────────────────────
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references public.profiles(id),
  first_name  text not null,
  last_name   text not null,
  phone       text,
  email       text,
  photo_url   text,
  birth_date  date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.students is 'Student records.';


-- ── 3. STUDENT_PARENTS ───────────────────────────────────────────────────────
create table public.student_parents (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  full_name    text not null,
  relation     text not null check (relation in ('mother', 'father', 'guardian')),
  phone        text,
  email        text,
  occupation   text,
  notes        text,
  social_links jsonb,
  created_at   timestamptz not null default now()
);
comment on table public.student_parents is 'Parent / guardian contact records for each student.';


-- ── 4. STUDENT_TEACHER_ASSIGNMENTS ───────────────────────────────────────────
create table public.student_teacher_assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id),
  role        text not null check (role in ('primary', 'assistant')),
  active_from timestamptz,
  active_to   timestamptz,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
comment on table public.student_teacher_assignments is 'Teacher → student assignments (primary or assistant).';

create unique index uq_one_active_primary
  on public.student_teacher_assignments (student_id)
  where role = 'primary' and active_to is null;


-- ── 5. LESSONS ───────────────────────────────────────────────────────────────
create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  teacher_id      uuid not null references public.profiles(id),
  held_at         timestamptz not null,
  vocal_technique text,
  song_notes      text,
  homework        text,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.lessons is 'Lesson log entries per student.';


-- ── 6. STUDENT_NOTES ─────────────────────────────────────────────────────────
create table public.student_notes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.student_notes is 'Private journal notes per student.';


-- ── 7. RECORDINGS ────────────────────────────────────────────────────────────
create table public.recordings (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  uploaded_by  uuid not null references public.profiles(id),
  file_path    text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  recorded_at  timestamptz,
  note         text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);
comment on table public.recordings is 'Audio/video recording metadata. File stored in Supabase Storage.';


-- ── 8. STUDENT_SONGS ─────────────────────────────────────────────────────────
create table public.student_songs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id),
  song_name   text not null,
  song_url    text,
  lyrics_url  text,
  notes       text,
  status      text not null default 'planned'
                check (status in ('planned', 'started', 'completed')),
  created_at  timestamptz not null default now()
);
comment on table public.student_songs is 'Repertoire / song tracker per student.';


-- ── 9. ANNOUNCEMENTS ─────────────────────────────────────────────────────────
create table public.announcements (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null references public.profiles(id),
  title          text not null,
  body           text not null,
  starts_at      timestamptz,
  ends_at        timestamptz,
  image_url      text,
  audience_type  text not null
                   check (audience_type in ('all_teachers', 'selected_teachers')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.announcements is 'School-wide or targeted announcements from admin.';


-- ── 10. ANNOUNCEMENT_TARGETS ─────────────────────────────────────────────────
create table public.announcement_targets (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  teacher_id       uuid not null references public.profiles(id),
  unique (announcement_id, teacher_id)
);
comment on table public.announcement_targets is 'Per-teacher targets when audience_type = selected_teachers.';


-- ── 11. ANNOUNCEMENT_COMMENTS ────────────────────────────────────────────────
create table public.announcement_comments (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  author_id        uuid not null references public.profiles(id),
  body             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
comment on table public.announcement_comments is 'Comments left by teachers on announcements.';


-- ── 12. ANNOUNCEMENT_READS ───────────────────────────────────────────────────
create table public.announcement_reads (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  user_id          uuid not null references public.profiles(id),
  read_at          timestamptz not null default now(),
  unique (announcement_id, user_id)
);
comment on table public.announcement_reads is 'Read-tracking for the unread announcements badge.';


-- ── INDEXES ──────────────────────────────────────────────────────────────────
create index idx_students_created_by     on public.students (created_by);
create index idx_sta_student             on public.student_teacher_assignments (student_id);
create index idx_sta_teacher             on public.student_teacher_assignments (teacher_id);
create index idx_lessons_student         on public.lessons (student_id);
create index idx_lessons_teacher         on public.lessons (teacher_id);
create index idx_lessons_held_at         on public.lessons (held_at desc);
create index idx_student_notes_student   on public.student_notes (student_id);
create index idx_recordings_student      on public.recordings (student_id);
create index idx_student_songs_student   on public.student_songs (student_id);
create index idx_ann_targets_ann         on public.announcement_targets (announcement_id);
create index idx_ann_targets_teacher     on public.announcement_targets (teacher_id);
create index idx_ann_comments_ann        on public.announcement_comments (announcement_id);
create index idx_ann_reads_user          on public.announcement_reads (user_id);
