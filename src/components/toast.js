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
 * Show a toast notification.
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
  el.className = `toast ml-toast ml-toast-${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <i class="bi ${icon} ml-toast-icon" aria-hidden="true"></i>
      <span class="flex-grow-1" style="font-size:.875rem;line-height:1.4">${message}</span>
      <button
        type="button"
        class="btn-close ms-1 flex-shrink-0"
        data-bs-dismiss="toast"
        aria-label="Close"
        style="width:.85rem;height:.85rem;font-size:.6rem"
      ></button>
    </div>`;

  container.appendChild(el);

  const toast = new bootstrap.Toast(el, { delay });
  toast.show();

  el.addEventListener('hidden.bs.toast', () => el.remove());
}
