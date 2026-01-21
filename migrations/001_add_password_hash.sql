-- Migration: Add password_hash column to users table
-- Run this in your Supabase SQL Editor

-- Add password_hash column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Note: For existing users that were created via Supabase Auth,
-- they will need to set a password through your backend's password reset flow
