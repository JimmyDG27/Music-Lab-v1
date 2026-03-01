-- Reassign students, lessons, and songs from deactivated Dimitar Emilov
-- to the 3 newly added active teachers.
--
-- Viktor Popov     (22222222-...-0001) → Kristina Ivanova (33333333-...-0001)
-- Nikoleta Hristova(22222222-...-0002) → Georgi Petrov    (33333333-...-0002)
-- Boyan Angelov    (22222222-...-0003) → Ana Nikolova     (33333333-...-0003)

-- Primary assignments
INSERT INTO public.student_teacher_assignments (student_id, teacher_id, role, active_from, active_to, created_by, created_at)
VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-05 09:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000002',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-08 10:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000003',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-10 11:00:00+00'
  );

-- Lessons
UPDATE public.lessons SET teacher_id = '33333333-0000-0000-0000-000000000001'
WHERE student_id = '22222222-0000-0000-0000-000000000001';

UPDATE public.lessons SET teacher_id = '33333333-0000-0000-0000-000000000002'
WHERE student_id = '22222222-0000-0000-0000-000000000002';

UPDATE public.lessons SET teacher_id = '33333333-0000-0000-0000-000000000003'
WHERE student_id = '22222222-0000-0000-0000-000000000003';

-- Songs
UPDATE public.student_songs SET teacher_id = '33333333-0000-0000-0000-000000000001'
WHERE student_id = '22222222-0000-0000-0000-000000000001';

UPDATE public.student_songs SET teacher_id = '33333333-0000-0000-0000-000000000002'
WHERE student_id = '22222222-0000-0000-0000-000000000002';

UPDATE public.student_songs SET teacher_id = '33333333-0000-0000-0000-000000000003'
WHERE student_id = '22222222-0000-0000-0000-000000000003';
