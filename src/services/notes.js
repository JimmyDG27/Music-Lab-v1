// services/notes.js
import { supabase } from './supabase.js';

/**
 * Fetch all non-deleted notes for a student, newest first.
 */
export async function getNotes(studentId) {
  const { data, error } = await supabase
    .from('student_notes')
    .select(`
      id, student_id, teacher_id, body, created_at, updated_at,
      teacher:profiles!teacher_id(first_name, last_name)
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a note for a student.
 */
export async function createNote(studentId, teacherId, body) {
  const { error } = await supabase
    .from('student_notes')
    .insert({ student_id: studentId, teacher_id: teacherId, body });

  if (error) throw error;
}

/**
 * Update the body of an existing note.
 */
export async function updateNote(id, body) {
  const { error } = await supabase
    .from('student_notes')
    .update({ body })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Soft-delete a note. RLS enforces admin + primary teacher only.
 */
export async function softDeleteNote(id) {
  const { error } = await supabase
    .from('student_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
