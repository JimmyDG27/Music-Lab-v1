// services/songs.js
import { supabase } from './supabase.js';

// Status sort order: planned=1, started=2, completed=3
const STATUS_ORDER = { planned: 1, started: 2, completed: 3 };

/**
 * Fetch all songs for a student.
 * Sorted: status ASC (planned → started → completed), then created_at DESC.
 */
export async function getSongs(studentId) {
  const { data, error } = await supabase
    .from('student_songs')
    .select(`
      id, student_id, teacher_id, song_name, song_url, lyrics_url,
      notes, status, created_at
    `)
    .eq('student_id', studentId);

  if (error) throw error;

  // Sort client-side: status order ASC, then created_at DESC
  return (data ?? []).sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/**
 * Create a new song entry for a student.
 */
export async function createSong(studentId, teacherId, fields) {
  const { error } = await supabase
    .from('student_songs')
    .insert({
      student_id:  studentId,
      teacher_id:  teacherId,
      song_name:   fields.song_name,
      song_url:    fields.song_url    || null,
      lyrics_url:  fields.lyrics_url  || null,
      notes:       fields.notes       || null,
      status:      fields.status      || 'planned',
    });

  if (error) throw error;
}

/**
 * Update a song's fields.
 */
export async function updateSong(id, fields) {
  const { error } = await supabase
    .from('student_songs')
    .update({
      song_name:  fields.song_name,
      song_url:   fields.song_url    || null,
      lyrics_url: fields.lyrics_url  || null,
      notes:      fields.notes       || null,
      status:     fields.status,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Hard-delete a song. RLS enforces Primary teacher + Admin only.
 */
export async function deleteSong(id) {
  const { error } = await supabase
    .from('student_songs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
