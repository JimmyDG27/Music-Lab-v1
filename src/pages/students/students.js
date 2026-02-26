// pages/students/students.js
import { authGuard }       from '../../utils/guards.js';
import { renderNavbar }    from '../../components/navbar.js';
import { showToast }       from '../../components/toast.js';
import { formatDate }      from '../../utils/formatters.js';
import {
  getStudents,
  getLastLessonDates,
  getTeacherProfiles,
  createStudent,
  updateStudent,
  reassignPrimaryTeacher,
} from '../../services/students.js';

// ── Module state ──────────────────────────────────────────────────────────────

let allStudents   = [];
let lastLessonMap = {};
let currentSort   = 'az';   // default: A → Z
let isAdmin       = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getPrimaryTeacher(assignments) {
  const a = (assignments ?? []).find(a => a.role === 'primary' && !a.active_to);
  if (!a?.teacher) return '—';
  return `${escHtml(a.teacher.first_name)} ${escHtml(a.teacher.last_name)}`;
}

// Returns active assistant names for a student (for primary teacher’s view)
function getActiveAssistants(assignments) {  return (assignments ?? []).filter(
    a => a.role === 'assistant' && !a.active_to
  );
}

// ── Row builder ───────────────────────────────────────────────────────────────

function buildRow(student) {
  const name       = escHtml(`${student.first_name} ${student.last_name}`);
  const lastLesson = formatDate(lastLessonMap[student.id]);
  const assignments = student.student_teacher_assignments ?? [];
  const statusBadge = student.is_active
    ? '<span class="badge rounded-pill bg-success-subtle text-success fw-semibold">Active</span>'
    : '<span class="badge rounded-pill bg-danger-subtle text-danger fw-semibold">Inactive</span>';
  const href = `/src/pages/students/student-detail.html?id=${escHtml(student.id)}`;

  // Primary teacher name
  const primaryTeacherName = getPrimaryTeacher(assignments);

  // For primary teacher: show active assistant names below
  const assistants = getActiveAssistants(assignments);
  const assistantLine = assistants.length
    ? assistants.map(a =>
        a.teacher
          ? `<span class="badge bg-secondary-subtle text-secondary rounded-pill" style="font-size:.7rem">
               <i class="bi bi-person-plus me-1"></i>${escHtml(a.teacher.first_name)} ${escHtml(a.teacher.last_name)}
             </span>`
          : ''
      ).join(' ')
    : '';

  const teacherCell = `
    <div>${escHtml(primaryTeacherName)}</div>
    ${assistantLine ? `<div class="mt-1">${assistantLine}</div>` : ''}`;

  const adminActions = isAdmin ? `
    <button class="btn btn-sm btn-light me-1 btn-edit-student"
      data-id="${escHtml(student.id)}"
      data-first="${escHtml(student.first_name)}"
      data-last="${escHtml(student.last_name)}"
      data-phone="${escHtml(student.phone ?? '')}"
      data-email="${escHtml(student.email ?? '')}"
      data-birth="${escHtml(student.birth_date ?? '')}"
      data-active="${student.is_active}"
      title="Edit">
      <i class="bi bi-pencil"></i>
    </button>
    <button class="btn btn-sm ${student.is_active ? 'btn-light text-danger' : 'btn-light text-success'} btn-toggle-status"
      data-id="${escHtml(student.id)}"
      data-name="${escHtml(student.first_name + ' ' + student.last_name)}"
      data-active="${student.is_active}"
      title="${student.is_active ? 'Deactivate' : 'Reactivate'}">
      <i class="bi ${student.is_active ? 'bi-person-slash' : 'bi-person-check'}"></i>
    </button>` : '';

  return `
    <tr data-search="${escHtml((student.first_name + ' ' + student.last_name).toLowerCase())}"
      ${!student.is_active ? 'style="background:rgba(220,53,69,.06)"' : ''}>
      <td>
        <a href="${href}" class="text-decoration-none fw-semibold text-body">${name}</a>
      </td>
      <td class="d-none d-md-table-cell text-muted small">${teacherCell}</td>
      <td class="d-none d-sm-table-cell text-muted small">${lastLesson}</td>
      <td>${statusBadge}</td>
      <td class="text-end" style="white-space:nowrap">
        ${adminActions}
        <a href="${href}" class="btn btn-sm btn-light" title="View">
          <i class="bi bi-chevron-right"></i>
        </a>
      </td>
    </tr>`;
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function sortStudents(students) {
  const active   = students.filter(s => s.is_active);
  const inactive = students.filter(s => !s.is_active);

  const sortFn = (list) => {
    const copy = [...list];
    if (currentSort === 'az') {
      copy.sort((a, b) =>
        (a.first_name + ' ' + a.last_name)
          .localeCompare(b.first_name + ' ' + b.last_name));
    } else if (currentSort === 'za') {
      copy.sort((a, b) =>
        (b.first_name + ' ' + b.last_name)
          .localeCompare(a.first_name + ' ' + a.last_name));
    } else if (currentSort === 'newest') {
      copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return copy;
  };

  // Inactive students always go to the bottom, sorted among themselves
  return [...sortFn(active), ...sortFn(inactive)];
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderTable(students) {
  const tbody = document.getElementById('students-tbody');
  const empty = document.getElementById('empty-state');

  if (!students.length) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }

  empty.classList.add('d-none');
  tbody.innerHTML = students.map(buildRow).join('');

  // Wire admin action buttons after render
  if (isAdmin) wireAdminRowButtons();
}

// ── Search + Sort ─────────────────────────────────────────────────────────────

function getQuery() {
  return document.getElementById('search-input').value.trim().toLowerCase();
}

function applyFilters() {
  const q = getQuery();
  const filtered = q
    ? allStudents.filter(s =>
        (s.first_name + ' ' + s.last_name).toLowerCase().includes(q))
    : allStudents;
  renderTable(sortStudents(filtered));
}

function setupSearch() {
  document.getElementById('search-input').addEventListener('input', applyFilters);
}

function setupSort() {
  document.getElementById('sort-wrapper').classList.remove('d-none');
  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });
}

// ── Add Student modal (Admin only) ────────────────────────────────────────────

// Shared teacher <select> population (done once for both Add and Edit modals)
let teachersLoaded = false;
let teacherList    = [];

async function ensureTeachersLoaded() {
  if (teachersLoaded) return;
  try {
    teacherList = await getTeacherProfiles();

    // Populate Add modal select
    const addSel  = document.getElementById('teacher-select');
    // Populate Edit modal select
    const editSel = document.getElementById('edit-teacher-select');

    teacherList.forEach(t => {
      const label = `${t.first_name} ${t.last_name}`;

      const opt1 = document.createElement('option');
      opt1.value       = t.id;
      opt1.textContent = label;
      addSel.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value       = t.id;
      opt2.textContent = label;
      editSel.appendChild(opt2);
    });

    teachersLoaded = true;
  } catch (err) {
    console.error('Could not load teachers for picker:', err);
  }
}

async function setupModal() {
  document.getElementById('btn-add-student').classList.remove('d-none');
  await ensureTeachersLoaded();

  const form       = document.getElementById('add-student-form');
  const spinner    = document.getElementById('btn-save-spinner');
  const saveBtn    = document.getElementById('btn-save-student');
  const formError  = document.getElementById('form-error');
  const collapseEl = document.getElementById('add-student-collapse');

  document.getElementById('btn-cancel-add-student').addEventListener('click', () => {
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
      await createStudent({
        first_name:          fd.get('first_name'),
        last_name:           fd.get('last_name'),
        phone:               fd.get('phone')              || null,
        email:               fd.get('email')              || null,
        birth_date:          fd.get('birth_date')         || null,
        primary_teacher_id:  fd.get('primary_teacher_id') || null,
      });
      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      form.reset();
      form.classList.remove('was-validated');
      showToast('Student added successfully.', 'success');
      await loadStudents();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

// ── Edit + Status modals (Admin only) ───────────────────────────────────────

function setupEditModal() {
  const form       = document.getElementById('edit-student-form');
  const spinner    = document.getElementById('btn-update-spinner');
  const saveBtn    = document.getElementById('btn-update-student');
  const formError  = document.getElementById('edit-form-error');
  const collapseEl = document.getElementById('edit-student-collapse');

  document.getElementById('btn-cancel-edit-student').addEventListener('click', () => {
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

    const fd               = new FormData(form);
    const studentId        = fd.get('student_id');
    const newTeacherId     = fd.get('primary_teacher_id') || null;
    const originalTeacher  = fd.get('original_teacher_id') || null;
    try {
      await updateStudent(studentId, {
        first_name: fd.get('first_name'),
        last_name:  fd.get('last_name'),
        phone:      fd.get('phone')       || null,
        email:      fd.get('email')       || null,
        birth_date: fd.get('birth_date')  || null,
        is_active:  fd.get('is_active') === 'true',
      });

      // Reassign primary teacher only when it actually changed
      if (newTeacherId !== originalTeacher) {
        await reassignPrimaryTeacher(studentId, newTeacherId);
      }

      bootstrap.Collapse.getInstance(collapseEl)?.hide();
      showToast('Student updated.', 'success');
      await loadStudents();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
    }
  });
}

function setupConfirmModal() {
  // wired per-click via wireAdminRowButtons
}

// Wire click events onto freshly-rendered rows
function wireAdminRowButtons() {
  // Edit buttons — look up student from in-memory array (avoids HTML-encoding issues)
  document.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = allStudents.find(s => s.id === btn.dataset.id);
      if (!student) return;

      // Close add-form if open
      const addCollapse = document.getElementById('add-student-collapse');
      bootstrap.Collapse.getInstance(addCollapse)?.hide();

      // Current primary teacher (open assignment)
      const primaryAssignment = (student.student_teacher_assignments ?? [])
        .find(a => a.role === 'primary' && !a.active_to);
      const currentTeacherId = primaryAssignment?.teacher_id ?? '';

      document.getElementById('edit-student-title').textContent =
        `Edit — ${student.first_name} ${student.last_name}`;
      document.getElementById('edit-student-id').value        = student.id;
      document.getElementById('edit-first-name').value        = student.first_name ?? '';
      document.getElementById('edit-last-name').value         = student.last_name  ?? '';
      document.getElementById('edit-phone').value             = student.phone      ?? '';
      document.getElementById('edit-email').value             = student.email      ?? '';
      document.getElementById('edit-birth-date').value        = student.birth_date ?? '';
      document.getElementById('edit-is-active').value         = String(student.is_active);
      document.getElementById('edit-teacher-select').value    = currentTeacherId;
      document.getElementById('edit-original-teacher').value  = currentTeacherId;

      const editCollapse = document.getElementById('edit-student-collapse');
      let instance = bootstrap.Collapse.getInstance(editCollapse);
      if (!instance) instance = new bootstrap.Collapse(editCollapse, { toggle: false });
      instance.show();
      editCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Deactivate / Reactivate buttons
  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', () => {
      const active    = btn.dataset.active === 'true';
      const name      = btn.dataset.name;
      const studentId = btn.dataset.id;

      const icon    = document.getElementById('confirm-status-icon');
      const msg     = document.getElementById('confirm-status-msg');
      const sub     = document.getElementById('confirm-status-sub');
      const confirm = document.getElementById('btn-confirm-status');

      if (active) {
        icon.textContent      = '⚠️';
        msg.textContent       = `Deactivate ${name}?`;
        sub.textContent       = 'The student will be hidden from active lists.';
        confirm.className     = 'btn btn-danger px-4';
        confirm.textContent   = 'Deactivate';
      } else {
        icon.textContent      = '✅';
        msg.textContent       = `Reactivate ${name}?`;
        sub.textContent       = 'The student will be marked as active again.';
        confirm.className     = 'btn btn-success px-4';
        confirm.textContent   = 'Reactivate';
      }

      // Replace confirm listener to avoid stacking
      const fresh = confirm.cloneNode(true);
      confirm.replaceWith(fresh);
      fresh.addEventListener('click', async () => {
        try {
          await updateStudent(studentId, { is_active: !active });
          bootstrap.Modal.getInstance(
            document.getElementById('confirmStatusModal')
          )?.hide();
          showToast(
            active ? `${name} deactivated.` : `${name} reactivated.`,
            active ? 'warning' : 'success'
          );
          await loadStudents();
        } catch (err) {
          showToast('Update failed: ' + err.message, 'danger');
        }
      });

      new bootstrap.Modal(document.getElementById('confirmStatusModal')).show();
    });
  });
}

// ── Data load ─────────────────────────────────────────────────────────────────

async function loadStudents() {
  const students   = await getStudents();
  allStudents      = students;
  lastLessonMap    = await getLastLessonDates(students.map(s => s.id));

  document.getElementById('students-subtitle').textContent =
    `${students.length} student${students.length !== 1 ? 's' : ''}`;

  applyFilters();
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  document.getElementById('page-loading').classList.add('d-none');
  document.getElementById('students-content').classList.remove('d-none');

  try {
    // Set role flag BEFORE loading so buildRow() renders admin buttons correctly
    if (profile.role === 'admin') isAdmin = true;

    await loadStudents();
    setupSearch();
    setupSort();
    if (isAdmin) {
      setupEditModal();
      await setupModal();
    }
  } catch (err) {
    showToast('Failed to load students: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
