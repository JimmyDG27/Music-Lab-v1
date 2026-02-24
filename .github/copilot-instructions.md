# Copilot Instructions — Music Lab (MPA + Supabase)

You are coding an internal school operations / progress tracking app (MVP).
Single-tenant. NOT an LMS.

---

# Source of Truth (READ FIRST)

Before generating or modifying code, always align with:

- docs/PRD.md
- docs/TECH_STACK.md
- docs/BUSINESS_LOGIC.md

These documents define:
- Roles and permissions
- Database schema
- Sorting rules
- Storage rules
- Access control model
- Architectural constraints

Never invent fields, rules, or behaviors that contradict these documents.

---

# Core Architecture Rules (DO NOT VIOLATE)

- Architecture: MPA (HTML/CSS/Vanilla JS) + Bootstrap + Vite + Supabase.
- This is NOT an SPA. Do NOT introduce SPA routers or frameworks.
- Routing is based on `window.location.pathname`.
- No frontend frameworks (React/Vue/etc).
- Keep the project modular and readable.

Folder structure must remain:

- `src/pages`
- `src/services`
- `src/components`
- `src/utils`
- `src/styles`

No giant monolithic scripts.

---

# Roles & Access Control

Roles:
- Admin
- Teacher

Enforce strictly:

- Teacher access ONLY through `student_teacher_assignments` rule described in PRD.
- Never implement permissions via client-side filtering.
- Supabase RLS policies are the authority.

Admin:
- Full access (as defined in PRD)

Teacher:
- Access only to assigned students
- Assignment logic must match PRD exactly:
  - primary: active_to IS NULL
  - assistant: active_from/active_to window logic

---

# Routing & Guards (MPA Specific)

- Protected routes:
  - /dashboard
  - /students
  - /students/{id}
  - /teachers
  - /announcements
  - /announcements/{id}

- Public routes:
  - /
  - /login

Rules:
- If no session → redirect to /login
- After successful login → redirect to /dashboard
- Enforce role-based access where required

---

# Data & Sorting Rules

Global default sorting:
- Latest first (DESC by created_at or held_at)

Exceptions:
- Songs:
  - status ASC
  - created_at DESC

Never change sorting behavior unless PRD explicitly changes.

---

# Recordings Rules

- Only allow:
  - audio/*
  - video/*
- No PDFs
- No images
- Storage bucket must be private (e.g. recordings-private)
- Never make recordings public
- File access must be validated against student permissions

---

# Soft Delete Rules

- Lessons:
  - Admin performs soft delete via `deleted_at`
  - Never hard delete lessons
- Lists must filter `deleted_at IS NULL` by default
- Notes/comments soft delete if defined in PRD

---

# Database & RLS Rules

- RLS must be enabled on all domain tables
- All policies must match PRD access model
- Do NOT suggest bypassing RLS in frontend logic
- All queries must work under RLS constraints

---

# Database Migrations Workflow

Schema changes must follow this process:

1. Never modify schema manually in Supabase UI.
2. Every schema change must be a new SQL file in:
   `/supabase/migrations`
3. Migrations are the source of truth.
4. Prefer applying and verifying migrations via Supabase MCP.
5. If MCP is unavailable, use CLI-based migration workflow.
6. Never rely on manual SQL edits in the dashboard.
7. After applying a migration:
   - Verify tables, columns, indexes exist
   - Confirm RLS policies exist
8. Instruct the user to commit migration file with descriptive message:
   e.g. `git commit -m "db: add announcements schema"`

---

# Services Layer Rules

- Pages must NEVER call Supabase directly.
- All DB/Auth/Storage calls must go through `src/services`.
- Services return:
  - data
  - standardized error

Keep business logic out of UI components.

---

# UI Standards

Every async action must include:
- Loading state
- Error toast
- Success toast (where appropriate)

Deletions:
- Always use confirmation modal

Lists:
- Always show empty state
- Never render silent blank tables

---

# Coding Conventions

- Prefer explicit and readable code over cleverness
- Follow exact field naming from PRD:
  - lessons: held_at, vocal_technique, song_notes, homework
  - songs: song_name, song_url, lyrics_url, notes, status
  - announcements: starts_at, ends_at, audience_type
- Do not invent alternative names

Dates:
- Centralize formatting in `src/utils`
- Sort by raw timestamp, display formatted values

---

# When Uncertain

If behavior is unclear:

- Do NOT guess
- Either:
  - Ask for clarification
  - Or add a TODO with explicit reference to relevant docs file and section

Never silently assume new business rules.

---

# Commit Discipline

- One commit per milestone
- Keep commits small and focused
- Use prefixes:
  - chore:
  - feat:
  - fix:
  - db:
  - refactor:

---

END OF INSTRUCTIONS