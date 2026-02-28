-- ─────────────────────────────────────────────────────────────────────────────
-- Fix STA SELECT policy: avoid recursion by using a SECURITY DEFINER helper
-- function that reads STA without triggering the RLS policy again.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper function: checks if a teacher has any active assignment for a student.
-- SECURITY DEFINER + fixed search_path bypasses RLS to prevent infinite recursion.
create or replace function public.is_teacher_assigned_to_student(
  p_teacher_id uuid,
  p_student_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from student_teacher_assignments
    where student_id = p_student_id
      and teacher_id = p_teacher_id
      and (active_to is null or now() < active_to)
  );
$$;

-- Drop the self-referencing policy and replace with the function-based one
drop policy if exists "sta: teacher sees all rows for assigned students or admin"
  on public.student_teacher_assignments;

create policy "sta: teacher sees all rows for assigned students or admin"
  on public.student_teacher_assignments for select
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or public.is_teacher_assigned_to_student((select auth.uid()), student_id)
  );
