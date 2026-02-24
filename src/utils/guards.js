// utils/guards.js
// Page guard: redirect unauthenticated / unauthorised users.
import { getSession, getProfile } from '../services/auth.js';

/**
 * Redirect to login if no active session.
 * Optionally restrict to a specific role.
 * @param {'admin'|'teacher'|null} requiredRole
 */
export async function requireAuth(requiredRole = null) {
  const session = await getSession();
  if (!session) {
    window.location.href = '/src/pages/login/login.html';
    return null;
  }
  if (requiredRole) {
    const profile = await getProfile(session.user.id);
    if (profile.role !== requiredRole) {
      window.location.href = '/src/pages/dashboard/dashboard.html';
      return null;
    }
  }
  return session;
}
