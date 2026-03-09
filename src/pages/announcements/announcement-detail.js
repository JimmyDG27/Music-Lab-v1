// pages/announcements/announcement-detail.js
import { authGuard }    from '../../utils/guards.js';
import { renderNavbar } from '../../components/navbar.js';
import { showToast }    from '../../components/toast.js';
import { formatDate, formatDateTime, toDateTimeLocal } from '../../utils/formatters.js';
import {
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '../../services/announcements.js';
import { getTeachers } from '../../services/teachers.js';

// ── Module state ──────────────────────────────────────────────────────────────

let announcementId = null;
let currentUserId  = null;
let isAdmin        = false;
let allTeachers    = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Announcement renderer ─────────────────────────────────────────────────────

function renderAnnouncement(ann) {
  document.title = `${ann.title} — Music Lab`;

  // Image
  if (ann.image_url) {
    document.getElementById('ann-image').src = ann.image_url;
    document.getElementById('ann-image').alt = escHtml(ann.title);
    document.getElementById('ann-image-wrap').classList.remove('d-none');
  }

  // Title
  document.getElementById('ann-title').textContent = ann.title;

  // Audience badge
  const badge    = document.getElementById('ann-audience-badge');
  badge.className = ann.audience_type === 'all_teachers'
    ? 'badge rounded-pill bg-success-subtle text-success-emphasis'
    : 'badge rounded-pill bg-warning-subtle text-warning-emphasis';
  badge.style.fontSize = '.7rem';
  badge.textContent    = ann.audience_type === 'all_teachers' ? 'All Teachers' : 'Selected Teachers';

  // Meta
  const author = ann.author
    ? `${ann.author.first_name ?? ''} ${ann.author.last_name ?? ''}`.trim()
    : '—';
  document.getElementById('ann-meta').textContent =
    `Posted by ${author} · ${formatDateTime(ann.created_at)}`;

  // Dates
  if (ann.starts_at || ann.ends_at) {
    document.getElementById('ann-dates-text').textContent =
      `${ann.starts_at ? formatDate(ann.starts_at) : '—'} → ${ann.ends_at ? formatDate(ann.ends_at) : '—'}`;
    document.getElementById('ann-dates').classList.remove('d-none');
  }

  // Body
  document.getElementById('ann-body').textContent = ann.body ?? '';

  // Admin actions
  if (isAdmin) {
    const adminActions = document.getElementById('admin-actions');
    adminActions.classList.remove('d-none');
    adminActions.classList.add('d-flex');
    setupAdminEdit(ann);
    setupAdminDelete();
  }
}

// ── Admin edit (detail page) ──────────────────────────────────────────────────

function populateTeacherPicker(selectedIds = []) {
  const el = document.getElementById('edit-target-teachers');
  el.innerHTML = allTeachers.map(t =>
    `<option value="${escHtml(t.id)}" ${selectedIds.includes(t.id) ? 'selected' : ''}>
       ${escHtml(t.first_name)} ${escHtml(t.last_name)}
     </option>`
  ).join('');
}

function wireAudienceToggle() {
  const sel     = document.getElementById('edit-audience-type');
  const wrapper = document.getElementById('edit-teacher-picker');
  const toggle  = () => {
    wrapper.classList.toggle('d-none', sel.value !== 'selected_teachers');
  };
  sel.addEventListener('change', toggle);
  toggle();
}

function setupAdminEdit(ann) {
  // Pre-fill edit form
  document.getElementById('edit-announcement-id').value = ann.id;
  document.getElementById('edit-title').value     = ann.title      ?? '';
  document.getElementById('edit-body').value      = ann.body       ?? '';
  document.getElementById('edit-starts-at').value = toDateTimeLocal(ann.starts_at);
  document.getElementById('edit-ends-at').value   = toDateTimeLocal(ann.ends_at);
  document.getElementById('edit-image-url').value = ann.image_url  ?? '';
  document.getElementById('edit-audience-type').value = ann.audience_type ?? 'all_teachers';

  const targetedIds = (ann.announcement_targets ?? []).map(t => t.teacher_id);
  populateTeacherPicker(targetedIds);
  wireAudienceToggle();

  // Cancel
  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    const collapseEl = document.getElementById('edit-announcement-collapse');
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    document.getElementById('edit-announcement-form').classList.remove('was-validated');
    document.getElementById('edit-form-error').classList.add('d-none');
  });

  // Submit
  const form    = document.getElementById('edit-announcement-form');
  const spinner = document.getElementById('btn-update-spinner');
  const saveBtn = document.getElementById('btn-update-announcement');
  const errEl   = document.getElementById('edit-form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    errEl.classList.add('d-none');

    const fd = new FormData(form);
    const audienceType = fd.get('audience_type');
    const targetIds = audienceType === 'selected_teachers'
      ? [...document.getElementById('edit-target-teachers').selectedOptions].map(o => o.value)
      : [];

    try {
      await updateAnnouncement(ann.id, {
        title:         fd.get('title'),
        body:          fd.get('body'),
        starts_at:     fd.get('starts_at') || null,
        ends_at:       fd.get('ends_at')   || null,
        image_url:     fd.get('image_url') || null,
        audience_type: audienceType,
      }, targetIds);

      showToast('Announcement updated.', 'success');
      // Reload to reflect changes
      window.location.reload();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

function setupAdminDelete() {
  const spinner = document.getElementById('btn-delete-spinner');
  const btn     = document.getElementById('btn-confirm-delete');

  btn.addEventListener('click', async () => {
    spinner.classList.remove('d-none');
    btn.disabled = true;

    try {
      await deleteAnnouncement(announcementId);
      window.location.href = '/src/pages/announcements/announcements.html';
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'danger');
      spinner.classList.add('d-none');
      btn.disabled = false;
    }
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────

const COMMENT_COLORS = ['#4361ee','#3a0ca3','#7209b7','#f72585','#4cc9f0','#06d6a0','#fb8500','#e63946'];
function commentAvatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COMMENT_COLORS[Math.abs(h) % COMMENT_COLORS.length];
}
function commentInitials(first, last) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function buildCommentHtml(comment) {
  const first    = comment.author?.first_name ?? '';
  const last     = comment.author?.last_name  ?? '';
  const author   = `${first} ${last}`.trim() || '—';
  const canEdit  = (comment.author_id === currentUserId) || isAdmin;
  const isOwn    = comment.author_id === currentUserId;
  const color    = commentAvatarColor(author);
  const initText = commentInitials(first, last);
  const bubble   = isOwn
    ? 'background:#eef2ff;border:1px solid #c7d2fe'
    : 'background:#f8f9fa;border:1px solid #e9ecef';

  return `
    <div class="d-flex gap-3 comment-item" data-id="${escHtml(comment.id)}">
      <!-- Avatar -->
      <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
           style="width:36px;height:36px;font-size:.75rem;background:${color};margin-top:2px">
        ${initText}
      </div>
      <!-- Bubble -->
      <div class="flex-grow-1 rounded-3 px-3 py-2" style="${bubble}">
        <div class="d-flex flex-wrap align-items-baseline gap-2 mb-1">
          <span class="fw-semibold" style="font-size:.875rem">${escHtml(author)}</span>
          ${isOwn ? `<span class="badge rounded-pill" style="font-size:.65rem;background:#c7d2fe;color:#3730a3">You</span>` : ''}
          <span class="text-muted" style="font-size:.73rem">${formatDateTime(comment.created_at)}</span>
          ${comment.updated_at !== comment.created_at
            ? `<span class="text-muted fst-italic" style="font-size:.7rem">(edited)</span>`
            : ''}
        </div>
        <!-- Display view -->
        <div class="comment-body-view" style="white-space:pre-wrap;font-size:.875rem;line-height:1.6">${escHtml(comment.body)}</div>
        <!-- Inline edit view -->
        <div class="comment-edit-view d-none">
          <textarea class="form-control form-control-sm comment-edit-textarea mb-1" rows="2">${escHtml(comment.body)}</textarea>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-primary btn-comment-save-edit" style="font-size:.75rem">Save</button>
            <button class="btn btn-sm btn-light btn-comment-cancel-edit" style="font-size:.75rem">Cancel</button>
          </div>
        </div>
        ${canEdit ? `
        <div class="d-flex gap-1 mt-1">
          <button class="btn btn-sm btn-comment-edit" style="color:var(--text-400,#9ca3af);padding:.15rem .35rem;font-size:.8rem;line-height:1;border:none;background:none" aria-label="Edit comment" title="Edit">
            <i class="bi bi-pencil-fill" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-comment-delete" style="color:#dc3545;padding:.15rem .35rem;font-size:.8rem;line-height:1;border:none;background:none" aria-label="Delete comment" title="Delete">
            <i class="bi bi-trash-fill" aria-hidden="true"></i>
          </button>
        </div>` : ''}
      </div>
    </div>`;
}

async function renderComments() {
  const comments = await getComments(announcementId);
  const list     = document.getElementById('comments-list');
  const empty    = document.getElementById('comments-empty');
  const badge    = document.getElementById('comment-count-badge');

  badge.textContent = comments.length;

  if (!comments.length) {
    list.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }

  empty.classList.add('d-none');
  list.innerHTML = comments.map(buildCommentHtml).join('');

  // Wire edit / delete per comment
  list.querySelectorAll('.comment-item').forEach(item => {
    const id = item.dataset.id;

    // Inline edit toggle
    item.querySelector('.btn-comment-edit')?.addEventListener('click', () => {
      item.querySelector('.comment-body-view').classList.add('d-none');
      item.querySelector('.comment-edit-view').classList.remove('d-none');
      item.querySelector('.btn-comment-edit').closest('div').classList.add('d-none');
    });

    // Cancel inline edit
    item.querySelector('.btn-comment-cancel-edit')?.addEventListener('click', () => {
      item.querySelector('.comment-edit-view').classList.add('d-none');
      item.querySelector('.comment-body-view').classList.remove('d-none');
      item.querySelector('.btn-comment-edit')?.closest('div').classList.remove('d-none');
    });

    // Save inline edit
    item.querySelector('.btn-comment-save-edit')?.addEventListener('click', async () => {
      const newBody = item.querySelector('.comment-edit-textarea').value.trim();
      if (!newBody) return;
      try {
        await updateComment(id, newBody);
        showToast('Comment updated.', 'success');
        await renderComments();
      } catch (err) {
        showToast('Update failed: ' + err.message, 'danger');
      }
    });

    // Delete comment
    item.querySelector('.btn-comment-delete')?.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      try {
        await deleteComment(id);
        showToast('Comment deleted.', 'success');
        await renderComments();
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'danger');
      }
    });
  });
}

function setupCommentForm() {
  const form    = document.getElementById('comment-form');
  const spinner = document.getElementById('btn-comment-spinner');
  const btn     = document.getElementById('btn-post-comment');
  const textarea = document.getElementById('comment-body');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const body = textarea.value.trim();
    if (!body) return;

    spinner.classList.remove('d-none');
    btn.disabled = true;

    try {
      await createComment(announcementId, body);
      textarea.value = '';
      form.classList.remove('was-validated');
      await renderComments();
    } catch (err) {
      showToast('Failed to post comment: ' + err.message, 'danger');
    } finally {
      spinner.classList.add('d-none');
      btn.disabled = false;
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Read ID from query string
  announcementId = new URLSearchParams(window.location.search).get('id');
  if (!announcementId) {
    window.location.replace('/src/pages/announcements/announcements.html');
    return;
  }

  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);
  isAdmin       = profile.role === 'admin';
  currentUserId = profile.id;

  if (isAdmin) {
    allTeachers = await getTeachers(false);
  }

  try {
    const ann = await getAnnouncementById(announcementId);

    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('detail-content').classList.remove('d-none');

    renderAnnouncement(ann);

    // Mark as read (fire-and-forget — don't block UI)
    markAsRead(announcementId).catch(() => {});

    await renderComments();
    setupCommentForm();
  } catch (err) {
    showToast('Failed to load announcement: ' + err.message, 'danger');
    document.getElementById('page-loading').classList.add('d-none');
  }
}

document.addEventListener('DOMContentLoaded', init);
