// services/announcements.js
// Supabase queries for the Announcements module.
import { supabase } from './supabase.js';

/**
 * Count of announcements the current user has not yet read.
 */
export async function getUnreadCount() {
  // Get all announcement ids targeted at this user
  const { data: targeted, error: tErr } = await supabase
    .from('announcement_targets')
    .select('announcement_id');

  if (tErr) throw tErr;
  if (!targeted?.length) return 0;

  const ids = targeted.map(r => r.announcement_id);

  // Get ids already read by the current user
  const { data: read, error: rErr } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .in('announcement_id', ids);

  if (rErr) throw rErr;

  const readSet = new Set((read ?? []).map(r => r.announcement_id));
  return ids.filter(id => !readSet.has(id)).length;
}
