// pages/students/student-detail.js
import { authGuard }      from '../../utils/guards.js';
import { renderNavbar }   from '../../components/navbar.js';
import { showToast }      from '../../components/toast.js';
import { formatDate }     from '../../utils/formatters.js';
import { getStudentById } from '../../services/students.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Header ────────────────────────────────────────────────────────────────────

function renderHeader(student) {
  document.title = `${student.first_name} ${student.last_name} — Music Lab`;

  const initials = (
    (student.first_name?.[0] ?? '') +
    (student.last_name?.[0]  ?? '')
  ).toUpperCase();

  const statusBadge = student.is_active
    ? '<span class="badge rounded-pill bg-success-subtle text-success fw-semibold ms-2">Active</span>'
    : '<span class="badge rounded-pill bg-secondary-subtle text-secondary fw-semibold ms-2">Inactive</span>';

  const meta = [
    student.phone      ? `<span class="me-3"><i class="bi bi-telephone me-1"></i>${escHtml(student.phone)}</span>`      : '',
    student.email      ? `<span class="me-3"><i class="bi bi-envelope me-1"></i>${escHtml(student.email)}</span>`        : '',
    student.birth_date ? `<span><i class="bi bi-calendar me-1"></i>${formatDate(student.birth_date)}</span>` : '',
  ].filter(Boolean).join('');

  document.getElementById('student-header').innerHTML = `
    <div class="d-flex align-items-center gap-4">
      <div class="ml-avatar flex-shrink-0"
        style="width:56px;height:56px;font-size:1.15rem;border-radius:50%">
        ${escHtml(initials)}
      </div>
      <div>
        <h1 class="h3 fw-bold mb-1">
          ${escHtml(student.first_name)} ${escHtml(student.last_name)}${statusBadge}
        </h1>
        ${meta ? `<div class="text-muted small">${meta}</div>` : ''}
      </div>
    </div>`;
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function renderOverview(student) {
  const assignments = student.student_teacher_assignments ?? [];
  const parents     = student.student_parents ?? [];

  // Assigned teachers table
  const teacherRows = assignments.length
    ? assignments.map(a => {
        const name   = a.teacher
          ? `${escHtml(a.teacher.first_name)} ${escHtml(a.teacher.last_name)}`
          : '—';
        const role   = a.role === 'primary'
          ? '<span class="badge bg-primary-subtle text-primary rounded-pill">Primary</span>'
          : '<span class="badge bg-secondary-subtle text-secondary rounded-pill">Assistant</span>';
        const active = !a.active_to
          ? '<span class="badge bg-success-subtle text-success rounded-pill ms-1">Active</span>'
          : `<span class="badge bg-secondary-subtle text-secondary rounded-pill ms-1">Until ${formatDate(a.active_to)}</span>`;
        const phone  = a.teacher?.phone
          ? `<small class="text-muted"><i class="bi bi-telephone me-1"></i>${escHtml(a.teacher.phone)}</small>`
          : '';
        return `<tr><td class="fw-semibold">${name}</td><td>${role}${active}</td><td>${phone}</td></tr>`;
      }).join('')
    : '<tr><td colspan="3" class="text-muted fst-italic">No teacher assignments.</td></tr>';

  // Parent/guardian cards
  const parentCards = parents.length
    ? parents.map(p => `
        <div class="col-12 col-md-6">
          <div class="card h-100">
            <div class="card-body">
              <div class="fw-semibold">${escHtml(p.full_name)}</div>
              <div class="text-muted small text-capitalize mb-2">${escHtml(p.relation)}</div>
              ${p.phone ? `<div class="small"><i class="bi bi-telephone me-1 text-muted"></i>${escHtml(p.phone)}</div>` : ''}
              ${p.email ? `<div class="small"><i class="bi bi-envelope me-1 text-muted"></i>${escHtml(p.email)}</div>` : ''}
              ${p.occupation ? `<div class="small text-muted mt-1">${escHtml(p.occupation)}</div>` : ''}
              ${p.notes ? `<div class="small text-muted fst-italic mt-1">${escHtml(p.notes)}</div>` : ''}
            </div>
          </div>
        </div>`).join('')
    : '<p class="text-muted">No parent contacts recorded.</p>';

  document.getElementById('panel-overview').innerHTML = `
    <h5 class="fw-semibold mb-3">Assigned Teachers</h5>
    <div class="table-responsive mb-5">
      <table class="table table-sm align-middle">
        <thead>
          <tr><th>Teacher</th><th>Role</th><th>Contact</th></tr>
        </thead>
        <tbody>${teacherRows}</tbody>
      </table>
    </div>

    <h5 class="fw-semibold mb-3">Parent / Guardian Contacts</h5>
    <div class="row g-3">${parentCards}</div>`;
}

// ── Placeholder tabs ──────────────────────────────────────────────────────────

function renderPlaceholder(panelId, icon, label) {
  document.getElementById(panelId).innerHTML = `
    <div class="text-center py-5 text-muted">
      <i class="bi ${icon} fs-1 opacity-50"></i>
      <p class="mt-3 mb-0">${label} — coming in the next milestone.</p>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  const studentId = new URLSearchParams(window.location.search).get('id');

  if (!studentId) {
    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('error-state').classList.remove('d-none');
    return;
  }

  try {
    const student = await getStudentById(studentId);

    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('student-content').classList.remove('d-none');

    renderHeader(student);
    renderOverview(student);
    renderPlaceholder('panel-lessons',    'bi-journal-check',  'Lessons');
    renderPlaceholder('panel-songs',      'bi-music-note-list', 'Songs');
    renderPlaceholder('panel-recordings', 'bi-mic',            'Recordings');
    renderPlaceholder('panel-notes',      'bi-chat-left-text', 'Notes');

  } catch (err) {
    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('error-state').classList.remove('d-none');
    document.getElementById('error-message').textContent = err.message;
    showToast('Failed to load student: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
// Renders the tabbed student detail page (Overview, Lessons, Songs, Recordings, Notes).
import { getSession } from '../../services/auth.js';

// TODO: implement student detail tabs
