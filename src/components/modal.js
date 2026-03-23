// components/modal.js
// Shared delete-confirmation modal — returns a Promise<boolean>.

const MODAL_ID = 'ml-confirm-delete-modal';

function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content ml-confirm-modal">
          <div class="modal-body px-4 pt-4 pb-3 text-center">
            <div class="ml-confirm-modal-icon mb-3" aria-hidden="true">
              <i class="bi bi-trash3"></i>
            </div>
            <p id="ml-confirm-modal-title" class="ml-confirm-modal-title"></p>
            <p id="ml-confirm-modal-msg"   class="ml-confirm-modal-msg"></p>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex">
            <button type="button" id="ml-confirm-modal-cancel"
                    class="btn btn-light flex-fill"
                    data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="ml-confirm-modal-confirm"
                    class="btn btn-danger flex-fill">Delete</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);
}

/**
 * Show a consistent delete-confirmation modal.
 * @param {{ title?: string, message?: string, confirmLabel?: string }} opts
 * @returns {Promise<boolean>} Resolves true if user confirmed, false otherwise.
 */
export function confirmDelete({
  title        = 'Delete',
  message      = 'This action cannot be undone.',
  confirmLabel = 'Delete',
} = {}) {
  ensureModal();

  document.getElementById('ml-confirm-modal-title').textContent = title;
  document.getElementById('ml-confirm-modal-msg').textContent   = message;

  const modalEl = document.getElementById(MODAL_ID);
  const modal   = window.bootstrap.Modal.getOrCreateInstance(modalEl);

  // Clone confirm button to remove stale event listeners
  const oldBtn = document.getElementById('ml-confirm-modal-confirm');
  const btn    = oldBtn.cloneNode(true);
  btn.textContent = confirmLabel;
  oldBtn.replaceWith(btn);

  return new Promise((resolve) => {
    btn.addEventListener('click', () => {
      modal.hide();
      resolve(true);
    }, { once: true });

    modalEl.addEventListener('hidden.bs.modal', () => resolve(false), { once: true });

    modal.show();
  });
}
