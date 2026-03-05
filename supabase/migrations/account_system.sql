-- =============================================================================
-- Migration: account_system
-- Creates user_profiles, user_activity_log, notification_preferences,
-- and notification_queue tables.
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/mfcztgzfjlimybdatkml/sql
-- =============================================================================

-- 1A. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  subject_interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users manage own profile'
  ) THEN
    CREATE POLICY "Users manage own profile"
      ON user_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 1B. Activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_detail TEXT,
  bill_id INTEGER REFERENCES "Bills"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_activity_log' AND policyname='Users view own activity'
  ) THEN
    CREATE POLICY "Users view own activity"
      ON user_activity_log FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
-- Service role can insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='user_activity_log' AND policyname='Service role can insert activity'
  ) THEN
    CREATE POLICY "Service role can insert activity"
      ON user_activity_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 1C. Notification preferences (comprehensive, replaces user_notification_preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_opted_in BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'never'
    CHECK (digest_frequency IN (
      'sunday_weekly','daily','wednesday_checkin',
      'session_end','alerts_only','never'
    )),
  digest_hour_ct INTEGER DEFAULT 8,
  alert_committee_hearing BOOLEAN DEFAULT false,
  alert_floor_vote BOOLEAN DEFAULT false,
  alert_bill_amended BOOLEAN DEFAULT false,
  alert_governor_action BOOLEAN DEFAULT false,
  alert_committee_vote BOOLEAN DEFAULT false,
  alert_bill_withdrawn BOOLEAN DEFAULT false,
  alert_session_open BOOLEAN DEFAULT false,
  alert_session_adjourn BOOLEAN DEFAULT false,
  alert_filing_deadline BOOLEAN DEFAULT false,
  alert_special_session BOOLEAN DEFAULT false,
  digest_include_ai_narrative BOOLEAN DEFAULT true,
  digest_include_bill_summaries BOOLEAN DEFAULT true,
  digest_include_vote_results BOOLEAN DEFAULT true,
  digest_include_amendments BOOLEAN DEFAULT true,
  digest_include_week_ahead BOOLEAN DEFAULT true,
  digest_include_session_snapshot BOOLEAN DEFAULT true,
  digest_include_quiet_bills BOOLEAN DEFAULT false,
  notification_timezone TEXT DEFAULT 'America/Chicago',
  last_digest_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='Users manage own preferences'
  ) THEN
    CREATE POLICY "Users manage own preferences"
      ON notification_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='Service role manages preferences'
  ) THEN
    CREATE POLICY "Service role manages preferences"
      ON notification_preferences FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 1D. Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT,
  subject TEXT,
  body_html TEXT,
  bill_id INTEGER REFERENCES "Bills"(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notification_queue' AND policyname='Users view own queue'
  ) THEN
    CREATE POLICY "Users view own queue"
      ON notification_queue FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notification_queue' AND policyname='Service role manages queue'
  ) THEN
    CREATE POLICY "Service role manages queue"
      ON notification_queue FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
