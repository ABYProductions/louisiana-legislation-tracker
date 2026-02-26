import Parser from 'rss-parser'
import NEWS_SOURCES, {
  LEGISLATIVE_KEYWORDS,
  INDUSTRY_KEYWORDS,
  type NewsSource,
} from './news-sources'

export interface ProcessedArticle {
  title: string
  description: string | null
  url: string
  source_name: string
  source_id: string
  published_at: Date
  relevance_score: number
  industry_tags: string[]
  related_bill_numbers: string[]
  image_url: string | null
  is_breaking: boolean
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function calculateRelevanceScore(
  title: string,
  description: string | null
): number {
  if (!title) return 0
  const combined = (title + ' ' + (description || '')).toLowerCase()
  let score = 0

  for (const kw of LEGISLATIVE_KEYWORDS.high) {
    if (combined.includes(kw.toLowerCase())) score += 3
  }
  for (const kw of LEGISLATIVE_KEYWORDS.medium) {
    if (combined.includes(kw.toLowerCase())) score += 2
  }
  for (const kw of LEGISLATIVE_KEYWORDS.low) {
    if (combined.includes(kw.toLowerCase())) score += 1
  }

  return Math.min(score, 20)
}

// ─── Industry detection ───────────────────────────────────────────────────────

export function detectIndustryTags(
  title: string,
  description: string | null
): string[] {
  const combined = (title + ' ' + (description || '')).toLowerCase()
  const tags: string[] = []

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      tags.push(industry)
    }
  }

  return tags
}

// ─── Bill number extraction ───────────────────────────────────────────────────

export function extractBillNumbers(
  title: string,
  description: string | null
): string[] {
  const combined = title + ' ' + (description || '')
  const pattern = /\b(HB|SB|HCR|SCR|HR|SR)\s*(\d+)\b/gi
  const matches: string[] = []
  let m: RegExpExecArray | null

  while ((m = pattern.exec(combined)) !== null) {
    matches.push((m[1] + m[2]).toUpperCase())
  }

  return [...new Set(matches)]
}

// ─── Breaking news detection ──────────────────────────────────────────────────

const BREAKING_TERMS = [
  'signed', 'vetoed', 'passes', 'passed', 'fails', 'failed',
  'advances', 'killed', 'special session',
]

function isBreaking(title: string, publishedAt: Date, relevanceScore: number): boolean {
  if (relevanceScore < 12) return false
  const ageMs = Date.now() - publishedAt.getTime()
  if (ageMs > 2 * 60 * 60 * 1000) return false // older than 2 hours
  const lower = title.toLowerCase()
  return BREAKING_TERMS.some(t => lower.includes(t))
}

// ─── Strip HTML from description ─────────────────────────────────────────────

function stripHtml(html: string | undefined): string | null {
  if (!html) return null
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500) || null
}

// ─── Extract image from RSS item ─────────────────────────────────────────────

function extractImage(item: any): string | null {
  if (item['media:content']?.$.url) return item['media:content'].$.url
  if (item['media:thumbnail']?.$.url) return item['media:thumbnail'].$.url
  if (item.enclosure?.url?.match(/\.(jpg|jpeg|png|webp)/i)) return item.enclosure.url
  // Try extracting from content
  const content = item['content:encoded'] || item.content || ''
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i)
  if (imgMatch) return imgMatch[1]
  return null
}

// ─── Fetch a single source ────────────────────────────────────────────────────

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: false }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ['content:encoded', 'content:encoded'],
    ],
  },
})

// Fix common XML malformations (attributes without values, missing whitespace, bare &, etc.)
function sanitizeXml(xml: string): string {
  return xml
    // Fix missing whitespace between attributes: attr1="val1"attr2="val2" → attr1="val1" attr2="val2"
    .replace(/("[^"]*"|'[^']*')([a-zA-Z])/g, '$1 $2')
    // Fix attributes without values: disabled, selected, checked, etc.
    .replace(/(<[^>]+)\s+([a-zA-Z-]+)(?=[\s/>])/g, (m, before, attr) => {
      // Only fix truly valueless attributes (no =)
      if (/=/.test(m.slice(before.length))) return m
      return `${before} ${attr}="${attr}"`
    })
    // Fix bare & not followed by valid entity
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
}

export async function fetchSourceFeed(
  source: NewsSource
): Promise<ProcessedArticle[]> {
  try {
    let feed: Awaited<ReturnType<typeof parser.parseURL>>
    try {
      feed = await parser.parseURL(source.rss_url)
    } catch (xmlErr: any) {
      // If parsing fails due to malformed XML, fetch raw and sanitize
      if (xmlErr.message?.includes('Attribute without value') ||
          xmlErr.message?.includes('No whitespace between attributes') ||
          xmlErr.message?.includes('Non-whitespace') ||
          xmlErr.message?.includes('Invalid character')) {
        const resp = await fetch(source.rss_url, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'SessionSource/1.0 RSS Reader' },
        })
        const rawXml = await resp.text()
        feed = await parser.parseString(sanitizeXml(rawXml))
      } else {
        throw xmlErr
      }
    }
    const articles: ProcessedArticle[] = []

    for (const item of (feed.items || [])) {
      const title = item.title?.trim()
      if (!title) continue

      const url = item.link?.trim()
      if (!url) continue

      const rawDesc = item.contentSnippet || item.summary || item.content
      const description = stripHtml(rawDesc as string | undefined)

      const relevanceScore = calculateRelevanceScore(title, description)
      if (relevanceScore < 3) continue

      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()
      if (isNaN(publishedAt.getTime())) continue

      articles.push({
        title,
        description,
        url,
        source_name: source.name,
        source_id: source.id,
        published_at: publishedAt,
        relevance_score: relevanceScore,
        industry_tags: detectIndustryTags(title, description),
        related_bill_numbers: extractBillNumbers(title, description),
        image_url: extractImage(item),
        is_breaking: isBreaking(title, publishedAt, relevanceScore),
      })
    }

    return articles
  } catch (err: any) {
    console.error(`[rss-fetcher] ${source.id} failed: ${err.message}`)
    return []
  }
}

// ─── Fetch all feeds ──────────────────────────────────────────────────────────

export async function fetchAllFeeds(): Promise<{
  articles: ProcessedArticle[]
  sources_succeeded: number
  sources_failed: number
  total_fetched: number
  source_results: { id: string; count: number; error?: string }[]
}> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map(s => fetchSourceFeed(s).then(articles => ({ source: s, articles })))
  )

  const allArticles: ProcessedArticle[] = []
  let sources_succeeded = 0
  let sources_failed = 0
  const source_results: { id: string; count: number; error?: string }[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, articles } = result.value
      if (articles.length > 0) {
        sources_succeeded++
      } else {
        // Still succeeded but returned 0 relevant articles
        sources_succeeded++
      }
      allArticles.push(...articles)
      source_results.push({ id: source.id, count: articles.length })
    } else {
      sources_failed++
      source_results.push({ id: 'unknown', count: 0, error: result.reason?.message })
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const deduplicated = allArticles.filter(a => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  // Sort by published_at DESC
  deduplicated.sort((a, b) => b.published_at.getTime() - a.published_at.getTime())

  return {
    articles: deduplicated,
    sources_succeeded,
    sources_failed,
    total_fetched: deduplicated.length,
    source_results,
  }
}
