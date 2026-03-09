// pages/login/login.js
// Login page: form handling, Supabase Auth, role-based redirect.
import { login }                   from '../../services/auth.js';
import { redirectIfAuthenticated } from '../../utils/guards.js';
import { showToast }               from '../../components/toast.js';

const DASHBOARD_URL = '/src/pages/dashboard/dashboard.html';

// ── Helpers ───────────────────────────────────────────────────────────────────

function showInlineError(message) {
  const el = document.getElementById('login-error');
  el.innerHTML = `<i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>${message}</span>`;
  el.classList.remove('d-none');
}

function clearInlineError() {
  const el = document.getElementById('login-error');
  el.innerHTML = '';
  el.classList.add('d-none');
}

function setLoading(isLoading) {
  const btn = document.getElementById('login-btn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Signing in…'
    : '<i class="bi bi-box-arrow-in-right me-2"></i>Sign in';
}

// ── Bootstrap validation ──────────────────────────────────────────────────────

function validateForm(form) {
  form.classList.add('was-validated');
  return form.checkValidity();
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // If already logged in, skip the login page entirely
  await redirectIfAuthenticated();

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInlineError();

    if (!validateForm(form)) return;

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(true);
    try {
      await login(email, password);
      // Successful login — go to dashboard
      window.location.replace(DASHBOARD_URL);
    } catch (err) {
      setLoading(false);
      showInlineError(err.message);
      showToast(err.message, 'danger');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
