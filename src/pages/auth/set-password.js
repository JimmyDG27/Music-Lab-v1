// pages/auth/set-password.js
// Invite acceptance flow: exchange token from URL hash, then let user set a password.
import { exchangeInviteToken, setPassword } from '../../services/auth.js';

const DASHBOARD_URL = '/src/pages/dashboard/dashboard.html';

function show(id)  { document.getElementById(id).classList.remove('d-none'); }
function hide(id)  { document.getElementById(id).classList.add('d-none'); }

async function init() {
  // 1. Try to exchange the invite token from the URL hash
  try {
    await exchangeInviteToken();
  } catch (err) {
    hide('token-loading');
    document.getElementById('token-error-msg').textContent = err.message;
    show('token-error');
    return;
  }

  // 2. Token valid — show the set-password form
  hide('token-loading');
  show('set-password-form');

  const form     = document.getElementById('set-password-form');
  const spinner  = document.getElementById('btn-set-spinner');
  const saveBtn  = document.getElementById('btn-set-password');
  const errEl    = document.getElementById('set-pw-error');
  const pwInput  = document.getElementById('new-password');
  const cfmInput = document.getElementById('confirm-password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('d-none');

    // Manual validity + password match check
    const pw  = pwInput.value;
    const cfm = cfmInput.value;

    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    if (pw !== cfm) {
      cfmInput.setCustomValidity('no-match');
      cfmInput.reportValidity();
      return;
    }
    cfmInput.setCustomValidity('');

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
      await setPassword(pw);
      // Password set → go straight to dashboard
      window.location.replace(DASHBOARD_URL);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });

  // Clear custom validity on input so the error goes away
  cfmInput.addEventListener('input', () => cfmInput.setCustomValidity(''));
}

document.addEventListener('DOMContentLoaded', init);
