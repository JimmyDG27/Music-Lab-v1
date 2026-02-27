// pages/profile/profile.js
import { authGuard }              from '../../utils/guards.js';
import { renderNavbar }           from '../../components/navbar.js';
import { showToast }              from '../../components/toast.js';
import { updateProfile, setPassword } from '../../services/auth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4361ee','#3a0ca3','#7209b7','#f72585',
  '#4cc9f0','#06d6a0','#fb8500','#e63946',
];
function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(first, last) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

// ── Render header ─────────────────────────────────────────────────────────────

function renderHeader(profile) {
  const full   = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email;
  const color  = avatarColor(full);
  const init   = initials(profile.first_name, profile.last_name);

  const avatarEl = document.getElementById('profile-avatar');
  avatarEl.textContent       = init;
  avatarEl.style.background  = color;

  document.getElementById('profile-fullname').textContent = full;

  const badge = document.getElementById('profile-role-badge');
  if (profile.role === 'admin') {
    badge.classList.add('ml-badge-admin');
    badge.textContent = 'Admin';
  } else {
    badge.classList.add('ml-badge-teacher');
    badge.textContent = 'Teacher';
  }
}

// ── Pre-fill form ─────────────────────────────────────────────────────────────

function prefillForm(profile) {
  document.getElementById('profile-first-name').value  = profile.first_name  ?? '';
  document.getElementById('profile-last-name').value   = profile.last_name   ?? '';
  document.getElementById('profile-phone').value       = profile.phone       ?? '';
  document.getElementById('profile-birth-date').value  = profile.birth_date  ?? '';
  document.getElementById('profile-social-links').value = profile.social_links ?? '';
}

// ── Profile form ──────────────────────────────────────────────────────────────

function setupProfileForm() {
  const form    = document.getElementById('profile-form');
  const spinner = document.getElementById('btn-save-spinner');
  const saveBtn = document.getElementById('btn-save-profile');
  const errEl   = document.getElementById('profile-form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    errEl.classList.add('d-none');

    const fd = new FormData(form);
    try {
      await updateProfile({
        first_name:   fd.get('first_name'),
        last_name:    fd.get('last_name'),
        phone:        fd.get('phone')        || null,
        birth_date:   fd.get('birth_date')   || null,
        social_links: fd.get('social_links') || null,
      });

      showToast('Profile saved.', 'success');

      // Refresh header with updated name
      const full  = `${fd.get('first_name')} ${fd.get('last_name')}`.trim();
      const color = avatarColor(full);
      const init  = initials(fd.get('first_name'), fd.get('last_name'));
      const avatarEl = document.getElementById('profile-avatar');
      avatarEl.textContent      = init;
      avatarEl.style.background = color;
      document.getElementById('profile-fullname').textContent = full;
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Password form ─────────────────────────────────────────────────────────────

function setupPasswordForm() {
  const modal   = new bootstrap.Modal(document.getElementById('change-password-modal'));
  const form    = document.getElementById('password-form');
  const spinner = document.getElementById('btn-pw-spinner');
  const btn     = document.getElementById('btn-change-password');
  const errEl   = document.getElementById('password-form-error');
  const pwInput = document.getElementById('new-password');
  const cfmInput = document.getElementById('confirm-password');

  // Reset form when modal closes
  document.getElementById('change-password-modal').addEventListener('hidden.bs.modal', () => {
    form.reset();
    form.classList.remove('was-validated');
    errEl.classList.add('d-none');
    cfmInput.setCustomValidity('');
  });

  cfmInput.addEventListener('input', () => cfmInput.setCustomValidity(''));

  btn.addEventListener('click', async () => {
    form.classList.add('was-validated');
    errEl.classList.add('d-none');
    if (!form.checkValidity()) return;

    const pw  = pwInput.value;
    const cfm = cfmInput.value;
    if (pw !== cfm) {
      cfmInput.setCustomValidity('no-match');
      cfmInput.reportValidity();
      return;
    }
    cfmInput.setCustomValidity('');

    spinner.classList.remove('d-none');
    btn.disabled = true;

    try {
      await setPassword(pw);
      modal.hide();
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      btn.disabled = false;
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  document.getElementById('page-loading').classList.add('d-none');
  document.getElementById('profile-content').classList.remove('d-none');

  // Need full profile fields — fetch them (authGuard only fetches minimal fields)
  try {
    const { supabase } = await import('../../services/supabase.js');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name, email, phone, birth_date, social_links')
      .eq('id', profile.id)
      .single();
    if (error) throw error;

    renderHeader(data);
    prefillForm(data);
  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'danger');
  }

  setupProfileForm();
  setupPasswordForm();
}

document.addEventListener('DOMContentLoaded', init);
