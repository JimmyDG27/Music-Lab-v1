# Music Lab

**Internal School Operations & Progress Tracking System**

A secure, role-based web application for a music school — built to replace fragmented group chats with a structured operational platform for tracking student progress, managing teacher assignments, publishing announcements, and scheduling lessons via Google Calendar.

> This is **not an LMS**. It is an internal operational progress tracking system.

---

## What It Does

| Capability | Description |
|------------|-------------|
| Student Progress | Track lessons, notes, audio/video recordings and repertoire per student |
| Role-Based Access | Teachers see only their assigned students — enforced at DB level via RLS |
| Announcements | Targeted, scheduled announcements with read tracking and comment threads |
| Google Calendar | OAuth 2.0 integration — create, edit and delete events directly from the app |
| Analytics | Admin dashboard with lesson activity heatmap, monthly trends and stats |
| Assignment Control | Primary + assistant teacher assignments with date ranges per student |
| Parent Contacts | Parent/guardian records attached to each student profile |

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — all students, teachers, data and operations |
| **Teacher** | Scoped access — only assigned students (primary or active assistant) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 · CSS3 · Vanilla JS (ES6+, ES Modules) |
| UI | Bootstrap 5.3.3 · Bootstrap Icons 1.11.3 · Inter font |
| Calendar UI | FullCalendar 6.1.15 |
| Backend | Supabase (PostgreSQL · Auth · Storage · RLS) |
| Google Integration | Google Calendar API v3 · Google Identity Services (OAuth 2.0) |
| Build | Vite |
| Deployment | Netlify (CI/CD from GitHub) |

---

## Pages & Routes

| Page | Route | Access |
|------|-------|--------|
| Login | `/src/pages/login/` | Public |
| Set Password | `/src/pages/auth/set-password.html` | Invite link only |
| Dashboard | `/src/pages/dashboard/` | All authenticated |
| Students List | `/src/pages/students/students.html` | All authenticated |
| Student Detail | `/src/pages/students/student-detail.html?id=...` | All authenticated |
| Teachers | `/src/pages/teachers/teachers.html` | All authenticated |
| Announcements | `/src/pages/announcements/announcements.html` | All authenticated |
| Announcement Detail | `/src/pages/announcements/announcement-detail.html?id=...` | All authenticated |
| Profile | `/src/pages/profile/profile.html` | All authenticated |
| Google Calendar | Offcanvas drawer (sidebar) | All authenticated |

---

## Project Structure

```
src/
  components/
    navbar.js           # Sidebar navigation (dark theme, responsive)
    toast.js            # Toast notification system
    modal.js            # Shared confirmDelete() modal
    calendarDrawer.js   # Google Calendar offcanvas (FullCalendar)
  pages/
    dashboard/
    students/
    teachers/
    announcements/
    profile/
    auth/
  services/
    supabase.js         # Supabase client
    auth.js             # Login / logout / session
    students.js         # Students, parents, assignments
    teachers.js         # Teacher management
    lessons.js          # Lessons + dashboard stats
    notes.js            # Student journal notes
    songs.js            # Repertoire
    recordings.js       # Audio/video uploads
    announcements.js    # Announcements + comments + reads
    googleCalendar.js   # Google Calendar OAuth + API
  styles/
    main.css            # Design system tokens + Bootstrap overrides
  utils/
    guards.js           # Auth + role guards
    formatters.js       # Date, bytes, datetime-local helpers
    validators.js       # Input validation
supabase/
  migrations/           # SQL migration history
DOCS/
  DATABASE_SCHEMA.md
  RLS.md
  SETUP.md
  CREDENTIALS.md
```

---

## Quick Start

### Prerequisites

- Node.js (LTS)
- A [Supabase](https://supabase.com) project with the schema applied
- A [Google Cloud](https://console.cloud.google.com) project with Calendar API enabled and an OAuth 2.0 Web Client ID

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/music-lab-v1.git
cd music-lab-v1

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your keys:
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
# VITE_GOOGLE_CLIENT_ID=

# 4. Apply database migrations
# Run the SQL files in supabase/migrations/ via the Supabase SQL editor

# 5. Start development server
npm run dev
# App available at http://localhost:5173
```

### Build & Deploy

```bash
npm run build
# Output in /dist — deploy to Netlify or any static host
```

Netlify configuration:
- **Build command:** `vite build`
- **Publish directory:** `dist`
- **Environment variables:** set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID` in the Netlify dashboard

---

## Key Features in Detail

### Google Calendar Integration
Each user independently connects their own Google account via OAuth 2.0. The connection is scoped to the Supabase user ID, preventing cross-user data leakage. Events are prefetched immediately on token acquisition to eliminate blank-flash UX.

### Role-Based Security
Access control is enforced at **two levels**: application logic (JS guards + service filters) and the database (PostgreSQL Row-Level Security policies). A teacher cannot access a student's data even if they construct a direct Supabase query — RLS blocks it.

### Assignment System
Each student has exactly one active primary teacher (DB-enforced partial unique index). Assistant teachers can be added with optional date ranges, edited, or removed by the admin.

### Soft Delete
Lessons, notes and recordings use `deleted_at` for soft deletion — data is preserved for audit purposes and never permanently removed by teachers.

### Announcements with Targeting
Admin can publish announcements to all teachers or a specific selection, with optional scheduling (`starts_at` / `ends_at`). Read tracking shows who has seen each announcement.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Product Requirements (PRD)](Music_Lab_PRD.md) | Full feature spec, UX rules, MVP scope |
| [Business Logic & DB Schema](Music_Lab_BL_&_DB.md) | Permission rules, all tables, ERD, RLS model |
| [Technology Stack](Music_Lab_TECH.md) | Architecture, design system, patterns |
| [Database Schema SQL](DOCS/DATABASE_SCHEMA.md) | CREATE TABLE statements |
| [RLS Policies](DOCS/RLS.md) | Row-Level Security documentation |
| [Setup Guide](DOCS/SETUP.md) | Supabase + Google + Netlify setup |

---

## Design System

The app uses a custom design system built on top of Bootstrap 5:

- **Brand:** Deep indigo palette — primary `#4f46e5`, buttons `#4338ca`
- **Sidebar:** Dark near-black navy (`#0a0920`) with indigo radial gradient glow
- **Active nav:** Light indigo / lavender (`#a5b4fc`)
- **Surface:** Cool off-white with subtle indigo tint (`#f4f4fd`)
- **Text:** Dark indigo-tinted near-black (`#1a1829`)
- **Font:** Inter (Google Fonts)

All design tokens are defined as CSS custom properties in `src/styles/main.css`.

---

## License

Internal use only — Music Lab Academy.
Not licensed for public distribution.
