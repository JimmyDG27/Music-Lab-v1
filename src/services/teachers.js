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
 */
export async function getTeachers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, photo_url, created_at')
    .eq('role', 'teacher')
    .order('last_name',  { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
