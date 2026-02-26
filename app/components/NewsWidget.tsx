'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import NEWS_SOURCES from '@/lib/news-sources'

interface NewsArticle {
  id: number
  title: string
  description: string | null
  url: string
  source_name: string
  source_id: string
  published_at: string
  relevance_score: number
  industry_tags: string[]
  related_bill_numbers: string[]
  image_url: string | null
  is_breaking: boolean
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 60) return `${mins} min ago`
  if (hours < 24) return `${hours} hr ago`
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getLastUpdatedStr(fetchedAt: Date | null): string {
  if (!fetchedAt) return ''
  const mins = Math.floor((Date.now() - fetchedAt.getTime()) / 60000)
  if (mins < 1) return 'Updated just now'
  if (mins === 1) return 'Updated 1 min ago'
  return `Updated ${mins} min ago`
}

function getSourceMeta(sourceId: string) {
  return NEWS_SOURCES.find(s => s.id === sourceId) || {
    logo_initial: sourceId.slice(0, 2).toUpperCase(),
    accent_color: '#555',
  }
}

function SkeletonRow() {
  return (
    <div style={{
      padding: 'var(--space-3) 0',
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'flex-start',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
        background: 'var(--cream-dark)',
        flexShrink: 0,
        animation: 'shimmer 1.5s ease-in-out infinite',
      }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 12, background: 'var(--cream-dark)', borderRadius: 2, width: '85%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ height: 12, background: 'var(--cream-dark)', borderRadius: 2, width: '60%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ height: 10, background: 'var(--cream-dark)', borderRadius: 2, width: '40%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

export default function NewsWidget({ embedded = false }: { embedded?: boolean }) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [breakingCount, setBreakingCount] = useState(0)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [lastUpdatedStr, setLastUpdatedStr] = useState('')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const fetchNews = useCallback(async () => {
    try {
      const r = await fetch('/api/news?limit=6')
      if (!r.ok) throw new Error('fetch failed')
      const d = await r.json()
      setArticles(d.articles || [])
      setBreakingCount(d.breaking_count || 0)
      setFetchedAt(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const refreshInterval = setInterval(fetchNews, 15 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [fetchNews])

  // Update "X min ago" every minute
  useEffect(() => {
    const tick = () => setLastUpdatedStr(getLastUpdatedStr(fetchedAt))
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [fetchedAt])

  const breaking = embedded ? null : articles.find(a => a.is_breaking)
  const displayArticles = articles.filter(a => !a.is_breaking).slice(0, embedded ? 4 : 5)

  const content = (
    <>
      {/* ── Widget header ── */}
      {embedded ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: '#22C55E',
              display: 'inline-block',
              flexShrink: 0,
              animation: 'news-pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--navy)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}>
              Session News
            </span>
          </div>
          <Link href="/news" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--gold)',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            All News →
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '40px',
          marginBottom: breaking ? 'var(--space-3)' : 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#22C55E',
              display: 'inline-block',
              flexShrink: 0,
              animation: 'news-pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}>
              Session News
            </span>
            {lastUpdatedStr && (
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}>
                {lastUpdatedStr}
              </span>
            )}
          </div>
          <Link href="/news" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--navy)',
            fontWeight: 'var(--weight-medium)',
            textDecoration: 'none',
          }}
            className="news-view-all-link"
          >
            View all news →
          </Link>
        </div>
      )}

      {/* ── Article content (padded when embedded) ── */}
      <div style={embedded ? { padding: 'var(--space-3) var(--space-5)' } : {}}>

      {/* ── Breaking news banner ── */}
      {breaking && (
        <div
          onClick={() => window.open(breaking.url, '_blank', 'noopener noreferrer')}
          style={{
            background: 'linear-gradient(90deg, #DC2626, #991B1B)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            cursor: 'pointer',
          }}
        >
          <span style={{
            background: 'white',
            color: '#DC2626',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-bold)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
            padding: '1px 6px',
            borderRadius: '2px',
            flexShrink: 0,
          }}>
            Breaking
          </span>
          <span style={{
            color: 'white',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {breaking.title}
          </span>
        </div>
      )}

      {/* ── Article list ── */}
      {loading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <div style={{
          padding: 'var(--space-6)',
          textAlign: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
        }}>
          Unable to load news feed.{' '}
          <button
            onClick={fetchNews}
            style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 }}
          >
            Retry
          </button>
        </div>
      ) : displayArticles.length === 0 ? (
        <div style={{
          padding: 'var(--space-6)',
          textAlign: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
        }}>
          No legislative news in the last 24 hours.
        </div>
      ) : (
        <div>
          {displayArticles.map((article, idx) => {
            const meta = getSourceMeta(article.source_id)
            const isLast = idx === displayArticles.length - 1
            const isHovered = hoveredIdx === idx
            return (
              <div
                key={article.id}
                onClick={() => window.open(article.url, '_blank', 'noopener noreferrer')}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  padding: 'var(--space-3) 0',
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  marginLeft: '-12px',
                  marginRight: '-12px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  paddingTop: 'var(--space-3)',
                  paddingBottom: 'var(--space-3)',
                  background: isHovered ? 'rgba(0,0,0,0.02)' : 'transparent',
                  transition: 'background 120ms ease',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {/* Source badge */}
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: (meta as any).accent_color,
                  color: 'white',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {(meta as any).logo_initial}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)',
                    color: 'var(--navy)',
                    lineHeight: 'var(--leading-snug)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {article.title}
                  </div>
                  <div style={{
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {article.source_name}
                    </span>
                    <span style={{ color: 'var(--border)', fontSize: 'var(--text-xs)' }}>·</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {timeAgo(article.published_at)}
                    </span>
                    {article.industry_tags[0] && (
                      <span style={{
                        background: 'rgba(12,35,64,0.06)',
                        color: 'var(--navy)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-xs)',
                        padding: '0 6px',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        {article.industry_tags[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* External link icon */}
                <div style={{
                  opacity: isHovered ? 0.4 : 0,
                  transition: 'opacity 150ms ease',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  flexShrink: 0,
                  paddingTop: 4,
                }}>
                  ↗
                </div>
              </div>
            )
          })}
        </div>
      )}

      </div>{/* end article content wrapper */}

      {/* ── Widget footer (hidden in embedded mode) ── */}
      {!embedded && !loading && !error && (
        <div style={{
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
          marginTop: 'var(--space-1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}>
            {NEWS_SOURCES.length} sources monitored
          </span>
          <Link href="/news" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--navy)',
            fontWeight: 'var(--weight-medium)',
            textDecoration: 'none',
            padding: 'var(--space-1) var(--space-3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
            className="news-footer-btn"
          >
            Full news feed →
          </Link>
        </div>
      )}

      <style>{`
        @keyframes news-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .news-view-all-link:hover {
          color: var(--gold) !important;
          text-decoration: underline !important;
        }
        .news-footer-btn:hover {
          border-color: var(--navy) !important;
          background: var(--cream) !important;
        }
      `}</style>
    </>
  )

  if (embedded) {
    return (
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 'var(--space-4)',
      }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {content}
    </div>
  )
}
