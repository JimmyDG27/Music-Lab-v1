# PRODUCT REQUIREMENTS DOCUMENT (PRD) — v2.0

**Project:** Music Lab — Internal School Operations & Progress Tracking App
**Model:** Single-tenant (1 school), domain model extensible to other school types
**Architecture:** MPA (Multi-Page Application) — HTML / CSS / Vanilla JS + Supabase (DB / Auth / Storage / RLS)
**Status:** MVP Delivered

---

# PART 1 — PRODUCT VISION & FUNCTIONAL SCOPE

---

## 1. PRODUCT VISION

### 1.1 Core Objective

Music Lab is a secure internal operational system for a single music school that:

- Tracks student progress in a structured, historical way
- Centralizes lesson history, notes, recordings and repertoire per student
- Gives teachers controlled, role-based access only to their assigned students
- Replaces chaotic group messaging (Viber, WhatsApp) with structured, targeted announcements
- Integrates with Google Calendar for lesson and event scheduling
- Gives the school administrator full operational oversight and analytics

This is **not an LMS**. It is an internal operational progress tracking system.

### 1.2 Target Users

| User | Description |
|------|-------------|
| Admin | School owner / manager — full access to all data and operations |
| Teacher | Instructor — access scoped strictly to assigned students |

> Parents are **not** users in MVP. They appear only as contact records on student profiles.

---

## 2. USER ROLES & PERMISSIONS

### 2.1 Role Definitions

**Admin:**
- Full CRUD on all entities (teachers, students, parents, assignments, lessons, notes, recordings, songs, announcements)
- Soft-delete on lessons, notes, recordings
- Hard-delete on songs, parents, assignment records
- Full announcement management with scheduling and audience targeting
- Comment moderation across all announcements
- Access to admin dashboard with system-wide analytics
- Google Calendar access

**Teacher:**
- Edit own profile only (no access to other profiles)
- Read-only access to the teacher directory (contacts)
- Student visibility: **only assigned students** (primary + active assistant)
- Create/update lessons, notes, recordings, songs for assigned students
- Delete notes/recordings/songs: **primary teacher only**
- Read announcements targeted to them; full CRUD on own comments
- Google Calendar access

### 2.2 Teacher–Student Access Model

Access is controlled through the `student_teacher_assignments` table.

| Assignment Type | Condition |
|-----------------|-----------|
| `primary` | `active_to IS NULL` — permanent, no end date |
| `assistant` | `active_from IS NULL OR now() >= active_from` AND `active_to IS NULL OR now() < active_to` |

A teacher has access to a student **only if** a valid assignment record exists matching the above conditions. This rule is enforced both in RLS policies and in application service queries.

Admin bypasses all access restrictions.

### 2.3 Assignment Management (Admin)

- Add assistant teacher to a student with optional date range
- Edit assistant assignment dates (active_from / active_to)
- Delete assignment permanently
- Primary teacher is managed via the Students list reassignment flow; the delete button is intentionally hidden on the student detail Info tab

---

## 3. FUNCTIONAL MODULES

### 3.1 Authentication

- Email / password login (Supabase Auth)
- New users receive an invite link and set their own password on first login
- Role-based routing on every protected page via `authGuard()`
- Session persistence across browser tabs
- `redirectIfAuthenticated()` guard on login page

### 3.2 Dashboard

**Admin Dashboard:**
- Total Students count (with link to students list)
- Total Teachers count (with link to teachers list)
- Total Lessons count — current month vs. previous month delta
- Unread Announcements badge
- Lesson Activity by Teacher table with monthly heatmap (modal)
- Heatmap filters empty months (months with no lessons are hidden)

**Teacher Dashboard:**
- Assigned Students count
- My Lessons this month count
- Unread Announcements count
- My Lessons by Student table with monthly heatmap (modal, shows students — not teachers)
- Delta comparison vs. previous month on lesson count

### 3.3 Students Module

**Students List:**

| Role | Visibility |
|------|-----------|
| Admin | All students |
| Teacher | Assigned students only |

Table columns: Full Name · Primary Teacher · Last Lesson Date · Active Status · Actions
Default sort: Alphabetical by first name
Admin actions: Edit profile, Deactivate / Reactivate
Search: Real-time filter by name

**Student Detail (Tabbed Page):**

Tabs: **Info · Lessons · Songs · Recordings · Notes**

Default tab: Info (persisted in `sessionStorage` across same-session navigation)

### 3.4 Student Info Tab

**Assigned Teachers section:**
- Card-list layout (responsive, no table)
- Each teacher shows: name, role badge (Primary / Assistant), status badge (Active / Ended)
- For assistant teachers: date range display
- Admin actions: Edit dates (inline form), Delete assignment
- Primary teacher: no delete button (managed from Students list)
- "+ Add Assistant" collapse form with teacher select, date range

**Parent / Guardian Contacts section:**
- Cards (1 column mobile, 2 columns tablet+)
- Fields: Full Name, Relation, Phone, Email, Occupation, Notes
- Admin: inline edit form per card, delete with shared confirm modal
- "+ Add Parent" collapse form

### 3.5 Lessons

Fields: `held_at` · `vocal_technique` · `song_notes` · `homework` · `teacher`

Rules:

| Role | Create | Update | Delete |
|------|--------|--------|--------|
| Teacher (assigned) | ✓ | ✓ own | ✗ |
| Admin | ✓ | ✓ | Soft-delete only |

Sort: `held_at DESC`

### 3.6 Student Notes (Journal)

Fields: `body` · `author` · `created_at` · `updated_at`

Rules:

| Role | Create | Update | Delete |
|------|--------|--------|--------|
| Teacher (assigned) | ✓ | ✓ own | Primary teacher only |
| Admin | ✓ | ✓ | Soft-delete |

Sort: `created_at DESC`

### 3.7 Recordings (Audio / Video)

Allowed MIME types: `audio/*` · `video/*` (no PDFs, no images in MVP)

Storage: Supabase Storage private bucket `recordings-private`

Metadata fields: `file_path` · `file_name` · `mime_type` · `size_bytes` · `recorded_at` · `note`

Rules:

| Role | Upload | View | Delete |
|------|--------|------|--------|
| Teacher (assigned) | ✓ | ✓ | Primary teacher only |
| Admin | ✓ | ✓ | Soft-delete |

Sort: `recorded_at DESC`

### 3.8 Songs (Repertoire)

Fields: `song_name` · `song_url` · `lyrics_url` · `notes` · `status`

Status values: `planned` (default) → `started` → `completed`

Sort logic (special case):
1. `status ASC` (planned → started → completed)
2. `created_at DESC`

This keeps active/planned songs on top, most recently added first within each group.

Delete: Primary teacher + Admin

### 3.9 Teachers Module

**Teachers List:**

| Role | Visibility |
|------|-----------|
| Admin | All teachers with full management |
| Teacher | Read-only directory (contacts) |

Admin features: Invite new teacher (sends email invite), Edit profile, Deactivate / Reactivate
Teacher features: View contact info (phone, email, Instagram) for all colleagues
Search: Real-time filter by name
Filter: Show inactive teachers toggle

### 3.10 Profile

All authenticated users can:
- Edit own profile (first name, last name, phone, email, Instagram, birth date)
- Change password

Avatar: auto-generated color avatar from initials (deterministic color per name)

### 3.11 Announcements System

**Admin creates announcements with:**

| Field | Notes |
|-------|-------|
| `title` | Required |
| `body` | Required, plain text (pre-wrap rendered) |
| `image_url` | Optional banner image |
| `audience_type` | `all_teachers` or `selected_teachers` |
| `starts_at` | Optional — announcement visible only from this date |
| `ends_at` | Optional — announcement expires on this date |

Audience targeting: When `selected_teachers`, an `announcement_targets` record is created per selected teacher.

Visibility rule for teachers:
```
now() >= starts_at
AND (ends_at IS NULL OR now() <= ends_at)
AND teacher is in audience (all_teachers OR targeted)
```

Admin sees all announcements plus expired ones (toggle).

**Announcement List Page:**
- Cards with unread dot indicator (blue left border + dot for unread)
- Audience badge (All Teachers / Selected Teachers)
- Comment count · author · timestamp
- Search by title/body
- "Show expired" toggle (all roles)
- Admin: edit (inline collapse) and delete per card

**Announcement Detail Page:**
- Full body, banner image if present, date range if set
- Audience badge + meta
- Admin: Edit form (collapse) + Delete
- Comment thread (all authenticated users)

### 3.12 Announcement Comments

| Role | Create | Update | Delete |
|------|--------|--------|--------|
| Teacher | ✓ own | ✓ own | ✓ own (inline) |
| Admin | ✓ | ✓ any | ✓ any |

- Inline edit: click edit icon → textarea replaces body in-place
- Avatar with deterministic color per author name
- "You" badge on own comments
- "edited" label if `updated_at ≠ created_at`

### 3.13 Read / Unread Tracking

Table: `announcement_reads`

- On opening announcement detail: `markAsRead()` is called (fire-and-forget)
- Unread count: visible announcements minus rows in `announcement_reads` for current user
- RLS scopes `announcement_reads` to the current user — empty result = unread

### 3.14 Google Calendar Integration

Available to: **Admin + Teacher** (all authenticated roles)

**Connection flow:**
1. User clicks Calendar in sidebar → opens off-canvas drawer
2. First visit: "Connect Google Calendar" button
3. OAuth 2.0 consent (Google Identity Services) — requests `calendar`, `calendar.events`, `email`, `profile` scopes
4. On success: access token cached in `sessionStorage`; connected email stored in `localStorage` scoped to the Supabase user ID
5. If a different Supabase user logs in, their previous Google connection is automatically cleared

**Calendar drawer features:**
- Weekly calendar (FullCalendar 6.1.15) — `timeGridWeek` on desktop, `timeGridDay` on mobile
- Bulgarian locale, Monday-first week
- Create event: click empty slot → modal form (title, date, start/end time, optional description)
- Edit event: click existing event → same modal pre-filled
- Delete event: from event modal with shared confirm dialog
- Disconnect calendar: removes token + email from storage
- Event cache: results cached by date range, cleared on create/update/delete
- Prefetch: current week events are fetched immediately on token acquisition (before FullCalendar renders) — eliminates blank-flash UX issue
- Error handling: `TOKEN_EXPIRED` → auto re-consent; `INSUFFICIENT_SCOPES` → force re-consent with correct scopes

---

## 4. SHARED UI PATTERNS

### 4.1 Delete Confirmation Modal

All delete operations use a single shared `confirmDelete()` component (`src/components/modal.js`):
- Returns `Promise<boolean>`
- Custom title, message and confirm button label per call
- Single DOM instance reused across all pages
- Consistent visual design (trash icon, red confirm button)

Replaces: all native `window.confirm()` calls and individual Bootstrap delete modals throughout the app.

### 4.2 Toast Notifications

All success / error / warning states surface as toast notifications (bottom-right):
- Types: `success` · `danger` · `warning` · `info`
- White card with colored left border (4px)
- Auto-dismiss after 4 seconds

### 4.3 Inline Forms (Collapse Panels)

Add/Edit forms throughout the app use Bootstrap collapse panels with the `.ml-inline-form` class:
- Appear inline below the relevant section header
- Cancel button collapses + resets the form
- Loading spinner on submit button while async operation runs
- Inline error alert below form on failure

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Security

- RLS enabled on all domain tables (enforced at database level)
- Admin override policies via `is_admin()` DB helper
- Teacher access validated via `is_teacher_assigned_to_student()` DB helper
- Storage bucket private — file access requires authenticated session
- `service_role` key never exposed to frontend
- Google OAuth tokens stored only in `sessionStorage` (cleared on tab close)
- Google Calendar connection scoped to Supabase user ID to prevent cross-user leakage

### 5.2 Data Integrity

- One active primary teacher per student (partial unique index on `student_teacher_assignments`)
- All FKs with `ON DELETE CASCADE` for child records
- Soft delete pattern for lessons, notes, recordings (audit trail preserved)
- Hard delete for songs, parents, assignment records (admin controlled)

### 5.3 Responsive Design

- Full mobile support (375px+)
- Sidebar collapses to offcanvas on mobile (hamburger trigger)
- Tables replaced with card-list layouts where needed (student Info tab teachers list, dashboard heatmap adjusts on mobile)
- All forms and modals are mobile-friendly

### 5.4 Performance

- Event prefetching for Google Calendar (current week fetched immediately)
- Dashboard stats: parallel async calls where data is independent
- Monthly heatmap modal: empty months are filtered out (no dead columns)

### 5.5 UX Standards

- Empty states with descriptive message + icon on every data-empty section
- Loading spinners on initial page load and on async form submits
- Tab state persistence (student detail tabs survive back navigation in same session)
- Back navigation link on all detail pages

---

## 6. SUCCESS METRICS (MVP)

- % teachers active weekly (login + lesson creation)
- Lessons logged per week
- Recording uploads per week
- Announcement read rate within 48h
- Admin operational confidence (qualitative — replaces Viber)

---

## 7. DOMAIN EXTENSIBILITY

The data model is intentionally generic:

| Current (Music School) | Future pivot |
|------------------------|-------------|
| Student Songs | Topics (Math) / Texts (Language) |
| Lesson fields (vocal_technique, song_notes) | Extendable custom fields |
| Teacher/Student roles | Any tutoring domain |

No multi-tenant complexity in MVP. Single `school_id` column can be added to each table when scaling to multiple schools.

---

## 8. MVP SCOPE — FINAL

**Included:**

| Module | Status |
|--------|--------|
| Auth (login, invite, set-password) | ✅ Delivered |
| Dashboard (admin + teacher, analytics) | ✅ Delivered |
| Students list + detail (5 tabs) | ✅ Delivered |
| Lessons | ✅ Delivered |
| Student Notes (journal) | ✅ Delivered |
| Recordings (audio/video) | ✅ Delivered |
| Songs / Repertoire | ✅ Delivered |
| Teacher directory + management | ✅ Delivered |
| Announcements (targeted + scheduling + read tracking) | ✅ Delivered |
| Announcement comments | ✅ Delivered |
| Google Calendar (OAuth + CRUD) | ✅ Delivered |
| Profile editing | ✅ Delivered |
| Shared delete confirmation modal | ✅ Delivered |
| Responsive mobile design | ✅ Delivered |

**Excluded (Post-MVP):**

| Feature |
|---------|
| Parent login / parent-facing portal |
| Payment tracking |
| In-app messaging / chat |
| Multi-tenant architecture |
| Rich text editor (WYSIWYG) |
| Public-facing pages |
| Supabase Realtime (live refresh) |
| Native mobile app |

---

*Music Lab PRD v2.0 — Updated March 2026*
