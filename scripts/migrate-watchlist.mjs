// One-time migration: watchlist enhancements
// Run with: node scripts/migrate-watchlist.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Parse .env.local
const env = {}
try {
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message)
  process.exit(1)
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run(label, sql) {
  console.log(`\n→ ${label}`)
  const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }))
  // rpc may not exist; fall through to raw REST
  if (error) {
    // Try via the REST management endpoint isn't available without Postgres URL.
    // Instead we use supabase-js .from() workarounds where possible, or log for manual run.
    console.log(`  ⚠ Could not run via RPC. SQL for manual execution:\n${sql}`)
    return false
  }
  console.log(`  ✓ Done`)
  return true
}

// We'll use the Supabase REST API (pg_net extension or direct SQL via service role)
// Since direct SQL exec is not available in the anon/service role REST API,
// we'll test if tables exist and report what needs manual execution.

async function checkTable(name) {
  const { error } = await supabase.from(name).select('id').limit(1)
  if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
    return false
  }
  return true
}

async function checkColumn(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1)
  if (error?.message?.includes('column') && error?.message?.includes('does not exist')) {
    return false
  }
  return true
}

console.log('=== SessionSource Watchlist Migration ===')
console.log('Checking current schema...\n')

const sharedExists   = await checkTable('shared_watchlists')
const foldersExists  = await checkTable('user_folders')
const priorityIsText = await checkColumn('user_bills', 'priority')

console.log('shared_watchlists table:', sharedExists ? '✓ exists' : '✗ needs creation')
console.log('user_folders table:', foldersExists ? '✓ exists' : '✗ needs creation')
console.log('user_bills.priority column:', priorityIsText ? '✓ exists' : '✗ missing')

// Test whether priority is the new text type
if (priorityIsText) {
  const { data } = await supabase.from('user_bills').select('priority').limit(1)
  console.log('user_bills.priority sample:', data?.[0]?.priority ?? '(no rows)')
}

const SQL_shared_watchlists = `
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
`

const SQL_priority_upgrade = `
ALTER TABLE user_bills DROP COLUMN IF EXISTS priority;
ALTER TABLE user_bills ADD COLUMN priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('critical', 'high', 'normal', 'low'));
`

console.log('\n=== SQL to run in Supabase SQL Editor ===')
if (!sharedExists) {
  console.log('\n--- shared_watchlists table ---')
  console.log(SQL_shared_watchlists)
}

console.log('\n--- priority column upgrade (run regardless) ---')
console.log(SQL_priority_upgrade)

console.log('\n=== End SQL ===')
console.log('\nPlease run the above SQL in your Supabase project SQL editor.')
console.log('URL: https://app.supabase.com → your project → SQL editor')
