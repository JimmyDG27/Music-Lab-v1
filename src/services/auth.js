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
    .select('id, role, first_name, last_name, email')
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
 * Update the current user's profile fields in the profiles table.
 * @param {{ first_name?, last_name?, phone?, birth_date?, social_links? }} fields
 */
export async function updateProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name:   fields.first_name   ?? undefined,
      last_name:    fields.last_name    ?? undefined,
      phone:        fields.phone        !== undefined ? (fields.phone || null)        : undefined,
      birth_date:   fields.birth_date   !== undefined ? (fields.birth_date || null)   : undefined,
      social_links: fields.social_links !== undefined ? (fields.social_links || null) : undefined,
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
}

/**
 * Set (or update) the current user's password.
 * Works for the invite flow (exchanged token already in session) and for voluntary password change.
 */
export async function setPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/**
 * Exchange an invite / recovery token from the URL hash for a session.
 * Call this on the set-password page before allowing the user to set their password.
 * Returns the session if successful, throws otherwise.
 */
export async function exchangeInviteToken() {
  // Supabase puts the token in the URL hash when following an invite link
  const hash   = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token  = params.get('access_token');
  const type   = params.get('type'); // 'invite' or 'recovery'

  if (!token) throw new Error('No invite token found in URL.');

  // setSession accepts the raw access token from the invite link
  const { data, error } = await supabase.auth.setSession({
    access_token:  token,
    refresh_token: params.get('refresh_token') ?? token,
  });

  if (error) throw new Error(error.message);
  return data.session;
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
