// scripts/sync-legislators.ts
// Scrapes LA Legislature websites for all member profiles and stores in Supabase.
// Cross-references LegiScan getSessionPeople to link legiscan_people_id.
//
// Data sources:
//   House list:     https://house.louisiana.gov/H_Reps/H_Reps_ByDistrict.aspx
//   Senate list:    https://senate.la.gov/Senators_FullInfo.aspx
//   House profile:  https://house.louisiana.gov/H_Reps/members.aspx?ID={id}
//   Senate profile: https://senate.la.gov/smembers.aspx?ID={id}
//   Photos:         Predictable URL patterns — no extra request needed
//
// Scraping rules:
//   - 1500ms delay between every HTTP request
//   - Sequential — no parallel scraping
//   - User-Agent: 'Louisiana Legislature Tracker (public data research)'
//   - Never overwrite a good value with null/empty
//   - Graceful failure: log and continue on any individual error

import { createClient } from '@supabase/supabase-js'
import { load as cheerioLoad } from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY
const LEGISCAN_BASE   = 'https://api.legiscan.com/'
const SCRAPE_DELAY    = 1500
const UA              = 'Louisiana Legislature Tracker (public data research)'

// ── Utilities ─────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) { console.warn(`  HTTP ${resp.status}: ${url}`); return null }
    return await resp.text()
  } catch (e: any) {
    console.warn(`  Fetch error (${url}): ${e.message}`)
    return null
  }
}

async function legiscan(op: string, params: Record<string, string | number> = {}): Promise<any> {
  if (!LEGISCAN_API_KEY) return null
  const url = new URL(LEGISCAN_BASE)
  url.searchParams.set('key', LEGISCAN_API_KEY)
  url.searchParams.set('op', op)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from LegiScan`)
  const data = await resp.json()
  if (data.status === 'ERROR') throw new Error(`LegiScan: ${data.alert?.message}`)
  return data
}

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(jr|sr|iii|iv|ii)\b\.?/gi, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseParty(text: string): string | null {
  if (/republican/i.test(text)) return 'Republican'
  if (/democrat/i.test(text)) return 'Democrat'
  if (/independent/i.test(text)) return 'Independent'
  return null
}

// Convert "LastName, [Suffix,] FirstNames" from the LA Legislature format to "FirstNames LastName [Suffix]"
function convertLegislatorName(raw: string): string {
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 1) return raw

  const SUFFIX_RE = /^(Jr\.|Sr\.|II|III|IV)\s*/i

  if (parts.length === 2) {
    const lastName = parts[0]
    const rest = parts[1]
    // "Landry, Jr. Terry" — suffix is at start of rest
    const suffixM = rest.match(/^(Jr\.|Sr\.|II|III|IV)\s+(.+)$/i)
    if (suffixM) return `${suffixM[2]} ${lastName} ${suffixM[1]}`
    // Normal: "LastName, FirstName"
    return `${rest} ${lastName}`
  }

  // 3+ parts: "LastName, Suffix, FirstNames..."
  const lastName = parts[0]
  const maybeSuffix = parts[1]
  if (SUFFIX_RE.test(maybeSuffix)) {
    const firstName = parts.slice(2).join(', ')
    return `${firstName} ${lastName} ${maybeSuffix}`
  }

  // Unusual format — just reverse
  return `${parts.slice(1).join(', ')} ${lastName}`
}

// Strip HTML tags and collapse whitespace to plain text
function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Split HTML on <BR> tags and return clean text lines
function brLines(html: string): string[] {
  return html
    .split(/<br\s*\/?>/gi)
    .map(s => textOf(s))
    .filter(s => s.length > 0)
}

// Merge: never replace a populated value with null/empty
function mergeIncoming(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const out = { ...existing }
  for (const [k, v] of Object.entries(incoming)) {
    const isEmpty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
    if (!isEmpty) out[k] = v
  }
  return out
}

// ── House member list ─────────────────────────────────────────────────────────

interface MemberStub {
  la_website_id: number
  name: string
  district_number: number | null
  party: string | null
  chamber: 'house' | 'senate'
  photo_url: string
}

async function scrapeHouseList(): Promise<MemberStub[]> {
  console.log('  Fetching House member list...')
  const html = await fetchHtml('https://house.louisiana.gov/H_Reps/H_Reps_ByDistrict.aspx')
  if (!html) return []

  const $ = cheerioLoad(html)
  const members: MemberStub[] = []
  const seen = new Set<number>()

  $('a.memlink22').each((_, el) => {
    const href = $(el).attr('href') || ''
    const m = href.match(/members\.aspx\?ID=(\d+)/i)
    if (!m) return

    const id = parseInt(m[1])
    if (seen.has(id)) return
    seen.add(id)

    const rawName = $(el).text().replace(/\s+/g, ' ').trim()
    if (!rawName || /vacant/i.test(rawName)) return

    const name = convertLegislatorName(rawName)

    // District from the preceding span in the page (DISTRICTj_IDLabel_N)
    const distSpan = $(el).closest('td, div, li').prev().find('[id*="DISTRICTj_IDLabel"]').first()
    let district_number: number | null = null
    if (distSpan.length) {
      const d = parseInt(distSpan.text().trim())
      if (!isNaN(d)) district_number = d
    }
    if (!district_number) {
      // Fallback: extract first number from the row
      const rowText = textOf($(el).closest('tr, div, li').html() || '')
      const dm = rowText.match(/\b(\d{1,3})\b/)
      if (dm) district_number = parseInt(dm[1])
    }

    // Party from PartyIcon image in same row
    const row = $(el).closest('tr')
    const partyImg = row.find('img[src*="Party"]').attr('src') || ''
    const party = parseParty(partyImg) || parseParty(row.text())

    const photo_url = `https://house.louisiana.gov/H_Reps/RepPics/rep${id}.jpg`

    members.push({ la_website_id: id, name, district_number, party, chamber: 'house', photo_url })
  })

  console.log(`  Found ${members.length} House members`)
  return members
}

// ── Senate member list ────────────────────────────────────────────────────────

interface SenateMemberStub extends MemberStub {
  office_address: string | null
  phone: string | null
  fax: string | null
  email: string | null
}

async function scrapeSenateList(): Promise<SenateMemberStub[]> {
  console.log('  Fetching Senate member list...')
  const html = await fetchHtml('https://senate.la.gov/Senators_FullInfo.aspx')
  if (!html) return []

  const body = textOf(html)

  // Build id → best name map: some links are navigation (empty text), some have names.
  // Keep the longest text per ID.
  const $ = cheerioLoad(html)
  const bestName = new Map<number, string>()

  $('a[href*="smembers.aspx"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const m = href.match(/smembers\.aspx\?ID=(\d+)/i)
    if (!m) return
    const id = parseInt(m[1])
    const rawName = $(el).text().replace(/\s+/g, ' ').trim()
    const existing = bestName.get(id) || ''
    if (rawName.length > existing.length) bestName.set(id, rawName)
  })

  const members: SenateMemberStub[] = []

  for (const [id, rawName] of bestName.entries()) {
    if (!rawName || rawName.length < 3 || /senator|menu|committees/i.test(rawName)) continue

    const name = convertLegislatorName(rawName)

    // Extract contact data from the full-info page text
    // Pattern near the lastName in body text:
    // "Abraham, Mark District 25 Republican 130 Jamestown Rd... (337)475-3016 (337)475-3018 (FAX) abrahamm@legis.la.gov"
    const lastName = rawName.split(',')[0].trim()
    const searchStr = `${lastName},`
    const idx = body.indexOf(searchStr)
    const chunk = idx > -1 ? body.substring(idx, idx + 500) : ''

    const distMatch = chunk.match(/District\s+(\d+)/i)
    const district_number = distMatch ? parseInt(distMatch[1]) : null
    const party = parseParty(chunk)

    const phones = chunk.match(/\(\d{3}\)\d{3}-\d{4}/g) || []
    const faxM = chunk.match(/(\(\d{3}\)\d{3}-\d{4})\s*\(FAX\)/i)
    const emailM = chunk.match(/\b[a-z]+@legis\.la\.gov\b/i)
    const addrM = chunk.match(/(\d+[^(]*(?:LA|Louisiana)\s+\d{5})/i)

    const photo_url = `https://senate.la.gov/SenPics/Sen${id}.jpg`

    members.push({
      la_website_id: id,
      name,
      district_number,
      party,
      chamber: 'senate',
      photo_url,
      office_address: addrM ? addrM[1].replace(/\s+/g, ' ').trim() : null,
      phone: phones[0] || null,
      fax: faxM ? faxM[1] : (phones[1] || null),
      email: emailM ? emailM[0] : null,
    })
  }

  members.sort((a, b) => (a.district_number ?? 999) - (b.district_number ?? 999))
  console.log(`  Found ${members.length} Senate members`)
  return members
}

// ── Profile detail scrapers ───────────────────────────────────────────────────

interface ProfileDetail {
  committees:            { committee_name: string; role: string; chamber: string }[]
  caucuses:              string[]
  year_elected:          number | null
  term_end:              string | null
  parishes_represented:  string[]
  legislative_assistant: string | null
  party:                 string | null
  office_address:        string | null
  phone:                 string | null
  fax:                   string | null
  email:                 string | null
  district_number:       number | null
}

function emptyDetail(): ProfileDetail {
  return {
    committees: [], caucuses: [], year_elected: null, term_end: null,
    parishes_represented: [], legislative_assistant: null,
    party: null, office_address: null, phone: null, fax: null, email: null,
    district_number: null,
  }
}

// Member email links on house pages: href="mailto:hse001@legis.la.gov"
// Also present: AVHelp@legis.la.gov?subject=... — excluded by checking for '?'
function extractMemberEmail($: ReturnType<typeof cheerioLoad>): string | null {
  let email: string | null = null
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $( el).attr('href') || ''
    const addr = href.replace('mailto:', '')
    if (addr.includes('?') || addr.toLowerCase().includes('avhelp')) return
    if (/@legis\.la\.gov/i.test(addr)) { email = addr; return false }
  })
  return email
}

async function scrapeHouseProfile(id: number): Promise<ProfileDetail> {
  const url = `https://house.louisiana.gov/H_Reps/members.aspx?ID=${id}`
  const html = await fetchHtml(url)
  if (!html) return emptyDetail()

  const $ = cheerioLoad(html)
  const body = textOf(html)
  const d = emptyDetail()

  // Party from PartyIcon image
  const partyImg = $('img[src*="PartyIcon"]').attr('src') || ''
  d.party = parseParty(partyImg) || parseParty(body)

  // District
  const distM = body.match(/District\s+(\d+)/i)
  if (distM) d.district_number = parseInt(distM[1])

  // Phones — "P: (NNN) NNN-NNNN" and "F: ..."
  const pM = body.match(/\bP:\s*([\d()\s.\-]{10,20})/)
  const fM = body.match(/\bF:\s*([\d()\s.\-]{10,20})/)
  if (pM) d.phone = pM[1].trim()
  if (fM && /\d{4}/.test(fM[1])) d.fax = fM[1].trim()

  // Email — exclude AVHelp and query-string links
  d.email = extractMemberEmail($)

  // Address — before the phone block
  const addrM = body.match(/(P\.\s*O\.\s*Box\s+\d+[^,\n]{0,30}|(?:\d{2,5}\s+[A-Za-z])[^\n]{5,60}(?:LA|Louisiana)\s+\d{5})/)
  if (addrM) d.office_address = addrM[1].replace(/\s+/g, ' ').trim()

  // Legislative assistant
  const laM = body.match(/Legislative Assistant:?\s*(.{3,80}?)(?:\s{3,}|Representing|$)/i)
  if (laM) d.legislative_assistant = laM[1].trim()

  // Parishes
  const parishM = body.match(/Representing Parishes:?\s*([A-Za-z ,]+?)(?:\s{3,}|Corresponding|$)/i)
  if (parishM) {
    d.parishes_represented = parishM[1].split(',').map(s => s.trim()).filter(s => s.length > 1)
  }

  // Year elected + term end
  const yearM = body.match(/Year Elected:?\s*(\d{4})/i)
  if (yearM) d.year_elected = parseInt(yearM[1])
  const termM = body.match(/Eligible to serve through\s+([^.]{5,40})/i)
  if (termM) d.term_end = termM[1].trim()

  // Committees — extracted from the span with id matching COMMITTEEASSIGNMENTS
  const cmteSpan = $('[id*="COMMITTEEASSIGNMENTS"]').first()
  if (cmteSpan.length) {
    d.committees = brLines(cmteSpan.html() || '')
      .filter(s => s.length > 3)
      .map(name => {
        const role = /chair/i.test(name) && !/vice/i.test(name) ? 'Chair'
          : /vice.?chair/i.test(name) ? 'Vice Chair' : 'Member'
        return { committee_name: name.replace(/\s*[-–]\s*(?:Chair|Vice\s+Chair)/i, '').trim(), role, chamber: 'house' }
      })
  }

  // Caucuses
  const caucusSpan = $('[id*="CAUCUSAFFILIATIONS"]').first()
  if (caucusSpan.length) {
    d.caucuses = brLines(caucusSpan.html() || '').filter(s => s.length > 3)
  }

  return d
}

async function scrapeSenateProfile(id: number): Promise<ProfileDetail> {
  const url = `https://senate.la.gov/smembers.aspx?ID=${id}`
  const html = await fetchHtml(url)
  if (!html) return emptyDetail()

  const $ = cheerioLoad(html)
  const body = textOf(html)
  const d = emptyDetail()

  d.party = parseParty(body)

  const distM = body.match(/District\s+(\d+)/i)
  if (distM) d.district_number = parseInt(distM[1])

  // Phones — two sequential, second may be labeled (FAX)
  const phones = body.match(/\(\d{3}\)\d{3}-\d{4}/g) || []
  if (phones[0]) d.phone = phones[0]
  const faxM = body.match(/(\(\d{3}\)\d{3}-\d{4})\s*\(FAX\)/i)
  if (faxM) d.fax = faxM[1]
  else if (phones[1] && phones[1] !== phones[0]) d.fax = phones[1]

  // Email — same exclusion logic
  d.email = extractMemberEmail($)

  // Address
  const addrM = body.match(/(\d{2,5}\s+[A-Za-z][^(]*(?:LA|Louisiana)\s+\d{5})/i)
  if (addrM) d.office_address = addrM[1].replace(/\s+/g, ' ').trim()

  // Legislative assistant
  const laM = body.match(/(?:Legislative\s+)?(?:Assistant|Staff)[:\s]+([A-Za-z\s.,']{3,60})(?:\s{3,}|$)/i)
  if (laM) d.legislative_assistant = laM[1].trim()

  // Parishes
  const parishM = body.match(/(?:\(Representing\)|Representing)\s+([A-Za-z ,]+?)(?:\s+Corresponding|\s+District\s+Map|\s{3,}|$)/i)
  if (parishM) {
    d.parishes_represented = parishM[1].split(',').map(s => s.trim()).filter(s => s.length > 1 && !/\d/.test(s))
  }

  // Year elected + term end
  const yearM = body.match(/Year Elected:?\s*(\d{4})/i)
  if (yearM) d.year_elected = parseInt(yearM[1])
  const termM = body.match(/Eligible to serve through\s+([^.]{5,40})/i)
  if (termM) d.term_end = termM[1].trim()

  // Committees — try span with id matching COMMITTEEASSIGNMENTS, then by heading
  const cmteSpan = $('[id*="COMMITTEEASSIGNMENT"], [id*="committee"]').first()
  if (cmteSpan.length) {
    d.committees = brLines(cmteSpan.html() || '')
      .filter(s => s.length > 3)
      .map(name => {
        const role = /chair/i.test(name) && !/vice/i.test(name) ? 'Chair'
          : /vice.?chair/i.test(name) ? 'Vice Chair' : 'Member'
        return { committee_name: name.replace(/\s*[-–]\s*(?:Chair|Vice\s+Chair)/i, '').trim(), role, chamber: 'senate' }
      })
  }

  return d
}

// ── LegiScan cross-reference ──────────────────────────────────────────────────

async function buildLegiscanPeopleMap(sessionId: number): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const data = await legiscan('getSessionPeople', { id: sessionId })
    if (!data) return map
    const people: any[] = data.sessionpeople?.people || []
    for (const p of people) {
      if (p.name && p.people_id) map.set(normalizeName(p.name), p.people_id)
    }
    console.log(`  LegiScan people map: ${map.size} entries`)
  } catch (e: any) {
    console.warn(`  getSessionPeople failed (non-fatal): ${e.message}`)
  }
  return map
}

async function getLatestSessionId(): Promise<number | null> {
  try {
    if (!LEGISCAN_API_KEY) return null
    const data = await legiscan('getSessionList', { state: 'LA' })
    if (!data) return null
    const year = new Date().getFullYear()
    const sessions: any[] = data.sessions
    const session =
      sessions.find((s: any) => s.special === 0 && (s.year_start === year || s.year_end === year)) ??
      sessions.find((s: any) => s.year_end >= year)
    return session?.session_id ?? null
  } catch {
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function syncLegislators() {
  console.log('=== Legislator Sync ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('')

  // 1. LegiScan people index
  console.log('Building LegiScan people index...')
  const sessionId = await getLatestSessionId()
  if (sessionId) await sleep(SCRAPE_DELAY)
  const legiscanMap = sessionId ? await buildLegiscanPeopleMap(sessionId) : new Map<string, number>()
  if (sessionId) await sleep(SCRAPE_DELAY)

  // 2. Member lists
  console.log('\nScraping member lists...')
  const houseStubs = await scrapeHouseList()
  await sleep(SCRAPE_DELAY)
  const senateStubs = await scrapeSenateList()
  await sleep(SCRAPE_DELAY)

  const allStubs: (MemberStub | SenateMemberStub)[] = [...houseStubs, ...senateStubs]
  console.log(`\nTotal: ${allStubs.length} (${houseStubs.length} House, ${senateStubs.length} Senate)`)
  console.log('---\nScraping profiles...')

  let inserted = 0, updated = 0, scraped = 0, scrapeErrors = 0, dbErrors = 0

  for (const stub of allStubs) {
    const label = `${stub.chamber === 'house' ? 'H' : 'S'}-${stub.district_number ?? '?'} ${stub.name}`

    try {
      const detail = stub.chamber === 'house'
        ? await scrapeHouseProfile(stub.la_website_id)
        : await scrapeSenateProfile(stub.la_website_id)

      scraped++

      const legiscanId = legiscanMap.get(normalizeName(stub.name)) ?? null
      const stubExtra = stub as SenateMemberStub

      const incoming: Record<string, any> = {
        la_website_id:         stub.la_website_id,
        chamber:               stub.chamber,
        name:                  stub.name,
        legiscan_people_id:    legiscanId,
        party:                 detail.party || stub.party,
        district_number:       detail.district_number || stub.district_number,
        photo_url:             stub.photo_url,
        office_address:        detail.office_address || stubExtra.office_address || null,
        phone:                 detail.phone || stubExtra.phone || null,
        fax:                   detail.fax || stubExtra.fax || null,
        email:                 detail.email || stubExtra.email || null,
        legislative_assistant: detail.legislative_assistant,
        parishes_represented:  detail.parishes_represented,
        year_elected:          detail.year_elected,
        term_end:              detail.term_end,
        education:             null,
        committees:            detail.committees,
        caucuses:              detail.caucuses,
        last_scraped_at:       new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('legislators')
        .select('*')
        .eq('la_website_id', stub.la_website_id)
        .eq('chamber', stub.chamber)
        .maybeSingle()

      if (existing) {
        const merged = mergeIncoming(existing, incoming)
        const { error } = await supabase.from('legislators').update(merged).eq('id', existing.id)
        if (error) { console.error(`  ✗ ${label}: ${error.message}`); dbErrors++ }
        else { console.log(`  ~ ${label}${legiscanId ? ' [LS✓]' : ''}`); updated++ }
      } else {
        const { error } = await supabase.from('legislators').insert(incoming)
        if (error) { console.error(`  ✗ ${label}: ${error.message}`); dbErrors++ }
        else { console.log(`  + ${label}${legiscanId ? ' [LS✓]' : ''}`); inserted++ }
      }
    } catch (e: any) {
      console.error(`  ✗ ${label}: ${e.message}`)
      scrapeErrors++
    }

    await sleep(SCRAPE_DELAY)
  }

  console.log('\n=== Sync complete ===')
  console.log(`  Total members:       ${allStubs.length}`)
  console.log(`  Profiles scraped:    ${scraped} / ${allStubs.length}`)
  console.log(`  Scrape failures:     ${scrapeErrors}`)
  console.log(`  Inserted:            ${inserted}`)
  console.log(`  Updated:             ${updated}`)
  console.log(`  DB errors:           ${dbErrors}`)
  console.log(`  LegiScan crossrefs:  ${legiscanMap.size} indexed`)

  // Sample records
  console.log('\n--- Sample records ---')
  const { data: samples } = await supabase
    .from('legislators')
    .select('name, chamber, party, district_number, photo_url, email, committees, parishes_represented')
    .order('chamber')
    .order('district_number', { nullsFirst: false })
    .limit(4)

  if (samples?.length) {
    for (const s of samples) {
      const cmtes = s.committees as any[]
      console.log(`\n${s.chamber.toUpperCase()} D-${s.district_number ?? '?'}: ${s.name}`)
      console.log(`  Party:      ${s.party ?? '(not found)'}`)
      console.log(`  Email:      ${s.email ?? '(not found)'}`)
      console.log(`  Photo URL:  ${s.photo_url ?? '(not found)'}`)
      console.log(`  Parishes:   ${(s.parishes_represented as string[])?.join(', ') || '(none)'}`)
      console.log(`  Committees: ${cmtes?.length ?? 0}${cmtes?.[0] ? ` — ${cmtes[0].committee_name}` : ''}`)
    }
  }

  if (scrapeErrors > 0 || dbErrors > 0) {
    console.warn(`\nWARNING: ${scrapeErrors} scrape + ${dbErrors} DB errors. Will retry on next run.`)
  }
}

syncLegislators().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
