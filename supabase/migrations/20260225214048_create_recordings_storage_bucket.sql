-- ─────────────────────────────────────────────────────────────────────────────
-- Create private Storage bucket for audio/video recordings
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings-private',
  'recordings-private',
  false,                        -- private bucket: no public URLs
  524288000,                    -- 500 MB max per file
  array['audio/*', 'video/*']  -- only audio and video allowed
)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload to their student's folder
create policy "recordings storage: authenticated can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recordings-private');

create policy "recordings storage: authenticated can read own uploads"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'recordings-private');

create policy "recordings storage: authenticated can delete own uploads"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recordings-private');
