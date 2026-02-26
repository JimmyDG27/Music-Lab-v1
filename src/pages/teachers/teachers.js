// pages/teachers/teachers.js
import { authGuard }     from '../../utils/guards.js';
import { renderNavbar }  from '../../components/navbar.js';
import { showToast }     from '../../components/toast.js';
import { formatDate }    from '../../utils/formatters.js';
import {
  getTeachers,
  updateTeacher,
  inviteTeacher,
} from '../../services/teachers.js';

// ── Module state ──────────────────────────────────────────────────────────────

let allTeachers   = [];
let isAdmin       = false;
let currentUserId = null;
let currentSort   = 'az';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Deterministic avatar color from name
const AVATAR_COLORS = [
  '#4361ee', '#3a0ca3', '#7209b7', '#f72585',
  '#4cc9f0', '#06d6a0', '#fb8500', '#e63946',
];
function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(first, last) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

// Check if a date's month+day matches today
function isBirthdayToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d     = new Date(dateStr);
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

// Count active primary students (is_active student + no active_to on assignment)
function activeStudentCount(assignments) {
  return (assignments ?? []).filter(
    a => a.role === 'primary' && !a.active_to && a.student?.is_active
  ).length;
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildCard(teacher) {
  const fullName   = `${teacher.first_name} ${teacher.last_name}`;
  const color      = avatarColor(fullName);
  const initText   = initials(teacher.first_name, teacher.last_name);
  const since      = formatDate(teacher.created_at);
  const isSelf     = teacher.id === currentUserId;

  const stuCount   = isAdmin ? activeStudentCount(teacher.student_teacher_assignments) : null;
  const stuStat    = isAdmin
    ? `<span class="badge rounded-pill fw-normal mt-1 d-inline-flex align-items-center gap-1"
           style="font-size:.72rem;background:#eef2ff;color:#4361ee;border:1px solid #c7d2fe">
         <i class="bi bi-people-fill"></i>${stuCount} active student${stuCount !== 1 ? 's' : ''}
       </span>`
    : '';

  const editBtn = isAdmin ? `
    <button class="btn btn-sm btn-light btn-edit-teacher"
      data-id="${escHtml(teacher.id)}"
      title="Edit">
      <i class="bi bi-pencil"></i>
    </button>` : '';

  const selfBadge = isSelf
    ? `<span class="badge bg-primary-subtle text-primary rounded-pill ms-2" style="font-size:.7rem">You</span>`
    : '';

  const bdayBadge = isBirthdayToday(teacher.birth_date)
    ? `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill ms-1" style="font-size:.7rem">🎂 Birthday</span>`
    : '';

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-body d-flex flex-column gap-2 p-4">

          <div class="d-flex align-items-center justify-content-between mb-1">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0
                           fw-bold text-white" style="width:46px;height:46px;font-size:1.05rem;background:${color}">
                ${initText}
              </div>
              <div>
                <div class="fw-semibold lh-sm">
                  ${escHtml(fullName)}${selfBadge}${bdayBadge}
                </div>
                ${stuStat}
              </div>
            </div>
            ${editBtn}
          </div>

          <hr class="my-1" />

          <div class="d-flex flex-column gap-1" style="font-size:.85rem">
            <div>
              <i class="bi bi-envelope me-2 text-muted"></i>
              ${teacher.email
                ? `<a href="mailto:${escHtml(teacher.email)}" class="text-decoration-none">${escHtml(teacher.email)}</a>`
                : '<span class="text-muted">—</span>'}
            </div>
            <div>
              <i class="bi bi-telephone me-2 text-muted"></i>
              ${teacher.phone
                ? `<a href="tel:${escHtml(teacher.phone)}" class="text-decoration-none">${escHtml(teacher.phone)}</a>`
                : '<span class="text-muted">—</span>'}
            </div>
            ${teacher.social_links ? `
            <div>
              <i class="bi bi-link-45deg me-2 text-muted"></i>
              <a href="${escHtml(teacher.social_links)}" target="_blank" rel="noopener noreferrer"
                class="text-decoration-none text-truncate d-inline-block" style="max-width:200px;vertical-align:bottom">
                ${escHtml(teacher.social_links.replace(/^https?:\/\//, ''))}
              </a>
            </div>` : ''}
            <div class="text-muted">
              <i class="bi bi-calendar3 me-2"></i>Since ${since}
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderGrid(teachers) {
  const grid  = document.getElementById('teachers-grid');
  const empty = document.getElementById('empty-state');

  if (!teachers.length) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');
  grid.innerHTML = teachers.map(buildCard).join('');
  if (isAdmin) wireAdminCardButtons();
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function sortTeachers(list) {
  const copy = [...list];
  if (currentSort === 'az') {
    copy.sort((a, b) =>
      (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name));
  } else if (currentSort === 'za') {
    copy.sort((a, b) =>
      (b.first_name + ' ' + b.last_name).localeCompare(a.first_name + ' ' + a.last_name));
  } else if (currentSort === 'students') {
    // Most active primary students first (admin only; for teachers returns 0 for all)
    copy.sort((a, b) =>
      activeStudentCount(b.student_teacher_assignments) -
      activeStudentCount(a.student_teacher_assignments));
  } else if (currentSort === 'bday') {
    // Birthday today floated to top, then A→Z within each group
    copy.sort((a, b) => {
      const aB = isBirthdayToday(a.birth_date) ? 0 : 1;
      const bB = isBirthdayToday(b.birth_date) ? 0 : 1;
      if (aB !== bB) return aB - bB;
      return (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name);
    });
  }
  return copy;
}

// ── Search + Sort ─────────────────────────────────────────────────────────────

function applyFilters() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const filtered = q
    ? allTeachers.filter(t =>
        (t.first_name + ' ' + t.last_name).toLowerCase().includes(q))
    : allTeachers;
  renderGrid(sortTeachers(filtered));
}

function setupSearch() {
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });
}

// ── Invite form (Admin only) ──────────────────────────────────────────────────

function setupInviteForm() {
  document.getElementById('btn-invite-teacher').classList.remove('d-none');

  const form       = document.getElementById('invite-teacher-form');
  const spinner    = document.getElementById('btn-invite-spinner');
  const saveBtn    = document.getElementById('btn-send-invite');
  const formError  = document.getElementById('invite-form-error');
  const collapseEl = document.getElementById('invite-teacher-collapse');

  document.getElementById('btn-cancel-invite').addEventListener('click', () => {
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
    try {
      await inviteTeacher({
        email:      fd.get('email'),
        first_name: fd.get('first_name'),
        last_name:  fd.get('last_name'),
      });
      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      form.reset();
      form.classList.remove('was-validated');
      showToast('Invitation sent! The teacher will receive a setup email.', 'success');
      await loadTeachers();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Edit form (Admin only) ────────────────────────────────────────────────────

function setupEditForm() {
  const form       = document.getElementById('edit-teacher-form');
  const spinner    = document.getElementById('btn-update-spinner');
  const saveBtn    = document.getElementById('btn-update-teacher');
  const formError  = document.getElementById('edit-teacher-error');
  const collapseEl = document.getElementById('edit-teacher-collapse');

  document.getElementById('btn-cancel-edit-teacher').addEventListener('click', () => {
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
    const id = fd.get('teacher_id');
    try {
      await updateTeacher(id, {
        first_name:   fd.get('first_name'),
        last_name:    fd.get('last_name'),
        phone:        fd.get('phone')         || null,
        email:        fd.get('email')         || null,
        birth_date:   fd.get('birth_date')    || null,
        social_links: fd.get('social_links')  || null,
      });
      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      showToast('Teacher updated.', 'success');
      await loadTeachers();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Wire edit buttons after each render ───────────────────────────────────────

function wireAdminCardButtons() {
  document.querySelectorAll('.btn-edit-teacher').forEach(btn => {
    btn.addEventListener('click', () => {
      const teacher = allTeachers.find(t => t.id === btn.dataset.id);
      if (!teacher) return;

      // Close invite form if open
      const inviteCollapse = document.getElementById('invite-teacher-collapse');
      bootstrap.Collapse.getInstance(inviteCollapse)?.hide();

      document.getElementById('edit-teacher-title').textContent =
        `Edit — ${teacher.first_name} ${teacher.last_name}`;
      document.getElementById('edit-teacher-id').value    = teacher.id;
      document.getElementById('edit-first-name').value    = teacher.first_name   ?? '';
      document.getElementById('edit-last-name').value     = teacher.last_name    ?? '';
      document.getElementById('edit-phone').value         = teacher.phone        ?? '';
      document.getElementById('edit-email').value         = teacher.email        ?? '';
      document.getElementById('edit-birth-date').value    = teacher.birth_date   ?? '';
      document.getElementById('edit-social-links').value  = teacher.social_links ?? '';

      const editCollapse = document.getElementById('edit-teacher-collapse');
      let instance = bootstrap.Collapse.getInstance(editCollapse);
      if (!instance) instance = new bootstrap.Collapse(editCollapse, { toggle: false });
      instance.show();
      editCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Data load ─────────────────────────────────────────────────────────────────

async function loadTeachers() {
  allTeachers = await getTeachers(isAdmin);
  const count = allTeachers.length;
  document.getElementById('teachers-subtitle').textContent =
    `${count} teacher${count !== 1 ? 's' : ''}`;
  applyFilters();
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  isAdmin       = profile.role === 'admin';
  currentUserId = profile.id;

  document.getElementById('page-loading').classList.add('d-none');
  document.getElementById('teachers-content').classList.remove('d-none');

  try {
    await loadTeachers();
    setupSearch();
    if (isAdmin) {
      setupInviteForm();
      setupEditForm();
    }
  } catch (err) {
    showToast('Failed to load teachers: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
