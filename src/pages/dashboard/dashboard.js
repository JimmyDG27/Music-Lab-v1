// pages/dashboard/dashboard.js
// Protected page — role-aware dashboard with real stat counts.
import { authGuard }       from '../../utils/guards.js';
import { renderNavbar }    from '../../components/navbar.js';
import { showToast }       from '../../components/toast.js';
import { getStudentCount } from '../../services/students.js';
import { getTeacherCount } from '../../services/teachers.js';
import { getUnreadCount }  from '../../services/announcements.js';
import { getLessonCount }  from '../../services/lessons.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Stat card builder ─────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.icon       Bootstrap Icon class (e.g. 'bi-people').
 * @param {string} opts.label      Card label.
 * @param {string|number} opts.value  Stat value or '—' placeholder.
 * @param {string} opts.color      Bootstrap color name (primary, success, …).
 * @param {string} [opts.href]     Optional link for the card footer.
 */
function statCard({ icon, label, value, color, href = null }) {
  const footer = href
    ? `<a href="${href}" class="card-footer text-decoration-none text-${color} small bg-transparent border-top-0">
         View all <i class="bi bi-arrow-right ms-1"></i>
       </a>`
    : '';
  return `
    <div class="col-12 col-sm-6 col-xl-3">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="rounded-3 p-3 bg-${color} bg-opacity-10 text-${color} fs-3">
            <i class="bi ${icon}"></i>
          </div>
          <div>
            <div class="fs-2 fw-bold lh-1">${escHtml(String(value))}</div>
            <div class="text-muted small mt-1">${escHtml(label)}</div>
          </div>
        </div>
        ${footer}
      </div>
    </div>`;
}

// ── Role-specific card grids ──────────────────────────────────────────────────

function adminCards({ students, teachers, lessons }) {
  return [
    {
      icon: 'bi-people-fill', label: 'Total Students',
      value: students, color: 'primary',
      href: '/src/pages/students/students.html',
    },
    {
      icon: 'bi-person-badge-fill', label: 'Total Teachers',
      value: teachers, color: 'success',
      href: '/src/pages/teachers/teachers.html',
    },
    {
      icon: 'bi-journal-check', label: 'Total Lessons',
      value: lessons, color: 'warning',
    },
  ].map(statCard).join('');
}

function teacherCards({ students, unread, lessons }) {
  return [
    {
      icon: 'bi-people-fill', label: 'My Active Students',
      value: students, color: 'primary',
      href: '/src/pages/students/students.html',
    },
    {
      icon: 'bi-megaphone-fill', label: 'Unread Announcements',
      value: unread, color: 'danger',
      href: '/src/pages/announcements/announcements.html',
    },
    {
      icon: 'bi-journal-check', label: 'My Lessons Taught',
      value: lessons, color: 'warning',
    },
  ].map(statCard).join('');
}

// ── Page template ─────────────────────────────────────────────────────────────

function renderDashboard(profile, stats) {
  const isAdmin   = profile.role === 'admin';
  const fullName  = escHtml(
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  );
  const roleLabel = isAdmin ? 'Admin' : 'Teacher';
  const roleBadge = `<span class="badge bg-${ isAdmin ? 'danger' : 'primary' } ms-2">${roleLabel}</span>`;
  const cards     = isAdmin ? adminCards(stats) : teacherCards(stats);

  return `
    <!-- Welcome header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 fw-bold mb-1">Welcome back, <span class="text-primary">${fullName}</span> 👋</h1>
        <p class="text-muted mb-0">You are signed in as ${roleBadge}</p>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="row g-4">
      ${cards}
    </div>

    `;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const user = await authGuard();
  if (!user) return;
  const { profile } = user;

  await renderNavbar('navbar-container', profile);

  // Fetch stats — fail gracefully so the page still renders
  const stats = { students: '—', teachers: '—', lessons: '—', unread: '—' };
  try {
    stats.students = await getStudentCount();

    if (profile.role === 'admin') {
      [stats.teachers, stats.lessons] = await Promise.all([
        getTeacherCount(),
        getLessonCount(),
      ]);
    } else {
      [stats.unread, stats.lessons] = await Promise.all([
        getUnreadCount(),
        getLessonCount(profile.id),
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
}

document.addEventListener('DOMContentLoaded', init);
