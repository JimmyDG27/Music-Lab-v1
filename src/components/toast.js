// components/toast.js
// Bootstrap 5 live-region toast notifications.
// Requires #toast-container in the page and Bootstrap JS bundle loaded.

const ICONS = {
  success: 'bi-check-circle-fill',
  danger:  'bi-exclamation-triangle-fill',
  warning: 'bi-exclamation-circle-fill',
  info:    'bi-info-circle-fill',
};

/**
 * Show a Bootstrap 5 toast.
 * @param {string} message  - Text to display.
 * @param {'success'|'danger'|'info'|'warning'} [type] - Colour variant.
 * @param {number} [delay]  - Auto-hide delay in ms (default 4000).
 */
export function showToast(message, type = 'info', delay = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('[Toast] #toast-container not found in DOM.');
    return;
  }

  const icon = ICONS[type] ?? ICONS.info;

  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icon}"></i>
        <span>${message}</span>
      </div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        data-bs-dismiss="toast"
        aria-label="Close"
      ></button>
    </div>`;

  container.appendChild(el);

  // Bootstrap Toast instance
  const toast = new bootstrap.Toast(el, { delay });
  toast.show();

  // Remove from DOM after hidden so it doesn't accumulate
  el.addEventListener('hidden.bs.toast', () => el.remove());
}
