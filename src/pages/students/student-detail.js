// pages/students/student-detail.js
import { authGuard }    from '../../utils/guards.js';
import { renderNavbar } from '../../components/navbar.js';
import { showToast }    from '../../components/toast.js';
import { formatDate, formatDateTime, toDateTimeLocal, formatBytes } from '../../utils/formatters.js';
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
import {
  getLessons,
  createLesson,
  updateLesson,
  softDeleteLesson,
} from '../../services/lessons.js';
import {
  getNotes,
  createNote,
  updateNote,
  softDeleteNote,
} from '../../services/notes.js';
import {
  getSongs,
  createSong,
  updateSong,
  deleteSong,
} from '../../services/songs.js';
import {
  getRecordings,
  uploadRecording,
  softDeleteRecording,
} from '../../services/recordings.js';

// ── Module state ──────────────────────────────────────────────────────────────

let currentStudentId = null;let currentTeacherId = null; // logged-in user's profile id
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
// ── Lessons tab ───────────────────────────────────────────────────────────────────

function renderLessons(lessons, isAdmin) {
  const addBtn = `
    <button class="btn btn-sm btn-outline-primary" id="btn-toggle-add-lesson"
      data-bs-toggle="collapse" data-bs-target="#add-lesson-collapse" aria-expanded="false">
      <i class="bi bi-plus-lg me-1"></i>Add Lesson
    </button>`;

  const cards = lessons.length
    ? lessons.map(l => {
        const teacherName = l.teacher
          ? `${escHtml(l.teacher.first_name)} ${escHtml(l.teacher.last_name)}`
          : '—';

        const editBtn = `
          <button class="btn btn-sm btn-outline-secondary btn-edit-lesson" data-id="${l.id}">
            <i class="bi bi-pencil"></i>
          </button>`;

        const deleteBtn = isAdmin
          ? `<button class="btn btn-sm btn-outline-danger btn-delete-lesson"
               data-id="${l.id}" data-date="${escHtml(formatDate(l.held_at))}">
               <i class="bi bi-trash"></i>
             </button>`
          : '';

        const section = (icon, label, value) => value
          ? `<div class="d-flex gap-2 mt-3">
               <div class="flex-shrink-0 text-muted" style="width:1rem;margin-top:2px;font-size:.85rem">
                 <i class="bi ${icon}"></i>
               </div>
               <div class="flex-grow-1">
                 <div class="fw-semibold mb-1" style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#6c757d">${label}</div>
                 <div class="small" style="white-space:pre-wrap;line-height:1.55">${escHtml(value)}</div>
               </div>
             </div>`
          : '';

        const hasSections = l.vocal_technique || l.song_notes || l.homework;

        const inlineEditForm = `
          <div id="lesson-edit-${l.id}" class="d-none" style="background:#f8f9fa;border-top:1px solid #e9ecef">
            <div class="px-4 py-3">
              <form class="inline-edit-lesson-form" data-lesson-id="${l.id}" novalidate>
                <div class="row g-3">
                  <div class="col-12 col-sm-5">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Date &amp; Time <span class="text-danger">*</span></label>
                    <input type="datetime-local" name="held_at" class="form-control form-control-sm"
                      value="${toDateTimeLocal(l.held_at)}" required />
                    <div class="invalid-feedback">Required.</div>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Vocal Technique</label>
                    <textarea name="vocal_technique" class="form-control form-control-sm" rows="2"
                      placeholder="What was practised…">${escHtml(l.vocal_technique || '')}</textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Song Notes</label>
                    <textarea name="song_notes" class="form-control form-control-sm" rows="2"
                      placeholder="Songs worked on…">${escHtml(l.song_notes || '')}</textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Homework</label>
                    <textarea name="homework" class="form-control form-control-sm" rows="2"
                      placeholder="Tasks for next lesson…">${escHtml(l.homework || '')}</textarea>
                  </div>
                </div>
                <div class="inline-edit-error alert alert-danger mt-3 d-none"></div>
                <div class="d-flex gap-2 mt-3">
                  <button type="submit" class="btn btn-primary btn-sm btn-save-inline-lesson">
                    <span class="edit-lesson-spinner spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                    Save Changes
                  </button>
                  <button type="button" class="btn btn-light btn-sm btn-cancel-edit-lesson">Cancel</button>
                </div>
              </form>
            </div>
          </div>`;

        return `
          <div class="card mb-4 border-0 shadow-sm overflow-hidden">
            <div class="d-flex align-items-center justify-content-between gap-2 px-4 py-2"
                 style="background:#f1f3f5;border-bottom:1px solid #e9ecef">
              <div>
                <i class="bi bi-calendar3 me-2 text-muted" style="font-size:.85rem"></i>
                <span class="fw-bold">${formatDate(l.held_at)}</span>
                <span class="text-muted ms-2" style="font-size:.85rem">· ${teacherName}</span>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                ${editBtn}
                ${deleteBtn}
              </div>
            </div>
            <div id="lesson-view-${l.id}" class="card-body pt-2 pb-3">
              ${hasSections ? `
                ${section('bi-lungs', 'Vocal Technique', l.vocal_technique)}
                ${section('bi-music-note-beamed', 'Song Notes', l.song_notes)}
                ${section('bi-pencil-square', 'Homework', l.homework)}
              ` : '<p class="text-muted small mt-2 mb-0">No notes recorded for this lesson.</p>'}
            </div>
            ${inlineEditForm}
          </div>`;
      }).join('')
    : `<div class="text-center py-5 text-muted">
         <i class="bi bi-journal-check fs-1 opacity-50"></i>
         <p class="mt-3 mb-0">No lessons recorded yet.</p>
       </div>`;

  const inlineForm = `
    <div class="collapse mb-4" id="add-lesson-collapse">
      <div class="card border-0 shadow-sm" style="background:#f8f9fa">
        <div class="card-body">
          <h6 class="fw-semibold mb-3">New Lesson</h6>
          <form id="add-lesson-form" novalidate>
            <div class="row g-3">
              <div class="col-12 col-sm-5">
                <label class="form-label fw-semibold" style="font-size:.8rem">Date &amp; Time <span class="text-danger">*</span></label>
                <input type="datetime-local" name="held_at" class="form-control form-control-sm" required />
                <div class="invalid-feedback">Required.</div>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Vocal Technique</label>
                <textarea name="vocal_technique" class="form-control form-control-sm" rows="2" placeholder="What was practised…"></textarea>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Song Notes</label>
                <textarea name="song_notes" class="form-control form-control-sm" rows="2" placeholder="Songs worked on…"></textarea>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Homework</label>
                <textarea name="homework" class="form-control form-control-sm" rows="2" placeholder="Tasks for next lesson…"></textarea>
              </div>
            </div>
            <div id="add-lesson-form-error" class="alert alert-danger mt-3 d-none"></div>
            <div class="d-flex gap-2 mt-3">
              <button type="submit" id="btn-save-lesson" class="btn btn-primary btn-sm">
                <span id="btn-save-lesson-spinner" class="spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                Save Lesson
              </button>
              <button type="button" id="btn-cancel-add-lesson" class="btn btn-light btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('panel-lessons').innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Lessons</h5>
      ${addBtn}
    </div>
    ${inlineForm}
    ${cards}`;

  wireLessonButtons(isAdmin);
}

function wireLessonButtons(isAdmin) {
  // Inline add form — default date when collapse opens
  const collapseEl = document.getElementById('add-lesson-collapse');
  const addForm    = document.getElementById('add-lesson-form');
  const addErr     = document.getElementById('add-lesson-form-error');
  const addSpinner = document.getElementById('btn-save-lesson-spinner');
  const addSaveBtn = document.getElementById('btn-save-lesson');

  collapseEl?.addEventListener('show.bs.collapse', () => {
    if (!addForm.elements['held_at'].value) {
      addForm.elements['held_at'].value = toDateTimeLocal(new Date().toISOString());
    }
  });

  // Cancel — collapse and reset
  document.getElementById('btn-cancel-add-lesson')?.addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    addForm.reset();
    addForm.classList.remove('was-validated');
    addErr.classList.add('d-none');
  });

  // Submit inline add form
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) { addForm.classList.add('was-validated'); return; }

    addSpinner.classList.remove('d-none');
    addSaveBtn.disabled = true;
    addErr.classList.add('d-none');

    const fd = new FormData(addForm);
    try {
      await createLesson(currentStudentId, currentTeacherId, {
        held_at:         fd.get('held_at'),
        vocal_technique: fd.get('vocal_technique') || null,
        song_notes:      fd.get('song_notes')      || null,
        homework:        fd.get('homework')        || null,
      });
      showToast('Lesson added.', 'success');
      await reloadLessons(isAdmin);
    } catch (err) {
      addErr.textContent = err.message;
      addErr.classList.remove('d-none');
      addSpinner.classList.add('d-none');
      addSaveBtn.disabled = false;
    }
  });

  // Edit — pencil toggles inline form per card, closes others
  document.querySelectorAll('.btn-edit-lesson').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = btn.dataset.id;
      const viewEl  = document.getElementById(`lesson-view-${id}`);
      const editEl  = document.getElementById(`lesson-edit-${id}`);
      const isOpen  = !editEl.classList.contains('d-none');

      // Close any other open edit forms
      document.querySelectorAll('[id^="lesson-edit-"]').forEach(el => {
        if (el.id !== `lesson-edit-${id}` && !el.classList.contains('d-none')) {
          el.classList.add('d-none');
          document.getElementById(el.id.replace('lesson-edit-', 'lesson-view-'))?.classList.remove('d-none');
        }
      });

      // Toggle this card
      if (isOpen) {
        editEl.classList.add('d-none');
        viewEl.classList.remove('d-none');
      } else {
        viewEl.classList.add('d-none');
        editEl.classList.remove('d-none');
      }
    });
  });

  // Cancel inline edit
  document.querySelectorAll('.btn-cancel-edit-lesson').forEach(btn => {
    btn.addEventListener('click', () => {
      const editEl = btn.closest('[id^="lesson-edit-"]');
      const id     = editEl.id.replace('lesson-edit-', '');
      editEl.classList.add('d-none');
      document.getElementById(`lesson-view-${id}`)?.classList.remove('d-none');
      btn.closest('form').classList.remove('was-validated');
      btn.closest('form').querySelector('.inline-edit-error')?.classList.add('d-none');
    });
  });

  // Inline edit submit
  document.querySelectorAll('.inline-edit-lesson-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

      const spinner = form.querySelector('.edit-lesson-spinner');
      const saveBtn = form.querySelector('.btn-save-inline-lesson');
      const errEl   = form.querySelector('.inline-edit-error');

      spinner.classList.remove('d-none');
      saveBtn.disabled = true;
      errEl.classList.add('d-none');

      const fd = new FormData(form);
      try {
        await updateLesson(form.dataset.lessonId, {
          held_at:         fd.get('held_at'),
          vocal_technique: fd.get('vocal_technique') || null,
          song_notes:      fd.get('song_notes')      || null,
          homework:        fd.get('homework')        || null,
        });
        showToast('Lesson updated.', 'success');
        await reloadLessons(isAdmin);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('d-none');
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
      }
    });
  });

  // Delete (admin only)
  if (isAdmin) {
    document.querySelectorAll('.btn-delete-lesson').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, date } = btn.dataset;
        document.getElementById('delete-lesson-date').textContent = date;

        const confirmBtn = document.getElementById('btn-confirm-delete-lesson');
        const fresh = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(fresh);
        fresh.addEventListener('click', async () => {
          try {
            await softDeleteLesson(id);
            bootstrap.Modal.getInstance(
              document.getElementById('deleteLessonModal')
            )?.hide();
            showToast('Lesson deleted.', 'warning');
            await reloadLessons(isAdmin);
          } catch (err) {
            showToast('Failed to delete: ' + err.message, 'danger');
          }
        });

        new bootstrap.Modal(document.getElementById('deleteLessonModal')).show();
      });
    });
  }
}

function setupLessonForms() {
  // Edit and Add are fully inline — no modals needed.
  // Delete modal is wired per-render in wireLessonButtons.
}

async function reloadLessons(isAdmin) {
  const lessons = await getLessons(currentStudentId);
  renderLessons(lessons, isAdmin);
}

// ── Notes tab ───────────────────────────────────────────────────────────────────

function renderNotes(notes, canDelete) {
  const addBtn = `
    <button class="btn btn-sm btn-outline-primary" id="btn-toggle-add-note"
      data-bs-toggle="collapse" data-bs-target="#add-note-collapse" aria-expanded="false">
      <i class="bi bi-plus-lg me-1"></i>Add Note
    </button>`;

  const inlineAddForm = `
    <div class="collapse mb-4" id="add-note-collapse">
      <div class="card border-0 shadow-sm" style="background:#f8f9fa">
        <div class="card-body">
          <h6 class="fw-semibold mb-3">New Note</h6>
          <form id="add-note-form" novalidate>
            <div>
              <label class="form-label fw-semibold" style="font-size:.8rem">Note <span class="text-danger">*</span></label>
              <textarea name="body" class="form-control form-control-sm" rows="4"
                placeholder="Write your observation or note here…" required></textarea>
              <div class="invalid-feedback">Note cannot be empty.</div>
            </div>
            <div id="add-note-form-error" class="alert alert-danger mt-3 d-none"></div>
            <div class="d-flex gap-2 mt-3">
              <button type="submit" id="btn-save-note" class="btn btn-primary btn-sm">
                <span id="btn-save-note-spinner" class="spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                Save Note
              </button>
              <button type="button" id="btn-cancel-add-note" class="btn btn-light btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  const cards = notes.length
    ? notes.map(n => {
        const authorName = n.teacher
          ? `${escHtml(n.teacher.first_name)} ${escHtml(n.teacher.last_name)}`
          : '—';

        const deleteBtn = canDelete
          ? `<button class="btn btn-sm btn-outline-danger btn-delete-note"
               data-id="${n.id}">
               <i class="bi bi-trash"></i>
             </button>`
          : '';

        const inlineEditForm = `
          <div id="note-edit-${n.id}" class="d-none" style="background:#f8f9fa;border-top:1px solid #e9ecef">
            <div class="px-4 py-3">
              <form class="inline-edit-note-form" data-note-id="${n.id}" novalidate>
                <textarea name="body" class="form-control form-control-sm" rows="4"
                  required>${escHtml(n.body)}</textarea>
                <div class="invalid-feedback">Note cannot be empty.</div>
                <div class="inline-note-error alert alert-danger mt-2 d-none"></div>
                <div class="d-flex gap-2 mt-3">
                  <button type="submit" class="btn btn-primary btn-sm btn-save-inline-note">
                    <span class="edit-note-spinner spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                    Save Changes
                  </button>
                  <button type="button" class="btn btn-light btn-sm btn-cancel-edit-note">Cancel</button>
                </div>
              </form>
            </div>
          </div>`;

        return `
          <div class="card mb-3 border-0 shadow-sm overflow-hidden">
            <div class="d-flex align-items-center justify-content-between gap-2 px-4 py-2"
                 style="background:#f1f3f5;border-bottom:1px solid #e9ecef">
              <div>
                <i class="bi bi-person me-2 text-muted" style="font-size:.85rem"></i>
                <span class="fw-semibold" style="font-size:.9rem">${authorName}</span>
                <span class="text-muted ms-2" style="font-size:.82rem">· ${formatDate(n.created_at)}</span>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                <button class="btn btn-sm btn-outline-secondary btn-edit-note" data-id="${n.id}">
                  <i class="bi bi-pencil"></i>
                </button>
                ${deleteBtn}
              </div>
            </div>
            <div id="note-view-${n.id}" class="card-body py-3">
              <p class="mb-0 small" style="white-space:pre-wrap;line-height:1.6">${escHtml(n.body)}</p>
            </div>
            ${inlineEditForm}
          </div>`;
      }).join('')
    : `<div class="text-center py-5 text-muted">
         <i class="bi bi-chat-left-text fs-1 opacity-50"></i>
         <p class="mt-3 mb-0">No notes recorded yet.</p>
       </div>`;

  document.getElementById('panel-notes').innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Notes</h5>
      ${addBtn}
    </div>
    ${inlineAddForm}
    ${cards}`;

  wireNoteButtons(canDelete);
}

function wireNoteButtons(canDelete) {
  // ── Add form ──
  const collapseEl = document.getElementById('add-note-collapse');
  const addForm    = document.getElementById('add-note-form');
  const addErr     = document.getElementById('add-note-form-error');
  const addSpinner = document.getElementById('btn-save-note-spinner');
  const addSaveBtn = document.getElementById('btn-save-note');

  document.getElementById('btn-cancel-add-note')?.addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    addForm.reset();
    addForm.classList.remove('was-validated');
    addErr.classList.add('d-none');
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) { addForm.classList.add('was-validated'); return; }

    addSpinner.classList.remove('d-none');
    addSaveBtn.disabled = true;
    addErr.classList.add('d-none');

    try {
      await createNote(currentStudentId, currentTeacherId, addForm.elements['body'].value);
      showToast('Note added.', 'success');
      await reloadNotes(canDelete);
    } catch (err) {
      addErr.textContent = err.message;
      addErr.classList.remove('d-none');
      addSpinner.classList.add('d-none');
      addSaveBtn.disabled = false;
    }
  });

  // ── Edit toggle ──
  document.querySelectorAll('.btn-edit-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const id     = btn.dataset.id;
      const viewEl = document.getElementById(`note-view-${id}`);
      const editEl = document.getElementById(`note-edit-${id}`);
      const isOpen = !editEl.classList.contains('d-none');

      // Close any other open edit forms
      document.querySelectorAll('[id^="note-edit-"]').forEach(el => {
        if (el.id !== `note-edit-${id}` && !el.classList.contains('d-none')) {
          el.classList.add('d-none');
          document.getElementById(el.id.replace('note-edit-', 'note-view-'))?.classList.remove('d-none');
        }
      });

      if (isOpen) {
        editEl.classList.add('d-none');
        viewEl.classList.remove('d-none');
      } else {
        viewEl.classList.add('d-none');
        editEl.classList.remove('d-none');
      }
    });
  });

  // ── Cancel inline edit ──
  document.querySelectorAll('.btn-cancel-edit-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const editEl = btn.closest('[id^="note-edit-"]');
      const id     = editEl.id.replace('note-edit-', '');
      editEl.classList.add('d-none');
      document.getElementById(`note-view-${id}`)?.classList.remove('d-none');
      btn.closest('form').classList.remove('was-validated');
      btn.closest('form').querySelector('.inline-note-error')?.classList.add('d-none');
    });
  });

  // ── Inline edit submit ──
  document.querySelectorAll('.inline-edit-note-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

      const spinner = form.querySelector('.edit-note-spinner');
      const saveBtn = form.querySelector('.btn-save-inline-note');
      const errEl   = form.querySelector('.inline-note-error');

      spinner.classList.remove('d-none');
      saveBtn.disabled = true;
      errEl.classList.add('d-none');

      try {
        await updateNote(form.dataset.noteId, form.elements['body'].value);
        showToast('Note updated.', 'success');
        await reloadNotes(canDelete);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('d-none');
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
      }
    });
  });

  // ── Delete (admin + primary only) ──
  if (canDelete) {
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id } = btn.dataset;

        const confirmBtn = document.getElementById('btn-confirm-delete-note');
        const fresh = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(fresh);
        fresh.addEventListener('click', async () => {
          try {
            await softDeleteNote(id);
            bootstrap.Modal.getInstance(
              document.getElementById('deleteNoteModal')
            )?.hide();
            showToast('Note deleted.', 'warning');
            await reloadNotes(canDelete);
          } catch (err) {
            showToast('Failed to delete: ' + err.message, 'danger');
          }
        });

        new bootstrap.Modal(document.getElementById('deleteNoteModal')).show();
      });
    });
  }
}

async function reloadNotes(canDelete) {
  const notes = await getNotes(currentStudentId);
  renderNotes(notes, canDelete);
}

// ── Songs tab ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  planned:   { label: 'Planned',   cls: 'secondary' },
  started:   { label: 'In Progress', cls: 'primary'   },
  completed: { label: 'Completed', cls: 'success'    },
};

function renderSongs(songs, canDelete) {
  const statusOptions = Object.entries(STATUS_META)
    .map(([val, m]) => `<option value="${val}">${m.label}</option>`)
    .join('');

  const addBtn = `
    <button class="btn btn-sm btn-outline-primary" id="btn-toggle-add-song"
      data-bs-toggle="collapse" data-bs-target="#add-song-collapse" aria-expanded="false">
      <i class="bi bi-plus-lg me-1"></i>Add Song
    </button>`;

  const inlineAddForm = `
    <div class="collapse mb-4" id="add-song-collapse">
      <div class="card border-0 shadow-sm" style="background:#f8f9fa">
        <div class="card-body">
          <h6 class="fw-semibold mb-3">New Song</h6>
          <form id="add-song-form" novalidate>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Song Name <span class="text-danger">*</span></label>
                <input type="text" name="song_name" class="form-control form-control-sm"
                  placeholder="e.g. APT — Bruno Mars" required />
                <div class="invalid-feedback">Song name is required.</div>
              </div>
              <div class="col-sm-6">
                <label class="form-label fw-semibold" style="font-size:.8rem">Song URL</label>
                <input type="url" name="song_url" class="form-control form-control-sm"
                  placeholder="https://…" />
              </div>
              <div class="col-sm-6">
                <label class="form-label fw-semibold" style="font-size:.8rem">Lyrics URL</label>
                <input type="url" name="lyrics_url" class="form-control form-control-sm"
                  placeholder="https://…" />
              </div>
              <div class="col-sm-6">
                <label class="form-label fw-semibold" style="font-size:.8rem">Status</label>
                <select name="status" class="form-select form-select-sm">${statusOptions}</select>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Notes</label>
                <textarea name="notes" class="form-control form-control-sm" rows="2"
                  placeholder="Additional notes…"></textarea>
              </div>
            </div>
            <div id="add-song-form-error" class="alert alert-danger mt-3 d-none"></div>
            <div class="d-flex gap-2 mt-3">
              <button type="submit" id="btn-save-song" class="btn btn-primary btn-sm">
                <span id="btn-save-song-spinner" class="spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                Save Song
              </button>
              <button type="button" id="btn-cancel-add-song" class="btn btn-light btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  const cards = songs.length
    ? songs.map(s => {
        const meta       = STATUS_META[s.status] ?? STATUS_META.planned;
        const songLink   = s.song_url
          ? `<a href="${escHtml(s.song_url)}" target="_blank" rel="noopener" class="text-decoration-none small">
               <i class="bi bi-music-note me-1"></i>Listen
             </a>` : '';
        const lyricsLink = s.lyrics_url
          ? `<a href="${escHtml(s.lyrics_url)}" target="_blank" rel="noopener" class="text-decoration-none small ms-3">
               <i class="bi bi-file-text me-1"></i>Lyrics
             </a>` : '';

        const deleteBtn = canDelete
          ? `<button class="btn btn-sm btn-outline-danger btn-delete-song" data-id="${s.id}" data-name="${escHtml(s.song_name)}">
               <i class="bi bi-trash"></i>
             </button>` : '';

        // Status options pre-selecting current status
        const statusOpts = Object.entries(STATUS_META)
          .map(([val, m]) => `<option value="${val}"${val === s.status ? ' selected' : ''}>${m.label}</option>`)
          .join('');

        const inlineEditForm = `
          <div id="song-edit-${s.id}" class="d-none" style="background:#f8f9fa;border-top:1px solid #e9ecef">
            <div class="px-4 py-3">
              <form class="inline-edit-song-form" data-song-id="${s.id}" novalidate>
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Song Name <span class="text-danger">*</span></label>
                    <input type="text" name="song_name" class="form-control form-control-sm"
                      value="${escHtml(s.song_name)}" required />
                    <div class="invalid-feedback">Song name is required.</div>
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Song URL</label>
                    <input type="url" name="song_url" class="form-control form-control-sm"
                      value="${escHtml(s.song_url ?? '')}" />
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Lyrics URL</label>
                    <input type="url" name="lyrics_url" class="form-control form-control-sm"
                      value="${escHtml(s.lyrics_url ?? '')}" />
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Status</label>
                    <select name="status" class="form-select form-select-sm">${statusOpts}</select>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:.8rem">Notes</label>
                    <textarea name="notes" class="form-control form-control-sm" rows="2">${escHtml(s.notes ?? '')}</textarea>
                  </div>
                </div>
                <div class="inline-song-error alert alert-danger mt-2 d-none"></div>
                <div class="d-flex gap-2 mt-3">
                  <button type="submit" class="btn btn-primary btn-sm btn-save-inline-song">
                    <span class="edit-song-spinner spinner-border spinner-border-sm me-1 d-none" role="status"></span>
                    Save Changes
                  </button>
                  <button type="button" class="btn btn-light btn-sm btn-cancel-edit-song">Cancel</button>
                </div>
              </form>
            </div>
          </div>`;

        return `
          <div class="card mb-3 border-0 shadow-sm overflow-hidden">
            <div class="d-flex align-items-center justify-content-between gap-2 px-4 py-2"
                 style="background:#f1f3f5;border-bottom:1px solid #e9ecef">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <i class="bi bi-music-note-beamed text-muted" style="font-size:.85rem"></i>
                <span class="fw-semibold" style="font-size:.9rem">${escHtml(s.song_name)}</span>
                <span class="badge text-bg-${meta.cls} rounded-pill" style="font-size:.72rem">${meta.label}</span>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                <button class="btn btn-sm btn-outline-secondary btn-edit-song" data-id="${s.id}">
                  <i class="bi bi-pencil"></i>
                </button>
                ${deleteBtn}
              </div>
            </div>
            <div id="song-view-${s.id}" class="card-body py-3">
              ${s.notes ? `<p class="small mb-2" style="white-space:pre-wrap;line-height:1.6">${escHtml(s.notes)}</p>` : ''}
              <div class="d-flex gap-3">${songLink}${lyricsLink}</div>
            </div>
            ${inlineEditForm}
          </div>`;
      }).join('')
    : `<div class="text-center py-5 text-muted">
         <i class="bi bi-music-note-list fs-1 opacity-50"></i>
         <p class="mt-3 mb-0">No songs in the repertoire yet.</p>
       </div>`;

  document.getElementById('panel-songs').innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Songs</h5>
      ${addBtn}
    </div>
    ${inlineAddForm}
    ${cards}`;

  wireSongButtons(canDelete);
}

function wireSongButtons(canDelete) {
  // ── Add form ──
  const collapseEl = document.getElementById('add-song-collapse');
  const addForm    = document.getElementById('add-song-form');
  const addErr     = document.getElementById('add-song-form-error');
  const addSpinner = document.getElementById('btn-save-song-spinner');
  const addSaveBtn = document.getElementById('btn-save-song');

  document.getElementById('btn-cancel-add-song')?.addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    addForm.reset();
    addForm.classList.remove('was-validated');
    addErr.classList.add('d-none');
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) { addForm.classList.add('was-validated'); return; }

    addSpinner.classList.remove('d-none');
    addSaveBtn.disabled = true;
    addErr.classList.add('d-none');

    try {
      const f = addForm.elements;
      await createSong(currentStudentId, currentTeacherId, {
        song_name:  f['song_name'].value,
        song_url:   f['song_url'].value,
        lyrics_url: f['lyrics_url'].value,
        notes:      f['notes'].value,
        status:     f['status'].value,
      });
      showToast('Song added.', 'success');
      await reloadSongs(canDelete);
    } catch (err) {
      addErr.textContent = err.message;
      addErr.classList.remove('d-none');
      addSpinner.classList.add('d-none');
      addSaveBtn.disabled = false;
    }
  });

  // ── Edit toggle ──
  document.querySelectorAll('.btn-edit-song').forEach(btn => {
    btn.addEventListener('click', () => {
      const id     = btn.dataset.id;
      const viewEl = document.getElementById(`song-view-${id}`);
      const editEl = document.getElementById(`song-edit-${id}`);
      const isOpen = !editEl.classList.contains('d-none');

      // Close any other open edit forms
      document.querySelectorAll('[id^="song-edit-"]').forEach(el => {
        if (el.id !== `song-edit-${id}` && !el.classList.contains('d-none')) {
          el.classList.add('d-none');
          document.getElementById(el.id.replace('song-edit-', 'song-view-'))?.classList.remove('d-none');
        }
      });

      if (isOpen) {
        editEl.classList.add('d-none');
        viewEl.classList.remove('d-none');
      } else {
        viewEl.classList.add('d-none');
        editEl.classList.remove('d-none');
      }
    });
  });

  // ── Cancel inline edit ──
  document.querySelectorAll('.btn-cancel-edit-song').forEach(btn => {
    btn.addEventListener('click', () => {
      const editEl = btn.closest('[id^="song-edit-"]');
      const id     = editEl.id.replace('song-edit-', '');
      editEl.classList.add('d-none');
      document.getElementById(`song-view-${id}`)?.classList.remove('d-none');
      btn.closest('form').classList.remove('was-validated');
      btn.closest('form').querySelector('.inline-song-error')?.classList.add('d-none');
    });
  });

  // ── Inline edit submit ──
  document.querySelectorAll('.inline-edit-song-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

      const spinner = form.querySelector('.edit-song-spinner');
      const saveBtn = form.querySelector('.btn-save-inline-song');
      const errEl   = form.querySelector('.inline-song-error');

      spinner.classList.remove('d-none');
      saveBtn.disabled = true;
      errEl.classList.add('d-none');

      try {
        const f = form.elements;
        await updateSong(form.dataset.songId, {
          song_name:  f['song_name'].value,
          song_url:   f['song_url'].value,
          lyrics_url: f['lyrics_url'].value,
          notes:      f['notes'].value,
          status:     f['status'].value,
        });
        showToast('Song updated.', 'success');
        await reloadSongs(canDelete);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('d-none');
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
      }
    });
  });

  // ── Delete (Primary teacher + Admin only) ──
  if (canDelete) {
    document.querySelectorAll('.btn-delete-song').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, name } = btn.dataset;
        document.getElementById('delete-song-name').textContent = name;

        const confirmBtn = document.getElementById('btn-confirm-delete-song');
        const fresh = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(fresh);
        fresh.addEventListener('click', async () => {
          try {
            await deleteSong(id);
            bootstrap.Modal.getInstance(
              document.getElementById('deleteSongModal')
            )?.hide();
            showToast('Song deleted.', 'warning');
            await reloadSongs(canDelete);
          } catch (err) {
            showToast('Failed to delete: ' + err.message, 'danger');
          }
        });

        new bootstrap.Modal(document.getElementById('deleteSongModal')).show();
      });
    });
  }
}

async function reloadSongs(canDelete) {
  const songs = await getSongs(currentStudentId);
  renderSongs(songs, canDelete);
}

// ── Recordings tab ────────────────────────────────────────────────────────────

function mimeIcon(mimeType) {
  if (!mimeType) return 'bi-file-earmark';
  if (mimeType.startsWith('audio/')) return 'bi-file-earmark-music';
  if (mimeType.startsWith('video/')) return 'bi-file-earmark-play';
  return 'bi-file-earmark';
}

function mimeLabel(mimeType) {
  if (!mimeType) return 'File';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.startsWith('video/')) return 'Video';
  return 'File';
}

function renderRecordings(recordings, canDelete) {
  const inlineAddForm = `
    <div class="collapse mb-4" id="add-recording-collapse">
      <div class="card border-0 shadow-sm" style="background:#f8f9fa">
        <div class="card-body">
          <h6 class="fw-semibold mb-3">Upload Recording</h6>
          <form id="add-recording-form" novalidate>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">
                  File <span class="text-danger">*</span>
                  <span class="text-muted fw-normal">(audio or video, max 100 MB)</span>
                </label>
                <input type="file" name="file" class="form-control form-control-sm"
                  accept="audio/*,video/*" required />
                <div class="invalid-feedback">Please select an audio or video file.</div>
              </div>
              <div class="col-sm-6">
                <label class="form-label fw-semibold" style="font-size:.8rem">Recorded on</label>
                <input type="datetime-local" name="recorded_at" class="form-control form-control-sm" />
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" style="font-size:.8rem">Note</label>
                <textarea name="note" class="form-control form-control-sm" rows="2"
                  placeholder="Optional context about this recording…"></textarea>
              </div>
            </div>
            <div id="add-recording-progress" class="d-none mt-3">
              <div class="d-flex align-items-center gap-2 text-muted small">
                <span class="spinner-border spinner-border-sm" role="status"></span>
                Uploading… please wait
              </div>
            </div>
            <div id="add-recording-form-error" class="alert alert-danger mt-3 d-none"></div>
            <div class="d-flex gap-2 mt-3">
              <button type="submit" id="btn-save-recording" class="btn btn-primary btn-sm">Upload</button>
              <button type="button" id="btn-cancel-add-recording" class="btn btn-light btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  const cards = recordings.length
    ? recordings.map(r => {
        const uploaderName = r.uploader
          ? `${escHtml(r.uploader.first_name)} ${escHtml(r.uploader.last_name)}`
          : '—';
        const dateLabel = r.recorded_at
          ? formatDate(r.recorded_at)
          : formatDate(r.created_at);
        const sizeLabel = formatBytes(r.size_bytes);

        const playerBlock = r.signedUrl
          ? r.mime_type?.startsWith('video/')
            ? `<video controls preload="metadata" src="${r.signedUrl}" class="w-100 rounded mt-2" style="max-height:260px"></video>`
            : `<audio controls preload="metadata" src="${r.signedUrl}" class="w-100 mt-2"></audio>`
          : `<p class="text-muted small mt-2">Preview unavailable.</p>`;

        const deleteBtn = canDelete
          ? `<button class="btn btn-sm btn-outline-danger btn-delete-recording"
               data-id="${r.id}" data-path="${escHtml(r.file_path)}" data-name="${escHtml(r.file_name)}">
               <i class="bi bi-trash"></i>
             </button>` : '';

        return `
          <div class="card mb-3 border-0 shadow-sm overflow-hidden">
            <div class="d-flex align-items-center justify-content-between gap-2 px-4 py-2"
                 style="background:#f1f3f5;border-bottom:1px solid #e9ecef">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <i class="bi ${mimeIcon(r.mime_type)} text-muted" style="font-size:.85rem"></i>
                <span class="fw-semibold" style="font-size:.9rem">${escHtml(r.file_name)}</span>
                <span class="badge text-bg-secondary rounded-pill" style="font-size:.72rem">${mimeLabel(r.mime_type)}</span>
                ${sizeLabel ? `<span class="text-muted" style="font-size:.78rem">${sizeLabel}</span>` : ''}
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                ${deleteBtn}
              </div>
            </div>
            <div class="card-body py-3">
              <div class="d-flex gap-3 mb-1 text-muted" style="font-size:.82rem">
                <span><i class="bi bi-calendar3 me-1"></i>${dateLabel}</span>
                <span><i class="bi bi-person me-1"></i>${uploaderName}</span>
              </div>
              ${r.note ? `<p class="small mb-2" style="white-space:pre-wrap;line-height:1.6">${escHtml(r.note)}</p>` : ''}
              ${playerBlock}
            </div>
          </div>`;
      }).join('')
    : `<div class="text-center py-5 text-muted">
         <i class="bi bi-mic fs-1 opacity-50"></i>
         <p class="mt-3 mb-0">No recordings uploaded yet.</p>
       </div>`;

  document.getElementById('panel-recordings').innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-semibold mb-0">Recordings</h5>
      <button class="btn btn-sm btn-outline-primary"
        data-bs-toggle="collapse" data-bs-target="#add-recording-collapse" aria-expanded="false">
        <i class="bi bi-upload me-1"></i>Upload Recording
      </button>
    </div>
    ${inlineAddForm}
    ${cards}`;

  wireRecordingButtons(canDelete);
}

function wireRecordingButtons(canDelete) {
  const collapseEl = document.getElementById('add-recording-collapse');
  const addForm    = document.getElementById('add-recording-form');
  const addErr     = document.getElementById('add-recording-form-error');
  const progress   = document.getElementById('add-recording-progress');
  const saveBtn    = document.getElementById('btn-save-recording');

  document.getElementById('btn-cancel-add-recording')?.addEventListener('click', () => {
    bootstrap.Collapse.getInstance(collapseEl)?.hide();
    addForm.reset();
    addForm.classList.remove('was-validated');
    addErr.classList.add('d-none');
    progress.classList.add('d-none');
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!addForm.checkValidity()) { addForm.classList.add('was-validated'); return; }

    const file = addForm.elements['file'].files[0];
    if (!file) { addForm.classList.add('was-validated'); return; }

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      addErr.textContent = 'Only audio and video files are allowed.';
      addErr.classList.remove('d-none');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      addErr.textContent = 'File exceeds the 100 MB limit.';
      addErr.classList.remove('d-none');
      return;
    }

    addErr.classList.add('d-none');
    progress.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
      await uploadRecording(
        currentStudentId,
        currentTeacherId,
        file,
        {
          note:       addForm.elements['note'].value || null,
          recordedAt: addForm.elements['recorded_at'].value || null,
        }
      );
      showToast('Recording uploaded.', 'success');
      await reloadRecordings(canDelete);
    } catch (err) {
      progress.classList.add('d-none');
      saveBtn.disabled = false;
      addErr.textContent = err.message;
      addErr.classList.remove('d-none');
    }
  });

  // ── Delete (admin + primary only) ──
  if (canDelete) {
    document.querySelectorAll('.btn-delete-recording').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, path, name } = btn.dataset;
        document.getElementById('delete-recording-name').textContent = name;

        const confirmBtn = document.getElementById('btn-confirm-delete-recording');
        const fresh = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(fresh);
        fresh.addEventListener('click', async () => {
          try {
            await softDeleteRecording(id, path);
            bootstrap.Modal.getInstance(
              document.getElementById('deleteRecordingModal')
            )?.hide();
            showToast('Recording deleted.', 'warning');
            await reloadRecordings(canDelete);
          } catch (err) {
            showToast('Failed to delete: ' + err.message, 'danger');
          }
        });

        new bootstrap.Modal(document.getElementById('deleteRecordingModal')).show();
      });
    });
  }
}

async function reloadRecordings(canDelete) {
  const recordings = await getRecordings(currentStudentId);
  renderRecordings(recordings, canDelete);
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
  currentTeacherId = profile.id;
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

    const lessons = await getLessons(studentId);
    renderLessons(lessons, isAdmin);

    // Notes — delete allowed for admin or primary teacher
    const isPrimary = (student.student_teacher_assignments ?? []).some(
      a => a.teacher_id === currentTeacherId && a.role === 'primary' && !a.active_to
    );
    const canDeleteNotes = isAdmin || isPrimary;
    const notes = await getNotes(studentId);
    renderNotes(notes, canDeleteNotes);

    // Songs — delete allowed for admin or primary teacher
    const canDeleteSongs = isAdmin || isPrimary;
    const songs = await getSongs(studentId);
    renderSongs(songs, canDeleteSongs);

    // Recordings — delete allowed for admin or primary teacher
    const canDeleteRecordings = isAdmin || isPrimary;
    const recordings = await getRecordings(studentId);
    renderRecordings(recordings, canDeleteRecordings);

  } catch (err) {
    document.getElementById('page-loading').classList.add('d-none');
    document.getElementById('error-state').classList.remove('d-none');
    document.getElementById('error-message').textContent = err.message;
    showToast('Failed to load student: ' + err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', init);
