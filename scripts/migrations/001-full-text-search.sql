-- ============================================================
-- Migration 001 — Full-text search infrastructure
-- Run this in the Supabase SQL editor before deploying
-- the new search system.
-- ============================================================

-- STEP 2A — Add search_vector column
ALTER TABLE "Bills"
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- STEP 2B — Populate search_vector for all existing bills
-- Weight: A=bill_number,title  B=abstract,digest,summary  C=full_text,description  D=added_text,deleted_text
UPDATE "Bills" SET search_vector = (
  setweight(to_tsvector('english', COALESCE(bill_number, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(abstract, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(digest, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(LEFT(COALESCE(full_text,''), 100000), '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(added_text, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(deleted_text, '')), 'D')
);

-- STEP 2C — GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS bills_search_vector_idx
  ON "Bills" USING GIN(search_vector);

-- STEP 2D — Trigger to auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_bill_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := (
    setweight(to_tsvector('english', COALESCE(NEW.bill_number,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.digest,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(LEFT(COALESCE(NEW.full_text,''),100000),'')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description,'')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.added_text,'')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.deleted_text,'')), 'D')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bills_search_vector_update ON "Bills";
CREATE TRIGGER bills_search_vector_update
BEFORE INSERT OR UPDATE ON "Bills"
FOR EACH ROW EXECUTE FUNCTION update_bill_search_vector();

-- STEP 2E — Supporting indexes for filter performance
CREATE INDEX IF NOT EXISTS bills_status_idx       ON "Bills"(status);
CREATE INDEX IF NOT EXISTS bills_bill_type_idx    ON "Bills"(bill_type);
CREATE INDEX IF NOT EXISTS bills_committee_idx    ON "Bills"(committee);
CREATE INDEX IF NOT EXISTS bills_author_idx       ON "Bills"(author);
CREATE INDEX IF NOT EXISTS bills_session_year_idx ON "Bills"(session_year);
CREATE INDEX IF NOT EXISTS bills_subjects_gin_idx ON "Bills" USING GIN(subjects);

-- STEP 2F — search_bills RPC
-- NOTE: The Bills table uses `author` (not `sponsor`) and `session_year` (not `session`).
-- next_event_date is derived from the next_event JSONB column.
CREATE OR REPLACE FUNCTION search_bills(
  query_text        TEXT    DEFAULT NULL,
  filter_chamber    TEXT    DEFAULT NULL,
  filter_status     TEXT    DEFAULT NULL,
  filter_committee  TEXT    DEFAULT NULL,
  filter_sponsor    TEXT    DEFAULT NULL,   -- maps to `author` column
  filter_subject    TEXT    DEFAULT NULL,
  filter_bill_type  TEXT    DEFAULT NULL,
  filter_has_upcoming_event BOOLEAN DEFAULT NULL,
  filter_date_from  DATE    DEFAULT NULL,
  filter_date_to    DATE    DEFAULT NULL,
  filter_session    INTEGER DEFAULT 2026,   -- session_year
  sort_by           TEXT    DEFAULT 'relevance',
  page_number       INTEGER DEFAULT 1,
  page_size         INTEGER DEFAULT 25
)
RETURNS TABLE (
  id                INTEGER,
  bill_number       TEXT,
  title             TEXT,
  status            TEXT,
  author            TEXT,
  committee         TEXT,
  bill_type         TEXT,
  subjects          JSONB,
  summary           TEXT,
  digest            TEXT,
  abstract          TEXT,
  description       TEXT,
  last_action       TEXT,
  last_action_date  TEXT,
  next_event        JSONB,
  session_year      INTEGER,
  pdf_url           TEXT,
  extraction_quality TEXT,
  summary_status    TEXT,
  body              TEXT,
  rank              REAL,
  total_count       BIGINT,
  headline          TEXT
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  IF query_text IS NOT NULL AND trim(query_text) != '' THEN
    BEGIN
      ts_query := websearch_to_tsquery('english', query_text);
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        ts_query := plainto_tsquery('english', query_text);
      EXCEPTION WHEN OTHERS THEN
        ts_query := NULL;
      END;
    END;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      b.id,
      b.bill_number,
      b.title,
      b.status,
      b.author,
      b.committee,
      b.bill_type,
      b.subjects,
      b.summary,
      b.digest,
      b.abstract,
      b.description,
      b.last_action,
      b.last_action_date,
      b.next_event,
      b.session_year,
      b.pdf_url,
      b.extraction_quality,
      b.summary_status,
      b.body,
      b.search_vector,
      CASE
        WHEN ts_query IS NOT NULL
          THEN ts_rank_cd(b.search_vector, ts_query, 32)
        ELSE 0.0
      END AS rank,
      CASE
        WHEN ts_query IS NOT NULL
          THEN ts_headline('english',
            COALESCE(b.digest, b.abstract, b.description, b.title),
            ts_query,
            'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>'
          )
        ELSE NULL
      END AS headline,
      COUNT(*) OVER() AS total_count
    FROM "Bills" b
    WHERE
      -- Full-text search
      (ts_query IS NULL OR b.search_vector @@ ts_query)
      -- Chamber filter (derived from bill_number prefix)
      AND (filter_chamber IS NULL OR
        CASE lower(filter_chamber)
          WHEN 'house'  THEN b.bill_number ~* '^(HB|HR|HCR)\d'
          WHEN 'senate' THEN b.bill_number ~* '^(SB|SR|SCR)\d'
          ELSE TRUE
        END)
      -- Status
      AND (filter_status IS NULL OR b.status ILIKE filter_status)
      -- Committee
      AND (filter_committee IS NULL OR
        b.committee ILIKE '%' || filter_committee || '%')
      -- Author/sponsor
      AND (filter_sponsor IS NULL OR
        b.author ILIKE '%' || filter_sponsor || '%')
      -- Subject (JSON array of {subject_name} objects)
      AND (filter_subject IS NULL OR
        b.subjects::text ILIKE '%' || filter_subject || '%')
      -- Bill type
      AND (filter_bill_type IS NULL OR
        b.bill_type ILIKE filter_bill_type)
      -- Upcoming event
      AND (filter_has_upcoming_event IS NULL OR
        CASE filter_has_upcoming_event
          WHEN TRUE  THEN (b.next_event->>'date')::date >= CURRENT_DATE
          WHEN FALSE THEN b.next_event IS NULL
                       OR (b.next_event->>'date')::date < CURRENT_DATE
        END)
      -- Date range (last_action_date stored as text YYYY-MM-DD)
      AND (filter_date_from IS NULL OR
        b.last_action_date::date >= filter_date_from)
      AND (filter_date_to IS NULL OR
        b.last_action_date::date <= filter_date_to)
      -- Session year
      AND (filter_session IS NULL OR b.session_year = filter_session)
  )
  SELECT
    f.id, f.bill_number, f.title, f.status, f.author, f.committee,
    f.bill_type, f.subjects, f.summary, f.digest, f.abstract, f.description,
    f.last_action, f.last_action_date, f.next_event, f.session_year,
    f.pdf_url, f.extraction_quality, f.summary_status, f.body,
    f.rank::REAL,
    f.total_count,
    f.headline
  FROM filtered f
  ORDER BY
    -- Primary sort
    CASE sort_by
      WHEN 'date_desc'   THEN NULL
      WHEN 'date_asc'    THEN NULL
      WHEN 'bill_number' THEN NULL
      ELSE (1.0 - f.rank)   -- relevance: lower = better
    END ASC NULLS LAST,
    CASE WHEN sort_by = 'date_desc'   THEN f.last_action_date END DESC NULLS LAST,
    CASE WHEN sort_by = 'date_asc'    THEN f.last_action_date END ASC  NULLS LAST,
    CASE WHEN sort_by = 'bill_number' THEN f.bill_number       END ASC  NULLS LAST,
    -- Tiebreaker
    f.rank DESC,
    f.bill_number ASC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to anon and authenticated (PostgREST RPC)
GRANT EXECUTE ON FUNCTION search_bills TO anon, authenticated;

-- STEP 2G — Verify
-- Test: SELECT bill_number, title, rank, headline FROM search_bills(query_text := 'carbon sequestration') ORDER BY rank DESC LIMIT 5;

-- STEP — Search analytics table
CREATE TABLE IF NOT EXISTS search_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query      TEXT,
  filters    JSONB,
  result_count INTEGER,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_logs_created_idx ON search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS search_logs_query_idx   ON search_logs(query) WHERE query IS NOT NULL;

-- Verify: check search_vector was populated
-- SELECT COUNT(*) FROM "Bills" WHERE search_vector IS NOT NULL;
