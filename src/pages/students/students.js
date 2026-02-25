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
} from '../../services/students.js';

// ── Module state ──────────────────────────────────────────────────────────────

let allStudents      = [];
let lastLessonMap    = {};

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

// ── Row builder ───────────────────────────────────────────────────────────────

function buildRow(student) {
  const name       = escHtml(`${student.last_name}, ${student.first_name}`);
  const teacher    = getPrimaryTeacher(student.student_teacher_assignments);
  const lastLesson = formatDate(lastLessonMap[student.id]);
  const statusBadge = student.is_active
    ? '<span class="badge rounded-pill bg-success-subtle text-success fw-semibold">Active</span>'
    : '<span class="badge rounded-pill bg-secondary-subtle text-secondary fw-semibold">Inactive</span>';
  const href = `/src/pages/students/student-detail.html?id=${escHtml(student.id)}`;

  return `
    <tr data-search="${escHtml((student.first_name + ' ' + student.last_name).toLowerCase())}">
      <td>
        <a href="${href}" class="text-decoration-none fw-semibold text-body">${name}</a>
      </td>
      <td class="d-none d-md-table-cell text-muted small">${teacher}</td>
      <td class="d-none d-sm-table-cell text-muted small">${lastLesson}</td>
      <td>${statusBadge}</td>
      <td>
        <a href="${href}" class="btn btn-sm btn-light" title="View">
          <i class="bi bi-chevron-right"></i>
        </a>
      </td>
    </tr>`;
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
}

// ── Search ────────────────────────────────────────────────────────────────────

function setupSearch() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? allStudents.filter(s =>
          (s.first_name + ' ' + s.last_name).toLowerCase().includes(q)
        )
      : allStudents;
    renderTable(filtered);
  });
}

// ── Add Student modal (Admin only) ────────────────────────────────────────────

async function setupModal() {
  document.getElementById('btn-add-student').classList.remove('d-none');

  // Populate teacher dropdown
  try {
    const teachers = await getTeacherProfiles();
    const sel = document.getElementById('teacher-select');
    teachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value       = t.id;
      opt.textContent = `${t.last_name}, ${t.first_name}`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Could not load teachers for picker:', err);
  }

  const form      = document.getElementById('add-student-form');
  const spinner   = document.getElementById('btn-save-spinner');
  const saveBtn   = document.getElementById('btn-save-student');
  const formError = document.getElementById('form-error');
  const modalEl   = document.getElementById('addStudentModal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);
    try {
      await createStudent({
        first_name:          fd.get('first_name'),
        last_name:           fd.get('last_name'),
        phone:               fd.get('phone')               || null,
        email:               fd.get('email')               || null,
        birth_date:          fd.get('birth_date')          || null,
        primary_teacher_id:  fd.get('primary_teacher_id')  || null,
      });

      bootstrap.Modal.getInstance(modalEl)?.hide();
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

  modalEl.addEventListener('hidden.bs.modal', () => {
    form.reset();
    form.classList.remove('was-validated');
    formError.classList.add('d-none');
  });
}

// ── Data load ─────────────────────────────────────────────────────────────────

async function loadStudents() {
  const students   = await getStudents();
  allStudents      = students;
  lastLessonMap    = await getLastLessonDates(students.map(s => s.id));

  document.getElementById('students-subtitle').textContent =
    `${students.length} student${students.length !== 1 ? 's' : ''}`;

  renderTable(students);
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
    await loadStudents();
    setupSearch();
    if (profile.role === 'admin') await setupModal();
  } catch (err) {
    showToast('Failed to load students: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
