// pages/students/student-detail.js
import { authGuard }    from '../../utils/guards.js';
import { renderNavbar } from '../../components/navbar.js';
import { showToast }    from '../../components/toast.js';
import { formatDate }   from '../../utils/formatters.js';
import {
  getStudentById,
  getTeacherProfiles,
  addAssignment,
  endAssignment,
  reassignPrimaryTeacher,
  createParent,
  updateParent,
  deleteParent,
} from '../../services/students.js';

// ── Module state ──────────────────────────────────────────────────────────────

let currentStudentId = null;

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

function renderOverview(student, isAdmin = false) {
  const assignments = student.student_teacher_assignments ?? [];
  const parents     = student.student_parents ?? [];

  // Sort: active (no active_to) first, primary before assistant
  const sorted = [...assignments].sort((a, b) => {
    if (!a.active_to && b.active_to)  return -1;
    if (a.active_to  && !b.active_to) return 1;
    if (a.role === 'primary' && b.role !== 'primary') return -1;
    if (a.role !== 'primary' && b.role === 'primary') return 1;
    return 0;
  });

  const hasActivePrimary    = assignments.some(a => a.role === 'primary' && !a.active_to);
  const activePrimaryTeacher = assignments.find(a => a.role === 'primary' && !a.active_to);
  const primaryTeacherId     = activePrimaryTeacher?.teacher_id ?? null;

  // Assigned teachers table rows
  const teacherRows = sorted.length
    ? sorted.map(a => {
        const name   = a.teacher
          ? `${escHtml(a.teacher.first_name)} ${escHtml(a.teacher.last_name)}`
          : '—';
        const roleBadge = a.role === 'primary'
          ? '<span class="badge bg-primary-subtle text-primary rounded-pill">Primary</span>'
          : '<span class="badge bg-secondary-subtle text-secondary rounded-pill">Assistant</span>';
        const isActive  = !a.active_to;
        const statusBadge = isActive
          ? '<span class="badge bg-success-subtle text-success rounded-pill ms-1">Active</span>'
          : `<span class="badge bg-light text-muted rounded-pill ms-1">Ended ${formatDate(a.active_to)}</span>`;
        const period = a.role === 'assistant'
          ? `<div class="text-muted" style="font-size:.8rem">
               ${a.active_from ? formatDate(a.active_from) : 'Start: open'}
               &rarr;
               ${a.active_to   ? formatDate(a.active_to)   : 'open-ended'}
             </div>`
          : '';
        const phone  = a.teacher?.phone
          ? `<small class="text-muted"><i class="bi bi-telephone me-1"></i>${escHtml(a.teacher.phone)}</small>`
          : '';
        const endBtn = isAdmin && isActive
          ? `<button class="btn btn-sm btn-light text-danger btn-end-assignment"
               data-id="${escHtml(a.id)}"
               data-name="${escHtml(name)}"
               title="End assignment">
               <i class="bi bi-x-circle"></i>
             </button>`
          : '';

        return `<tr>
          <td class="fw-semibold">${name}</td>
          <td>${roleBadge}${statusBadge}${period}</td>
          <td>${phone}</td>
          <td class="text-end">${endBtn}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="text-muted fst-italic">No teacher assignments.</td></tr>';

  const addBtn = isAdmin
    ? `<button class="btn btn-sm btn-outline-primary" id="btn-add-assignment">
         <i class="bi bi-plus-lg me-1"></i>Add Assistant
       </button>`
    : '';

  // Parent/guardian cards
  const addParentBtn = isAdmin
    ? `<button class="btn btn-sm btn-outline-primary" id="btn-add-parent">
         <i class="bi bi-plus-lg me-1"></i>Add Parent
       </button>`
    : '';

  const parentCards = parents.length
    ? parents.map(p => {
        const adminBtns = isAdmin
          ? `<div class="ms-auto d-flex gap-1 flex-shrink-0">
               <button class="btn btn-sm btn-outline-secondary btn-edit-parent"
                 data-id="${p.id}"
                 data-full-name="${escHtml(p.full_name)}"
                 data-relation="${escHtml(p.relation)}"
                 data-phone="${escHtml(p.phone || '')}"
                 data-email="${escHtml(p.email || '')}"
                 data-occupation="${escHtml(p.occupation || '')}"
                 data-notes="${escHtml(p.notes || '')}">
                 <i class="bi bi-pencil"></i>
               </button>
               <button class="btn btn-sm btn-outline-danger btn-delete-parent"
                 data-id="${p.id}" data-name="${escHtml(p.full_name)}">
                 <i class="bi bi-trash"></i>
               </button>
             </div>`
          : '';
        return `
        <div class="col-12 col-md-6">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-start gap-2 mb-1">
                <span class="fw-semibold">${escHtml(p.full_name)}</span>
                ${adminBtns}
              </div>
              <div class="text-muted small text-capitalize mb-2">${escHtml(p.relation)}</div>
              ${p.phone      ? `<div class="small"><i class="bi bi-telephone me-1 text-muted"></i>${escHtml(p.phone)}</div>`      : ''}
              ${p.email      ? `<div class="small"><i class="bi bi-envelope me-1 text-muted"></i>${escHtml(p.email)}</div>`       : ''}
              ${p.occupation ? `<div class="small text-muted mt-1">${escHtml(p.occupation)}</div>`                                : ''}
              ${p.notes      ? `<div class="small text-muted fst-italic mt-1">${escHtml(p.notes)}</div>`                          : ''}
            </div>
          </div>
        </div>`;
      }).join('')
    : '<p class="text-muted">No parent contacts recorded.</p>';

  document.getElementById('panel-overview').innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Assigned Teachers</h5>
      ${addBtn}
    </div>
    <div class="table-responsive mb-5">
      <table class="table table-sm align-middle">
        <thead>
          <tr><th>Teacher</th><th>Role &amp; Status</th><th>Contact</th><th></th></tr>
        </thead>
        <tbody>${teacherRows}</tbody>
      </table>
    </div>

    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Parent / Guardian Contacts</h5>
      ${addParentBtn}
    </div>
    <div class="row g-3">${parentCards}</div>`;

  // Wire admin buttons after render
  if (isAdmin) wireOverviewAdminButtons(primaryTeacherId);
}

// ── Parent modal (Admin only) ────────────────────────────────────────────────────────

function wireParentAdminButtons() {
  // Add Parent button
  document.getElementById('btn-add-parent')?.addEventListener('click', () => {
    const form = document.getElementById('add-parent-form');
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('parent-form-error').classList.add('d-none');
    new bootstrap.Modal(document.getElementById('addParentModal')).show();
  });

  // Edit buttons — one per card
  document.querySelectorAll('.btn-edit-parent').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset;
      const form = document.getElementById('edit-parent-form');
      form.reset();
      form.classList.remove('was-validated');
      document.getElementById('edit-parent-form-error').classList.add('d-none');
      form.dataset.parentId             = d.id;
      form.elements['full_name'].value  = d.fullName;
      form.elements['relation'].value   = d.relation;
      form.elements['phone'].value      = d.phone;
      form.elements['email'].value      = d.email;
      form.elements['occupation'].value = d.occupation;
      form.elements['notes'].value      = d.notes;
      new bootstrap.Modal(document.getElementById('editParentModal')).show();
    });
  });

  // Delete buttons — one per card
  document.querySelectorAll('.btn-delete-parent').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name } = btn.dataset;
      document.getElementById('delete-parent-name').textContent = name;

      const confirmBtn = document.getElementById('btn-confirm-delete-parent');
      const fresh = confirmBtn.cloneNode(true);
      confirmBtn.replaceWith(fresh);
      fresh.addEventListener('click', async () => {
        try {
          await deleteParent(id);
          bootstrap.Modal.getInstance(
            document.getElementById('deleteParentModal')
          )?.hide();
          showToast(`${name} removed.`, 'warning');
          await reloadOverview();
        } catch (err) {
          showToast('Failed to delete: ' + err.message, 'danger');
        }
      });

      new bootstrap.Modal(document.getElementById('deleteParentModal')).show();
    });
  });
}

function setupEditParentForm() {
  const form      = document.getElementById('edit-parent-form');
  const spinner   = document.getElementById('btn-save-edit-parent-spinner');
  const saveBtn   = document.getElementById('btn-save-edit-parent');
  const formError = document.getElementById('edit-parent-form-error');
  const modalEl   = document.getElementById('editParentModal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);
    try {
      await updateParent(form.dataset.parentId, {
        full_name:  fd.get('full_name'),
        relation:   fd.get('relation'),
        phone:      fd.get('phone')      || null,
        email:      fd.get('email')      || null,
        occupation: fd.get('occupation') || null,
        notes:      fd.get('notes')      || null,
      });
      bootstrap.Modal.getInstance(modalEl)?.hide();
      showToast('Parent contact updated.', 'success');
      await reloadOverview();
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

function setupAddParentForm() {
  const form      = document.getElementById('add-parent-form');
  const spinner   = document.getElementById('btn-save-parent-spinner');
  const saveBtn   = document.getElementById('btn-save-parent');
  const formError = document.getElementById('parent-form-error');
  const modalEl   = document.getElementById('addParentModal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);
    try {
      await createParent(currentStudentId, {
        full_name:  fd.get('full_name'),
        relation:   fd.get('relation'),
        phone:      fd.get('phone')      || null,
        email:      fd.get('email')      || null,
        occupation: fd.get('occupation') || null,
        notes:      fd.get('notes')      || null,
      });
      bootstrap.Modal.getInstance(modalEl)?.hide();
      showToast('Parent contact added.', 'success');
      await reloadOverview();
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

// ── Assignment modals (Admin only) ────────────────────────────────────────────

// Rebuild teacher options each time, excluding the current primary teacher
async function loadTeacherOptions(excludeTeacherId) {
  const teachers = await getTeacherProfiles();
  const sel = document.getElementById('assign-teacher-select');
  // Clear all but the placeholder
  while (sel.options.length > 1) sel.remove(1);
  teachers
    .filter(t => t.id !== excludeTeacherId)
    .forEach(t => {
      const opt = document.createElement('option');
      opt.value       = t.id;
      opt.textContent = `${t.first_name} ${t.last_name}`;
      sel.appendChild(opt);
    });
}

function wireOverviewAdminButtons(primaryTeacherId) {
  // "+ Add Assistant" button
  document.getElementById('btn-add-assignment')?.addEventListener('click', async () => {
    const form = document.getElementById('add-assignment-form');
    form.reset();
    form.classList.remove('was-validated');
    document.getElementById('assign-form-error').classList.add('d-none');
    await loadTeacherOptions(primaryTeacherId);
    new bootstrap.Modal(document.getElementById('addAssignmentModal')).show();
  });
  // Wire Add Parent button
  wireParentAdminButtons();
  // "End" buttons per row
  document.querySelectorAll('.btn-end-assignment').forEach(btn => {
    btn.addEventListener('click', () => {
      const assignId  = btn.dataset.id;
      const name      = btn.dataset.name;

      document.getElementById('end-assignment-msg').textContent =
        `End ${name}’s assignment?`;

      const confirmBtn = document.getElementById('btn-confirm-end');
      const fresh = confirmBtn.cloneNode(true);
      confirmBtn.replaceWith(fresh);
      fresh.addEventListener('click', async () => {
        try {
          await endAssignment(assignId);
          bootstrap.Modal.getInstance(
            document.getElementById('endAssignmentModal')
          )?.hide();
          showToast(`${name}’s assignment ended.`, 'warning');
          await reloadOverview();
        } catch (err) {
          showToast('Failed to end assignment: ' + err.message, 'danger');
        }
      });

      new bootstrap.Modal(document.getElementById('endAssignmentModal')).show();
    });
  });
}

function setupAddAssignmentForm(isAdmin) {
  if (!isAdmin) return;

  const form      = document.getElementById('add-assignment-form');
  const spinner   = document.getElementById('btn-save-assignment-spinner');
  const saveBtn   = document.getElementById('btn-save-assignment');
  const formError = document.getElementById('assign-form-error');
  const modalEl   = document.getElementById('addAssignmentModal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    formError.classList.add('d-none');

    const fd = new FormData(form);

    try {
      // Always assistant — role is fixed in this modal
      await addAssignment(
        currentStudentId,
        fd.get('teacher_id'),
        'assistant',
        fd.get('active_from') || null,
        fd.get('active_to')   || null
      );
      bootstrap.Modal.getInstance(modalEl)?.hide();
      showToast('Assistant teacher added.', 'success');
      await reloadOverview();
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

// Reload student from Supabase and re-render overview tab without full page reload
async function reloadOverview() {
  const student = await getStudentById(currentStudentId);
  renderOverview(student, true);
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
  currentStudentId = studentId;
  const isAdmin    = profile.role === 'admin';

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
    renderOverview(student, isAdmin);
    if (isAdmin) {
      setupAddAssignmentForm(isAdmin);
      setupAddParentForm();
      setupEditParentForm();
    }
    renderPlaceholder('panel-lessons',    'bi-journal-check',   'Lessons');
    renderPlaceholder('panel-songs',      'bi-music-note-list', 'Songs');
    renderPlaceholder('panel-recordings', 'bi-mic',             'Recordings');
    renderPlaceholder('panel-notes',      'bi-chat-left-text',  'Notes');

  } catch (err) {
    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('error-state').classList.remove('d-none');
    document.getElementById('error-message').textContent = err.message;
    showToast('Failed to load student: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
