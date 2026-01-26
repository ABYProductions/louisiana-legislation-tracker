console.log('Script starting...')
console.log('LEGISCAN_API_KEY exists:', !!process.env.LEGISCAN_API_KEY)
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

import { createClient } from '@supabase/supabase-js'

// Configuration
const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const LOUISIANA_STATE_ID = 18 // LegiScan's ID for Louisiana

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

// LegiScan API base URL
const LEGISCAN_BASE_URL = 'https://api.legiscan.com/'

// Helper function to make LegiScan API requests
async function legiscanRequest(operation: string, params: Record<string, string | number> = {}) {
  const url = new URL(LEGISCAN_BASE_URL)
  url.searchParams.set('key', LEGISCAN_API_KEY!)
  url.searchParams.set('op', operation)
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  
  console.log(`Making LegiScan request: ${operation}`)
  
  const response = await fetch(url.toString())
  const data = await response.json()
  
  if (data.status === 'ERROR') {
    throw new Error(`LegiScan API Error: ${data.alert?.message || 'Unknown error'}`)
  }
  
  return data
}

// Get the current Louisiana session
async function getCurrentSession() {
  const data = await legiscanRequest('getSessionList', { state: 'LA' })
  const sessions = data.sessions
  
  // Find the most recent regular session or current session
  const currentSession = sessions.find((s: any) => s.session_id && s.year_end >= new Date().getFullYear())
  
  if (!currentSession) {
    throw new Error('Could not find current Louisiana session')
  }
  
  console.log(`Found session: ${currentSession.session_name} (ID: ${currentSession.session_id})`)
  return currentSession
}

// Get the master list of bills for a session
async function getBillList(sessionId: number) {
  const data = await legiscanRequest('getMasterList', { id: sessionId })
  return Object.values(data.masterlist).filter((bill: any) => bill.bill_id) as any[]
}

// Get detailed information for a specific bill
async function getBillDetail(billId: number) {
  const data = await legiscanRequest('getBill', { id: billId })
  return data.bill
}

// Check if a bill needs updating by comparing change_hash
async function billNeedsUpdate(legiscanBillId: number, newChangeHash: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('Bills')
    .select('change_hash')
    .eq('legiscan_bill_id', legiscanBillId)
    .single()
  
  if (error || !data) {
    // Bill doesn't exist, needs to be inserted
    return true
  }
  
  // Compare hashes - if different, bill has been updated
  return data.change_hash !== newChangeHash
}

// Transform LegiScan bill data to our database schema
function transformBillData(bill: any, sessionId: number) {
  return {
    legiscan_bill_id: bill.bill_id,
    bill_number: bill.bill_number,
    title: bill.title,
    description: bill.description || bill.title,
    session_id: sessionId,
    session_year: parseInt(bill.session?.year_start) || new Date().getFullYear(),
    body: bill.body,
    body_id: bill.body_id,
    current_body: bill.current_body,
    current_body_id: bill.current_body_id,
    bill_type: bill.bill_type,
    bill_type_id: bill.bill_type_id,
    status: bill.status_desc || bill.status,
    state_link: bill.state_link,
    url: bill.url,
    change_hash: bill.change_hash,
    committee: bill.committee?.name || null,
    last_action: bill.history?.[0]?.action || null,
    last_action_date: bill.history?.[0]?.date || null,
    author: bill.sponsors?.[0]?.name || null,
    sponsors: bill.sponsors || [],
    history: bill.history || [],
    votes: bill.votes || [],
    amendments: bill.amendments || [],
    texts: bill.texts || [],
    calendar: bill.calendar || [],
    subjects: bill.subjects || [],
    full_text: null, // We'll fetch this separately if needed
    updated_at: new Date().toISOString()
  }
}

// Upsert a bill into the database
async function upsertBill(billData: any) {
  const { data, error } = await supabase
    .from('Bills')
    .upsert(billData, { 
      onConflict: 'legiscan_bill_id',
      ignoreDuplicates: false 
    })
    .select()
  
  if (error) {
    console.error(`Error upserting bill ${billData.bill_number}:`, error.message)
    return null
  }
  
  return data
}

// Main sync function
async function syncLouisianaBills() {
  console.log('Starting Louisiana bill sync...')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('---')
  
  try {
    // Get current session
    const session = await getCurrentSession()
    
    // Get list of all bills
    console.log('Fetching bill list...')
    const billList = await getBillList(session.session_id)
    console.log(`Found ${billList.length} bills in session`)
    console.log('---')
    
    let newBills = 0
    let updatedBills = 0
    let unchangedBills = 0
    let errors = 0
    
    // Process each bill
    for (const billSummary of billList) {
      try {
        // Check if bill needs updating
        const needsUpdate = await billNeedsUpdate(billSummary.bill_id, billSummary.change_hash)
        
        if (!needsUpdate) {
          unchangedBills++
          continue
        }
        
        // Fetch full bill details
        console.log(`Fetching details for ${billSummary.bill_number}...`)
        const billDetail = await getBillDetail(billSummary.bill_id)
        
        // Transform and save
        const transformedData = transformBillData(billDetail, session.session_id)
        const result = await upsertBill(transformedData)
        
        if (result) {
          // Check if this was an insert or update
          const { data: existing } = await supabase
            .from('Bills')
            .select('created_at, updated_at')
            .eq('legiscan_bill_id', billSummary.bill_id)
            .single()
          
          if (existing && existing.created_at === existing.updated_at) {
            newBills++
            console.log(`  ✓ Added new bill: ${billSummary.bill_number}`)
          } else {
            updatedBills++
            console.log(`  ✓ Updated bill: ${billSummary.bill_number}`)
          }
        }
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 250))
        
      } catch (billError) {
        console.error(`  ✗ Error processing ${billSummary.bill_number}:`, billError)
        errors++
      }
    }
    
    // Print summary
    console.log('---')
    console.log('Sync complete!')
    console.log(`  New bills: ${newBills}`)
    console.log(`  Updated bills: ${updatedBills}`)
    console.log(`  Unchanged bills: ${unchangedBills}`)
    console.log(`  Errors: ${errors}`)
    console.log(`  Total processed: ${billList.length}`)
    
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

// Run the sync
syncLouisianaBills()