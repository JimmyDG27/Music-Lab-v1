// services/announcements.js
// Supabase queries for the Announcements module.
import { supabase } from './supabase.js';

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all visible announcements (RLS filters for teachers automatically).
 * sinceDate: if provided, only announcements created on or after that date are returned.
 * Includes read status for current user and comment count.
 */
export async function getAnnouncements(sinceDate = null) {
  let query = supabase
    .from('announcements')
    .select(`
      id, title, body, starts_at, ends_at, image_url, audience_type, created_at, updated_at,
      created_by,
      author:profiles!announcements_created_by_fkey(first_name, last_name),
      announcement_reads(id),
      announcement_comments(id, deleted_at),
      announcement_targets(teacher_id)
    `)
    .order('created_at', { ascending: false });

  // Teachers only see announcements created after their own account was created
  if (sinceDate) query = query.gte('created_at', sinceDate);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ── Single ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single announcement with full details + targets.
 */
export async function getAnnouncementById(id) {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      id, title, body, starts_at, ends_at, image_url, audience_type, created_at, updated_at,
      created_by,
      author:profiles!announcements_created_by_fkey(first_name, last_name),
      announcement_targets(teacher_id)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create an announcement and optional per-teacher targets.
 * @param {{ title, body, starts_at, ends_at, image_url, audience_type }} fields
 * @param {string[]} targetTeacherIds  – only used when audience_type = 'selected_teachers'
 */
export async function createAnnouncement(fields, targetTeacherIds = []) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ann, error } = await supabase
    .from('announcements')
    .insert({
      created_by:    user.id,
      title:         fields.title,
      body:          fields.body,
      starts_at:     fields.starts_at     || null,
      ends_at:       fields.ends_at       || null,
      image_url:     fields.image_url     || null,
      audience_type: fields.audience_type || 'all_teachers',
    })
    .select('id')
    .single();

  if (error) throw error;

  if (fields.audience_type === 'selected_teachers' && targetTeacherIds.length) {
    const rows = targetTeacherIds.map(tid => ({
      announcement_id: ann.id,
      teacher_id:      tid,
    }));
    const { error: tErr } = await supabase.from('announcement_targets').insert(rows);
    if (tErr) throw tErr;
  }

  return ann;
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update an existing announcement. Replaces targets if audience_type = 'selected_teachers'.
 */
export async function updateAnnouncement(id, fields, targetTeacherIds = []) {
  const { error } = await supabase
    .from('announcements')
    .update({
      title:         fields.title,
      body:          fields.body,
      starts_at:     fields.starts_at     || null,
      ends_at:       fields.ends_at       || null,
      image_url:     fields.image_url     || null,
      audience_type: fields.audience_type || 'all_teachers',
    })
    .eq('id', id);

  if (error) throw error;

  // Replace targets
  const { error: delErr } = await supabase
    .from('announcement_targets')
    .delete()
    .eq('announcement_id', id);
  if (delErr) throw delErr;

  if (fields.audience_type === 'selected_teachers' && targetTeacherIds.length) {
    const rows = targetTeacherIds.map(tid => ({
      announcement_id: id,
      teacher_id:      tid,
    }));
    const { error: tErr } = await supabase.from('announcement_targets').insert(rows);
    if (tErr) throw tErr;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

// ── Read tracking ─────────────────────────────────────────────────────────────

/**
 * Mark an announcement as read by the current user (upsert — safe to call multiple times).
 */
export async function markAsRead(announcementId) {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, user_id: (await supabase.auth.getUser()).data.user.id },
             { onConflict: 'announcement_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/**
 * Count of announcements the current user has not yet read.
 */
export async function getUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: allVisible, error: aErr } = await supabase
    .from('announcements')
    .select('id');
  if (aErr) throw aErr;
  if (!allVisible?.length) return 0;

  const visibleIds = allVisible.map(r => r.id);

  const { data: read, error: rErr } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .in('announcement_id', visibleIds)
    .eq('user_id', user.id);
  if (rErr) throw rErr;

  const readSet = new Set((read ?? []).map(r => r.announcement_id));
  return visibleIds.filter(id => !readSet.has(id)).length;
}

// ── Comments ──────────────────────────────────────────────────────────────────

/**
 * Fetch non-deleted comments for an announcement, newest first.
 */
export async function getComments(announcementId) {
  const { data, error } = await supabase
    .from('announcement_comments')
    .select(`
      id, body, created_at, updated_at, deleted_at,
      author_id,
      author:profiles!announcement_comments_author_id_fkey(first_name, last_name)
    `)
    .eq('announcement_id', announcementId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createComment(announcementId, body) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('announcement_comments')
    .insert({ announcement_id: announcementId, author_id: user.id, body })
    .select('id, body, created_at, author_id, author:profiles!announcement_comments_author_id_fkey(first_name, last_name)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateComment(id, body) {
  const { error } = await supabase
    .from('announcement_comments')
    .update({ body })
    .eq('id', id);
  if (error) throw error;
}

/** Soft-delete a comment. */
export async function deleteComment(id) {
  const { error } = await supabase
    .from('announcement_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
