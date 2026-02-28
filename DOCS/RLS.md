# Row-Level Security (RLS) Policies — Music Lab

RLS is enabled on **all** public tables.  
Role is determined by `profiles.role` (`'admin'` or `'teacher'`).  
All policies use a helper that reads the current user's role from the `profiles` table.

---

## Helper Functions

```sql
-- Returns true if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Returns true if teacher has any active assignment for a given student
-- SECURITY DEFINER prevents infinite recursion in STA RLS policy
CREATE OR REPLACE FUNCTION is_teacher_assigned_to_student(
  p_teacher_id uuid,
  p_student_id uuid
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_teacher_assignments
    WHERE student_id = p_student_id
      AND teacher_id = p_teacher_id
      AND (active_to IS NULL OR now() < active_to)
  );
$$;
```

---

## Table Policies

### `profiles`

| Operation | Who          | Condition                                 |
|-----------|--------------|-------------------------------------------|
| SELECT    | Authenticated | Own row OR admin                         |
| UPDATE    | Authenticated | Own row only                              |
| INSERT    | System only  | Via auth trigger (on auth.users insert)   |
| DELETE    | Admin only   |                                           |

---

### `students`

| Operation | Who     | Condition                                              |
|-----------|---------|--------------------------------------------------------|
| SELECT    | Admin   | All rows                                               |
| SELECT    | Teacher | Only students with an active assignment to this teacher|
| INSERT    | Admin   | Always                                                 |
| UPDATE    | Admin   | Always                                                 |
| DELETE    | Admin   | Always (hard delete disabled in practice)              |

Teacher SELECT condition:
```sql
EXISTS (
  SELECT 1 FROM student_teacher_assignments sta
  WHERE sta.student_id = students.id
    AND sta.teacher_id = auth.uid()
    AND (
      (sta.role = 'primary' AND sta.active_to IS NULL)
      OR (
        sta.role = 'assistant'
        AND (sta.active_from IS NULL OR now() >= sta.active_from)
        AND (sta.active_to IS NULL OR now() < sta.active_to)
      )
    )
)
```

---

### `student_parents`

Same access rule as `students` — teacher can read parents only for assigned students.

---

### `student_teacher_assignments`

| Operation | Who     | Condition                    |
|-----------|---------|------------------------------|
| SELECT    | Admin   | All rows                     |
| SELECT    | Teacher | Rows where teacher_id = auth.uid() |
| INSERT    | Admin   | Always                       |
| UPDATE    | Admin   | Always                       |
| DELETE    | Admin   | Always                       |

---

### `lessons`

| Operation | Who     | Condition                                         |
|-----------|---------|---------------------------------------------------|
| SELECT    | Admin   | All (excluding deleted_at IS NOT NULL optionally) |
| SELECT    | Teacher | Assigned students only + deleted_at IS NULL       |
| INSERT    | Teacher | Assigned students only                            |
| UPDATE    | Teacher | Own lessons (teacher_id = auth.uid())             |
| DELETE    | **Blocked** | Soft delete via admin only (sets deleted_at)   |
| UPDATE    | Admin   | Can set deleted_at (soft delete)                  |

---

### `student_notes`

| Operation | Who              | Condition                             |
|-----------|------------------|---------------------------------------|
| SELECT    | Admin            | All                                   |
| SELECT    | Teacher          | Assigned students only                |
| INSERT    | Teacher          | Assigned students only                |
| UPDATE    | Teacher          | Own notes only                        |
| DELETE    | Primary teacher  | Only if primary for this student      |
| DELETE    | Admin            | Always                                |

---

### `recordings`

| Operation | Who              | Condition                             |
|-----------|------------------|---------------------------------------|
| SELECT    | Admin            | All                                   |
| SELECT    | Teacher          | Assigned students only                |
| INSERT    | Teacher          | Assigned students only                |
| DELETE    | Primary teacher  | Only if primary for this student      |
| DELETE    | Admin            | Always                                |

Storage bucket `recordings-private` is private — all access requires authentication.

---

### `student_songs`

| Operation | Who              | Condition                             |
|-----------|------------------|---------------------------------------|
| SELECT    | Admin            | All                                   |
| SELECT    | Teacher          | Assigned students only                |
| INSERT    | Teacher          | Assigned students only                |
| UPDATE    | Teacher          | Assigned students only                |
| DELETE    | Primary teacher  | Only if primary for this student      |
| DELETE    | Admin            | Always                                |

---

### `announcements`

| Operation | Who     | Condition                                                       |
|-----------|---------|-----------------------------------------------------------------|
| SELECT    | Admin   | All                                                             |
| SELECT    | Teacher | audience_type = 'all_teachers' OR exists in announcement_targets |
| INSERT    | Admin   | Always                                                          |
| UPDATE    | Admin   | Always                                                          |
| DELETE    | Admin   | Always                                                          |

---

### `announcement_targets`

| Operation | Who     | Condition        |
|-----------|---------|------------------|
| SELECT    | Admin   | All              |
| SELECT    | Teacher | Own teacher_id   |
| INSERT    | Admin   | Always           |
| DELETE    | Admin   | Always           |

---

### `announcement_comments`

| Operation | Who     | Condition                 |
|-----------|---------|---------------------------|
| SELECT    | All     | Where deleted_at IS NULL  |
| INSERT    | Teacher | Own comments only         |
| UPDATE    | Teacher | Own comments only         |
| DELETE    | Teacher | Own comments only         |
| DELETE    | Admin   | Always (moderation)       |

---

### `announcement_reads`

| Operation | Who          | Condition              |
|-----------|--------------|------------------------|
| SELECT    | Authenticated | Own rows (user_id = auth.uid()) |
| INSERT    | Authenticated | Own rows only          |
| DELETE    | —            | Not allowed            |

---

## Key Security Principles

1. **Never bypass RLS on the frontend** — all filtering is enforced at the DB level
2. **Admin uses service_role key only in Edge Functions** — never expose it to the client
3. **Storage bucket is private** — no public URLs; signed URLs must be generated server-side
4. **Soft deletes** — lessons and notes are soft-deleted (`deleted_at`), never hard deleted by teachers
5. **Invitation flow** — new teachers are created via `invite-teacher` Edge Function (service_role) with `verify_jwt: false` + custom auth check inside
