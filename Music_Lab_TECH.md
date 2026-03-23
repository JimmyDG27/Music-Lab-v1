# Music Lab — Technology Stack & Architecture

**Project:** Music Lab — Internal School Operations & Progress Tracking App
**Status:** MVP Delivered — March 2026

---

## 1. CORE TECHNOLOGY STACK

### 1.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | — | Page structure, semantic markup |
| CSS3 | — | Custom design system, responsive rules |
| JavaScript (Vanilla, ES6+) | — | All application logic |
| ES Modules (`type="module"`) | — | Code splitting, clean imports |

No JavaScript framework (React, Vue, Angular). All DOM manipulation is vanilla JS with template literals for HTML generation.

### 1.2 UI / Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Bootstrap | 5.3.3 (CDN) | Layout grid, components (modals, collapse, offcanvas, tabs, badges) |
| Bootstrap Icons | 1.11.3 (CDN) | Icon set (`bi bi-*`) used throughout |
| Inter (Google Fonts) | — | Primary typeface via `@import` in `main.css` |
| Custom CSS (`src/styles/main.css`) | — | Design system tokens, component overrides |

### 1.3 Backend (BaaS)

| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-Service platform |
| PostgreSQL (via Supabase) | Primary relational database |
| Supabase Auth | Email/password authentication, session management, JWT tokens, invite flow |
| Supabase Storage | Private file storage bucket (`recordings-private`) for audio/video |
| Supabase Row-Level Security (RLS) | Database-enforced access control per user role and assignment |
| `@supabase/supabase-js` | v2 client library (imported via npm, bundled by Vite) |

### 1.4 Third-Party Integrations

| Technology | Version | Purpose |
|------------|---------|---------|
| Google Calendar API v3 | — | Read and write events on user's primary calendar |
| Google Identity Services (GIS) | — | OAuth 2.0 token acquisition for Google APIs |
| FullCalendar | 6.1.15 (CDN) | Calendar UI component (week / day views) |
| `@fullcalendar/core` | 6.1.15 | Core FullCalendar package |
| `@fullcalendar/timegrid` | 6.1.15 | Time grid view (week/day) |
| `@fullcalendar/interaction` | 6.1.15 | Click and drag interactions |
| `@fullcalendar/google-calendar` | 6.1.15 | Not used directly — custom API layer used instead |

### 1.5 Build Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| Vite | Latest | Dev server, ES module bundling, environment variables |
| Node.js | Latest LTS | Runtime for Vite and npm |
| npm | — | Package manager |

### 1.6 Deployment

| Technology | Purpose |
|------------|---------|
| Netlify | Static hosting with CI/CD |
| GitHub | Version control, source of truth for Netlify deploys |

**Build configuration:**
```
Build command:    vite build
Publish directory: dist
```

**Required environment variables:**
```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

---

## 2. APPLICATION ARCHITECTURE

### 2.1 Architecture Pattern — MPA (Multi-Page Application)

Each page is a standalone `.html` file with a paired `.js` module. There is no client-side router. Navigation is standard `<a href>` links. This keeps the architecture simple, auditable and fast to load.

```
/src/pages/
  auth/
    set-password.html + set-password.js
  dashboard/
    dashboard.html + dashboard.js
  students/
    students.html + students.js
    student-detail.html + student-detail.js
  teachers/
    teachers.html + teachers.js
  announcements/
    announcements.html + announcements.js
    announcement-detail.html + announcement-detail.js
  profile/
    profile.html + profile.js
  login/
    login.html + login.js   (inline CSS, no main.css dependency)
```

### 2.2 Module Structure

```
src/
  components/         # Shared UI components
    navbar.js         # Sidebar navigation (dark theme, responsive offcanvas)
    toast.js          # Toast notification system
    modal.js          # Shared confirmDelete() modal
    calendarDrawer.js # Google Calendar offcanvas drawer (FullCalendar)

  pages/              # Page controllers (one JS per HTML page)
    dashboard/
    students/
    teachers/
    announcements/
    profile/
    auth/

  services/           # All Supabase + external API calls
    supabase.js       # Supabase client init
    auth.js           # Login, logout, session
    students.js       # Students + parents + assignments CRUD
    teachers.js       # Teachers directory + management
    lessons.js        # Lessons CRUD + stats
    notes.js          # Student notes CRUD
    songs.js          # Songs (repertoire) CRUD
    recordings.js     # Recordings upload + metadata
    announcements.js  # Announcements + comments + reads
    googleCalendar.js # Google Calendar OAuth + API calls

  styles/
    main.css          # Design system tokens, global styles, component overrides

  utils/
    guards.js         # authGuard(), requireRole(), redirectIfAuthenticated()
    formatters.js     # formatDate(), formatDateTime(), toDateTimeLocal(), formatBytes()
    validators.js     # Input validation helpers

supabase/
  migrations/         # SQL migration files (schema history)

DOCS/
  DATABASE_SCHEMA.md  # Full table definitions with SQL
  RLS.md              # Row-Level Security policy documentation
  SETUP.md            # Local setup + Supabase configuration guide
  CREDENTIALS.md      # Demo credentials (internal only)
```

### 2.3 Separation of Concerns

| Layer | Location | Responsibility |
|-------|----------|---------------|
| Structure | `.html` files | DOM skeleton, IDs referenced by JS |
| Styles | `main.css` + Bootstrap | Visual design, responsive behavior |
| Logic | `pages/*.js` | Page init, event wiring, render functions |
| Data access | `services/*.js` | All Supabase queries, file uploads, API calls |
| Auth/Guards | `utils/guards.js` | Session validation, role enforcement |
| Shared UI | `components/*.js` | Navbar, toasts, modals, calendar drawer |

---

## 3. DESIGN SYSTEM

### 3.1 Color Palette

All colors are defined as CSS custom properties in `main.css`.

**Brand — Indigo palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-950` | `#1e1b4b` | Deep indigo (darkest) |
| `--brand-900` | `#312e81` | Dark indigo |
| `--brand-800` | `#3730a3` | Active button press |
| `--brand-700` | `#4338ca` | Button background, badge bg |
| `--brand-600` | `#4f46e5` | Primary accent — links, focus rings, icons |
| `--brand-300` | `#a5b4fc` | Light indigo — sidebar active nav, borders |
| `--brand-100` | `#e0e7ff` | Subtle highlight backgrounds |
| `--brand-50`  | `#eef2ff` | Very light tint backgrounds |

**Violet secondary accent** (stored as `--amber-*` for backwards compatibility with existing HTML):

| Token | Value | Usage |
|-------|-------|-------|
| `--amber-500` | `#7c3aed` | Violet accent |
| `--amber-400` | `#a78bfa` | Light violet / lavender |

**Sidebar:**

| Token | Value | Usage |
|-------|-------|-------|
| `--sb-bg` | `#0e0c2e` | Base dark navy |
| `--sb-gradient` | `#0d0c27 → #0a0920` + indigo radial glows | Full sidebar background |
| `--sb-nav-active-bg` | `rgba(129,140,248,0.16)` | Active nav item background |
| `--sb-nav-active-fg` | `#a5b4fc` | Active nav item text/icon color |
| `--sb-text` | `rgba(210,215,255,0.82)` | Nav item text (cool blue-white) |

**Surfaces:**

| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | `#f4f4fd` | Page background (cool off-white with indigo tint) |
| `--surface-card` | `#ffffff` | Card backgrounds |
| `--surface-inset` | `#ebebf7` | Inset / secondary backgrounds |
| `--surface-border` | `#ddddf0` | Card and input borders |

**Text:**

| Token | Value | Usage |
|-------|-------|-------|
| `--text-900` | `#1a1829` | Primary text (dark indigo-tinted near-black) |
| `--text-600` | `#4b4870` | Secondary / muted text |
| `--text-400` | `#8b89a8` | Placeholder / disabled text |

### 3.2 Typography

- **Font:** Inter (Google Fonts, weights 400/500/600/700)
- **Scale:** Bootstrap default scale, with component-specific overrides in `main.css`

### 3.3 Sidebar Navigation

- Dark near-black navy background — gradient from `#0d0c27` to `#0a0920` with indigo radial glow overlays
- Active nav item: light indigo/lavender `#a5b4fc`
- Nav text: cool blue-white tint `rgba(210,215,255,0.82)`
- Collapses to offcanvas drawer on mobile (hamburger trigger)
- Hamburger uses white icon (`btn-close-white` for offcanvas close)
- Calendar link opens an offcanvas drawer (right side) — not a page navigation

### 3.4 Component CSS Classes (Custom)

| Class | Purpose |
|-------|---------|
| `.ml-page-header` | Flex header: page title + action button |
| `.ml-page-subtitle` | Muted subtitle under h1 |
| `.ml-toolbar` | Search and filter bar row |
| `.ml-search-wrap` + `.ml-search-icon` | Search input with leading icon |
| `.ml-select-sm` | Compact dropdown select |
| `.ml-inline-form` | Collapsible add/edit form panel |
| `.ml-inline-form-title` | Form panel heading |
| `.ml-empty-state` | Empty state wrapper |
| `.ml-empty-icon` | Large icon in empty state |
| `.ml-empty-title` | Empty state heading |
| `.ml-empty-desc` | Empty state description |
| `.ml-back-link` | Back navigation link (← Back to ...) |
| `.ml-stat-card` | Dashboard stat card |
| `.ml-stat-icon.{green\|amber\|red\|blue}` | Colored icon in stat card |
| `.ml-stat-value` | Large number in stat card |
| `.ml-stat-label` | Label below value in stat card |
| `.ml-stat-link` | Clickable stat card with chevron |
| `.ml-toast.ml-toast-{success\|danger\|warning\|info}` | Toast notification (white card + left border) |
| `.ml-avatar` | User/teacher initials avatar |
| `.ml-confirm-modal` | Shared delete confirmation modal |
| `.ml-app` | Root app wrapper |
| `.ml-main` | Main content area |
| `.ml-content` | Inner content container (max-width constrained) |

### 3.5 Bootstrap Overrides

In `main.css`, Bootstrap's default colors are overridden via CSS variables:

- `.btn-primary` → forest green (`--brand-700`)
- `.form-control:focus` → green focus ring (3px rgba)
- `.text-primary` → `var(--brand-600)`
- `.card` → warm border + shadow

---

## 4. AUTHENTICATION ARCHITECTURE

### 4.1 Session Management

- Supabase Auth handles JWT issuance and refresh automatically
- Sessions persist across page loads via `localStorage` (Supabase default)
- Every protected page calls `authGuard()` at init

### 4.2 Auth Guards (`src/utils/guards.js`)

| Function | Behavior |
|----------|---------|
| `authGuard()` | Returns `{ session, profile }` or redirects to `/login` |
| `requireRole(role)` | Enforces `'admin'` or `'teacher'`; redirects to dashboard if wrong role |
| `redirectIfAuthenticated()` | Login page only — sends logged-in users to dashboard |

### 4.3 Invite Flow

1. Admin invites a new teacher via Supabase invite (sends email)
2. Teacher clicks invite link → lands on `/src/pages/auth/set-password.html`
3. Teacher sets their password
4. On success: redirect to `/src/pages/dashboard/dashboard.html`

### 4.4 Login Page

- `login.html` uses **inline CSS** (no dependency on `main.css`)
- Design tokens applied manually so the login page works standalone without Vite serving styles
- Language: Bulgarian (`lang="bg"`)

---

## 5. GOOGLE CALENDAR INTEGRATION

### 5.1 OAuth 2.0 Flow

```
User clicks "Connect Google Calendar"
  → requestCalendarAccess()
    → Google Identity Services tokenClient.requestAccessToken()
      → Google consent screen
        → Access token returned
          → Token stored in sessionStorage (with expiry)
          → User email stored in localStorage (keyed by Supabase UID)
          → prefetchEvents() triggered immediately
            → FullCalendar initialized with cached events
```

### 5.2 Scope Requirements

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

If a user previously authorized the app without calendar scopes, the app detects `INSUFFICIENT_SCOPES` (HTTP 403) and triggers `forceConsent = true` re-authorization.

### 5.3 Event Cache

Events are cached in a `Map` keyed by `{timeMin}_{timeMax}`. The cache:
- Is populated on first fetch for any date range
- Prefetches the current week immediately on token acquisition
- Is cleared entirely on create / update / delete operations

### 5.4 FullCalendar Configuration

| Option | Value |
|--------|-------|
| Views | `timeGridWeek` (desktop), `timeGridDay` (mobile) |
| Locale | `bg` (Bulgarian) |
| Week start | Monday (`firstDay: 1`) |
| Business hours | 08:00 – 20:00 |
| Slot duration | 30 minutes |
| Event source | Custom `events` callback using `googleCalendar.js` service |

---

## 6. STORAGE ARCHITECTURE

### 6.1 Bucket: `recordings-private`

| Setting | Value |
|---------|-------|
| Visibility | Private (authenticated only) |
| Allowed MIME types | `audio/*`, `video/*` |
| Path pattern | `{student_id}/{timestamp}_{filename}` |

File metadata is stored in the `recordings` table. Signed URLs are generated on demand for playback.

### 6.2 Access Validation

Storage RLS validates that the requesting user has an active assignment to the student referenced in the file path. This prevents any URL-guessing attacks.

---

## 7. KEY UI PATTERNS

### 7.1 Shared Delete Confirmation (`src/components/modal.js`)

```javascript
const confirmed = await confirmDelete({
  title: 'Delete Recording',
  message: 'This file will be permanently removed.',
  confirmLabel: 'Delete',  // optional, defaults to 'Delete'
});
if (!confirmed) return;
// proceed with deletion
```

- Single Bootstrap modal DOM instance, injected once, reused everywhere
- Returns `Promise<boolean>`
- Stale event listeners removed by cloning the confirm button on each invocation

### 7.2 Toast System (`src/components/toast.js`)

```javascript
showToast('Lesson saved.', 'success');
showToast('Failed to delete: ' + err.message, 'danger');
```

Types: `success` · `danger` · `warning` · `info`

### 7.3 Navbar / Sidebar (`src/components/navbar.js`)

- Generates sidebar HTML dynamically based on `profile.role`
- Admin sees: Dashboard, Students, Teachers, Announcements, Calendar, Profile
- Teacher sees: Dashboard, Students, Announcements, Calendar, Profile
- Highlights active link based on `window.location.pathname`
- Calendar link calls `initCalendarDrawer(profile.id)` — opens offcanvas, does not navigate

---

## 8. PERFORMANCE PATTERNS

| Pattern | Implementation |
|---------|---------------|
| Google Calendar prefetch | `prefetchEvents()` called immediately on token — current week cached before FullCalendar mounts |
| Dashboard parallel loads | Admin stats use independent `Promise.all`-style calls where data is not dependent |
| Tab persistence | Active student detail tab stored in `sessionStorage` — survives back navigation |
| Event cache | `Map` keyed by date range — avoids redundant Google API calls on same-week navigation |
| Empty month filtering | Dashboard heatmap removes months with zero lessons before rendering |

---

## 9. DEVELOPMENT WORKFLOW

### 9.1 Version Control

- Git + GitHub
- Feature work committed per logical milestone
- Main branch = production-ready

### 9.2 AI-Assisted Development

- Claude Code (Anthropic) — primary AI pair programming tool
- GitHub Copilot — secondary autocomplete

### 9.3 Editor

- VS Code / Cursor

### 9.4 Local Development

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
# App available at http://localhost:5173
```

---

## 10. DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start |
| `Music_Lab_PRD.md` | Full product requirements |
| `Music_Lab_BL_&_DB.md` | Business logic rules + full DB schema |
| `Music_Lab_TECH.md` | This file — tech stack + architecture |
| `DOCS/DATABASE_SCHEMA.md` | SQL CREATE TABLE statements |
| `DOCS/RLS.md` | Row-Level Security policy documentation |
| `DOCS/SETUP.md` | Supabase + Netlify setup guide |
| `DOCS/CREDENTIALS.md` | Demo credentials (internal only, not committed) |
| `.github/copilot-instructions.md` | AI assistant project context |
| `.env.example` | Environment variable template |

---

*Music Lab Tech Stack v2.0 — Updated March 2026*
