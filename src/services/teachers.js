// services/teachers.js
// Supabase queries for the Teachers module.
import { supabase } from './supabase.js';

/**
 * Total teacher count. Admin only (enforced by RLS).
 */
export async function getTeacherCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');

  if (error) throw error;
  return count ?? 0;
}

/**
 * Fetch all teacher profiles. Admin sees all; teachers see directory.
 * Includes a count of active primary assignments per teacher (admin only).
 */
export async function getTeachers(withAssignments = false) {
  const selectFields = withAssignments
    ? `id, first_name, last_name, email, phone, birth_date, instagram, created_at, is_active,
       student_teacher_assignments!student_teacher_assignments_teacher_id_fkey(
         id, role, active_to,
         student:students!student_teacher_assignments_student_id_fkey(id, first_name, last_name, is_active)
       )`
    : 'id, first_name, last_name, email, phone, birth_date, instagram, created_at, is_active';

  let query = supabase
    .from('profiles')
    .select(selectFields)
    .eq('role', 'teacher')
    .order('last_name',  { ascending: true })
    .order('first_name', { ascending: true });

  // Teachers only see active colleagues; admins see all
  if (!withAssignments) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Update a teacher's profile fields. Admin only (enforced by RLS).
 */
export async function updateTeacher(id, { first_name, last_name, phone, email, birth_date, instagram }) {
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name,
      last_name,
      phone:        phone        || null,
      email:        email        || null,
      birth_date:   birth_date   || null,
      instagram: instagram || null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Invite a new teacher via the invite-teacher Edge Function.
 * Sends a Supabase magic-link invite email; the DB trigger creates the profile.
 */
export async function inviteTeacher({ email, first_name, last_name }) {
  // Build redirectTo pointing to the set-password page on whichever origin is running
  const redirectTo = `${window.location.origin}/src/pages/auth/set-password.html`;

  const { data, error } = await supabase.functions.invoke('invite-teacher', {
    body: { email, first_name, last_name, redirectTo },
  });

  if (error) throw new Error(error.message ?? 'Invite failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Deactivate a teacher: marks profile inactive, closes assignments, bans auth user.
 * Admin only (enforced inside the Edge Function).
 */
export async function deactivateTeacher(teacherId) {
  const { data, error } = await supabase.functions.invoke('deactivate-teacher', {
    body: { teacher_id: teacherId },
  });
  if (error) throw new Error(error.message ?? 'Deactivation failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Activate a teacher: marks profile active, unbans auth user.
 * Admin only (enforced inside the Edge Function).
 */
export async function activateTeacher(teacherId) {
  const { data, error } = await supabase.functions.invoke('activate-teacher', {
    body: { teacher_id: teacherId },
  });
  if (error) throw new Error(error.message ?? 'Activation failed');
  if (data?.error) throw new Error(data.error);
  return data;
}
