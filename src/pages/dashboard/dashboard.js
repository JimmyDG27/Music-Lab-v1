// pages/dashboard/dashboard.js
// Protected page — role-aware dashboard with real stat counts.
import { authGuard }       from '../../utils/guards.js';
import { renderNavbar }    from '../../components/navbar.js';
import { showToast }       from '../../components/toast.js';
import { getStudentCount } from '../../services/students.js';
import { getTeacherCount } from '../../services/teachers.js';
import { getUnreadCount }  from '../../services/announcements.js';
import { getLessonCount, getLessonCountThisMonth, getLessonCountLastMonth, getLessonsByTeacher, getLessonsMonthlyByTeacher, getLessonsMonthlyByStudentForTeacher } from '../../services/lessons.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Stat card builder ─────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.icon   Bootstrap Icon class (e.g. 'bi-people-fill').
 * @param {string} opts.label  Card label.
 * @param {string|number} opts.value  Stat value.
 * @param {'green'|'amber'|'red'|'blue'} opts.color  Icon colour theme.
 * @param {string} [opts.href] Optional "view all" link.
 */
function statCard({ icon, label, value, color, href = null, modalTarget = null }) {
  const clickable = href || modalTarget;
  const inner = `
    <div class="ml-stat-card${clickable ? ' ml-stat-card-link' : ''}">
      <div class="ml-stat-icon ${escHtml(color)}" aria-hidden="true">
        <i class="bi ${escHtml(icon)}"></i>
      </div>
      <div class="ml-stat-body">
        <div class="ml-stat-value">${escHtml(String(value))}</div>
        <div class="ml-stat-label">${escHtml(label)}</div>
      </div>
      ${modalTarget ? `<i class="bi bi-arrow-up-right-square" style="font-size:.85rem;color:var(--text-400);margin-left:auto;align-self:flex-start"></i>` : ''}
    </div>`;

  if (href) return `<div class="col-12 col-sm-6 col-xl-4"><a href="${href}" class="text-decoration-none d-block h-100">${inner}</a></div>`;
  if (modalTarget) return `<div class="col-12 col-sm-6 col-xl-4"><button type="button" class="d-block w-100 h-100 border-0 bg-transparent p-0 text-start" data-bs-toggle="modal" data-bs-target="${escHtml(modalTarget)}">${inner}</button></div>`;
  return `<div class="col-12 col-sm-6 col-xl-4">${inner}</div>`;
}

// ── Role-specific card grids ──────────────────────────────────────────────────

function adminCards({ students, teachers, lessons }) {
  return [
    {
      icon: 'bi-people-fill', label: 'Total Students',
      value: students, color: 'green',
      href: '/src/pages/students/students.html',
    },
    {
      icon: 'bi-person-badge-fill', label: 'Total Teachers',
      value: teachers, color: 'amber',
      href: '/src/pages/teachers/teachers.html',
    },
    {
      icon: 'bi-journal-check', label: 'Total Lessons',
      value: lessons, color: 'blue',
      modalTarget: '#lessons-modal',
    },
  ].map(statCard).join('');
}

// ── Teacher lesson-activity table (admin only) ────────────────────────────────

function renderLessonActivity(rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="ml-empty-state">
        <div class="ml-empty-icon"><i class="bi bi-journal-x"></i></div>
        <p class="ml-empty-title">No lessons recorded yet</p>
        <p class="ml-empty-desc">Lessons will appear here once teachers start logging them.</p>
      </div>`;
  }

  const maxThis = Math.max(...rows.map(r => r.thisMonth), 1);

  const monthName = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('default', { month: 'long' });
  };
  const thisMonthLabel = monthName(0);
  const lastMonthLabel = monthName(-1);

  const tableRows = rows.map((r, i) => {
    const barPct  = Math.round((r.thisMonth / maxThis) * 100);
    const rankBg  = i === 0 ? 'rgba(79,70,229,.1)' : i === 1 ? 'rgba(79,70,229,.06)' : i === 2 ? 'rgba(79,70,229,.04)' : 'transparent';
    const rankNum = i < 3
      ? `<span class="ml-la-rank ml-la-rank-top">${i + 1}</span>`
      : `<span class="ml-la-rank">${i + 1}</span>`;

    return `
      <tr style="background:${rankBg}">
        <td class="ps-3">
          <div class="d-flex align-items-center gap-2">
            ${rankNum}
            <div class="ml-la-avatar">${escHtml(r.initials)}</div>
            <span class="fw-500">${escHtml(r.name)}</span>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="ml-la-bar-wrap">
              <div class="ml-la-bar" style="width:${barPct}%"></div>
            </div>
            <span class="ml-la-count-main">${escHtml(String(r.thisMonth))}</span>
          </div>
        </td>
        <td>
          <span class="ml-la-count-sec">${escHtml(String(r.lastMonth))}</span>
        </td>
        <td class="pe-3 text-end">
          <span class="ml-la-total">${escHtml(String(r.total))}</span>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="card mt-4">
      <div class="card-body p-0">
        <div class="d-flex align-items-center justify-content-between px-3 pt-3 pb-2">
          <div>
            <p class="fw-600 mb-0" style="font-size:.92rem;color:var(--text-900)">
              <i class="bi bi-bar-chart-line-fill me-1" style="color:var(--brand-600)"></i>
              Lesson Activity by Teacher
            </p>
            <p class="mb-0" style="font-size:.78rem;color:var(--text-400)">
              ${escHtml(thisMonthLabel)} vs ${escHtml(lastMonthLabel)} vs all-time
            </p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th class="ps-3">Teacher</th>
                <th>${escHtml(thisMonthLabel)}</th>
                <th>${escHtml(lastMonthLabel)}</th>
                <th class="pe-3 text-end">All-time</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ── Teacher month-comparison card ─────────────────────────────────────────────

function renderTeacherLessonComparison({ lessonsThisMonth, lessonsLastMonth }) {
  const cur  = lessonsThisMonth  ?? 0;
  const prev = lessonsLastMonth  ?? 0;

  const label = (offset) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  const thisLabel = label(0);
  const lastLabel = label(-1);

  return `
    <div class="ml-lc-card mt-4">
      <div class="ml-lc-header">
        <div>
          <p class="ml-lc-title"><i class="bi bi-calendar2-week-fill me-1"></i> Monthly Lesson Summary</p>
          <p class="ml-lc-subtitle">Your lesson activity for the past two months</p>
        </div>
      </div>

      <div class="ml-lc-cols">
        <div class="ml-lc-col current">
          <span class="ml-lc-col-label">This month</span>
          <span class="ml-lc-col-month">${escHtml(thisLabel)}</span>
          <span class="ml-lc-col-num current">${escHtml(String(cur))}</span>
          <span class="ml-lc-col-unit">lessons</span>
        </div>
        <div class="ml-lc-divider"></div>
        <div class="ml-lc-col prev">
          <span class="ml-lc-col-label">Last month</span>
          <span class="ml-lc-col-month">${escHtml(lastLabel)}</span>
          <span class="ml-lc-col-num prev">${escHtml(String(prev))}</span>
          <span class="ml-lc-col-unit">lessons</span>
        </div>
      </div>

    </div>`;
}

function teacherCards({ students, unread, lessons }) {
  return [
    {
      icon: 'bi-people-fill', label: 'My Active Students',
      value: students, color: 'green',
      href: '/src/pages/students/students.html',
    },
    {
      icon: 'bi-megaphone-fill', label: 'Unread Announcements',
      value: unread, color: 'red',
      href: '/src/pages/announcements/announcements.html',
    },
    {
      icon: 'bi-journal-check', label: 'My Total Lessons',
      value: lessons, color: 'blue',
      modalTarget: '#student-lessons-modal',
    },
  ].map(statCard).join('');
}

// ── Monthly heatmap modal (admin) ─────────────────────────────────────────────

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('default', { month: 'short' }) + " '" + String(y).slice(2);
}

function renderMonthlyModalContent({ months, rows }) {
  if (!rows.length) {
    return `<div class="ml-empty-state">
      <div class="ml-empty-icon"><i class="bi bi-journal-x"></i></div>
      <p class="ml-empty-title">No lessons recorded yet</p>
    </div>`;
  }

  const allCounts = rows.flatMap(r => Object.values(r.months));
  const maxCount  = Math.max(...allCounts, 1);

  const headCols = months.map(ym =>
    `<th class="ml-hm-th">${escHtml(monthLabel(ym))}</th>`
  ).join('');

  const bodyRows = rows.map(r => {
    const cells = months.map(ym => {
      const count   = r.months[ym] ?? 0;
      const opacity = count === 0 ? 0 : 0.12 + (count / maxCount) * 0.78;
      const bg      = count === 0 ? '' : `rgba(79,70,229,${opacity.toFixed(2)})`;
      const color   = opacity > 0.5 ? '#fff' : 'var(--text-900)';
      const text    = count === 0 ? `<span class="ml-hm-zero">—</span>` : count;
      return `<td class="ml-hm-cell" style="background:${bg};color:${color}">${text}</td>`;
    }).join('');

    return `<tr>
      <td class="ml-hm-teacher">
        <div class="ml-la-avatar">${escHtml(r.initials)}</div>
        <span>${escHtml(r.name)}</span>
      </td>
      ${cells}
      <td class="ml-hm-total">${r.total}</td>
    </tr>`;
  }).join('');

  return `
    <div class="table-responsive">
      <table class="table mb-0 ml-hm-table">
        <thead>
          <tr>
            <th class="ml-hm-teacher-th">Teacher</th>
            ${headCols}
            <th class="ml-hm-total-th">Total</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

// ── Page template ─────────────────────────────────────────────────────────────

function renderDashboard(profile, stats) {
  const isAdmin  = profile.role === 'admin';
  const fullName = escHtml(
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  );
  const roleLabel = isAdmin ? 'Admin' : 'Teacher';
  const roleBadge = `<span class="badge rounded-pill ms-2 fw-semibold" style="background:${isAdmin ? '#fee2e2' : '#ede9fe'};color:${isAdmin ? '#b91c1c' : '#6d28d9'};font-size:.7rem;letter-spacing:.04em;text-transform:uppercase">${roleLabel}</span>`;
  const cards     = isAdmin ? adminCards(stats) : teacherCards(stats);
  const activity  = isAdmin
    ? renderLessonActivity(stats.lessonsByTeacher)
    : renderTeacherLessonComparison(stats);

  return `
    <div class="ml-page-header mb-4">
      <div>
        <h1 style="font-size:1.55rem;letter-spacing:-0.03em">
          Welcome back, <span style="color:var(--brand-600)">${fullName}</span>
        </h1>
        <p class="ml-page-subtitle">
          You are signed in as${roleBadge}
        </p>
      </div>
    </div>

    <div class="row g-3">
      ${cards}
    </div>

    ${activity}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  const stats = { students: '—', teachers: '—', lessons: '—', unread: '—', lessonsByTeacher: null, lessonsMonthly: null, studentLessonsMonthly: null, lessonsThisMonth: 0, lessonsLastMonth: 0 };
  try {
    stats.students = await getStudentCount();

    if (profile.role === 'admin') {
      [stats.teachers, stats.lessons, stats.lessonsByTeacher, stats.lessonsMonthly] = await Promise.all([
        getTeacherCount(),
        getLessonCount(),
        getLessonsByTeacher(),
        getLessonsMonthlyByTeacher(),
      ]);
    } else {
      [stats.unread, stats.lessons, stats.lessonsThisMonth, stats.lessonsLastMonth, stats.studentLessonsMonthly] = await Promise.all([
        getUnreadCount(),
        getLessonCount(profile.id),
        getLessonCountThisMonth(profile.id),
        getLessonCountLastMonth(profile.id),
        getLessonsMonthlyByStudentForTeacher(profile.id),
      ]);
    }
  } catch (err) {
    showToast('Could not load some stats.', 'warning');
  }

  document.getElementById('page-loading')?.classList.add('d-none');
  const content = document.getElementById('dashboard-content');
  if (content) {
    content.classList.remove('d-none');
    content.innerHTML = renderDashboard(profile, stats);
  }

  if (profile.role === 'admin' && stats.lessonsMonthly) {
    const modalBody = document.getElementById('lessons-modal-body');
    if (modalBody) modalBody.innerHTML = renderMonthlyModalContent(stats.lessonsMonthly);
  }

  if (profile.role !== 'admin' && stats.studentLessonsMonthly) {
    const modalBody = document.getElementById('student-lessons-modal-body');
    if (modalBody) modalBody.innerHTML = renderMonthlyModalContent(stats.studentLessonsMonthly);
  }
}

document.addEventListener('DOMContentLoaded', init);
