// components/navbar.js
// Renders the shared sidebar into a container element.
// Same public API — renderNavbar(containerId, profile?) — so all pages work unchanged.
import { getCurrentUser } from '../services/auth.js';
import { logout }         from '../services/auth.js';
import { showToast }      from './toast.js';

// ── Route definitions ─────────────────────────────────────────────────────────

const ADMIN_LINKS = [
  { href: '/src/pages/dashboard/dashboard.html',         icon: 'bi-squares',      label: 'Dashboard'     },
  { href: '/src/pages/students/students.html',           icon: 'bi-people',        label: 'Students'      },
  { href: '/src/pages/teachers/teachers.html',           icon: 'bi-person-badge',  label: 'Teachers'      },
  { href: '/src/pages/announcements/announcements.html', icon: 'bi-megaphone',     label: 'Announcements' },
];

const TEACHER_LINKS = [
  { href: '/src/pages/dashboard/dashboard.html',         icon: 'bi-squares',      label: 'Dashboard'     },
  { href: '/src/pages/students/students.html',           icon: 'bi-people',        label: 'My Students'   },
  { href: '/src/pages/announcements/announcements.html', icon: 'bi-megaphone',     label: 'Announcements' },
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

/**
 * Generate the first letter(s) of the user's name for the avatar circle.
 */
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
          <i class="bi ${icon} ml-nav-icon"></i>
          <span>${escHtml(label)}</span>
        </a>
      </li>`;
  }).join('');
}

function buildSidebarHTML(profile) {
  const links    = profile.role === 'admin' ? ADMIN_LINKS : TEACHER_LINKS;
  const navItems = buildNavItems(links);
  const fullName = escHtml(
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  );
  const roleLabel   = profile.role === 'admin' ? 'Admin' : 'Teacher';
  const roleClass   = profile.role === 'admin' ? 'ml-badge-admin' : 'ml-badge-teacher';
  const avatarChars = escHtml(initials(profile));

  return `
    <!-- ── MOBILE TOPBAR ── -->
    <header class="ml-topbar d-flex d-lg-none align-items-center justify-content-between px-4">
      <span class="ml-brand-text">
        <i class="bi bi-music-note-beamed"></i> Music Lab
      </span>
      <button
        class="btn p-1 border-0"
        type="button"
        aria-label="Open menu"
      >
        <i class="bi bi-list fs-4 text-secondary"></i>
      </button>
    </header>

    <!-- ── SIDEBAR (desktop: aside | mobile: offcanvas) ── -->
    <aside
      id="mlSidebar"
      class="ml-sidebar offcanvas-lg offcanvas-start"
      tabindex="-1"
      aria-label="Sidebar"
    >
      <!-- Brand -->
      <div class="ml-brand px-4 py-4 d-flex align-items-center gap-2">
        <div class="ml-brand-icon">
          <i class="bi bi-music-note-beamed"></i>
        </div>
        <span class="ml-brand-text">Music Lab</span>
        <!-- Mobile close -->
        <button
          type="button"
          class="btn-close ms-auto d-lg-none"
          aria-label="Close"
        ></button>
      </div>

      <!-- Navigation -->
      <nav class="ml-nav flex-grow-1 px-3 mt-2">
        <ul class="ml-nav-list list-unstyled mb-0">
          ${navItems}
        </ul>
      </nav>

      <!-- Profile + Logout -->
      <div class="ml-sidebar-footer px-4 py-4">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="ml-avatar" aria-hidden="true">${avatarChars}</div>
          <div class="overflow-hidden">
            <div class="ml-user-name text-truncate" title="${fullName}">${fullName}</div>
            <span class="ml-badge ${roleClass}">${escHtml(roleLabel)}</span>
          </div>
        </div>
        <button
          id="nav-logout-btn"
          type="button"
          class="btn ml-logout-btn w-100"
        >
          <i class="bi bi-box-arrow-right me-2"></i>Sign out
        </button>
      </div>
    </aside>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render the sidebar into the element matching `containerId`.
 * Fetches the current user profile automatically.
 *
 * @param {string} containerId  - id of the target element (no #)
 * @param {object} [profile]    - optional pre-fetched profile (avoids extra call)
 */
export async function renderNavbar(containerId, profile = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!profile) {
    const user = await getCurrentUser();
    if (!user) return;
    profile = user.profile;
  }

  container.innerHTML = buildSidebarHTML(profile);

  // Bootstrap's data-bs-toggle event delegation doesn't reliably fire for
  // elements injected after page load. Wire the hamburger and close button
  // manually instead.
  const offcanvasEl = document.getElementById('mlSidebar');
  if (offcanvasEl && window.bootstrap?.Offcanvas) {
    const oc = new window.bootstrap.Offcanvas(offcanvasEl);

    // Hamburger (inside the topbar) → show
    const hamburger = container.querySelector('[aria-label="Open menu"]');
    hamburger?.addEventListener('click', () => oc.show());

    // ✕ button (inside the sidebar) → hide
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
