-- ─────────────────────────────────────────────────────────────────────────────
-- Fix function search paths for security
-- All SECURITY DEFINER functions must pin search_path to prevent
-- search_path injection attacks.
-- ─────────────────────────────────────────────────────────────────────────────

-- Re-create is_admin() with explicit search_path
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Re-create handle_new_user() with explicit search_path (already had it, ensure consistency)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  return new;
end;
$$;

-- Re-create set_updated_at() with explicit search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
