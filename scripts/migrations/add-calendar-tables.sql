-- Migration: Calendar Intelligence System
-- Run this in your Supabase SQL editor.
-- Adds new columns to Bills and creates the legislative_calendar table.

-- 1. Add calendar intelligence columns to Bills
ALTER TABLE "Bills"
  ADD COLUMN IF NOT EXISTS next_event       JSONB,
  ADD COLUMN IF NOT EXISTS upcoming_events  JSONB,
  ADD COLUMN IF NOT EXISTS last_event_sync  TIMESTAMPTZ;

-- 2. Create the legislative_calendar table
CREATE TABLE IF NOT EXISTS legislative_calendar (
  id             BIGSERIAL PRIMARY KEY,
  event_type     TEXT NOT NULL,
  chamber        TEXT,
  committee_name TEXT,
  event_date     DATE NOT NULL,
  event_time     TEXT,
  location       TEXT,
  bill_ids       JSONB DEFAULT '[]',
  bill_numbers   JSONB DEFAULT '[]',
  agenda_url     TEXT,
  source         TEXT DEFAULT 'legiscan',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Unique constraint so upserts deduplicate by event identity
CREATE UNIQUE INDEX IF NOT EXISTS legislative_calendar_event_key
  ON legislative_calendar (event_date, event_type, COALESCE(committee_name, ''), COALESCE(chamber, ''));

-- 4. Index for date-range queries (calendar page)
CREATE INDEX IF NOT EXISTS legislative_calendar_date_idx
  ON legislative_calendar (event_date);

-- 5. Enable RLS (read-only for public)
ALTER TABLE legislative_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read legislative_calendar" ON legislative_calendar;
CREATE POLICY "Public can read legislative_calendar"
  ON legislative_calendar FOR SELECT USING (true);
