// pages/announcements/announcements.js
import { authGuard }    from '../../utils/guards.js';
import { renderNavbar } from '../../components/navbar.js';
import { showToast }    from '../../components/toast.js';
import { formatDate, formatDateTime, toDateTimeLocal } from '../../utils/formatters.js';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/announcements.js';
import { getTeachers } from '../../services/teachers.js';

// ── Module state ──────────────────────────────────────────────────────────────

let allAnnouncements = [];
let allTeachers      = [];
let isAdmin          = false;
let teacherSince     = null; // profile.created_at for teachers, null for admins
let pendingDeleteId  = null;
let showExpired      = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, n = 140) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

function isUnread(ann) {
  // RLS on announcement_reads filters to current user → empty means unread
  return (ann.announcement_reads ?? []).length === 0;
}

function commentCount(ann) {
  return (ann.announcement_comments ?? []).filter(c => !c.deleted_at).length;
}

function isExpired(ann) {
  return ann.ends_at && new Date(ann.ends_at) < new Date();
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildCard(ann) {
  const unread     = isUnread(ann);
  const count      = commentCount(ann);
  const author     = ann.author
    ? `${ann.author.first_name ?? ''} ${ann.author.last_name ?? ''}`.trim()
    : '—';

  const audienceBadge = ann.audience_type === 'all_teachers'
    ? `<span class="badge rounded-pill bg-success-subtle text-success-emphasis" style="font-size:.7rem">All Teachers</span>`
    : `<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis" style="font-size:.7rem">Selected Teachers</span>`;

  const datesHtml = (ann.starts_at || ann.ends_at)
    ? `<span class="text-muted" style="font-size:.78rem">
         <i class="bi bi-calendar-range me-1"></i>${ann.starts_at ? formatDate(ann.starts_at) : '—'} → ${ann.ends_at ? formatDate(ann.ends_at) : '—'}
       </span>`
    : '';

  const adminBtns = isAdmin
    ? `<div class="d-flex gap-1 ms-auto flex-shrink-0">
         <button class="btn btn-sm btn-light btn-edit-ann" data-id="${escHtml(ann.id)}" title="Edit">
           <i class="bi bi-pencil"></i>
         </button>
         <button class="btn btn-sm btn-light text-danger btn-delete-ann" data-id="${escHtml(ann.id)}" data-title="${escHtml(ann.title)}" title="Delete">
           <i class="bi bi-trash"></i>
         </button>
       </div>`
    : '';

  return `
    <div class="card border-0 shadow-sm ann-card${unread ? ' ann-unread' : ''}"
         data-id="${escHtml(ann.id)}"
         style="cursor:pointer;${unread ? 'border-left:4px solid #4361ee !important;' : ''}">
      <div class="card-body p-4">
        <div class="d-flex align-items-start gap-3">
          <!-- Unread dot -->
          ${unread ? `<span class="flex-shrink-0 mt-1 rounded-circle" style="width:8px;height:8px;background:#4361ee;display:inline-block"></span>` : `<span class="flex-shrink-0 mt-1 rounded-circle" style="width:8px;height:8px;display:inline-block"></span>`}

          <div class="flex-grow-1 min-w-0">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span class="fw-semibold${unread ? '' : ' text-muted'}">${escHtml(ann.title)}</span>
              ${audienceBadge}
            </div>
            <p class="mb-2 text-muted" style="font-size:.875rem;line-height:1.5">${escHtml(truncate(ann.body))}</p>
            <div class="d-flex flex-wrap align-items-center gap-3" style="font-size:.78rem;color:#6c757d">
              ${datesHtml}
              <span><i class="bi bi-person me-1"></i>${escHtml(author)}</span>
              <span><i class="bi bi-chat me-1"></i>${count} comment${count !== 1 ? 's' : ''}</span>
              <span><i class="bi bi-clock me-1"></i>${formatDateTime(ann.created_at)}</span>
            </div>
          </div>

          ${adminBtns}
        </div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderList(list) {
  const container  = document.getElementById('announcements-list');
  const emptyState = document.getElementById('empty-state');

  if (!list.length) {
    container.innerHTML = '';
    emptyState.classList.remove('d-none');
    return;
  }

  emptyState.classList.add('d-none');
  container.innerHTML = list.map(buildCard).join('');

  // Navigate to detail on card click
  container.querySelectorAll('.ann-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate when clicking the action buttons
      if (e.target.closest('.btn-edit-ann, .btn-delete-ann')) return;
      window.location.href = `/src/pages/announcements/announcement-detail.html?id=${card.dataset.id}`;
    });
  });

  if (isAdmin) wireAdminButtons();
}

// ── Search ────────────────────────────────────────────────────────────────────

function applySearch() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  let filtered = showExpired
    ? allAnnouncements.filter(a => isExpired(a))
    : allAnnouncements.filter(a => !isExpired(a));
  if (q) filtered = filtered.filter(a =>
    a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  renderList(filtered);
}

function setupSearch() {
  document.getElementById('search-input').addEventListener('input', applySearch);
}

// ── Teacher picker helper (for create/edit forms) ─────────────────────────────

function populateTeacherPicker(selectId, selectedIds = []) {
  const el = document.getElementById(selectId);
  el.innerHTML = allTeachers.map(t =>
    `<option value="${escHtml(t.id)}" ${selectedIds.includes(t.id) ? 'selected' : ''}>
       ${escHtml(t.first_name)} ${escHtml(t.last_name)}
     </option>`
  ).join('');
}

function wireAudienceSelect(audienceSelectId, pickerWrapperId, teacherSelectId) {
  const sel = document.getElementById(audienceSelectId);
  const wrapper = document.getElementById(pickerWrapperId);

  const toggle = () => {
    if (sel.value === 'selected_teachers') {
      wrapper.classList.remove('d-none');
    } else {
      wrapper.classList.add('d-none');
    }
  };

  sel.addEventListener('change', toggle);
  toggle(); // run on init in case of pre-filled value
}

// ── Create form ───────────────────────────────────────────────────────────────

function setupCreateForm() {
  document.getElementById('btn-new-announcement').classList.remove('d-none');
  populateTeacherPicker('create-target-teachers');
  wireAudienceSelect('create-audience-type', 'create-teacher-picker', 'create-target-teachers');

  const form       = document.getElementById('create-announcement-form');
  const spinner    = document.getElementById('btn-create-spinner');
  const saveBtn    = document.getElementById('btn-create-announcement');
  const formError  = document.getElementById('create-form-error');
  const collapseEl = document.getElementById('create-announcement-collapse');

  document.getElementById('btn-cancel-create').addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    form.reset();
    form.classList.remove('was-validated');
    formError.classList.add('d-none');
    document.getElementById('create-teacher-picker').classList.add('d-none');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);
    const audienceType = fd.get('audience_type');
    const targetIds = audienceType === 'selected_teachers'
      ? [...document.getElementById('create-target-teachers').selectedOptions].map(o => o.value)
      : [];

    try {
      await createAnnouncement({
        title:         fd.get('title'),
        body:          fd.get('body'),
        starts_at:     fd.get('starts_at') || null,
        ends_at:       fd.get('ends_at')   || null,
        image_url:     fd.get('image_url') || null,
        audience_type: audienceType,
      }, targetIds);

      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      form.reset();
      form.classList.remove('was-validated');
      document.getElementById('create-teacher-picker').classList.add('d-none');
      showToast('Announcement published.', 'success');
      await loadAnnouncements();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function setupEditForm() {
  populateTeacherPicker('edit-target-teachers');
  wireAudienceSelect('edit-audience-type', 'edit-teacher-picker', 'edit-target-teachers');

  const form       = document.getElementById('edit-announcement-form');
  const spinner    = document.getElementById('btn-update-spinner');
  const saveBtn    = document.getElementById('btn-update-announcement');
  const formError  = document.getElementById('edit-form-error');
  const collapseEl = document.getElementById('edit-announcement-collapse');

  document.getElementById('btn-cancel-edit-announcement').addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    form.reset();
    form.classList.remove('was-validated');
    formError.classList.add('d-none');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);
    const id = fd.get('announcement_id');
    const audienceType = fd.get('audience_type');
    const targetIds = audienceType === 'selected_teachers'
      ? [...document.getElementById('edit-target-teachers').selectedOptions].map(o => o.value)
      : [];

    try {
      await updateAnnouncement(id, {
        title:         fd.get('title'),
        body:          fd.get('body'),
        starts_at:     fd.get('starts_at') || null,
        ends_at:       fd.get('ends_at')   || null,
        image_url:     fd.get('image_url') || null,
        audience_type: audienceType,
      }, targetIds);

      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      showToast('Announcement updated.', 'success');
      await loadAnnouncements();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Wire admin card buttons after each render ─────────────────────────────────

function wireAdminButtons() {
  // Edit
  document.querySelectorAll('.btn-edit-ann').forEach(btn => {
    btn.addEventListener('click', () => {
      const ann = allAnnouncements.find(a => a.id === btn.dataset.id);
      if (!ann) return;

      // Close create if open
      const createCollapse = document.getElementById('create-announcement-collapse');
      bootstrap.Collapse.getInstance(createCollapse)?.hide();

      document.getElementById('edit-announcement-title').textContent = `Edit — ${ann.title}`;
      document.getElementById('edit-announcement-id').value = ann.id;
      document.getElementById('edit-title').value     = ann.title      ?? '';
      document.getElementById('edit-body').value      = ann.body       ?? '';
      document.getElementById('edit-starts-at').value = toDateTimeLocal(ann.starts_at);
      document.getElementById('edit-ends-at').value   = toDateTimeLocal(ann.ends_at);
      document.getElementById('edit-image-url').value = ann.image_url  ?? '';

      // Audience
      document.getElementById('edit-audience-type').value = ann.audience_type ?? 'all_teachers';
      document.getElementById('edit-audience-type').dispatchEvent(new Event('change'));

      // Pre-select targeted teachers
      const targetedIds = (ann.announcement_targets ?? []).map(t => t.teacher_id);
      populateTeacherPicker('edit-target-teachers', targetedIds);

      const editCollapse = document.getElementById('edit-announcement-collapse');
      let instance = bootstrap.Collapse.getInstance(editCollapse);
      if (!instance) instance = new bootstrap.Collapse(editCollapse, { toggle: false });
      instance.show();
      editCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Delete
  document.querySelectorAll('.btn-delete-ann').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteId = btn.dataset.id;
      document.getElementById('delete-announcement-name').textContent = `"${btn.dataset.title}"`;
      bootstrap.Modal.getOrCreateInstance(
        document.getElementById('delete-announcement-modal')
      ).show();
    });
  });
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function setupDeleteModal() {
  const spinner = document.getElementById('btn-delete-spinner');
  const btn     = document.getElementById('btn-confirm-delete-announcement');

  btn.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    spinner.classList.remove('d-none');
    btn.disabled = true;

    try {
      await deleteAnnouncement(pendingDeleteId);
      bootstrap.Modal.getInstance(
        document.getElementById('delete-announcement-modal')
      )?.hide();
      showToast('Announcement deleted.', 'success');
      pendingDeleteId = null;
      await loadAnnouncements();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'danger');
    } finally {
      spinner.classList.add('d-none');
      btn.disabled = false;
    }
  });
}

// ── Data load ─────────────────────────────────────────────────────────────────

async function loadAnnouncements() {
  allAnnouncements = await getAnnouncements(teacherSince);
  const active  = allAnnouncements.filter(a => !isExpired(a)).length;
  const expired = allAnnouncements.length - active;
  const subtitle = (isAdmin && expired > 0)
    ? `${active} announcement${active !== 1 ? 's' : ''} · ${expired} expired`
    : `${active} announcement${active !== 1 ? 's' : ''}`;
  document.getElementById('announcements-subtitle').textContent = subtitle;
  applySearch();
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  isAdmin = profile.role === 'admin';
  if (!isAdmin) teacherSince = profile.created_at;

  document.getElementById('page-loading').classList.add('d-none');
  document.getElementById('announcements-content').classList.remove('d-none');

  try {
    if (isAdmin) {
      allTeachers = await getTeachers(false);
    }

    await loadAnnouncements();
    setupSearch();

    // Show expired toggle (all roles)
    const toggleEl = document.createElement('div');
    toggleEl.className = 'form-check form-switch ms-auto align-self-center';
    toggleEl.innerHTML = `
      <input class="form-check-input" type="checkbox" id="toggle-expired" role="switch">
      <label class="form-check-label small text-muted" for="toggle-expired">Show expired</label>
    `;
    document.getElementById('search-bar').appendChild(toggleEl);
    document.getElementById('toggle-expired').addEventListener('change', (e) => {
      showExpired = e.target.checked;
      applySearch();
    });

    if (isAdmin) {
      setupCreateForm();
      setupEditForm();
      setupDeleteModal();
    }
  } catch (err) {
    showToast('Failed to load announcements: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
