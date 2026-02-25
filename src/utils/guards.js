// utils/guards.js
// Page auth guards for the MPA. Call at the top of every protected page script.
import { getCurrentUser } from '../services/auth.js';

const LOGIN_URL     = '/src/pages/login/login.html';
const DASHBOARD_URL = '/src/pages/dashboard/dashboard.html';

/**
 * Ensure the current visitor has an active session.
 * If not → redirect to login immediately (returns null and execution stops).
 * If yes → return { session, profile } so the page can use role / name.
 *
 * Usage (top of every protected page JS):
 *   const { profile } = await authGuard();
 *
 * @returns {Promise<{session: object, profile: object}|null>}
 */
export async function authGuard() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace(LOGIN_URL);
    return null;
  }
  return user; // { session, profile }
}

/**
 * Ensure the current visitor has a specific role.
 * If wrong role → redirect to dashboard (they are logged in but not authorised).
 *
 * @param {'admin'|'teacher'} requiredRole
 * @returns {Promise<{session: object, profile: object}|null>}
 */
export async function requireRole(requiredRole) {
  const user = await authGuard();
  if (!user) return null; // already redirected
  if (user.profile.role !== requiredRole) {
    window.location.replace(DASHBOARD_URL);
    return null;
  }
  return user;
}

/**
 * Redirect an already-authenticated user away from the login page.
 * Call at the top of login.js.
 */
export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    window.location.replace(DASHBOARD_URL);
  }
}
