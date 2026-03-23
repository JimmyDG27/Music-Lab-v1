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
      id, first_name, last_name, phone, email, birth_date, is_active, created_at,
      student_teacher_assignments(
        teacher_id, role, active_to,
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
        id, teacher_id, role, active_from, active_to,
        teacher:profiles!teacher_id(id, first_name, last_name, phone, email)
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
 * Add a new assignment (primary or assistant). Admin only.
 * For primary: DB partial unique index enforces one active primary per student.
 * For assistant: active_from and active_to are optional.
 */
export async function addAssignment(studentId, teacherId, role, activeFrom, activeTo) {
  const { error } = await supabase
    .from('student_teacher_assignments')
    .insert({
      student_id:  studentId,
      teacher_id:  teacherId,
      role,
      active_from: activeFrom || new Date().toISOString(),
      active_to:   activeTo   || null,
    });
  if (error) throw error;
}

/**
 * End an assignment by setting active_to = now(). Admin only.
 */
export async function endAssignment(assignmentId) {
  const { error } = await supabase
    .from('student_teacher_assignments')
    .update({ active_to: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) throw error;
}

/**
 * Update an assistant assignment's dates. Admin only.
 */
export async function updateAssignment(assignmentId, { activeFrom, activeTo }) {
  const { error } = await supabase
    .from('student_teacher_assignments')
    .update({
      active_from: activeFrom || null,
      active_to:   activeTo   || null,
    })
    .eq('id', assignmentId);
  if (error) throw error;
}

/**
 * Permanently delete an assignment record. Admin only.
 */
export async function deleteAssignment(assignmentId) {
  const { error } = await supabase
    .from('student_teacher_assignments')
    .delete()
    .eq('id', assignmentId);
  if (error) throw error;
}

/**
 * Reassign the primary teacher for a student. Admin only.
 * Closes the current open primary assignment (sets active_to = now)
 * then inserts a new one. Pass null to clear without reassigning.
 */
export async function reassignPrimaryTeacher(studentId, newTeacherId) {
  // Close any currently open primary assignment
  const { error: closeError } = await supabase
    .from('student_teacher_assignments')
    .update({ active_to: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('role', 'primary')
    .is('active_to', null);

  if (closeError) throw closeError;

  if (newTeacherId) {
    const { error: insertError } = await supabase
      .from('student_teacher_assignments')
      .insert({
        student_id: studentId,
        teacher_id: newTeacherId,
        role:       'primary',
        active_to:  null,
      });
    if (insertError) throw insertError;
  }
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
    .eq('is_active', true)
    .order('last_name',  { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── Parents ───────────────────────────────────────────────────────────────────

/**
 * Add a parent / guardian record for a student. Admin only (enforced by RLS).
 */
export async function createParent(studentId, { full_name, relation, phone, email, occupation, notes }) {
  const { error } = await supabase
    .from('student_parents')
    .insert({
      student_id:  studentId,
      full_name,
      relation,
      phone:       phone      || null,
      email:       email      || null,
      occupation:  occupation || null,
      notes:       notes      || null,
    });
  if (error) throw error;
}

/**
 * Update an existing parent / guardian record. Admin only (enforced by RLS).
 */
export async function updateParent(id, { full_name, relation, phone, email, occupation, notes }) {
  const { error } = await supabase
    .from('student_parents')
    .update({
      full_name,
      relation,
      phone:      phone      || null,
      email:      email      || null,
      occupation: occupation || null,
      notes:      notes      || null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Hard-delete a parent / guardian record. Admin only (enforced by RLS).
 */
export async function deleteParent(id) {
  const { error } = await supabase
    .from('student_parents')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
