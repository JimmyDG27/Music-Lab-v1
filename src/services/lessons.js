// services/lessons.js
import { supabase } from './supabase.js';

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all non-deleted lessons for a student, newest first.
 */
export async function getLessons(studentId) {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id, student_id, teacher_id, held_at,
      vocal_technique, song_notes, homework, created_at,
      teacher:profiles!teacher_id(first_name, last_name)
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('held_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Create a lesson. teacherId is the logged-in user's profile id.
 */
export async function createLesson(studentId, teacherId, { held_at, vocal_technique, song_notes, homework }) {
  const { error } = await supabase
    .from('lessons')
    .insert({
      student_id:      studentId,
      teacher_id:      teacherId,
      held_at,
      vocal_technique: vocal_technique || null,
      song_notes:      song_notes      || null,
      homework:        homework        || null,
    });

  if (error) throw error;
}

/**
 * Update an existing lesson's fields.
 */
export async function updateLesson(id, { held_at, vocal_technique, song_notes, homework }) {
  const { error } = await supabase
    .from('lessons')
    .update({
      held_at,
      vocal_technique: vocal_technique || null,
      song_notes:      song_notes      || null,
      homework:        homework        || null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Soft-delete a lesson (Admin only — enforced by RLS).
 */
export async function softDeleteLesson(id) {
  const { error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
