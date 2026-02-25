// services/students.js
// All Supabase queries for the Students module.
// Pages must never call supabase directly — use these functions.
import { supabase } from './supabase.js';

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all students visible to the current user.
 * RLS handles teacher filtering automatically.
 * Sorted alphabetically by last_name, first_name.
 */
export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, first_name, last_name, is_active, created_at,
      student_teacher_assignments(
        role, active_to,
        teacher:profiles!teacher_id(first_name, last_name)
      )
    `)
    .order('last_name',  { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Returns a map of { student_id → most_recent_held_at } for the given ids.
 * Used to populate the "Last Lesson" column in the list without N+1 queries.
 */
export async function getLastLessonDates(studentIds) {
  if (!studentIds.length) return {};

  const { data, error } = await supabase
    .from('lessons')
    .select('student_id, held_at')
    .in('student_id', studentIds)
    .is('deleted_at', null)
    .order('held_at', { ascending: false });

  if (error) throw error;

  // Keep only the first (most recent) row per student
  const map = {};
  for (const row of data ?? []) {
    if (!map[row.student_id]) map[row.student_id] = row.held_at;
  }
  return map;
}

// ── Detail ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single student by id, including parents + teacher assignments.
 */
export async function getStudentById(id) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      student_parents(*),
      student_teacher_assignments(
        id, role, active_from, active_to,
        teacher:profiles!teacher_id(id, first_name, last_name, phone, email, photo_url)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ── Create / Update ───────────────────────────────────────────────────────────

/**
 * Create a new student. Admin only (enforced by RLS).
 * Optionally creates a primary teacher assignment.
 */
export async function createStudent({ first_name, last_name, phone, email, birth_date, primary_teacher_id }) {
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      first_name,
      last_name,
      phone:      phone      || null,
      email:      email      || null,
      birth_date: birth_date || null,
    })
    .select()
    .single();

  if (studentError) throw studentError;

  if (primary_teacher_id) {
    const { error: assignError } = await supabase
      .from('student_teacher_assignments')
      .insert({
        student_id: student.id,
        teacher_id: primary_teacher_id,
        role:       'primary',
        active_to:  null,
      });
    if (assignError) throw assignError;
  }

  return student;
}

/**
 * Update a student's profile. Admin only (enforced by RLS).
 */
export async function updateStudent(id, updates) {
  const { data, error } = await supabase
    .from('students')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Counts (dashboard) ────────────────────────────────────────────────────────

/**
 * Total student count visible to the current user (RLS-filtered).
 */
export async function getStudentCount() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

// ── Teacher picker (modal) ────────────────────────────────────────────────────

/**
 * Fetch all teacher profiles for dropdown selects.
 */
export async function getTeacherProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('role', 'teacher')
    .order('last_name',  { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
