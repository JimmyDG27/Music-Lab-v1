# PROJECT: Private School Student Progress & Operations App (MVP)

## SECTION: TECHNOLOGY STACK (COMPLETE LIST)

Purpose: Paste into project folder / documentation so every chat has the full context.

---

## 1) CORE TECHNOLOGIES (REQUIRED BY ASSIGNMENT)

### 1.1 Frontend (No frameworks)

- HTML5
- CSS3
- Custom styles + responsive rules
- JavaScript (Vanilla, ES6+)
- DOM manipulation, events
- Fetch API (async/await)
- Form handling + validation
- Multi-page structure (each page in separate file or template fragment)

### 1.2 UI / Styling

- Bootstrap (CSS + JS bundle)
- Layout: grid system, responsive utilities
- Components: navbar, dashboard, cards, tables, forms, buttons, tabs, modals
- Icons library (recommended)
- Bootstrap Icons (or equivalent lightweight icon set)

### 1.3 Backend (BaaS)

- Supabase
- Supabase Database (PostgreSQL)
- Supabase Auth (email/password, session, JWT)
- Supabase Storage (file uploads: audio/video/attachments)
- Supabase Row-Level Security (RLS) policies
- Supabase Migrations (schema changes tracked in SQL)
- (Optional, not MVP) Supabase Realtime
- (Optional, not MVP) Supabase Edge Functions

### 1.4 Build Tools

- Node.js
- npm
- Vite
- Dev server
- Bundling/build output
- Environment variables support

### 1.5 Deployment

- Netlify
- CI/CD from GitHub
- Build command: vite build
- Environment variables setup (Supabase keys)
- Static hosting

---

## 2) DEVELOPMENT TOOLING (WORKFLOW)

### 2.1 Version Control

- Git
- GitHub
- Remote repo
- Commit per working milestone

### 2.2 AI-Assisted Development

- GitHub Copilot
- Copilot Agent Instructions
- File: .github/copilot-instructions.md
- Contains:
  - project description
  - architecture rules
  - code conventions
  - UI rules
  - Supabase + RLS guidelines

### 2.3 Editor / Local Dev

- VS Code
- Recommended extensions:
  - GitHub Copilot
  - ESLint (if you add it)
  - Prettier (if you add it)

---

## 3) ARCHITECTURE / CONCEPTS (YOU MUST FOLLOW)

### 3.1 App Architecture

- Multi-Page App (MPA)
- Separate pages / routes:
  - /, /login, /dashboard, /students, /students/{id}, /teachers, /announcements,
  - /announcements/{id}
- Modular code structure (no monolith files)
  - /pages (page controllers / rendering)
  - /services (Supabase queries, auth, storage)
  - /components (header/footer/tabs/modals/toasts)
  - /utils (helpers: validators, date formatting, etc.)
  - /styles (custom CSS)

### 3.2 Separation of Concerns

- UI (HTML templates / fragments)
- Styles (CSS)
- Logic (JS)
- Data access (services calling Supabase)

### 3.3 Responsive UI

- Desktop + Mobile support
- Bootstrap grid + utilities

---

## 4) DATABASE / SECURITY TECHNOLOGIES (SUPABASE-SPECIFIC)

### 4.1 Database

- PostgreSQL (managed by Supabase)
- Schema design concepts
  - normalization
  - relationships (FKs)
  - indexing
  - constraints (CHECK, unique partial indexes)

### 4.2 Authentication & Authorization

- JWT-based sessions (Supabase Auth)
- Row-Level Security (RLS)
  - policies per table
  - access control by assignments:
    - primary / assistant teacher access
  - admin overrides

### 4.3 Storage

- Supabase Storage buckets
- audio/video uploads stored as files
- metadata stored in `recordings` table

---

## 5) UI FEATURES (IMPLEMENTATION TECH / PATTERNS)

### 5.1 Notifications

- Toast notifications
  - error toasts for failed actions
  - info toasts for non-obvious successful actions
- Unread badge mechanism
  - announcement_reads table (read tracking)

### 5.2 Dialogs / Popups

- Bootstrap modals
  - confirm delete
  - create/edit forms (songs, notes, announcements comments, etc.)

### 5.3 Tabs UI

- Bootstrap tabs (Student details page)
  - Lessons / Songs / Recordings / Notes

### 5.4 Rich Text (MVP-compatible)

- Simple approach:
  - store as plain text OR HTML-like content
  - render safely (escape if needed)
  - (Optional) lightweight editor later

---

## 6) DOCUMENTATION (REQUIRED DELIVERABLES)

- README / documentation in GitHub:
  - Project description (what it does, roles)
  - Technology stack (this file)
  - Architecture (MPA + modular folders)
  - Database schema (tables + ERD)
  - RLS overview (who can access what)
  - Local setup guide
  - Deployment guide (Netlify + env vars)
  - Demo credentials (if you provide)

---

## 7) OPTIONAL / NICE-TO-HAVE (ONLY IF TIME)

- ESLint (code quality)
- Prettier (formatting)
- Supabase Realtime (live refresh)
- Simple analytics (counts, last lesson date, etc.)

---

## 8) FILES TO INCLUDE IN PROJECT ROOT (RECOMMENDED)

- README.md
- .github/copilot-instructions.md
- supabase/migrations/*.sql
- .env.example (never commit real secrets)
- package.json
- vite.config.js
- /src (or your chosen structure)

---

END OF TECHNOLOGY STACK