-- ─────────────────────────────────────────────────────────────────────────────
-- Fix STA SELECT policy: teacher needs to see ALL assignment rows for any
-- student they are assigned to (not just their own row), so that join-based
-- student detail queries work correctly.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop previous attempts if any
drop policy if exists "sta: teacher can read own assignments" on public.student_teacher_assignments;
drop policy if exists "sta: teacher or admin can read"        on public.student_teacher_assignments;

-- Allow teacher to see all STA rows for students they are assigned to
create policy "sta: teacher sees all rows for assigned students or admin"
  on public.student_teacher_assignments for select
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (
      select 1 from public.student_teacher_assignments sta2
      where sta2.student_id  = student_teacher_assignments.student_id
        and sta2.teacher_id  = (select auth.uid())
        and (sta2.active_to is null or now() < sta2.active_to)
    )
  );
