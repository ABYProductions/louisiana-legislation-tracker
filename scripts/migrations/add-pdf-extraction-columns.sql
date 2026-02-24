-- Migration: Add PDF extraction pipeline columns to Bills table
-- Run in Supabase SQL Editor before executing extract-bill-text.ts
-- Date: 2026-02-24

ALTER TABLE "Bills"
  ADD COLUMN IF NOT EXISTS pdf_url                TEXT,
  ADD COLUMN IF NOT EXISTS pdf_text_hash          TEXT,
  ADD COLUMN IF NOT EXISTS digest                 TEXT,
  ADD COLUMN IF NOT EXISTS abstract               TEXT,
  ADD COLUMN IF NOT EXISTS deleted_text           TEXT,
  ADD COLUMN IF NOT EXISTS added_text             TEXT,
  ADD COLUMN IF NOT EXISTS extraction_quality     TEXT,
  ADD COLUMN IF NOT EXISTS extraction_notes       TEXT,
  ADD COLUMN IF NOT EXISTS previous_summary       TEXT,
  ADD COLUMN IF NOT EXISTS summary_updated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS text_last_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_priority          TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS last_legiscan_action   TEXT,
  ADD COLUMN IF NOT EXISTS legiscan_text_backup   TEXT;

-- Indexes for efficient pipeline queries
CREATE INDEX IF NOT EXISTS idx_bills_sync_priority
  ON "Bills" (sync_priority);

CREATE INDEX IF NOT EXISTS idx_bills_extraction_quality
  ON "Bills" (extraction_quality)
  WHERE extraction_quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bills_text_verified
  ON "Bills" (text_last_verified_at NULLS FIRST);

-- Seed sync_priority from existing data
-- Bills with last_action within 7 days → high
-- Bills with last_action within 30 days → normal
-- Older → low
UPDATE "Bills"
SET sync_priority = CASE
  WHEN last_action_date >= (NOW() - INTERVAL '7 days')::DATE::TEXT  THEN 'high'
  WHEN last_action_date >= (NOW() - INTERVAL '30 days')::DATE::TEXT THEN 'normal'
  ELSE 'low'
END
WHERE sync_priority = 'normal';  -- only touch rows still at default

-- Verify
SELECT
  sync_priority,
  COUNT(*) AS bill_count
FROM "Bills"
GROUP BY sync_priority
ORDER BY sync_priority;
