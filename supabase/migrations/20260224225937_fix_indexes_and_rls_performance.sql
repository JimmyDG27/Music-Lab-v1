-- ─────────────────────────────────────────────────────────────────────────────
-- Fix indexes for RLS performance
-- Use (select auth.uid()) instead of auth.uid() to prevent re-evaluation per row
-- Add missing performance indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Additional indexes to support RLS policy lookups
create index if not exists idx_profiles_role
  on public.profiles (role);

create index if not exists idx_sta_teacher_active
  on public.student_teacher_assignments (teacher_id, student_id, role, active_to);
