// scripts/enhanced-sync.ts
// Simplified enhanced sync - analyzes amendments from text (no PDF parsing yet)

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Initialize clients
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
  console.log('🚀 Starting Enhanced Sync...')
  console.log(`📅 Date: ${new Date().toISOString()}`)
  
  try {
    // Check budget
    console.log(`💰 Monthly spending: $${monthlySpending.toFixed(2)} / $${MONTHLY_BUDGET}`)
    
    if (monthlySpending >= MONTHLY_BUDGET) {
      console.log('⚠️  Budget exceeded. Running basic sync only.')
      await basicSync()
      return
    }
    
    // Get bills from database
    const { data: existingBills } = await supabase
      .from('Bills')
      .select('*')
    
    console.log(`📚 Found ${existingBills?.length || 0} bills in database`)
    
    // Fetch bills from LegiScan
    const legiScanBills = await fetchLegiScanBills()
    console.log(`🔍 Found ${legiScanBills.length} bills from LegiScan`)
    
    let billsUpdated = 0
    
    // Process each bill
    for (const bill of legiScanBills) {
      const existing = existingBills?.find(b => b.bill_id === bill.bill_id)
      
      // Check if bill changed
      if (existing && existing.change_hash === bill.change_hash) {
        continue
      }
      
      console.log(`\n📋 Updating: ${bill.bill_number}`)
      
      // Update bill record
      await supabase
        .from('Bills')
        .upsert({
          bill_id: bill.bill_id,
          bill_number: bill.bill_number,
          title: bill.title,
          description: bill.description,
          status: bill.status?.desc || bill.status,
          change_hash: bill.change_hash,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'bill_id'
        })
      
      billsUpdated++
      
      // Rate limit
      await sleep(500)
    }
    
    console.log('\n✅ Sync Complete!')
    console.log(`📊 Summary:`)
    console.log(`   - Bills checked: ${legiScanBills.length}`)
    console.log(`   - Bills updated: ${billsUpdated}`)
    console.log(`   - Monthly spending: $${monthlySpending.toFixed(2)} / $${MONTHLY_BUDGET}`)
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    throw error
  }
}

async function fetchLegiScanBills() {
  const url = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getMasterList&state=LA`
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (data.status !== 'OK') {
    throw new Error(`LegiScan API error: ${data.status}`)
  }
  
  const bills = Object.values(data.masterlist) as any[]
  return bills.filter(b => typeof b === 'object' && b.bill_id)
}

async function basicSync() {
  console.log('📊 Running basic sync...')
  const bills = await fetchLegiScanBills()
  
  for (const bill of bills) {
    await supabase
      .from('Bills')
      .upsert({
        bill_id: bill.bill_id,
        bill_number: bill.bill_number,
        title: bill.title,
        description: bill.description,
        status: bill.status?.desc || bill.status,
        change_hash: bill.change_hash,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'bill_id'
      })
    
    await sleep(500)
  }
  
  console.log('✅ Basic sync complete')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run
enhancedSync()
  .then(() => {
    console.log('✨ All done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })