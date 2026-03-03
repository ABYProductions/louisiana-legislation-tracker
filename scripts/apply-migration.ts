// scripts/apply-migration.ts
// Outputs the versioned_summaries migration SQL for manual application.
//
// USAGE:
//   npx tsx scripts/apply-migration.ts
//
// Then copy the SQL from supabase/migrations/versioned_summaries.sql and
// paste it into the Supabase SQL Editor:
//   https://supabase.com/dashboard/project/mfcztgzfjlimybdatkml/sql

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sqlPath = join(__dirname, '../supabase/migrations/versioned_summaries.sql')
const sql = readFileSync(sqlPath, 'utf-8')

console.log('\n' + '='.repeat(72))
console.log('  SessionSource — Database Migration Required')
console.log('='.repeat(72))
console.log()
console.log('The Supabase REST API does not support DDL (CREATE TABLE, ALTER TABLE).')
console.log('Apply this migration manually via the Supabase SQL Editor:')
console.log()
console.log('  https://supabase.com/dashboard/project/mfcztgzfjlimybdatkml/sql')
console.log()
console.log('1. Open the link above')
console.log('2. Click "New query"')
console.log('3. Paste the contents of:')
console.log('     supabase/migrations/versioned_summaries.sql')
console.log('4. Click "Run"')
console.log()
console.log('='.repeat(72))
console.log()
console.log('Migration SQL preview (first 20 lines):')
console.log('-'.repeat(72))
sql.split('\n').slice(0, 20).forEach(line => console.log(line))
console.log('...')
console.log()
console.log('Full SQL file:', sqlPath)
console.log()
