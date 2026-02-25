// services/recordings.js
import { supabase } from './supabase.js';

const BUCKET = 'recordings-private';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Fetch all non-deleted recordings for a student, newest first.
 * Generates a signed URL for each file (1 h expiry).
 */
export async function getRecordings(studentId) {
  const { data, error } = await supabase
    .from('recordings')
    .select(`
      id, student_id, uploaded_by, file_path, file_name,
      mime_type, size_bytes, recorded_at, note, created_at,
      uploader:profiles!uploaded_by(first_name, last_name)
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Batch-generate signed URLs
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(data.map(r => r.file_path), SIGNED_URL_EXPIRY);

  if (signErr) throw signErr;

  const urlMap = Object.fromEntries((signed ?? []).map(s => [s.path, s.signedUrl]));
  return data.map(r => ({ ...r, signedUrl: urlMap[r.file_path] ?? null }));
}

/**
 * Upload a file to storage then insert a metadata row.
 * Rolls back the storage file if the DB insert fails.
 */
export async function uploadRecording(studentId, uploadedBy, file, { note, recordedAt } = {}) {
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    throw new Error('Only audio and video files are allowed.');
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath  = `${studentId}/${Date.now()}_${sanitized}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadErr) throw uploadErr;

  const { error: dbErr } = await supabase.from('recordings').insert({
    student_id:  studentId,
    uploaded_by: uploadedBy,
    file_path:   filePath,
    file_name:   file.name,
    mime_type:   file.type,
    size_bytes:  file.size,
    recorded_at: recordedAt || null,
    note:        note       || null,
  });

  if (dbErr) {
    // Rollback storage file on DB failure
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw dbErr;
  }
}

/**
 * Soft-delete the DB row AND remove the file from storage.
 * RLS enforces admin + primary teacher only.
 */
export async function softDeleteRecording(id, filePath) {
  const { error } = await supabase
    .from('recordings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  // Best-effort file removal (ignore errors — file may already be gone)
  await supabase.storage.from(BUCKET).remove([filePath]).catch(() => null);
}
