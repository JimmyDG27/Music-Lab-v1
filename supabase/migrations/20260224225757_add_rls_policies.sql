-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES — all domain tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
alter table public.profiles                   enable row level security;
alter table public.students                   enable row level security;
alter table public.student_parents            enable row level security;
alter table public.student_teacher_assignments enable row level security;
alter table public.lessons                    enable row level security;
alter table public.student_notes              enable row level security;
alter table public.recordings                 enable row level security;
alter table public.student_songs              enable row level security;

-- ── PROFILES ──────────────────────────────────────────────────────────────────
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: own or admin can update"
  on public.profiles for update
  to authenticated
  using (
    id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  )
  with check (
    id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "profiles: admin can insert"
  on public.profiles for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "profiles: admin can delete"
  on public.profiles for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── STUDENTS ──────────────────────────────────────────────────────────────────
-- Helper condition for assigned teacher access (used across many tables)
-- Teacher has access if there is an active primary or assistant assignment

create policy "students: admin or assigned teacher can read"
  on public.students for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = students.id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "students: admin can insert"
  on public.students for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "students: admin can update"
  on public.students for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "students: admin can delete"
  on public.students for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── STUDENT_PARENTS ───────────────────────────────────────────────────────────
create policy "student_parents: admin or assigned teacher can read"
  on public.student_parents for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_parents.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_parents: admin can insert"
  on public.student_parents for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "student_parents: admin can update"
  on public.student_parents for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "student_parents: admin can delete"
  on public.student_parents for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── STUDENT_TEACHER_ASSIGNMENTS ───────────────────────────────────────────────
create policy "sta: admin can insert"
  on public.student_teacher_assignments for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "sta: admin can update"
  on public.student_teacher_assignments for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "sta: admin can delete"
  on public.student_teacher_assignments for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── LESSONS ───────────────────────────────────────────────────────────────────
create policy "lessons: admin or assigned teacher can read"
  on public.lessons for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = lessons.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "lessons: admin or assigned teacher can insert"
  on public.lessons for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = lessons.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "lessons: admin or assigned teacher can update"
  on public.lessons for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = lessons.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "lessons: admin can delete"
  on public.lessons for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── STUDENT_NOTES ─────────────────────────────────────────────────────────────
create policy "student_notes: admin or assigned teacher can read"
  on public.student_notes for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_notes.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_notes: admin or assigned teacher can insert"
  on public.student_notes for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_notes.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_notes: admin or assigned teacher can update"
  on public.student_notes for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_notes.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_notes: admin or primary teacher can delete"
  on public.student_notes for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_notes.student_id
        and sta.teacher_id = (select auth.uid())
        and sta.role = 'primary'
        and sta.active_to is null
    )
  );

-- ── RECORDINGS ────────────────────────────────────────────────────────────────
create policy "recordings: admin or assigned teacher can read"
  on public.recordings for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = recordings.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "recordings: admin or assigned teacher can insert"
  on public.recordings for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = recordings.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "recordings: admin or primary teacher can update"
  on public.recordings for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = recordings.student_id
        and sta.teacher_id = (select auth.uid())
        and sta.role = 'primary'
        and sta.active_to is null
    )
  );

create policy "recordings: admin or primary teacher can delete"
  on public.recordings for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = recordings.student_id
        and sta.teacher_id = (select auth.uid())
        and sta.role = 'primary'
        and sta.active_to is null
    )
  );

-- ── STUDENT_SONGS ─────────────────────────────────────────────────────────────
create policy "student_songs: admin or assigned teacher can read"
  on public.student_songs for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_songs.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_songs: admin or assigned teacher can insert"
  on public.student_songs for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_songs.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_songs: admin or assigned teacher can update"
  on public.student_songs for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_songs.student_id
        and sta.teacher_id = (select auth.uid())
        and (
          (sta.role = 'primary' and sta.active_to is null)
          or (sta.role = 'assistant'
              and (sta.active_from is null or now() >= sta.active_from)
              and (sta.active_to is null or now() < sta.active_to))
        )
    )
  );

create policy "student_songs: admin or primary teacher can delete"
  on public.student_songs for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta
      where sta.student_id = student_songs.student_id
        and sta.teacher_id = (select auth.uid())
        and sta.role = 'primary'
        and sta.active_to is null
    )
  );
