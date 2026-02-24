// scripts/enhanced-sync.ts
// Sync bills from LegiScan, then attempt summary generation for pending bills

import { createClient } from '@supabase/supabase-js'
import { processPendingBills } from './generate-summaries'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!

async function enhancedSync() {
  console.log('Starting Enhanced Sync...')
  console.log(`Date: ${new Date().toISOString()}`)

  try {
    const { data: existingBills } = await supabase
      .from('Bills')
      .select('legiscan_bill_id, change_hash')

    console.log(`Found ${existingBills?.length || 0} bills in database`)

    const existingMap = new Map(
      (existingBills || []).map(b => [b.legiscan_bill_id, b.change_hash])
    )

    const legiScanBills = await fetchLegiScanBills()
    console.log(`Found ${legiScanBills.length} bills from LegiScan`)

    let billsUpdated = 0
    let billsSkipped = 0

    for (const bill of legiScanBills) {
      if (existingMap.get(bill.bill_id) === bill.change_hash) {
        billsSkipped++
        continue
      }

      console.log(`Updating: ${bill.number}`)

      // Never overwrite summary or full_text — those are managed by generate-summaries.ts
      const { error } = await supabase
        .from('Bills')
        .upsert({
          legiscan_bill_id: bill.bill_id,
          bill_number:      bill.number,
          title:            bill.title,
          description:      bill.description,
          status:           String(bill.status),
          last_action:      bill.last_action,
          last_action_date: bill.last_action_date,
          url:              bill.url,
          state_link:       bill.url,
          change_hash:      bill.change_hash,
          updated_at:       new Date().toISOString(),
        }, {
          onConflict: 'legiscan_bill_id'
        })

      if (error) {
        console.error(`Error upserting ${bill.number}:`, error.message)
      } else {
        billsUpdated++
      }

      await sleep(300)
    }

    console.log('\nSync Complete!')
    console.log(`  Bills checked:             ${legiScanBills.length}`)
    console.log(`  Bills updated:             ${billsUpdated}`)
    console.log(`  Bills skipped (unchanged): ${billsSkipped}`)

  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

async function fetchLegiScanBills() {
  const url = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getMasterList&state=LA`
  const response = await fetch(url)
  const data = await response.json()

  if (data.status !== 'OK') {
    throw new Error(`LegiScan API error: ${JSON.stringify(data)}`)
  }

  const bills = Object.values(data.masterlist) as any[]
  return bills.filter(b => typeof b === 'object' && b.bill_id && b.number)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

enhancedSync()
  .then(async () => {
    console.log('\n=== Running Summary Generation for Pending Bills ===')
    const { upgraded, stillPending, legiscanCount, pdfCount } = await processPendingBills(true)
    console.log('\n=== Summary Generation Complete ===')
    console.log(`  Upgraded to complete:  ${upgraded}`)
    console.log(`  Still pending:         ${stillPending}`)
    console.log(`  Text from LegiScan:    ${legiscanCount}`)
    console.log(`  Text from PDF:         ${pdfCount}`)
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
