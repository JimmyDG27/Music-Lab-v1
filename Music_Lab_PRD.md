# PRODUCT REQUIREMENTS DOCUMENT (PRD) — v1.0 (Locked Scope)

Project: School Internal Progress & Operations App (MVP)  
Model: Single-tenant (1 school), extensible for other school types  
Architecture: MPA (HTML/CSS/Vanilla JS) + Supabase (DB/Auth/Storage/RLS)

==================================================================

# PART 1 — PRODUCT VISION, FUNCTIONAL SCOPE, USER EXPERIENCE

==================================================================

## 1. PRODUCT VISION

### 1.1 Core Objective

To build a secure internal operational system for a single school that:

• Tracks student progress structurally  
• Centralizes lesson history, notes, recordings, repertoire  
• Enables controlled teacher access via role assignments  
• Replaces chaotic messaging (e.g. Viber) with structured announcements  
• Gives admin full operational oversight  

The product is single-tenant (1 school), but the domain model is designed to be  
reusable across different school types (music, math, language, etc.) with minimal  
structural changes.

The system is not an LMS. It is an operational progress tracking system.

------------------------------------------------------------

## 2. USER ROLES & PERMISSIONS

### 2.1 Roles

• Admin  
• Teacher  

Parents are NOT users in MVP (contact-only records).

------------------------------------------------------------

### 2.2 Teacher–Student Access Model

Access is controlled through:

student_teacher_assignments

Assignment types:

• primary → permanent (no active_to)  
• assistant → time-bounded (active_from / active_to)  

Teacher has access to a student only if:

primary AND active_to IS NULL  
OR  
assistant AND  
(active_from IS NULL OR now() >= active_from)  
AND (active_to IS NULL OR now() < active_to)  

This rule applies consistently across:

• Students  
• Lessons  
• Notes  
• Recordings  
• Songs  

Admin bypasses all restrictions.

------------------------------------------------------------

## 3. FUNCTIONAL MODULES

### 3.1 Authentication

• Email/password login (Supabase Auth)  
• Role-based routing  
• Session persistence  
• Page guards  

------------------------------------------------------------

### 3.2 Dashboard

Teacher Dashboard:

• Assigned students count  
• Unread announcements badge  
• Quick access links  

Admin Dashboard:

• Total students  
• Total teachers  
• Unread announcements summary  

------------------------------------------------------------

### 3.3 Students Module

Students List:

Admin:  
• Sees all students  

Teacher:  
• Sees only assigned students  

Columns:

• Full Name  
• Primary Teacher  
• Last Lesson Date  
• Status (active/inactive)  
• Actions  

Default sorting:

• Alphabetical by last_name  

------------------------------------------------------------

### 3.4 Student Details (Core Area)

Tabs:

• Overview  
• Lessons  
• Songs  
• Recordings  
• Notes  

Default sorting (system-wide rule):

• Latest first (DESC by created_at or held_at)

Applies to:

Lessons  
Notes  
Recordings  
Announcements  

Songs is the only exception (see below).

------------------------------------------------------------

### 3.5 Lessons

Fields:

• held_at  
• vocal_technique  
• song_notes  
• homework  

Rules:

Teacher:  
• Create  
• Update  
• NO delete  

Admin:  
• Soft delete (deleted_at)  

Sorting:

ORDER BY held_at DESC  

------------------------------------------------------------

### 3.6 Student Notes (Journal)

Fields:

• body  
• author_id  
• created_at  
• updated_at  
• deleted_at (soft delete recommended)  

Rules:

Teacher:  
• Create / Update  
• Delete only if Primary teacher  

Admin:  
• Full control  

Sorting:

ORDER BY created_at DESC  

------------------------------------------------------------

### 3.7 Recordings (Audio/Video Only)

Allowed types:

• audio/*  
• video/*  

No PDFs, no images in MVP.

Storage:

Supabase Storage bucket (private)

Metadata fields:

• file_path  
• file_name  
• mime_type  
• size_bytes  
• recorded_at  
• note  

Rules:

Teacher:  
• Upload  
• View  
• Delete only if Primary  

Admin:  
• Full control  

Sorting:

ORDER BY recorded_at DESC  

------------------------------------------------------------

### 3.8 Songs (Repertoire)

Fields:

• song_name (e.g. "APT — Bruno Mars")  
• song_url  
• lyrics_url  
• notes  
• status:  
- planned (default)  
- started  
- completed  

Sorting logic (special case):

Default sorting:  
1. status ASC (planned → started → completed)  
2. created_at DESC  

This ensures:

• Planned songs stay visible on top  
• Recently added songs appear first within status group  

Deletion:

Primary teacher + Admin  

------------------------------------------------------------

### 3.9 Announcements System

Admin creates announcement:

Fields:

• title  
• body  
• image_url (optional)  
• audience_type:  
- all_teachers  
- selected_teachers  
• starts_at  
• ends_at  

Filtering logic (confirmed requirement):

An announcement is visible only if:

now() >= starts_at  
AND (ends_at IS NULL OR now() <= ends_at)  

Teachers only see announcements they are targeted in.

------------------------------------------------------------

### 3.10 Announcement Comments

Teachers:

• CRUD only their own comments  

Admin:

• Full moderation  
• Soft delete (deleted_at)  

------------------------------------------------------------

### 3.11 Read / Unread Tracking

Table:

announcement_reads

On opening announcement detail:

Insert read_at if not exists

Unread count:

Visible announcements  
MINUS  
announcement_reads where user_id = current user  

------------------------------------------------------------

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Security

• RLS enabled on all domain tables  
• Admin override policies  
• Storage bucket private  
• File access validated against student_id permissions  

### 4.2 Data Integrity

• One active primary teacher per student (partial unique index)  
• FK constraints with ON DELETE CASCADE  
• Soft delete consistency  

### 4.3 UX Standards

• Bootstrap tabs  
• Bootstrap modals  
• Toast notifications  
• Clear empty states  
• Mobile responsive  

------------------------------------------------------------

## 5. SUCCESS METRICS (MVP)

• % teachers active weekly  
• Lessons created per week  
• Recording uploads per week  
• Announcement read rate within 48h  
• Admin visibility satisfaction (qualitative)  

------------------------------------------------------------

## 6. DOMAIN EXTENSIBILITY STRATEGY

Although MVP is for one school:

Design considerations:

• Avoid music-specific naming in core logic  
• Keep lesson fields extensible  
• Songs table can later become “materials” or “topics”  

Future pivot examples:

Music School → keep Songs  
Math School → rename Songs → Topics  
Language School → Songs → Texts / Units  

No multi-tenant complexity in MVP.

==================================================================

# PART 2 — TECHNICAL ARCHITECTURE, DATA MODEL, SECURITY, DELIVERY

==================================================================

## 1. TECH STACK

Frontend:

• HTML5  
• CSS3  
• Vanilla JS (ES6+)  
• Bootstrap 5  

Backend:

• Supabase  
- PostgreSQL  
- Auth  
- Storage  
- RLS  

Tooling:

• Vite  
• Node.js  
• GitHub  
• Netlify (deployment)  

------------------------------------------------------------

## 2. DATABASE MODEL (Authoritative)

Core Tables:

• profiles  
• students  
• student_parents  
• student_teacher_assignments  
• lessons  
• student_notes  
• recordings  
• student_songs  
• announcements  
• announcement_targets  
• announcement_comments  
• announcement_reads  

All primary keys:

UUID default gen_random_uuid()

All timestamps:

timestamptz default now()

------------------------------------------------------------

## 3. RLS POLICY REQUIREMENTS

Global:

Enable RLS on all tables except public safe metadata if any.

Role logic:

profiles.role determines permission branch.

Teacher access:

Exists active assignment for student.

Admin:

Full access via policy OR role check.

Storage access:

Validate user has access to student tied to file_path.

------------------------------------------------------------

## 4. STORAGE CONFIGURATION

Bucket:

recordings-private

Rules:

Only authenticated users.  
Additional row-level logic via metadata validation.

File validation:

mime_type LIKE 'audio/%'  
OR mime_type LIKE 'video/%'

------------------------------------------------------------

## 5. PERFORMANCE STRATEGY

Indexes required:

• student_teacher_assignments(student_id, teacher_id)  
• lessons(student_id, held_at DESC)  
• student_notes(student_id, created_at DESC)  
• recordings(student_id, recorded_at DESC)  
• announcements(starts_at, ends_at)  
• announcement_reads(user_id, announcement_id)  

------------------------------------------------------------

## 6. DEFAULT SORTING RULES (GLOBAL CONSISTENCY)

Lessons:  
held_at DESC  

Notes:  
created_at DESC  

Recordings:  
recorded_at DESC  

Announcements:  
created_at DESC  

Songs:  
status ASC,  
created_at DESC  

------------------------------------------------------------

## 7. DEPLOYMENT REQUIREMENTS

Netlify:

• Build command: vite build  
• Publish directory: dist  
• Environment variables:  
SUPABASE_URL  
SUPABASE_ANON_KEY  

Repository must include:

• README.md  
• Database schema SQL  
• RLS documentation section  
• Setup guide  
• .env.example  

------------------------------------------------------------

## 8. RISKS

• RLS misconfiguration exposing data  
• Storage access loopholes  
• Assignment logic edge cases  
• Soft delete inconsistencies  
• Scope creep toward LMS  

------------------------------------------------------------

## 9. FINAL LOCKED MVP DEFINITION

MVP includes:

✔ Auth  
✔ Students list + detail  
✔ Lessons  
✔ Notes  
✔ Recordings (audio/video only)  
✔ Songs (with status logic)  
✔ Announcements (targeted + scheduling + read tracking)  
✔ Strict role-based access via assignments  

MVP excludes:

✘ Parent login  
✘ Payments  
✘ Chat  
✘ Multi-tenant architecture  
✘ Advanced rich text editor  
✘ Public pages  

------------------------------------------------------------

END OF PRD v1.0