-- ── Insert 3 new demo teachers into auth.users ───────────────────────────────
-- The handle_new_user trigger will auto-create profiles from raw_user_meta_data.

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES
  (
    '33333333-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'kristina.ivanova@musiclab.bg', '', now(),
    '2026-01-02 08:00:00+00', '2026-01-02 08:00:00+00',
    '{"provider":"email","providers":["email"]}',
    '{"role":"teacher","first_name":"Kristina","last_name":"Ivanova"}'
  ),
  (
    '33333333-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'georgi.petrov@musiclab.bg', '', now(),
    '2026-01-03 08:00:00+00', '2026-01-03 08:00:00+00',
    '{"provider":"email","providers":["email"]}',
    '{"role":"teacher","first_name":"Georgi","last_name":"Petrov"}'
  ),
  (
    '33333333-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ana.nikolova@musiclab.bg', '', now(),
    '2026-01-04 08:00:00+00', '2026-01-04 08:00:00+00',
    '{"provider":"email","providers":["email"]}',
    '{"role":"teacher","first_name":"Ana","last_name":"Nikolova"}'
  );

-- ── Update profiles with extra details (phone, birth_date) ───────────────────
UPDATE public.profiles SET
  phone      = '+359 888 300 001',
  birth_date = '1990-04-15',
  is_active  = true
WHERE id = '33333333-0000-0000-0000-000000000001';

UPDATE public.profiles SET
  phone      = '+359 888 300 002',
  birth_date = '1985-09-23',
  is_active  = true
WHERE id = '33333333-0000-0000-0000-000000000002';

UPDATE public.profiles SET
  phone      = '+359 888 300 003',
  birth_date = '1993-12-07',
  is_active  = true
WHERE id = '33333333-0000-0000-0000-000000000003';
