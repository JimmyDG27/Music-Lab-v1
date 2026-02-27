# PROJECT: Private School Student Progress & Operations App (MVP)
STACK (per requirements): HTML/CSS/JS + Bootstrap + Vite + Supabase  
(DB/Auth/Storage) + Netlify

============================================================
## 1) BUSINESS LOGIC (END-TO-END)
============================================================

### 1.1 Core Goal
- Centralize monitoring of:
  - student progress (lessons, notes, recordings, repertoire)
  - teacher work visibility (admin oversight)
  - internal announcements (organized, non-Viber)

### 1.2 Roles (Auth)
- Admin
- Teacher

### 1.3 Teacher ↔ Student Access Model (Assignments)
- Every Student can be assigned to Teachers via assignments:
  - Primary: no end date; always has access
  - Assistant: active_from/active_to; active until admin stops it (sets active_to)

Access rule (conceptual):
- A Teacher has access to a Student if there exists an assignment record:
  - role='primary' AND active_to IS NULL
  OR
  - role='assistant' AND (active_to IS NULL OR now() < active_to)
                       AND (active_from IS NULL OR now() >= active_from)

### 1.4 Permissions Summary

#### ADMIN
- Full CRUD on:
  - teachers (profiles)
  - students
  - parents
  - assignments
  - lessons (soft delete only)
  - student notes (primary + admin delete rule still holds, but admin always can)
  - recordings (storage + metadata)
  - announcements (and their targets, comments moderation, read tracking)
  - student songs (repertoire)

#### TEACHER (general)
- Edit own profile
- Read-only teacher directory (see all teachers contacts)
- Student visibility: only assigned (Primary + active Assistant)
- Contacts visibility: sees ALL important parent contacts for assigned students (read-only)

- Lessons:
  - create/update for assigned students
  - delete: NO (admin soft-delete only)

- Student Notes (journal):
  - create/update for assigned students
  - delete: only Primary teacher + Admin

- Recordings:
  - upload/view for assigned students
  - delete: Primary teacher + Admin

- Announcements:
  - read if audience includes teacher
  - comment CRUD only own comments
  - admin moderates all comments

- Student Songs tab (repertoire):
  - create/update for assigned students
  - delete: Primary teacher + Admin (recommended; can be adjusted)

### 1.5 Student Page UX (MPA)
- /students/{id}
  - Header: name + key info
  - Tabs:
    - Overview (student + parents contacts)
    - Lessons
    - Songs (repertoire)
    - Recordings
    - Notes (journal)

### 1.6 Navigation (Pages)
- / (Landing)
- /login (Register/Login)
- /dashboard (assigned student count + unread announcements)
- /students (table: name | primary teacher | last lesson date | actions)
- /students/{id} (tabs page)
- /teachers (directory)
- /announcements (list)
- /announcements/{id} (detail + comments)

============================================================
## 2) DATA MODEL (TABLES) — FINAL
============================================================

Legend:
- UUID PK: uuid primary key default gen_random_uuid()
- Timestamps: timestamptz default now()

### 2.1 Supabase Auth
- auth.users (built-in)

### 2.2 profiles (users metadata + role)
- id (uuid, PK) = auth.users.id
- role (text) values: 'admin' | 'teacher'
- first_name (text)
- last_name (text)
- phone (text, nullable)
- email (text, nullable)
- social_links (text, nullable)
- birth_date (date, nullable)
- created_at (timestamptz)

### 2.3 students
- id (uuid, PK)
- created_by (uuid, FK -> profiles.id) // admin who created
- first_name (text)
- last_name (text)
- phone (text, nullable)
- email (text, nullable)
- birth_date (date, nullable)
- is_active (boolean default true)
- created_at (timestamptz)
- updated_at (timestamptz)

### 2.4 student_parents (usually 2)
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- full_name (text)
- relation (text) values: 'mother' | 'father' | 'guardian'
- phone (text, nullable)
- email (text, nullable)
- occupation (text, nullable)
- notes (text, nullable)
- social_links (jsonb, nullable)
- created_at (timestamptz)

### 2.5 student_teacher_assignments
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- teacher_id (uuid, FK -> profiles.id)
- role (text) values: 'primary' | 'assistant'
- active_from (timestamptz, nullable)
- active_to (timestamptz, nullable)
- created_by (uuid, FK -> profiles.id)
- created_at (timestamptz)

Constraint recommendation:
- One active primary per student:
  - unique partial index on (student_id) where role='primary' AND active_to IS NULL

### 2.6 lessons
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- teacher_id (uuid, FK -> profiles.id)
- held_at (timestamptz)
- vocal_technique (text, nullable)
- song_notes (text, nullable)
- homework (text, nullable)
- deleted_at (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

### 2.7 student_notes
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- teacher_id (uuid, FK -> profiles.id)
- body (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, nullable)

Delete rule:
- Teacher delete allowed only if teacher is Primary for that student; admin always allowed.

### 2.8 recordings
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- uploaded_by (uuid, FK -> profiles.id)
- file_path (text)
- file_name (text)
- mime_type (text, nullable)
- size_bytes (bigint, nullable)
- recorded_at (timestamptz, nullable)
- note (text, nullable)
- deleted_at (timestamptz, nullable)
- created_at (timestamptz)

Delete rule:
- Primary teacher + admin

### 2.9 student_songs
- id (uuid, PK)
- student_id (uuid, FK -> students.id ON DELETE CASCADE)
- teacher_id (uuid, FK -> profiles.id)
- song_name (text)
- song_url (text, nullable)
- lyrics_url (text, nullable)
- notes (text, nullable)
- status (text NOT NULL DEFAULT 'planned')
  allowed: 'planned' | 'started' | 'completed'
- created_at (timestamptz)

### 2.10 announcements
- id (uuid, PK)
- created_by (uuid, FK -> profiles.id)
- title (text)
- body (text)
- starts_at (timestamptz, nullable)
- ends_at (timestamptz, nullable)
- image_url (text, nullable)
- audience_type (text) values: 'all_teachers' | 'selected_teachers'
- created_at (timestamptz)
- updated_at (timestamptz)

### 2.11 announcement_targets
- id (uuid, PK)
- announcement_id (uuid, FK -> announcements.id ON DELETE CASCADE)
- teacher_id (uuid, FK -> profiles.id)

### 2.12 announcement_comments
- id (uuid, PK)
- announcement_id (uuid, FK -> announcements.id ON DELETE CASCADE)
- author_id (uuid, FK -> profiles.id)
- body (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, nullable)

### 2.13 announcement_reads
- id (uuid, PK)
- announcement_id (uuid, FK -> announcements.id ON DELETE CASCADE)
- user_id (uuid, FK -> profiles.id)
- read_at (timestamptz)

============================================================
## 3) DB RELATIONSHIPS SUMMARY
============================================================

- profiles (teacher/admin) 1..* assignments
- students 1..* assignments
- students 1..* parents
- students 1..* lessons
- students 1..* notes
- students 1..* recordings
- students 1..* student_songs
- announcements 1..* comments
- announcements 0..* targets
- announcements 0..* reads

============================================================
## 4) ERD (MERMAID)
============================================================

```mermaid
erDiagram
  PROFILES ||--o{ STUDENT_TEACHER_ASSIGNMENTS : assigns
  STUDENTS ||--o{ STUDENT_TEACHER_ASSIGNMENTS : has
  STUDENTS ||--o{ STUDENT_PARENTS : has
  STUDENTS ||--o{ LESSONS : has
  STUDENTS ||--o{ STUDENT_NOTES : has
  STUDENTS ||--o{ RECORDINGS : has
  STUDENTS ||--o{ STUDENT_SONGS : has
  PROFILES ||--o{ LESSONS : conducts
  PROFILES ||--o{ STUDENT_NOTES : writes
  PROFILES ||--o{ RECORDINGS : uploads
  PROFILES ||--o{ STUDENT_SONGS : adds
  PROFILES ||--o{ ANNOUNCEMENTS : creates
  ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_TARGETS : targets
  ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_COMMENTS : has
  ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_READS : read_by
  PROFILES ||--o{ ANNOUNCEMENT_COMMENTS : writes
  PROFILES ||--o{ ANNOUNCEMENT_READS : reads