// services/auth.js
// Auth helpers: login, logout, getCurrentUser, getSession, getProfile.
import { supabase } from './supabase.js';

// ─── Low-level primitives ─────────────────────────────────────────────────────

/** Return the current raw session (or null). */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Fetch the profiles row for a given userId. */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, email, photo_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ─── App-level helpers ────────────────────────────────────────────────────────

/**
 * Sign in with email + password.
 * Returns { session, profile } so callers have role immediately.
 * Throws a plain Error with a user-friendly message on failure.
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Map Supabase error messages to friendlier copies
    if (error.message.toLowerCase().includes('invalid login')) {
      throw new Error('Incorrect email or password.');
    }
    throw new Error(error.message);
  }
  const profile = await getProfile(data.user.id);
  return { session: data.session, profile };
}

/** Sign out the current user and clear the local session. */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Return { session, profile } for the currently signed-in user,
 * or null if no active session exists.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  return { session, profile };
}
