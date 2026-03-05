-- Watchlist Sharing Migration
-- Apply via Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- Run each block separately if any fail.

-- ── 1. shared_watchlists table ──────────────────────────────────────────────
-- This table may already exist. If it does, skip to section 2.
CREATE TABLE IF NOT EXISTS shared_watchlists (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token   TEXT         UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id       UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type    TEXT         NOT NULL CHECK (share_type IN ('full_watchlist', 'folder')),
  folder_id     UUID         DEFAULT NULL,
  title         TEXT         DEFAULT NULL,
  view_count    INTEGER      DEFAULT 0,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- RLS
ALTER TABLE shared_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Owners manage own shares"
  ON shared_watchlists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Public can read active shares"
  ON shared_watchlists FOR SELECT
  USING (is_active = true);

-- ── 2. user_bills — add columns if not already present ──────────────────────
-- These columns are used by the watchlist UI (priority, notes, added_at).
-- Run each ALTER separately to avoid failures if columns already exist.

ALTER TABLE user_bills
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low'));

ALTER TABLE user_bills
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

ALTER TABLE user_bills
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();

-- ── 3. user_activity_log — used by logActivity() ────────────────────────────
-- May already exist. Skip if present.
CREATE TABLE IF NOT EXISTS user_activity_log (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT         NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users view own activity"
  ON user_activity_log FOR SELECT
  USING (auth.uid() = user_id);
