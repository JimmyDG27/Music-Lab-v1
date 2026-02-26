-- Alter profiles.social_links from jsonb → text.
-- The column was changed directly in the Supabase dashboard; this migration
-- captures the drift so the migrations folder stays the source of truth.
alter table public.profiles
  alter column social_links type text using social_links::text;
