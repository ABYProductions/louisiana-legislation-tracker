-- =============================================================================
-- Migration: versioned_summaries
-- Adds bill_summaries and notifications tables, extends bill_versions.
--
-- bill_versions already exists. We only add the pdf_hash column.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- =============================================================================

-- ── 1. Extend bill_versions with pdf_hash ────────────────────────────────────
ALTER TABLE bill_versions ADD COLUMN IF NOT EXISTS pdf_hash text;

-- ── 2. bill_summaries — one AI summary row per version ───────────────────────
CREATE TABLE IF NOT EXISTS bill_summaries (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id          integer NOT NULL REFERENCES "Bills"(id) ON DELETE CASCADE,
  version_id       integer REFERENCES bill_versions(id) ON DELETE SET NULL,
  version_number   integer NOT NULL DEFAULT 1,
  is_current       boolean NOT NULL DEFAULT false,
  summary          text,
  summary_status   text NOT NULL DEFAULT 'pending'
                     CHECK (summary_status IN ('pending','complete','failed')),
  changes_from_prior text,
  change_type_label  text,
  generated_at     timestamptz,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_summaries_bill_id ON bill_summaries(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_summaries_current ON bill_summaries(bill_id, is_current) WHERE is_current = true;

-- ── 3. notifications — per-user notification inbox ───────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id    integer NOT NULL REFERENCES "Bills"(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'summary_updated',
  title      text,
  body       text,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);

-- ── 4. Add current_summary_id to Bills ───────────────────────────────────────
ALTER TABLE "Bills" ADD COLUMN IF NOT EXISTS current_summary_id uuid REFERENCES bill_summaries(id);

-- ── 5. Row-level security ─────────────────────────────────────────────────────
ALTER TABLE bill_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running
DROP POLICY IF EXISTS "Public can read bill_summaries"         ON bill_summaries;
DROP POLICY IF EXISTS "Service role can manage bill_summaries" ON bill_summaries;
DROP POLICY IF EXISTS "Users can read own notifications"       ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications"  ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications"     ON notifications;

CREATE POLICY "Public can read bill_summaries"
  ON bill_summaries FOR SELECT USING (true);

CREATE POLICY "Service role can manage bill_summaries"
  ON bill_summaries FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── 6. Seed existing complete Bills summaries → bill_summaries ────────────────
-- Creates version 1 entries for every bill that already has a complete AI summary.
DO $$
DECLARE
  r        RECORD;
  v_ver_id integer;
  v_sum_id uuid;
BEGIN
  FOR r IN
    SELECT id, bill_number, summary, summary_updated_at
    FROM "Bills"
    WHERE summary_status = 'complete' AND summary IS NOT NULL
    LIMIT 5000
  LOOP
    -- Skip if a bill_summaries entry already exists for this bill
    IF EXISTS (SELECT 1 FROM bill_summaries WHERE bill_id = r.id AND version_number = 1) THEN
      CONTINUE;
    END IF;

    -- Insert a bill_versions snapshot (version 1, introduced)
    INSERT INTO bill_versions (bill_id, version_name, version_type, version_date, version_number, summary)
    VALUES (
      r.id,
      'Initial Version',
      'introduced',
      COALESCE(r.summary_updated_at::date::text, CURRENT_DATE::text),
      1,
      r.summary
    )
    RETURNING id INTO v_ver_id;

    -- Insert bill_summaries row
    INSERT INTO bill_summaries (bill_id, version_id, version_number, is_current, summary, summary_status, generated_at)
    VALUES (r.id, v_ver_id, 1, true, r.summary, 'complete', COALESCE(r.summary_updated_at, now()))
    RETURNING id INTO v_sum_id;

    -- Back-fill current_summary_id on Bills
    UPDATE "Bills" SET current_summary_id = v_sum_id WHERE id = r.id;
  END LOOP;
END $$;
