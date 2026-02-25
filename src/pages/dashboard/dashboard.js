// pages/dashboard/dashboard.js
// Protected page — role-aware dashboard shell.
import { authGuard } from '../../utils/guards.js';
import { logout }    from '../../services/auth.js';
import { showToast } from '../../components/toast.js';

async function init() {
  // ── Auth guard: redirects to login if no session ──────────────────────────
  const user = await authGuard();
  if (!user) return; // redirect already triggered

  const { profile } = user;

  // ── Render welcome stub ───────────────────────────────────────────────────
  // Full dashboard UI (cards, stats) comes in the next milestone.
  const content = document.getElementById('dashboard-content');
  if (content) {
    content.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="h4 fw-semibold mb-0">
            Welcome, ${escHtml(profile.first_name || profile.email)} 👋
          </h2>
          <span class="badge bg-${
            profile.role === 'admin' ? 'danger' : 'primary'
          } mt-1">${profile.role}</span>
        </div>
        <button id="btn-logout" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-box-arrow-right me-1"></i>Logout
        </button>
      </div>
      <p class="text-muted">Dashboard UI coming next — auth is working correctly.</p>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      try {
        await logout();
        window.location.replace('/src/pages/login/login.html');
      } catch (err) {
        showToast('Logout failed: ' + err.message, 'danger');
      }
    });
  }
}

/** Escape HTML to prevent XSS when injecting user data into innerHTML. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);
