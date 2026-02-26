-- SessionSource Watchlist Enhancements Migration
-- Run this in the Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- 1. Create shared_watchlists table (skip if already exists)
CREATE TABLE IF NOT EXISTS shared_watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  share_type text NOT NULL DEFAULT 'full_watchlist'
    CHECK (share_type IN ('full_watchlist', 'folder')),
  folder_id uuid REFERENCES user_folders(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS shared_watchlists_token_idx ON shared_watchlists(share_token);
CREATE INDEX IF NOT EXISTS shared_watchlists_user_idx ON shared_watchlists(user_id);

ALTER TABLE shared_watchlists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "owners_manage_shares" ON shared_watchlists
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "public_view_active_shares" ON shared_watchlists
    FOR SELECT TO public
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Upgrade user_bills.priority from boolean to text enum
-- This safely migrates existing data: false→'normal', true→'high'
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_bills'
    AND column_name = 'priority';

  IF col_type = 'boolean' THEN
    -- Add temp column
    ALTER TABLE user_bills ADD COLUMN priority_new text NOT NULL DEFAULT 'normal'
      CHECK (priority_new IN ('critical', 'high', 'normal', 'low'));
    -- Migrate data
    UPDATE user_bills SET priority_new = CASE WHEN priority THEN 'high' ELSE 'normal' END;
    -- Swap columns
    ALTER TABLE user_bills DROP COLUMN priority;
    ALTER TABLE user_bills RENAME COLUMN priority_new TO priority;
    RAISE NOTICE 'priority column upgraded from boolean to text';
  ELSIF col_type IS NULL THEN
    -- Column doesn't exist, add it fresh
    ALTER TABLE user_bills ADD COLUMN priority text NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('critical', 'high', 'normal', 'low'));
    RAISE NOTICE 'priority column created as text';
  ELSE
    RAISE NOTICE 'priority column already text type (%), no change needed', col_type;
  END IF;
END $$;
