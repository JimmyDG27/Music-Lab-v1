# Database Schema — Music Lab

All migrations are tracked in `/supabase/migrations/`.  
Apply them in order using the Supabase MCP or CLI.

---

## Tables

### `profiles`
User metadata for every `auth.users` account.

| Column       | Type        | Notes                              |
|--------------|-------------|-------------------------------------|
| id           | uuid PK     | = auth.users.id                     |
| role         | text        | `'admin'` \| `'teacher'`            |
| first_name   | text        |                                     |
| last_name    | text        |                                     |
| phone        | text?       |                                     |
| email        | text?       |                                     |
| instagram    | text?       | Instagram profile URL               |
| birth_date   | date?       |                                     |
| is_active    | boolean     | default `true`                      |
| created_at   | timestamptz | default `now()`                     |

---

### `students`

| Column      | Type        | Notes                    |
|-------------|-------------|--------------------------|
| id          | uuid PK     | gen_random_uuid()        |
| created_by  | uuid FK     | → profiles.id            |
| first_name  | text        |                          |
| last_name   | text        |                          |
| phone       | text?       |                          |
| email       | text?       |                          |
| birth_date  | date?       |                          |
| is_active   | boolean     | default `true`           |
| created_at  | timestamptz |                          |
| updated_at  | timestamptz |                          |

---

### `student_parents`

| Column     | Type    | Notes                                             |
|------------|---------|---------------------------------------------------|
| id         | uuid PK |                                                   |
| student_id | uuid FK | → students.id ON DELETE CASCADE                   |
| full_name  | text    |                                                   |
| relation   | text    | `'mother'` \| `'father'` \| `'guardian'`          |
| phone      | text?   |                                                   |
| email      | text?   |                                                   |
| occupation | text?   |                                                   |
| notes      | text?   |                                                   |
| social_links | jsonb? |                                                  |
| created_at | timestamptz |                                               |

---

### `student_teacher_assignments`

| Column     | Type        | Notes                            |
|------------|-------------|----------------------------------|
| id         | uuid PK     |                                  |
| student_id | uuid FK     | → students.id ON DELETE CASCADE  |
| teacher_id | uuid FK     | → profiles.id                    |
| role       | text        | `'primary'` \| `'assistant'`     |
| active_from | timestamptz? |                               |
| active_to  | timestamptz? |                                |
| created_by | uuid FK     | → profiles.id                    |
| created_at | timestamptz |                                  |

**Constraint:** Partial unique index on `(student_id)` WHERE `role='primary' AND active_to IS NULL` — enforces one active primary teacher per student.

**Access rule:**
- `primary` → `active_to IS NULL`
- `assistant` → `(active_from IS NULL OR now() >= active_from) AND (active_to IS NULL OR now() < active_to)`

---

### `lessons`

| Column          | Type        | Notes                           |
|-----------------|-------------|---------------------------------|
| id              | uuid PK     |                                 |
| student_id      | uuid FK     | → students.id ON DELETE CASCADE |
| teacher_id      | uuid FK     | → profiles.id                   |
| held_at         | timestamptz |                                 |
| vocal_technique | text?       |                                 |
| song_notes      | text?       |                                 |
| homework        | text?       |                                 |
| deleted_at      | timestamptz? | soft delete                    |
| created_at      | timestamptz |                                 |
| updated_at      | timestamptz |                                 |

Sorting: `ORDER BY held_at DESC`

---

### `student_notes`

| Column     | Type        | Notes                           |
|------------|-------------|---------------------------------|
| id         | uuid PK     |                                 |
| student_id | uuid FK     | → students.id ON DELETE CASCADE |
| teacher_id | uuid FK     | → profiles.id                   |
| body       | text        |                                 |
| created_at | timestamptz |                                 |
| updated_at | timestamptz |                                 |
| deleted_at | timestamptz? | soft delete                    |

Sorting: `ORDER BY created_at DESC`

---

### `recordings`

| Column      | Type        | Notes                           |
|-------------|-------------|---------------------------------|
| id          | uuid PK     |                                 |
| student_id  | uuid FK     | → students.id ON DELETE CASCADE |
| uploaded_by | uuid FK     | → profiles.id                   |
| file_path   | text        | Path in `recordings-private` bucket |
| file_name   | text        |                                 |
| mime_type   | text?       | `audio/*` or `video/*` only     |
| size_bytes  | bigint?     |                                 |
| recorded_at | timestamptz? |                                |
| note        | text?       |                                 |
| deleted_at  | timestamptz? | soft delete                    |
| created_at  | timestamptz |                                 |

Sorting: `ORDER BY recorded_at DESC`

---

### `student_songs`

| Column     | Type   | Notes                                          |
|------------|--------|------------------------------------------------|
| id         | uuid PK |                                               |
| student_id | uuid FK | → students.id ON DELETE CASCADE               |
| teacher_id | uuid FK | → profiles.id                                 |
| song_name  | text   |                                                |
| song_url   | text?  |                                                |
| lyrics_url | text?  |                                                |
| notes      | text?  |                                                |
| status     | text   | `'planned'` \| `'started'` \| `'completed'`   |
| created_at | timestamptz |                                           |

Sorting: `ORDER BY status ASC, created_at DESC`

---

### `announcements`

| Column        | Type        | Notes                                    |
|---------------|-------------|------------------------------------------|
| id            | uuid PK     |                                          |
| created_by    | uuid FK     | → profiles.id                            |
| title         | text        |                                          |
| body          | text        |                                          |
| starts_at     | timestamptz? |                                         |
| ends_at       | timestamptz? |                                         |
| image_url     | text?       |                                          |
| audience_type | text        | `'all_teachers'` \| `'selected_teachers'`|
| created_at    | timestamptz |                                          |
| updated_at    | timestamptz |                                          |

Visibility rule: `now() >= starts_at AND (ends_at IS NULL OR now() <= ends_at)`  
Sorting: `ORDER BY created_at DESC`

---

### `announcement_targets`

| Column          | Type    | Notes                                        |
|-----------------|---------|----------------------------------------------|
| id              | uuid PK |                                              |
| announcement_id | uuid FK | → announcements.id ON DELETE CASCADE         |
| teacher_id      | uuid FK | → profiles.id                                |

---

### `announcement_comments`

| Column          | Type        | Notes                                |
|-----------------|-------------|--------------------------------------|
| id              | uuid PK     |                                      |
| announcement_id | uuid FK     | → announcements.id ON DELETE CASCADE |
| author_id       | uuid FK     | → profiles.id                        |
| body            | text        |                                      |
| created_at      | timestamptz |                                      |
| updated_at      | timestamptz |                                      |
| deleted_at      | timestamptz? | soft delete                         |

---

### `announcement_reads`

| Column          | Type        | Notes                                |
|-----------------|-------------|--------------------------------------|
| id              | uuid PK     |                                      |
| announcement_id | uuid FK     | → announcements.id ON DELETE CASCADE |
| user_id         | uuid FK     | → profiles.id                        |
| read_at         | timestamptz |                                      |

---

## Indexes

```sql
CREATE INDEX ON student_teacher_assignments(student_id, teacher_id);
CREATE INDEX ON lessons(student_id, held_at DESC);
CREATE INDEX ON student_notes(student_id, created_at DESC);
CREATE INDEX ON recordings(student_id, recorded_at DESC);
CREATE INDEX ON announcements(starts_at, ends_at);
CREATE INDEX ON announcement_reads(user_id, announcement_id);
CREATE INDEX ON profiles(is_active);
```

---

## Storage

Bucket: `recordings-private` (private — no public access)  
Allowed MIME types: `audio/*`, `video/*`

---

## Migration Files

| File | Description |
|------|-------------|
| `20260224225627_create_initial_schema.sql` | Full initial schema (all tables) |
| `20260224225757_add_rls_policies.sql` | RLS policies for all tables |
| `20260224225937_fix_indexes_and_rls_performance.sql` | Performance indexes |
| `20260225180203_fix_sta_read_policy_show_all_assignments_for_assigned_students.sql` | STA SELECT policy fix |
| `20260225180323_fix_sta_read_policy_no_recursion.sql` | STA policy — recursion fix via helper function |
| `20260225214048_create_recordings_storage_bucket.sql` | Storage bucket `recordings-private` |
| `20260226015455_alter_profiles_social_links_to_text.sql` | social_links: jsonb → text |
| `20260226113803_add_announcements_schema.sql` | Announcements tables + RLS |
| `20260226114455_fix_function_search_paths.sql` | Security: pin search_path on all functions |
| `20260227202408_add_is_active_to_profiles.sql` | profiles.is_active column |
| `20260227233217_drop_photo_url_from_profiles_and_students.sql` | Remove photo_url |
| `20260227234750_rename_social_links_to_instagram_in_profiles.sql` | Rename social_links → instagram |
