// scripts/extract-bill-text.ts
// =============================================================================
// PDF Extraction Pipeline — primary text source for Louisiana bill analysis
//
// Architecture:
//   pdfjs-dist (primary)  → text positioning, annotations, operator-list lines
//   pdf2json   (secondary) → text content cross-validation
//   crypto     (built-in)  → SHA-256 hash for change detection
//
// PDF URL pattern: https://legis.la.gov/Legis/ViewDocument.aspx?d={docId}
//   docId discovered by scraping BillInfo page; cached in pdf_url column.
//
// Rate limiting: 1500ms delay between fetches, max 40 PDFs/hour.
// Retries: up to 3 attempts with 5s / 15s / 45s exponential backoff.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// pdfjs-dist v5 — legacy Node.js build (ESM, no DOM dependency)
// @ts-ignore — .mjs ESM import
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
pdfjs.GlobalWorkerOptions.workerSrc = '' // disable web worker; use main thread in Node.js

// pdf2json — secondary library for text content validation
// @ts-ignore
import PDFParser from 'pdf2json'

// ── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Constants ────────────────────────────────────────────────────────────────

const UA = 'SessionSource-Louisiana/1.0 (public legislative transparency project; non-commercial; contact via legis.la.gov)'
const FETCH_DELAY_MS   = 1500
const MAX_PER_HOUR     = 40
const MAX_RETRIES      = 3
const RETRY_DELAYS_MS  = [5_000, 15_000, 45_000]

// pdfjs OPS codes (fallback values match pdfjs-dist v5 defaults)
const OPS = (pdfjs as any).OPS as Record<string, number> ?? {}
const OP_MOVE_TO         = OPS.moveTo         ?? 13
const OP_LINE_TO         = OPS.lineTo         ?? 14
const OP_CONSTRUCT_PATH  = OPS.constructPath  ?? 91

// ── Louisiana character correction map ───────────────────────────────────────
// Handles common encoding artifacts that arise when the Legislature's
// document management system exports Word documents to PDF.

const LA_CHAR_CORRECTIONS: Array<[RegExp, string]> = [
  // Section symbol — appears as garbage when encoding mismatches
  [/\uFFFD(?=\s*\d)/g,           '§'],
  [/[\u25A0\u25A1\u2610\u2611]/g, '§'],   // block/box chars often substituted for §

  // Accented characters common in Louisiana names and places
  [/[Aa]\u0300/g, 'à'], [/[Aa]\u0302/g, 'â'], [/[Ee]\u0301/g, 'é'],
  [/[Ee]\u0300/g, 'è'], [/[Ee]\u0302/g, 'ê'], [/[Ee]\u0308/g, 'ë'],
  [/[Oo]\u0302/g, 'ô'], [/[Uu]\u0300/g, 'ù'], [/[Uu]\u0302/g, 'û'],
  [/[Uu]\u0308/g, 'ü'], [/[Cc]\u0327/g, 'ç'],

  // Citation formatting fixes
  [/R\.S\.(\d)/g,   'R.S. $1'],    // "R.S.14:67" → "R.S. 14:67"
  [/C\.C\.(\d)/g,   'C.C. $1'],

  // Ellipsis normalization
  [/\.{3}/g, '…'],

  // Remove remaining replacement characters
  [/\uFFFD+/g, ''],
]

// ── Citation validation patterns ─────────────────────────────────────────────

const RS_CITATION_RE   = /R\.S\.\s+\d+:\d+/g
const CC_CITATION_RE   = /C\.C\.\s+Art\.\s+\d+/gi
const CCP_CITATION_RE  = /C\.C\.P\.\s+Art\.\s+\d+/gi
const CCRP_CITATION_RE = /C\.Cr\.P\.\s+Art\.\s+\d+/gi
const CONST_CITE_RE    = /Const\.\s+Art\.\s+[IVX]+/gi

// ── Types ────────────────────────────────────────────────────────────────────

type ExtractionQuality = 'full' | 'partial' | 'digest_only' | 'abstract_only' | 'failed'

interface HorizontalLine {
  x1: number
  x2: number
  y:  number
  page: number
}

interface FormattedTextItem {
  text:          string
  x:             number
  y:             number       // PDF baseline y (y-up from page bottom)
  width:         number
  fontSize:      number
  fontName:      string
  underline:     boolean      // [ADDED] text
  strikethrough: boolean      // [DELETED] text
  bold:          boolean
  page:          number
}

interface PdfjsResult {
  items:               FormattedTextItem[]
  pageCount:           number
  pageHeights:         number[]
  rawText:             string
  formattingDetected:  boolean
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWithRetry(url: string, opts: RequestInit = {}, label = ''): Promise<Response | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': UA, ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      })
      if (resp.status === 429) {
        console.warn(`    429 rate limit — backing off 120s (${label})`)
        await sleep(120_000)
        continue
      }
      if (resp.status === 503) {
        console.warn(`    503 — backing off 60s (${label})`)
        await sleep(60_000)
        continue
      }
      if (resp.status === 404) {
        console.warn(`    404 not found: ${url}`)
        return null
      }
      if (!resp.ok) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`    HTTP ${resp.status} (${label}) — retry ${attempt + 1}`)
          await sleep(RETRY_DELAYS_MS[attempt])
        }
        continue
      }
      return resp
    } catch (e: any) {
      if (attempt < MAX_RETRIES - 1) {
        console.warn(`    Fetch error (${label}, attempt ${attempt + 1}): ${e.message}`)
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }
  return null
}

// ── PDF URL discovery ─────────────────────────────────────────────────────────
// The BillInfo page lists all document versions as ViewDocument.aspx?d=NNN links.
// The first such link is the primary (enrolled/engrossed) bill text PDF.

async function discoverPdfUrl(
  bill: { bill_number: string; state_link: string | null }
): Promise<string | null> {
  const billNum = (bill.bill_number ?? '').replace(/\s+/g, '')
  if (!billNum) return null

  // Use stored state_link if it already points to legis.la.gov
  let billInfoUrl: string
  if (bill.state_link?.includes('legis.la.gov/legis/BillInfo')) {
    billInfoUrl = bill.state_link
  } else {
    // Extract session code from state_link if possible, else default to 26RS
    const sessionMatch = bill.state_link?.match(/[?&]s=(\d+RS)/i)
    const session = sessionMatch?.[1]?.toUpperCase() ?? '26RS'
    billInfoUrl = `https://legis.la.gov/legis/BillInfo.aspx?s=${session}&b=${billNum}&sbi=y`
  }

  const resp = await fetchWithRetry(billInfoUrl, { headers: { Accept: 'text/html' } }, `BillInfo:${billNum}`)
  if (!resp) return null

  const html = await resp.text()

  // Primary: ViewDocument.aspx?d=NNN (all bill types use this)
  const viewMatch = html.match(/ViewDocument\.aspx\?d=(\d+)/i)
  if (viewMatch) {
    return `https://legis.la.gov/Legis/ViewDocument.aspx?d=${viewMatch[1]}`
  }

  // Fallback: direct .pdf href
  const pdfMatch = html.match(/href="([^"]*\.pdf[^"]*)"/i)
  if (pdfMatch) {
    const href = pdfMatch[1]
    return href.startsWith('http') ? href : `https://legis.la.gov${href}`
  }

  return null
}

// ── Operator-list line extraction ─────────────────────────────────────────────
// Walks a pdfjs operator list and collects horizontal line segments.
// These are used as a backup for formatting detection when PDF annotations
// are not present (e.g., line-drawn strikethrough/underline in older PDFs).

function extractHorizontalLines(opList: any, pageNum: number): HorizontalLine[] {
  const lines: HorizontalLine[] = []
  const { fnArray, argsArray } = opList
  let curX = 0, curY = 0

  for (let i = 0; i < fnArray.length; i++) {
    const fn   = fnArray[i]
    const args = argsArray[i]

    if (fn === OP_MOVE_TO && args) {
      curX = args[0] ?? 0
      curY = args[1] ?? 0
    } else if (fn === OP_LINE_TO && args) {
      const endX = args[0] ?? 0
      const endY = args[1] ?? 0
      // Horizontal: y-delta < 0.5pt, x-span > 2pt (meaningful width)
      if (Math.abs(endY - curY) < 0.5 && Math.abs(endX - curX) > 2) {
        lines.push({ x1: Math.min(curX, endX), x2: Math.max(curX, endX), y: curY, page: pageNum })
      }
      curX = endX; curY = endY
    } else if (fn === OP_CONSTRUCT_PATH && args?.[0] && args?.[1]) {
      // constructPath: args[0] = sub-op codes (0=m, 1=l, 2=c), args[1] = flat coords
      const subOps: number[] = args[0]
      const coords: number[] = args[1]
      let ci = 0, cx = 0, cy = 0
      for (const op of subOps) {
        if (op === 0) {                            // moveTo
          cx = coords[ci++] ?? 0; cy = coords[ci++] ?? 0
        } else if (op === 1) {                     // lineTo
          const ex = coords[ci++] ?? 0, ey = coords[ci++] ?? 0
          if (Math.abs(ey - cy) < 0.5 && Math.abs(ex - cx) > 2) {
            lines.push({ x1: Math.min(cx, ex), x2: Math.max(cx, ex), y: cy, page: pageNum })
          }
          cx = ex; cy = ey
        } else if (op === 2) { ci += 6 }          // bezierCurveTo: skip 6 coords
      }
    }
  }
  return lines
}

// ── pdfjs-dist extraction ─────────────────────────────────────────────────────
// Primary extraction using pdfjs-dist's text content API.
// Formatting detection strategy (in priority order):
//   1. PDF annotations (StrikeOut / Underline) — most reliable for Word-generated PDFs
//   2. Operator-list horizontal lines correlated with text item positions

async function extractWithPdfJs(buffer: Buffer): Promise<PdfjsResult> {
  const data     = new Uint8Array(buffer)
  const loadTask = (pdfjs as any).getDocument({ data, disableFontFace: true })
  const doc      = await loadTask.promise

  const pageCount  = doc.numPages
  const allItems:   FormattedTextItem[] = []
  const pageHeights: number[] = []
  let formattingDetected = false

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page     = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0 })
    pageHeights.push(viewport.height)

    // ── Text content ──────────────────────────────────────────────────────────
    const textContent = await page.getTextContent()

    // ── Annotations (primary formatting source) ───────────────────────────────
    let underlineRects:  number[][] = []  // [llx, lly, urx, ury] in PDF user space
    let strikeoutRects:  number[][] = []
    try {
      const annotations = await page.getAnnotations({ intent: 'display' })
      for (const ann of (annotations ?? [])) {
        if (!ann.rect) continue
        if (ann.subtype === 'Underline')  { underlineRects.push(ann.rect);  formattingDetected = true }
        if (ann.subtype === 'StrikeOut')  { strikeoutRects.push(ann.rect);  formattingDetected = true }
      }
    } catch (_) { /* annotations unavailable for this page */ }

    // ── Operator-list lines (backup formatting source) ────────────────────────
    let opLines: HorizontalLine[] = []
    try {
      const opList = await page.getOperatorList()
      opLines = extractHorizontalLines(opList, pageNum)
    } catch (_) {}

    // ── Process text items ────────────────────────────────────────────────────
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue

      const transform = item.transform as number[]   // [a, b, c, d, e, f]
      const x        = transform[4]
      const y        = transform[5]                  // baseline in PDF user space (y-up)
      const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12
      const width    = (item as any).width ?? 0

      // ── Underline detection ────────────────────────────────────────────────
      let underline = false
      for (const rect of underlineRects) {
        // x-range overlap
        if (x > rect[2] + 2 || x + width < rect[0] - 2) continue
        // Underline annotation sits just below baseline: lly ≈ baseline
        if (Math.abs(rect[1] - y) < fontSize * 0.5) { underline = true; break }
      }
      // Operator-list fallback: horizontal line within ±20% of fontSize below baseline
      if (!underline && opLines.length > 0) {
        for (const line of opLines) {
          if (line.page !== pageNum) continue
          if (line.x2 < x - 1 || line.x1 > x + width + 1) continue
          const dy = line.y - y  // positive = above baseline (PDF y-up)
          if (dy >= -fontSize * 0.2 && dy <= fontSize * 0.25) {
            underline = true; formattingDetected = true; break
          }
        }
      }

      // ── Strikethrough detection ───────────────────────────────────────────
      let strikethrough = false
      const strikeTargetY = y + fontSize * 0.35   // typical strikethrough position
      for (const rect of strikeoutRects) {
        if (x > rect[2] + 2 || x + width < rect[0] - 2) continue
        const midY = (rect[1] + rect[3]) / 2
        if (Math.abs(midY - strikeTargetY) < fontSize * 0.5) { strikethrough = true; break }
      }
      // Operator-list fallback
      if (!strikethrough && opLines.length > 0) {
        for (const line of opLines) {
          if (line.page !== pageNum) continue
          if (line.x2 < x - 1 || line.x1 > x + width + 1) continue
          if (Math.abs(line.y - strikeTargetY) < fontSize * 0.3) {
            strikethrough = true; formattingDetected = true; break
          }
        }
      }

      // ── Bold detection ─────────────────────────────────────────────────────
      const bold = /Bold|Heavy|Black/i.test((item as any).fontName ?? '')

      allItems.push({ text: item.str, x, y, width, fontSize, fontName: (item as any).fontName ?? '', underline, strikethrough, bold, page: pageNum })
    }
  }

  const rawText = buildRawText(allItems)
  return { items: allItems, pageCount, pageHeights, rawText, formattingDetected }
}

// ── Text reconstruction from positioned items ─────────────────────────────────
// Groups items by page and line (y-coordinate proximity), then joins into text.

function buildRawText(items: FormattedTextItem[]): string {
  return buildPageTexts(items, () => (_item, _fmt) => '')
}

function buildFormattedText(items: FormattedTextItem[]): {
  text: string
  deletedText: string
  addedText: string
} {
  const deletedParts: string[] = []
  const addedParts:   string[] = []

  const text = buildPageTexts(items, () => (item, _fmt) => {
    if (item.strikethrough) { deletedParts.push(item.text); return `[DELETED: ${item.text}]` }
    if (item.underline)     { addedParts.push(item.text);   return `[ADDED: ${item.text}]` }
    if (item.bold)          { return `[BOLD: ${item.text}]` }
    return item.text
  })

  return { text, deletedText: deletedParts.join(' '), addedText: addedParts.join(' ') }
}

type ItemRenderer = (item: FormattedTextItem, fmt: boolean) => string

function buildPageTexts(
  items: FormattedTextItem[],
  makeRenderer: () => ItemRenderer
): string {
  if (items.length === 0) return ''

  // Group by page
  const byPage = new Map<number, FormattedTextItem[]>()
  for (const it of items) {
    const arr = byPage.get(it.page) ?? []; arr.push(it); byPage.set(it.page, arr)
  }

  const pageTexts: string[] = []
  const LINE_TOL = 3   // pts — items within this vertical distance share a line

  for (const [, pageItems] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    // Sort by y descending (top of page first in PDF y-up space), then x ascending
    pageItems.sort((a, b) => b.y - a.y || a.x - b.x)

    const render = makeRenderer()
    const lineGroups: FormattedTextItem[][] = []
    let curLineY = Infinity, curLine: FormattedTextItem[] = []

    for (const item of pageItems) {
      if (Math.abs(item.y - curLineY) > LINE_TOL) {
        if (curLine.length > 0) lineGroups.push(curLine)
        curLine  = []
        curLineY = item.y
      }
      curLine.push(item)
    }
    if (curLine.length > 0) lineGroups.push(curLine)

    const lineTexts = lineGroups.map(line =>
      line.map(it => render(it, it.underline || it.strikethrough)).join(' ')
    )
    pageTexts.push(lineTexts.join('\n'))
  }

  return pageTexts.join('\n\n')
}

// ── pdf2json extraction (text validation) ─────────────────────────────────────

function parsePdf2Json(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1)   // 1 = rawText mode (decodes encoded text)
    parser.on('pdfParser_dataError', (err: any) => reject(new Error(err?.parserError ?? String(err))))
    parser.on('pdfParser_dataReady', (data: any) => {
      try {
        const text = (data?.Pages ?? [])
          .map((page: any) =>
            (page.Texts ?? [])
              .map((t: any) => (t.R ?? []).map((r: any) => decodeURIComponent(r.T ?? '')).join(''))
              .join(' ')
          )
          .join('\n\n')
        resolve(text)
      } catch (e) { reject(e) }
    })
    parser.parseBuffer(buffer)
  })
}

// ── Extraction comparison ─────────────────────────────────────────────────────
// Compares pdfjs-dist and pdf2json results to select the more complete extraction.

function compareExtractions(pdfjsText: string, pdf2jsonText: string): {
  usePdfjs: boolean
  similarity: number
  notes: string[]
} {
  const notes: string[] = []
  if (!pdfjsText && !pdf2jsonText) return { usePdfjs: true, similarity: 0, notes: ['both libraries returned empty text'] }
  if (!pdfjsText)    return { usePdfjs: false, similarity: 0, notes: ['pdfjs returned empty — using pdf2json'] }
  if (!pdf2jsonText) return { usePdfjs: true,  similarity: 0, notes: ['pdf2json returned empty'] }

  const maxLen  = Math.max(pdfjsText.length, pdf2jsonText.length)
  const minLen  = Math.min(pdfjsText.length, pdf2jsonText.length)
  const similarity = minLen / maxLen

  // Compare R.S. citation counts — both should extract similar numbers
  const pdfjsCites = (pdfjsText.match(RS_CITATION_RE) ?? []).length
  const p2jCites   = (pdf2jsonText.match(RS_CITATION_RE) ?? []).length
  if (Math.abs(pdfjsCites - p2jCites) > 3) {
    notes.push(`R.S. citation count mismatch: pdfjs=${pdfjsCites}, pdf2json=${p2jCites}`)
  }

  if (similarity < 0.6) {
    notes.push(`Low extraction similarity (${(similarity * 100).toFixed(0)}%) — results differ significantly`)
  }

  // Prefer pdfjs-dist: it provides formatting metadata; fall back only if pdf2json is dramatically longer
  const usePdfjs = pdfjsText.length >= pdf2jsonText.length * 0.75
  if (!usePdfjs) notes.push(`pdf2json extraction is ${(pdf2jsonText.length / pdfjsText.length).toFixed(1)}x longer — using pdf2json`)

  return { usePdfjs, similarity, notes }
}

// ── Post-processing pipeline ──────────────────────────────────────────────────
// Applied in strict order after extraction. Each step runs on the output of the previous.

function applyCharacterCorrections(text: string): string {
  for (const [pattern, replacement] of LA_CHAR_CORRECTIONS) {
    text = text.replace(pattern, replacement)
  }
  return text
}

function reconstructHyphenatedWords(text: string): string {
  // Reconnect line-break-split words: "legis-\nlative" → "legislative"
  // Preserve intentional hyphens: "R.S. 14:67-\n14:70" (numeric-hyphen-numeric = citation range)
  return text.replace(/(\w{2,})-\n([a-z]\w)/g, (full, before, after) => {
    if (/\d$/.test(before)) return full   // citation range — keep break
    return before + after
  })
}

function stripLineNumbers(text: string): string {
  // Louisiana bills have 1-2 digit line numbers in the left margin of every line.
  // Pattern: line starts with optional whitespace, then the number, then spaces,
  // then the actual text (which starts with a letter, quote, §, or '(').
  return text
    .split('\n')
    .map(line => line.replace(/^\s{0,5}\b([1-9]\d?)\s{1,4}(?=[A-Za-z§"(])/, ''))
    .join('\n')
}

function stripRepeatingHeaders(text: string, pageCount: number): string {
  // Lines that repeat many times across pages are likely headers or footers.
  const lines    = text.split('\n')
  const freqMap  = new Map<string, number>()
  for (const line of lines) {
    const t = line.trim()
    if (t.length >= 4 && t.length < 100) freqMap.set(t, (freqMap.get(t) ?? 0) + 1)
  }
  const threshold   = Math.max(3, Math.floor(pageCount / 2))
  const headerLines = new Set(
    [...freqMap.entries()]
      .filter(([t, count]) => count >= threshold && /^\s*\d+\s*$|HB|SB|HCR|SCR|HR|SR|Page\s+\d/i.test(t))
      .map(([t]) => t)
  )
  return lines.filter(l => !headerLines.has(l.trim())).join('\n')
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^[ \t]+$/gm, '')
    .trim()
}

function postProcess(rawText: string, pageCount: number): string {
  let t = rawText
  t = applyCharacterCorrections(t)
  t = reconstructHyphenatedWords(t)
  t = stripRepeatingHeaders(t, pageCount)
  t = stripLineNumbers(t)
  t = normalizeWhitespace(t)
  return t
}

// ── Abstract extraction ────────────────────────────────────────────────────────
// Every Louisiana bill begins with an enacting clause ("AN ACT to amend...").
// This is one of the highest-value elements and must always be extracted completely.

function extractAbstract(text: string): string | null {
  const startIdx = text.search(/\b(AN ACT|A JOINT RESOLUTION|A CONCURRENT RESOLUTION|A RESOLUTION)\b/i)
  if (startIdx === -1) return null

  const fromAbstract = text.substring(startIdx)

  // Abstract ends with "and to provide for related matters."
  const endMatch = fromAbstract.match(/and to provide for related matters\.?\s*/i)
  if (endMatch) {
    const endIdx = endMatch.index! + endMatch[0].length
    return fromAbstract.substring(0, endIdx).trim()
  }

  // Fallback: take first paragraph (first double newline) — cap at 3000 chars
  const firstPara = fromAbstract.split(/\n\n/)[0]?.trim()
  if (firstPara && firstPara.length >= 50) {
    return firstPara.substring(0, 3000)
  }

  return null
}

// ── Digest extraction ──────────────────────────────────────────────────────────
// The Louisiana Legislative Bureau digest appears at the end of every bill PDF.
// It is written by professional legislative attorneys and is the most authoritative
// plain-English interpretation of a bill's effect available from any source.

function extractDigest(text: string): { digest: string | null; notes: string[] } {
  const notes: string[] = []

  // Search for the DIGEST heading — it appears as a standalone all-caps or bold heading
  const digestRE = /\bDIGEST\b/i
  const match    = digestRE.exec(text)
  if (!match) {
    notes.push('DIGEST_NOT_FOUND')
    return { digest: null, notes }
  }

  const digestStart = match.index
  let digestText = text.substring(digestStart)

  // Remove the "DIGEST" heading and any boilerplate attribution line
  digestText = digestText
    .replace(/^DIGEST\s*/i, '')
    .replace(/The digest printed below was prepared by[^\n]*/i, '')
    .replace(/HLS \d+RS[^\n]*/i, '')     // session code sometimes appears here
    .trim()

  if (digestText.length < 50) {
    notes.push('DIGEST_TOO_SHORT — possible false positive; not stored')
    return { digest: null, notes }
  }

  // Validate: digest must contain recognizable legislative language
  const hasLegalLanguage = /present law|proposed law|provides|requires|authorizes|prohibits|amends|repeals|enacted|existing law|this bill|Section \d+/i.test(digestText)
  if (!hasLegalLanguage) {
    notes.push('DIGEST_VALIDATION_FAILED — text does not contain expected legal language')
    return { digest: null, notes }
  }

  return { digest: digestText, notes }
}

// ── Extraction quality scoring ─────────────────────────────────────────────────
// Scored with strict honesty — never round up. Quality directly determines
// how the summary generation layer handles each bill.

function scoreExtraction(params: {
  abstract: string | null
  digest: string | null
  bodyText: string
  formattingDetected: boolean
  rsCitationCount: number
  notes: string[]
}): ExtractionQuality {
  const { abstract, digest, bodyText, formattingDetected, rsCitationCount, notes } = params

  // Nothing usable at all
  if (!abstract && !digest && bodyText.length < 200) return 'failed'

  // Only very minimal text — treat as failed
  if (bodyText.length < 200 && !digest) return 'failed'

  // Full: all elements present, formatting detected, citations found
  if (
    abstract &&
    digest &&
    bodyText.length > 1000 &&
    formattingDetected &&
    rsCitationCount > 0 &&
    !notes.some(n => n.includes('FORMATTING_UNDETECTABLE') || n.includes('garbled'))
  ) return 'full'

  // Digest + abstract but body text missing or thin
  if (digest && (!bodyText || bodyText.length < 200)) return 'digest_only'

  // Abstract only — body and digest missing
  if (abstract && !digest && bodyText.length < 200) return 'abstract_only'

  // Everything else with some content → partial
  return 'partial'
}

// ── Single bill processing ─────────────────────────────────────────────────────

async function processBill(bill: any): Promise<{
  quality: ExtractionQuality | 'skipped'
  formattingDetected: boolean
  rsCitations: number
  abstractLen: number
  digestLen: number
  notes: string[]
}> {
  const label = bill.bill_number ?? `id=${bill.id}`
  console.log(`\n  Processing ${label}...`)
  const notes: string[] = []

  // ── Step 1: Resolve PDF URL ─────────────────────────────────────────────────
  let pdfUrl: string | null = bill.pdf_url ?? null
  if (!pdfUrl) {
    await sleep(FETCH_DELAY_MS)
    pdfUrl = await discoverPdfUrl(bill)
    if (!pdfUrl) {
      console.log(`    PDF URL not found`)
      await supabase.from('Bills').update({
        extraction_quality: 'failed',
        extraction_notes:   'PDF URL not found on BillInfo page',
        text_last_verified_at: new Date().toISOString(),
      }).eq('id', bill.id)
      return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['PDF URL not found'] }
    }
    console.log(`    PDF URL: ${pdfUrl}`)
  }

  // ── Step 2: Fetch PDF ───────────────────────────────────────────────────────
  await sleep(FETCH_DELAY_MS)
  console.log(`    Fetching PDF...`)
  const pdfResp = await fetchWithRetry(pdfUrl, { headers: { Accept: 'application/pdf,*/*' } }, label)
  if (!pdfResp) {
    await supabase.from('Bills').update({
      extraction_quality: 'failed',
      extraction_notes:   `PDF fetch failed after ${MAX_RETRIES} retries`,
      pdf_url: pdfUrl,
      text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['PDF fetch failed'] }
  }

  const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer())
  if (pdfBuffer.length < 500) {
    notes.push('PDF too small — likely error response page')
    await supabase.from('Bills').update({
      extraction_quality: 'failed', extraction_notes: notes.join('; '),
      pdf_url: pdfUrl, text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes }
  }
  console.log(`    PDF fetched: ${(pdfBuffer.length / 1024).toFixed(0)} KB`)

  // ── Step 3: Hash for change detection ──────────────────────────────────────
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')

  // Skip re-extraction if PDF unchanged and quality isn't 'failed'
  if (
    bill.pdf_text_hash === pdfHash &&
    bill.extraction_quality &&
    bill.extraction_quality !== 'failed'
  ) {
    console.log(`    PDF unchanged (hash match) — updating verification timestamp only`)
    await supabase.from('Bills').update({ text_last_verified_at: new Date().toISOString() }).eq('id', bill.id)
    return { quality: 'skipped', formattingDetected: false, rsCitations: 0, abstractLen: 0, digestLen: 0, notes: ['hash_match_skip'] }
  }

  // ── Step 4: pdfjs-dist extraction ──────────────────────────────────────────
  console.log(`    Extracting with pdfjs-dist...`)
  let pdfjsResult: PdfjsResult | null = null
  try {
    pdfjsResult = await extractWithPdfJs(pdfBuffer)
    console.log(`    pdfjs: ${pdfjsResult.pageCount} pages, ${pdfjsResult.rawText.length} chars, formatting=${pdfjsResult.formattingDetected}`)
  } catch (e: any) {
    notes.push(`pdfjs-dist error: ${e.message}`)
    console.warn(`    pdfjs-dist failed: ${e.message}`)
  }

  // ── Step 5: pdf2json validation ──────────────────────────────────────────
  console.log(`    Validating with pdf2json...`)
  let pdf2jsonText = ''
  try {
    pdf2jsonText = await parsePdf2Json(pdfBuffer)
    console.log(`    pdf2json: ${pdf2jsonText.length} chars`)
  } catch (e: any) {
    notes.push(`pdf2json error: ${e.message}`)
    console.warn(`    pdf2json failed: ${e.message}`)
  }

  // ── Step 6: Compare and select ─────────────────────────────────────────────
  const { usePdfjs, similarity, notes: cmpNotes } = compareExtractions(
    pdfjsResult?.rawText ?? '', pdf2jsonText
  )
  notes.push(...cmpNotes)
  console.log(`    Extraction similarity: ${(similarity * 100).toFixed(0)}% — using ${usePdfjs ? 'pdfjs-dist' : 'pdf2json'}`)

  const primaryRawText      = usePdfjs ? (pdfjsResult?.rawText ?? '') : pdf2jsonText
  const formattingDetected  = pdfjsResult?.formattingDetected ?? false

  if (!formattingDetected) {
    notes.push('FORMATTING_UNDETECTABLE — annotations and operator-list analysis yielded no underline/strikethrough markers')
    console.warn(`    Formatting undetectable — [DELETED]/[ADDED] markers will not be present`)
  }

  if (primaryRawText.length < 200) {
    await supabase.from('Bills').update({
      extraction_quality: 'failed', extraction_notes: notes.join('; '),
      pdf_url: pdfUrl, pdf_text_hash: pdfHash,
      text_last_verified_at: new Date().toISOString(),
    }).eq('id', bill.id)
    return { quality: 'failed', formattingDetected, rsCitations: 0, abstractLen: 0, digestLen: 0, notes }
  }

  // ── Step 7: Post-processing pipeline ───────────────────────────────────────
  console.log(`    Post-processing...`)
  const pageCount = pdfjsResult?.pageCount ?? 1
  const cleanText = postProcess(primaryRawText, pageCount)

  // Build text with [DELETED:] / [ADDED:] / [BOLD:] markers (only when formatting detected)
  let fullTextWithMarkers = cleanText
  let deletedText  = ''
  let addedText    = ''
  if (formattingDetected && pdfjsResult) {
    const formatted = buildFormattedText(pdfjsResult.items)
    fullTextWithMarkers = postProcess(formatted.text, pageCount)
    deletedText         = formatted.deletedText
    addedText           = formatted.addedText
    if (deletedText || addedText) {
      console.log(`    Formatting: ${deletedText.length} chars deleted, ${addedText.length} chars added`)
    }
  }

  // ── Step 8: Extract abstract and digest ────────────────────────────────────
  const abstract = extractAbstract(cleanText)
  const { digest, notes: digestNotes } = extractDigest(cleanText)
  notes.push(...digestNotes)

  console.log(`    Abstract: ${abstract ? abstract.length + ' chars' : 'NOT FOUND'}`)
  console.log(`    Digest:   ${digest   ? digest.length   + ' chars' : 'NOT FOUND'}`)
  if (!abstract) notes.push('ABSTRACT_NOT_FOUND')

  // ── Step 9: Citation validation ────────────────────────────────────────────
  const rsCitations = (cleanText.match(RS_CITATION_RE) ?? []).length
  const ccCitations = (cleanText.match(CC_CITATION_RE) ?? []).length
  console.log(`    Citations: ${rsCitations} R.S., ${ccCitations} C.C.`)
  if (rsCitations === 0 && ccCitations === 0 && cleanText.length > 500) {
    notes.push('NO_CITATIONS_FOUND — possible extraction issue or resolution with no statute references')
  }

  // ── Step 10: Quality score ─────────────────────────────────────────────────
  const quality = scoreExtraction({ abstract, digest, bodyText: cleanText, formattingDetected, rsCitationCount: rsCitations, notes })
  console.log(`    Quality: ${quality}`)

  // ── Step 11: Amendment detection ───────────────────────────────────────────
  const isAmendment = bill.pdf_text_hash && bill.pdf_text_hash !== pdfHash &&
                      bill.summary_status === 'complete' && bill.summary
  if (isAmendment) {
    notes.push('AMENDMENT_DETECTED — previous summary archived')
    console.log(`    Amendment detected — archiving previous summary`)
  }

  // ── Step 12: Database update ───────────────────────────────────────────────
  const updateData: Record<string, any> = {
    pdf_url:               pdfUrl,
    pdf_text_hash:         pdfHash,
    full_text:             fullTextWithMarkers.substring(0, 100_000),
    abstract:              abstract,
    digest:                digest,
    deleted_text:          deletedText ? deletedText.substring(0, 50_000) : null,
    added_text:            addedText   ? addedText.substring(0, 50_000)   : null,
    extraction_quality:    quality,
    extraction_notes:      notes.length > 0 ? notes.join('; ') : null,
    text_last_verified_at: new Date().toISOString(),
  }

  if (isAmendment) {
    updateData.previous_summary  = bill.summary
    updateData.summary_status    = 'pending'
    updateData.summary_updated_at = new Date().toISOString()
  } else if (quality !== 'failed' && bill.summary_status !== 'complete') {
    updateData.summary_status = 'pending'
  }

  const { error } = await supabase.from('Bills').update(updateData).eq('id', bill.id)
  if (error) {
    console.error(`    DB update error: ${error.message}`)
    notes.push(`DB_ERROR: ${error.message}`)
  } else {
    console.log(`    ✓ ${label} saved (${quality})`)
  }

  return { quality, formattingDetected, rsCitations, abstractLen: abstract?.length ?? 0, digestLen: digest?.length ?? 0, notes }
}

// ── Test mode (20 bills — 10H, 10S, 2 HCR) ────────────────────────────────────

async function runTestMode() {
  console.log('\n=== TEST MODE — 20 bills (10 House, 10 Senate, 2 HCR) ===\n')

  const { data: testBills, error } = await supabase
    .from('Bills')
    .select('id, bill_number, bill_type, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
    .in('bill_number', [
      'HB25', 'HB35', 'HB91', 'HB192', 'HB215', 'HB238', 'HB248', 'HB251', 'HB259', 'HB262',
      'SB5', 'SB16', 'SB22', 'SB32', 'SB62', 'SB94', 'SB105',
      'HCR1', 'HCR2',
    ])

  if (error) { console.error('Query error:', error.message); process.exit(1) }
  if (!testBills || testBills.length === 0) {
    // Fallback: pick any 20 bills
    const { data: fallback } = await supabase.from('Bills')
      .select('id, bill_number, bill_type, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
      .limit(20)
    if (!fallback || fallback.length === 0) { console.log('No bills in database'); process.exit(0) }
    testBills?.push(...(fallback ?? []))
  }

  console.log(`Selected ${testBills!.length} test bills: ${testBills!.map(b => b.bill_number).join(', ')}\n`)

  const results: Array<{
    bill_number: string
    quality: string
    formattingDetected: boolean
    rsCitations: number
    abstractLen: number
    digestLen: number
    notes: string[]
  }> = []

  let fetched = 0
  for (const bill of testBills!) {
    if (fetched >= MAX_PER_HOUR) { console.log('\nHourly rate limit reached — stopping test'); break }
    const result = await processBill(bill)
    if (result.quality !== 'skipped') fetched++
    results.push({ bill_number: bill.bill_number, ...result })
    await sleep(FETCH_DELAY_MS)
  }

  // ── Test report ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70))
  console.log('TEST EXTRACTION REPORT')
  console.log('='.repeat(70))

  // Quality distribution
  const qualityDist: Record<string, number> = {}
  for (const r of results) {
    if (r.quality !== 'skipped') qualityDist[r.quality] = (qualityDist[r.quality] ?? 0) + 1
  }
  console.log('\nQuality Distribution:')
  for (const [q, count] of Object.entries(qualityDist)) {
    console.log(`  ${q.padEnd(14)}: ${count}`)
  }

  // Formatting detection
  const fmtDetected = results.filter(r => r.formattingDetected).length
  console.log(`\nFormatting detected (underline/strikethrough): ${fmtDetected}/${results.filter(r => r.quality !== 'skipped').length}`)

  // Abstract/digest coverage
  const withAbstract = results.filter(r => r.abstractLen > 0).length
  const withDigest   = results.filter(r => r.digestLen > 0).length
  console.log(`Abstract extracted: ${withAbstract}/${results.length}`)
  console.log(`Digest extracted:   ${withDigest}/${results.length}`)

  // Fetch fresh samples for detailed report
  const { data: samples } = await supabase
    .from('Bills')
    .select('bill_number, extraction_quality, extraction_notes, abstract, digest, deleted_text, added_text, full_text')
    .in('bill_number', testBills!.map(b => b.bill_number))

  console.log('\n' + '-'.repeat(70))
  console.log('PER-BILL DETAILS:')
  console.log('-'.repeat(70))

  // Show one House and one Senate sample with abstract + digest previews
  const sampleBills = (samples ?? []).filter(b => b.extraction_quality && b.extraction_quality !== 'failed').slice(0, 4)
  for (const s of sampleBills) {
    console.log(`\n${s.bill_number} [${s.extraction_quality}]`)
    if (s.extraction_notes) console.log(`  Notes: ${s.extraction_notes}`)
    if (s.abstract) {
      console.log(`  Abstract (${s.abstract.length} chars):`)
      console.log(`    ${s.abstract.substring(0, 300).replace(/\n/g, '\n    ')}...`)
    }
    if (s.digest) {
      console.log(`  Digest (${s.digest.length} chars):`)
      console.log(`    ${s.digest.substring(0, 300).replace(/\n/g, '\n    ')}...`)
    }
    if (s.deleted_text) console.log(`  Deleted text sample: ${s.deleted_text.substring(0, 150)}...`)
    if (s.added_text)   console.log(`  Added text sample:   ${s.added_text.substring(0, 150)}...`)

    // Check for § and accented character survival
    const hasSection = s.full_text?.includes('§') || s.abstract?.includes('§')
    const hasAccented = /[éèêëàâôùûüç]/i.test(s.full_text ?? '')
    console.log(`  § symbols present: ${hasSection ?? false} | Accented chars present: ${hasAccented}`)
  }

  // Bills with issues
  const failed = results.filter(r => r.quality === 'failed')
  if (failed.length > 0) {
    console.log('\nFailed bills:')
    for (const f of failed) {
      console.log(`  ${f.bill_number}: ${f.notes.join('; ')}`)
    }
  }

  const noFormatting = results.filter(r => r.formattingDetected === false && r.quality !== 'failed' && r.quality !== 'skipped')
  if (noFormatting.length > 0) {
    console.log(`\nFormatting undetectable on ${noFormatting.length} bills: ${noFormatting.map(r => r.bill_number).join(', ')}`)
    console.log('  → These bills will not have [DELETED]/[ADDED] markers. This is expected for some bill types.')
  }

  console.log('\n' + '='.repeat(70))
  console.log('⚠  PAUSED — Review results above before proceeding to full extraction.')
  console.log('   If extraction quality is acceptable, run: npx tsx scripts/extract-bill-text.ts')
  console.log('='.repeat(70))
}

// ── Production mode ───────────────────────────────────────────────────────────

async function runProductionMode(limit: number, priorityOnly: boolean) {
  console.log(`\nProduction mode — limit=${limit}, priority=${priorityOnly ? 'high only' : 'high+normal'}\n`)

  let query = supabase
    .from('Bills')
    .select('id, bill_number, state_link, pdf_url, pdf_text_hash, extraction_quality, summary, summary_status')
    .order('sync_priority', { ascending: true })
    .limit(limit)

  if (priorityOnly) {
    query = query.eq('sync_priority', 'high')
  } else {
    query = query.neq('sync_priority', 'low')
  }

  const { data: bills, error } = await query
  if (error) { console.error('Query error:', error.message); process.exit(1) }
  if (!bills || bills.length === 0) { console.log('No bills to process'); return }

  console.log(`Processing ${bills.length} bills...\n`)

  const stats = { processed: 0, failed: 0, skipped: 0, full: 0, partial: 0, digestOnly: 0, abstractOnly: 0 }
  let fetchedThisHour = 0
  const hourStart     = Date.now()

  for (const bill of bills) {
    // Hourly rate limit
    if (fetchedThisHour >= MAX_PER_HOUR) {
      const elapsed   = Date.now() - hourStart
      const remaining = 3_600_000 - elapsed
      if (remaining > 0) {
        console.log(`\nRate limit (${MAX_PER_HOUR}/hour) reached — waiting ${Math.ceil(remaining / 60_000)} min`)
        await sleep(remaining)
        fetchedThisHour = 0
      }
    }

    const result = await processBill(bill)
    if (result.quality === 'skipped') { stats.skipped++;      continue }
    if (result.quality === 'failed')  { stats.failed++;  fetchedThisHour++; stats.processed++ }
    else {
      fetchedThisHour++; stats.processed++
      if (result.quality === 'full')         stats.full++
      else if (result.quality === 'partial') stats.partial++
      else if (result.quality === 'digest_only')   stats.digestOnly++
      else if (result.quality === 'abstract_only') stats.abstractOnly++
    }

    await sleep(FETCH_DELAY_MS)
  }

  console.log('\n=== Extraction Complete ===')
  console.log(`  Processed:     ${stats.processed}`)
  console.log(`  Skipped:       ${stats.skipped} (unchanged PDF)`)
  console.log(`  Full:          ${stats.full}`)
  console.log(`  Partial:       ${stats.partial}`)
  console.log(`  Digest only:   ${stats.digestOnly}`)
  console.log(`  Abstract only: ${stats.abstractOnly}`)
  console.log(`  Failed:        ${stats.failed}`)
}

// ── Entry point ────────────────────────────────────────────────────────────────

const isTest          = process.argv.includes('--test')
const isPriorityOnly  = process.argv.includes('--high-priority')
const limitArg        = process.argv.find(a => a.startsWith('--limit='))
const limit           = limitArg ? parseInt(limitArg.split('=')[1]) : 500

console.log('=== SessionSource — PDF Extraction Pipeline ===')
console.log(`Timestamp: ${new Date().toISOString()}`)

if (isTest) {
  runTestMode().catch(e => { console.error('Fatal:', e); process.exit(1) })
} else {
  runProductionMode(limit, isPriorityOnly).catch(e => { console.error('Fatal:', e); process.exit(1) })
}
