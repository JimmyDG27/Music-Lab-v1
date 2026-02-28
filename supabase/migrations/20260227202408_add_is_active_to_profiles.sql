-- Add is_active flag to profiles (soft deactivation for teachers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for faster active-only queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles (is_active);
