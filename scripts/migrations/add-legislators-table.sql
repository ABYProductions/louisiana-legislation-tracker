-- Migration: Add legislators table
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates a dedicated legislators table populated by sync-legislators.ts

CREATE TABLE IF NOT EXISTS legislators (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  la_website_id         INTEGER,                        -- numeric ID in LA legislature URL (?ID=123)
  legiscan_people_id    INTEGER,                        -- LegiScan people_id for cross-referencing
  chamber               TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  name                  TEXT NOT NULL,

  -- Contact & office
  party                 TEXT,
  district_number       INTEGER,
  office_address        TEXT,
  phone                 TEXT,
  fax                   TEXT,
  email                 TEXT,
  legislative_assistant TEXT,

  -- Geographic
  parishes_represented  JSONB DEFAULT '[]',             -- ["Jefferson", "Orleans", ...]
  corresponding_districts JSONB DEFAULT '[]',           -- for House members representing multiple districts

  -- Background
  year_elected          INTEGER,
  term_end              TEXT,                           -- stored as "January 2028" style string
  education             TEXT,

  -- Media
  photo_url             TEXT,

  -- Legislative assignments
  committees            JSONB DEFAULT '[]',             -- [{committee_name, role, chamber}, ...]
  caucuses              JSONB DEFAULT '[]',             -- ["Caucus Name", ...]

  -- Sync metadata
  last_scraped_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one record per legislator per chamber (by la_website_id)
-- NULLS NOT DISTINCT so that NULL la_website_id doesn't bypass the constraint
CREATE UNIQUE INDEX IF NOT EXISTS legislators_la_website_id_chamber_key
  ON legislators (la_website_id, chamber)
  WHERE la_website_id IS NOT NULL;

-- Unique constraint on legiscan_people_id
CREATE UNIQUE INDEX IF NOT EXISTS legislators_legiscan_people_id_key
  ON legislators (legiscan_people_id)
  WHERE legiscan_people_id IS NOT NULL;

-- Index for name-based lookups (used when matching Bills.author)
CREATE INDEX IF NOT EXISTS legislators_name_idx
  ON legislators (name);

-- Index for chamber filtering
CREATE INDEX IF NOT EXISTS legislators_chamber_idx
  ON legislators (chamber);

-- Enable RLS (read-only for anon)
ALTER TABLE legislators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legislators_public_read" ON legislators;
CREATE POLICY "legislators_public_read"
  ON legislators FOR SELECT
  TO anon, authenticated
  USING (true);
