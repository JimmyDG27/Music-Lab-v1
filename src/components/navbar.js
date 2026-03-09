// components/navbar.js
// Renders the shared sidebar into a container element.
import { getCurrentUser } from '../services/auth.js';
import { logout }         from '../services/auth.js';
import { showToast }      from './toast.js';

// ── Route definitions ─────────────────────────────────────────────────────────

const ADMIN_LINKS = [
  { href: '/src/pages/dashboard/dashboard.html',         icon: 'bi-grid-fill',     label: 'Dashboard'     },
  { href: '/src/pages/students/students.html',           icon: 'bi-people-fill',   label: 'Students'      },
  { href: '/src/pages/teachers/teachers.html',           icon: 'bi-person-badge',  label: 'Teachers'      },
  { href: '/src/pages/announcements/announcements.html', icon: 'bi-megaphone-fill',label: 'Announcements' },
];

const TEACHER_LINKS = [
  { href: '/src/pages/dashboard/dashboard.html',         icon: 'bi-grid-fill',     label: 'Dashboard'     },
  { href: '/src/pages/students/students.html',           icon: 'bi-people-fill',   label: 'My Students'   },
  { href: '/src/pages/teachers/teachers.html',           icon: 'bi-person-badge',  label: 'Teachers'      },
  { href: '/src/pages/announcements/announcements.html', icon: 'bi-megaphone-fill',label: 'Announcements' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isActive(href) {
  return window.location.pathname.endsWith(href);
}

function initials(profile) {
  const f = (profile.first_name ?? '').trim();
  const l = (profile.last_name  ?? '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f)      return f.slice(0, 2).toUpperCase();
  return (profile.email ?? '?').slice(0, 2).toUpperCase();
}

function buildNavItems(links) {
  return links.map(({ href, icon, label }) => {
    const active = isActive(href);
    return `
      <li class="ml-nav-item">
        <a
          href="${href}"
          class="ml-nav-link${active ? ' active' : ''}"${active ? ' aria-current="page"' : ''}
        >
          <i class="bi ${icon} ml-nav-icon" aria-hidden="true"></i>
          <span>${escHtml(label)}</span>
        </a>
      </li>`;
  }).join('');
}

function buildSidebarHTML(profile) {
  const links       = profile.role === 'admin' ? ADMIN_LINKS : TEACHER_LINKS;
  const navItems    = buildNavItems(links);
  const fullName    = escHtml(
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  );
  const roleLabel   = profile.role === 'admin' ? 'Admin' : 'Teacher';
  const roleClass   = profile.role === 'admin' ? 'ml-badge-admin' : 'ml-badge-teacher';
  const avatarChars = escHtml(initials(profile));

  return `
    <!-- ── MOBILE TOPBAR ── -->
    <header class="ml-topbar d-flex d-lg-none align-items-center justify-content-between px-4">
      <span class="ml-brand-text" style="font-size:.95rem;font-weight:700;letter-spacing:-.02em">
        <i class="bi bi-music-note-beamed me-1" style="color:#a5b4fc" aria-hidden="true"></i>Music Lab
      </span>
      <button
        class="btn p-1 border-0"
        type="button"
        aria-label="Open menu"
        style="line-height:1"
      >
        <i class="bi bi-list fs-4" style="color:rgba(255,255,255,.75)" aria-hidden="true"></i>
      </button>
    </header>

    <!-- ── SIDEBAR ── -->
    <aside
      id="mlSidebar"
      class="ml-sidebar offcanvas-lg offcanvas-start"
      tabindex="-1"
      aria-label="Main navigation"
    >
      <!-- Brand -->
      <div class="ml-brand px-4 py-4 d-flex align-items-center gap-2">
        <div class="ml-brand-icon" aria-hidden="true">
          <i class="bi bi-music-note-beamed"></i>
        </div>
        <span class="ml-brand-text">Music Lab</span>
        <button
          type="button"
          class="btn-close btn-close-white ms-auto d-lg-none"
          aria-label="Close"
        ></button>
      </div>

      <!-- Navigation -->
      <nav class="ml-nav flex-grow-1 px-3 mt-1" aria-label="Site navigation">
        <ul class="ml-nav-list list-unstyled mb-0">
          ${navItems}
        </ul>
      </nav>

      <!-- Profile + Logout -->
      <div class="ml-sidebar-footer px-4 py-4">
        <a href="/src/pages/profile/profile.html"
           class="d-flex align-items-center gap-3 mb-3 text-decoration-none"
           style="color:inherit"
           aria-label="Go to your profile">
          <div class="ml-avatar" aria-hidden="true">${avatarChars}</div>
          <div class="overflow-hidden">
            <div class="ml-user-name text-truncate" title="${fullName}">${fullName}</div>
            <span class="ml-badge ${roleClass}">${escHtml(roleLabel)}</span>
          </div>
        </a>
        <button
          id="nav-logout-btn"
          type="button"
          class="btn ml-logout-btn w-100"
        >
          <i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Sign out
        </button>
      </div>
    </aside>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function renderNavbar(containerId, profile = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!profile) {
    const user = await getCurrentUser();
    if (!user) return;
    profile = user.profile;
  }

  container.innerHTML = buildSidebarHTML(profile);

  const offcanvasEl = document.getElementById('mlSidebar');
  if (offcanvasEl && window.bootstrap?.Offcanvas) {
    const oc = new window.bootstrap.Offcanvas(offcanvasEl);

    const hamburger = container.querySelector('[aria-label="Open menu"]');
    hamburger?.addEventListener('click', () => oc.show());

    const closeBtn = offcanvasEl.querySelector('[aria-label="Close"]');
    closeBtn?.addEventListener('click', () => oc.hide());
  }

  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    try {
      await logout();
      window.location.replace('/src/pages/login/login.html');
    } catch (err) {
      showToast('Logout failed: ' + err.message, 'danger');
    }
  });
}
