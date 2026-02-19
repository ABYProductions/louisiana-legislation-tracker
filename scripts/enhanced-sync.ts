// scripts/enhanced-sync.ts
// Fixed sync - correct column names matching actual Bills table schema

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY!
const MONTHLY_BUDGET = 30
let monthlySpending = 0

async function enhancedSync() {
  console.log('Starting Enhanced Sync...')
  console.log(`Date: ${new Date().toISOString()}`)

  try {
    console.log(`Monthly spending: $${monthlySpending.toFixed(2)} / $${MONTHLY_BUDGET}`)

    if (monthlySpending >= MONTHLY_BUDGET) {
      console.log('Budget exceeded. Running basic sync only.')
      await basicSync()
      return
    }

    // Use legiscan_bill_id — the correct column name
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
    console.log(`Summary:`)
    console.log(`   - Bills checked: ${legiScanBills.length}`)
    console.log(`   - Bills updated: ${billsUpdated}`)
    console.log(`   - Bills skipped (unchanged): ${billsSkipped}`)
    console.log(`   - Monthly spending: $${monthlySpending.toFixed(2)} / $${MONTHLY_BUDGET}`)

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

async function basicSync() {
  console.log('Running basic sync...')
  const bills = await fetchLegiScanBills()

  for (const bill of bills) {
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
    }

    await sleep(300)
  }

  console.log('Basic sync complete')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

enhancedSync()
  .then(() => {
    console.log('All done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
