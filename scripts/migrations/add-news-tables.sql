-- News articles cache table
CREATE TABLE IF NOT EXISTS news_articles (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text,
  url text NOT NULL UNIQUE,
  source_name text NOT NULL,
  source_id text NOT NULL,
  published_at timestamptz NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  relevance_score integer DEFAULT 0,
  industry_tags text[] DEFAULT '{}',
  related_bill_numbers text[] DEFAULT '{}',
  image_url text,
  is_breaking boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_idx
  ON news_articles(published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_relevance_idx
  ON news_articles(relevance_score DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_industry_tags_idx
  ON news_articles USING gin(industry_tags);

CREATE INDEX IF NOT EXISTS news_articles_bill_numbers_idx
  ON news_articles USING gin(related_bill_numbers);

-- News sync audit log
CREATE TABLE IF NOT EXISTS news_sync_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  articles_fetched integer DEFAULT 0,
  articles_inserted integer DEFAULT 0,
  articles_skipped integer DEFAULT 0,
  sources_succeeded integer DEFAULT 0,
  sources_failed integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'
);

-- User preferences table (since user_preferences does not exist yet)
CREATE TABLE IF NOT EXISTS user_preferences (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  news_industry_preferences text[] DEFAULT '{}',
  news_enabled boolean DEFAULT true,
  news_show_breaking_only boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for news_articles (public read, service role write)
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'news_articles' AND policyname = 'news_articles_public_read'
  ) THEN
    CREATE POLICY news_articles_public_read ON news_articles FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'news_articles' AND policyname = 'news_articles_service_insert'
  ) THEN
    CREATE POLICY news_articles_service_insert ON news_articles FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'news_articles' AND policyname = 'news_articles_service_update'
  ) THEN
    CREATE POLICY news_articles_service_update ON news_articles FOR UPDATE TO service_role USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'news_articles' AND policyname = 'news_articles_service_delete'
  ) THEN
    CREATE POLICY news_articles_service_delete ON news_articles FOR DELETE TO service_role USING (true);
  END IF;
END $$;

-- RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_own'
  ) THEN
    CREATE POLICY user_preferences_own ON user_preferences
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
