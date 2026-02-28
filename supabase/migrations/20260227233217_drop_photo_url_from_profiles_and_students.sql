-- Remove photo_url from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS photo_url;

-- Remove photo_url from students
ALTER TABLE students DROP COLUMN IF EXISTS photo_url;
