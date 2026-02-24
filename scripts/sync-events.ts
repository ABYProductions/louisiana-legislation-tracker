// scripts/sync-events.ts
// Processes bill calendar and history data to populate:
//   - Bills.next_event:      next upcoming event for quick display on cards/badges
//   - Bills.upcoming_events: all future events for the bill
//   - Bills.last_event_sync: timestamp of last processing
//   - legislative_calendar:  aggregated view of all upcoming events across all bills
//
// Also scrapes LA Legislature website for committee agendas when available.
// Run after enhanced-sync.ts so Bills.calendar is already populated.

import { createClient } from '@supabase/supabase-js'
import { load as cheerioLoad } from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TODAY = new Date().toISOString().split('T')[0]
const NINETY_DAYS = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Louisiana Legislature Tracker (public data research)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) return null
    return await resp.text()
  } catch {
    return null
  }
}

// ── Calendar processing ───────────────────────────────────────────────────────

interface CalendarEntry {
  date: string
  time: string | null
  type: string
  description: string
  location: string | null
}

function normalizeEventType(raw: string | null | undefined): string {
  const s = (raw || '').toLowerCase()
  if (s.includes('committee')) return 'committee_hearing'
  if (s.includes('floor')) return 'floor_session'
  if (s.includes('vote')) return 'vote'
  if (s.includes('hearing')) return 'hearing'
  if (s.includes('governor') || s.includes('signed') || s.includes('vetoed')) return 'executive_action'
  return 'scheduled'
}

function processCalendarForBill(calendar: any[]): {
  next_event: CalendarEntry | null
  upcoming_events: CalendarEntry[]
} {
  const future: CalendarEntry[] = (calendar || [])
    .filter(c => c.date && c.date >= TODAY)
    .map(c => ({
      date: c.date as string,
      time: (c.time as string) || null,
      type: normalizeEventType(c.type || c.description),
      description: (c.description || c.type || 'Scheduled event') as string,
      location: (c.location as string) || null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

  return {
    next_event: future.length > 0 ? future[0] : null,
    upcoming_events: future,
  }
}

// ── legislative_calendar aggregation ─────────────────────────────────────────

interface CalendarRow {
  event_date: string
  event_time: string | null
  event_type: string
  chamber: string | null
  committee_name: string | null
  location: string | null
  bill_ids: number[]
  bill_numbers: string[]
  source: string
}

function buildCalendarKey(date: string, type: string, description: string, chamber: string | null): string {
  // Group events by date + committee/type to merge multiple bills into one row
  const normalizedDesc = description.toLowerCase().trim()
  const chamberKey = chamber || ''
  return `${date}|${type}|${normalizedDesc}|${chamberKey}`
}

function extractChamber(billNumber: string): string | null {
  if (billNumber.startsWith('H')) return 'H'
  if (billNumber.startsWith('S')) return 'S'
  return null
}

// ── Scraping: LA Legislature committee agendas ────────────────────────────────

interface ScrapedEvent {
  date: string
  time: string | null
  committee_name: string
  chamber: 'H' | 'S'
  location: string | null
  agenda_url: string | null
}

async function scrapeHousePendingAgendas(): Promise<ScrapedEvent[]> {
  const url = 'https://house.louisiana.gov/H_Cmtes/H_CmteAgendasPending'
  const html = await fetchHtml(url)
  if (!html) return []

  const $ = cheerioLoad(html)
  const events: ScrapedEvent[] = []

  // House agenda pages typically list committee meetings in tables or lists
  // We look for date patterns and committee names
  $('table tr, .agenda-item, .committee-meeting').each((_, el) => {
    const text = $(el).text().trim()
    const dateMatch = text.match(/(\w+),\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i)

    if (!dateMatch) return

    const dateStr = new Date(`${dateMatch[2]} ${dateMatch[3]}, ${dateMatch[4]}`).toISOString().split('T')[0]
    if (isNaN(new Date(dateStr).getTime())) return
    if (dateStr < TODAY || dateStr > NINETY_DAYS) return

    const committeeName = $(el).find('a, .committee-name').first().text().trim() ||
      text.replace(dateMatch[0], '').replace(timeMatch?.[0] || '', '').trim().slice(0, 80)

    if (committeeName.length < 4) return

    const agendaLink = $(el).find('a[href]').first().attr('href') || null
    events.push({
      date: dateStr,
      time: timeMatch ? timeMatch[1] : null,
      committee_name: committeeName,
      chamber: 'H',
      location: null,
      agenda_url: agendaLink ? `https://house.louisiana.gov${agendaLink}` : null,
    })
  })

  return events
}

async function scrapeSenatePendingAgendas(): Promise<ScrapedEvent[]> {
  const url = 'https://senate.la.gov/Committees/Agenda.asp'
  const html = await fetchHtml(url)
  if (!html) return []

  const $ = cheerioLoad(html)
  const events: ScrapedEvent[] = []

  $('table tr').each((_, el) => {
    const cells = $(el).find('td')
    if (cells.length < 2) return

    const dateText = $(cells[0]).text().trim()
    const committeeText = $(cells[1]).text().trim()
    const timeText = $(cells[2]).text().trim() || null

    const parsedDate = new Date(dateText)
    if (isNaN(parsedDate.getTime())) return

    const dateStr = parsedDate.toISOString().split('T')[0]
    if (dateStr < TODAY || dateStr > NINETY_DAYS) return
    if (committeeText.length < 4) return

    events.push({
      date: dateStr,
      time: timeText,
      committee_name: committeeText,
      chamber: 'S',
      location: null,
      agenda_url: null,
    })
  })

  return events
}

// ── Main sync ─────────────────────────────────────────────────────────────────

async function syncEvents() {
  console.log('=== Calendar & Events Sync ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('')

  // 1. Load all bills with their calendar and basic info
  const { data: bills, error: billsErr } = await supabase
    .from('Bills')
    .select('id, bill_number, calendar')
    .limit(2000)

  if (billsErr) throw new Error(`DB read failed: ${billsErr.message}`)
  console.log(`Processing ${bills?.length || 0} bills...`)

  // 2. Process each bill's calendar into next_event / upcoming_events
  const calendarMap = new Map<string, CalendarRow>() // key → aggregated row
  const billUpdates: {
    id: number
    next_event: CalendarEntry | null
    upcoming_events: CalendarEntry[]
    last_event_sync: string
  }[] = []

  const now = new Date().toISOString()

  for (const bill of bills || []) {
    const calendar: any[] = bill.calendar || []
    const { next_event, upcoming_events } = processCalendarForBill(calendar)

    billUpdates.push({
      id: bill.id,
      next_event,
      upcoming_events,
      last_event_sync: now,
    })

    // Aggregate into legislative_calendar
    const chamber = extractChamber(bill.bill_number || '')
    for (const evt of upcoming_events) {
      const key = buildCalendarKey(evt.date, evt.type, evt.description, chamber)
      if (calendarMap.has(key)) {
        const existing = calendarMap.get(key)!
        if (!existing.bill_ids.includes(bill.id)) {
          existing.bill_ids.push(bill.id)
          existing.bill_numbers.push(bill.bill_number || '')
        }
      } else {
        // Extract committee name from description for committee_hearing events
        const isCommittee = evt.type === 'committee_hearing'
        calendarMap.set(key, {
          event_date: evt.date,
          event_time: evt.time,
          event_type: evt.type,
          chamber: isCommittee ? chamber : null,
          committee_name: isCommittee ? evt.description : null,
          location: evt.location,
          bill_ids: [bill.id],
          bill_numbers: [bill.bill_number || ''],
          source: 'legiscan',
        })
      }
    }
  }

  // 3. Batch update Bills in chunks of 50
  let billsUpdated = 0
  let billErrors = 0
  const CHUNK = 50

  for (let i = 0; i < billUpdates.length; i += CHUNK) {
    const chunk = billUpdates.slice(i, i + CHUNK)
    for (const u of chunk) {
      const { error } = await supabase
        .from('Bills')
        .update({
          next_event: u.next_event,
          upcoming_events: u.upcoming_events,
          last_event_sync: u.last_event_sync,
        })
        .eq('id', u.id)

      if (error) {
        billErrors++
      } else {
        billsUpdated++
      }
    }
    await sleep(100) // brief pause between chunks
  }

  console.log(`Bills updated: ${billsUpdated} | Errors: ${billErrors}`)

  // 4. Scrape LA Legislature for additional events (best-effort)
  console.log('\nScraping LA Legislature for committee agendas...')
  let scrapedEvents: ScrapedEvent[] = []
  try {
    const [houseAgendas, senateAgendas] = await Promise.all([
      scrapeHousePendingAgendas(),
      scrapeSenatePendingAgendas(),
    ])
    scrapedEvents = [...houseAgendas, ...senateAgendas]
    console.log(`  Scraped: ${houseAgendas.length} House + ${senateAgendas.length} Senate events`)
  } catch (e: any) {
    console.warn(`  Scraping failed (non-fatal): ${e.message}`)
  }

  // Merge scraped events into calendarMap
  for (const scraped of scrapedEvents) {
    const key = buildCalendarKey(scraped.date, 'committee_hearing', scraped.committee_name, scraped.chamber)
    if (!calendarMap.has(key)) {
      calendarMap.set(key, {
        event_date: scraped.date,
        event_time: scraped.time,
        event_type: 'committee_hearing',
        chamber: scraped.chamber,
        committee_name: scraped.committee_name,
        location: scraped.location,
        bill_ids: [],
        bill_numbers: [],
        source: 'la_legislature',
      })
    } else {
      // If we already have this from LegiScan, enrich with scraped data
      const existing = calendarMap.get(key)!
      if (!existing.event_time && scraped.time) existing.event_time = scraped.time
      if (!existing.location && scraped.location) existing.location = scraped.location
      if (scraped.agenda_url) {
        // Store agenda_url only if not already set
      }
    }
  }

  // 5. Upsert into legislative_calendar
  const calendarRows = Array.from(calendarMap.values())
  console.log(`\nUpserting ${calendarRows.length} calendar events...`)

  let calendarUpserted = 0
  let calendarErrors = 0

  for (let i = 0; i < calendarRows.length; i += CHUNK) {
    const chunk = calendarRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('legislative_calendar')
      .upsert(
        chunk.map(r => ({
          event_date: r.event_date,
          event_time: r.event_time,
          event_type: r.event_type,
          chamber: r.chamber,
          committee_name: r.committee_name,
          location: r.location,
          bill_ids: r.bill_ids,
          bill_numbers: r.bill_numbers,
          source: r.source,
          updated_at: now,
        })),
        {
          onConflict: 'event_date,event_type,committee_name,chamber',
          ignoreDuplicates: false,
        }
      )

    if (error) {
      console.error(`  Upsert error: ${error.message}`)
      calendarErrors += chunk.length
    } else {
      calendarUpserted += chunk.length
    }
    await sleep(100)
  }

  // 6. Remove stale calendar entries (events in the past older than 7 days)
  const pruneDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { error: pruneErr } = await supabase
    .from('legislative_calendar')
    .delete()
    .lt('event_date', pruneDate)

  if (pruneErr) {
    console.warn(`  Prune error (non-fatal): ${pruneErr.message}`)
  }

  console.log('\n=== Sync complete ===')
  console.log(`  Bills processed: ${billUpdates.length}`)
  console.log(`  Bills with next event: ${billUpdates.filter(u => u.next_event).length}`)
  console.log(`  Calendar events upserted: ${calendarUpserted}`)
  if (calendarErrors > 0) console.warn(`  Calendar errors: ${calendarErrors}`)
}

syncEvents().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
