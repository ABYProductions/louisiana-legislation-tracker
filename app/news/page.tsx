'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import TopBar from '@/app/components/TopBar'
import NEWS_SOURCES, { INDUSTRY_KEYWORDS } from '@/lib/news-sources'

const INDUSTRIES = Object.keys(INDUSTRY_KEYWORDS)
const SESSION_START = new Date('2026-03-10T00:00:00')
const SESSION_END = new Date('2026-06-09T23:59:59')

function getSessionInfo() {
  const now = new Date()
  if (now < SESSION_START) {
    const days = Math.ceil((SESSION_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'before' as const, days }
  }
  if (now <= SESSION_END) {
    const day = Math.ceil((now.getTime() - SESSION_START.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'active' as const, day }
  }
  return { type: 'ended' as const, days: 0, day: 85 }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (Math.floor(diff / 86400000) === 1) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getSourceMeta(sourceId: string) {
  const meta = NEWS_SOURCES.find(s => s.id === sourceId)
  return {
    logo_initial: meta?.logo_initial || sourceId.slice(0, 2).toUpperCase(),
    accent_color: meta?.accent_color || 'var(--navy)',
  }
}

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

interface SourceInfo {
  source_id: string
  source_name: string
  article_count: number
  latest_article: string
  logo_initial: string
  accent_color: string
}

function SourceBadge({ sourceId, size = 36 }: { sourceId: string; size?: number }) {
  const { logo_initial, accent_color } = getSourceMeta(sourceId)
  const fontSize = logo_initial.length > 2 ? '8px' : '10px'
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--radius-sm)',
      background: accent_color, color: 'white',
      fontFamily: 'var(--font-sans)', fontSize, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {logo_initial}
    </div>
  )
}

function ArticleSkeleton() {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--cream-dark)', flexShrink: 0, animation: 'newsShimmer 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '40%', background: 'var(--cream-dark)', borderRadius: 2, marginBottom: 10, animation: 'newsShimmer 1.5s infinite' }} />
          <div style={{ height: 16, background: 'var(--cream-dark)', borderRadius: 2, marginBottom: 6, animation: 'newsShimmer 1.5s infinite' }} />
          <div style={{ height: 14, width: '70%', background: 'var(--cream-dark)', borderRadius: 2, animation: 'newsShimmer 1.5s infinite' }} />
        </div>
      </div>
    </div>
  )
}

function SidebarPanel({ header, children }: { header: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 16px', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: 'var(--tracking-wide)',
        color: 'var(--text-muted)',
      }}>
        {header}
      </div>
      <div style={{ padding: '12px' }}>
        {children}
      </div>
    </div>
  )
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiOffset, setApiOffset] = useState(0)

  const [activeIndustry, setActiveIndustry] = useState<string | null>(null)
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'relevance'>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [showPersonalization, setShowPersonalization] = useState(false)
  const [userIndustries, setUserIndustries] = useState<string[]>([])
  const [displayCount, setDisplayCount] = useState(20)

  // Load user industry preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('news_industry_prefs')
      if (stored) setUserIndustries(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // Initial fetch
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/news?limit=50').then(r => r.json()),
      fetch('/api/news/sources').then(r => r.json()),
    ]).then(([newsData, sourcesData]) => {
      setArticles(newsData.articles || [])
      setHasMore(newsData.has_more || false)
      setApiOffset(50)
      setSources(sourcesData.sources || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/news?limit=50&offset=${apiOffset}`)
      const d = await r.json()
      setArticles(prev => [...prev, ...(d.articles || [])])
      setHasMore(d.has_more || false)
      setApiOffset(prev => prev + 50)
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleUserIndustry = (ind: string) => {
    const next = userIndustries.includes(ind)
      ? userIndustries.filter(i => i !== ind)
      : [...userIndustries, ind]
    setUserIndustries(next)
    try { localStorage.setItem('news_industry_prefs', JSON.stringify(next)) } catch { /* ignore */ }
  }

  const clearPreferences = () => {
    setUserIndustries([])
    try { localStorage.removeItem('news_industry_prefs') } catch { /* ignore */ }
  }

  // Client-side filtering + sorting
  const filteredArticles = useMemo(() => {
    let result = [...articles]

    // Industry filter
    if (activeIndustry) {
      result = result.filter(a => a.industry_tags?.includes(activeIndustry))
    }

    // Source filter
    if (activeSource) {
      result = result.filter(a => a.source_id === activeSource)
    }

    // Search query
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortBy === 'relevance') {
      result.sort((a, b) =>
        b.relevance_score - a.relevance_score ||
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      )
    } else {
      // recent: breaking first, then by date
      result.sort((a, b) => {
        if (a.is_breaking !== b.is_breaking) return a.is_breaking ? -1 : 1
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      })
    }

    // User preferences: if no explicit industry filter, boost matching articles
    if (userIndustries.length > 0 && !activeIndustry) {
      result.sort((a, b) => {
        const aMatch = a.industry_tags?.some(t => userIndustries.includes(t)) ? 0 : 1
        const bMatch = b.industry_tags?.some(t => userIndustries.includes(t)) ? 0 : 1
        return aMatch - bMatch
      })
    }

    return result
  }, [articles, activeIndustry, activeSource, searchQuery, sortBy, userIndustries])

  // Industry counts from all (unfiltered by industry) articles
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const base = activeSource
      ? articles.filter(a => a.source_id === activeSource)
      : articles
    for (const a of base) {
      for (const t of a.industry_tags || []) {
        counts[t] = (counts[t] || 0) + 1
      }
    }
    return counts
  }, [articles, activeSource])

  // Source counts from unfiltered articles
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of articles) {
      counts[a.source_id] = (counts[a.source_id] || 0) + 1
    }
    return counts
  }, [articles])

  // Dynamic heading
  const { dynamicTitle, dynamicSubtitle } = useMemo(() => {
    const srcName = sources.find(s => s.source_id === activeSource)?.source_name
    if (searchQuery.length > 1) {
      return {
        dynamicTitle: 'Search Results',
        dynamicSubtitle: `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''} matching "${searchQuery}"`,
      }
    }
    if (activeIndustry) {
      return {
        dynamicTitle: `${activeIndustry} Coverage`,
        dynamicSubtitle: `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''} about ${activeIndustry.toLowerCase()}`,
      }
    }
    if (activeSource && srcName) {
      return {
        dynamicTitle: `${srcName} Coverage`,
        dynamicSubtitle: `Articles from ${srcName}`,
      }
    }
    if (userIndustries.length > 0) {
      return {
        dynamicTitle: '2026 Session Coverage',
        dynamicSubtitle: `Personalized for your interests · ${sources.length || NEWS_SOURCES.length} sources`,
      }
    }
    return {
      dynamicTitle: '2026 Session Coverage',
      dynamicSubtitle: `All legislative news from ${sources.length || NEWS_SOURCES.length} sources`,
    }
  }, [activeIndustry, activeSource, searchQuery, filteredArticles.length, sources, userIndustries])

  const visibleArticles = filteredArticles.slice(0, displayCount)
  const hasMoreDisplay = filteredArticles.length > displayCount || hasMore

  const sessionInfo = getSessionInfo()

  const clearAllFilters = () => {
    setActiveIndustry(null)
    setActiveSource(null)
    setSearchQuery('')
  }

  const hasActiveFilters = !!(activeIndustry || activeSource || searchQuery.length > 1)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopBar />

      {/* ── Page header ── */}
      <div style={{
        background: 'linear-gradient(180deg, var(--navy) 0%, #0d2244 100%)',
        padding: '32px 0 28px',
        borderBottom: '3px solid var(--gold)',
      }}>
        <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 28px' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)',
                color: 'var(--gold)', marginBottom: '6px',
              }}>
                Legislative News
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 600,
                color: 'white', margin: 0, lineHeight: 1.2, transition: 'all 200ms ease',
              }}>
                {dynamicTitle}
              </h1>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: '13px',
                color: 'rgba(255,255,255,0.5)', marginTop: '6px', marginBottom: 0,
              }}>
                {dynamicSubtitle}
              </p>
            </div>

            <button
              onClick={() => setShowPersonalization(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: showPersonalization ? 'var(--gold)' : 'transparent',
                border: showPersonalization ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.25)',
                color: showPersonalization ? 'var(--navy)' : 'white',
                fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500,
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              Personalize Feed
            </button>
          </div>

          {/* Personalization panel */}
          {showPersonalization && (
            <div style={{
              marginTop: '20px', paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              animation: 'newsPersonalizeIn 200ms ease',
            }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)',
                color: 'rgba(255,255,255,0.45)', marginBottom: '10px',
              }}>
                Filter by your interests:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {INDUSTRIES.map(ind => {
                  const active = userIndustries.includes(ind)
                  return (
                    <button
                      key={ind}
                      onClick={() => toggleUserIndustry(ind)}
                      style={{
                        padding: '5px 14px', borderRadius: 'var(--radius-full)',
                        fontFamily: 'var(--font-sans)', fontSize: '12px',
                        fontWeight: active ? 600 : 500, cursor: 'pointer',
                        transition: 'all 120ms ease',
                        background: active ? 'var(--gold)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${active ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                        color: active ? 'var(--navy)' : 'rgba(255,255,255,0.6)',
                      }}
                      className="news-personal-chip"
                    >
                      {ind}
                    </button>
                  )
                })}
              </div>
              {userIndustries.length > 0 && (
                <button
                  onClick={clearPreferences}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '11px',
                    color: 'rgba(255,255,255,0.4)', textDecoration: 'underline',
                    marginTop: '8px', padding: 0,
                  }}
                >
                  Clear preferences
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          maxWidth: 'var(--width-content)', margin: '0 auto',
          padding: '24px 28px 60px',
          display: 'grid', gridTemplateColumns: '72fr 28fr',
          gap: '24px', alignItems: 'start',
        }}
        className="news-layout-grid"
      >
        {/* ── Left column ── */}
        <div>

          {/* Search + sort bar */}
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            flexWrap: 'wrap', marginBottom: '16px',
          }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="var(--text-muted)" strokeWidth="2"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setDisplayCount(20) }}
                placeholder="Search articles..."
                style={{
                  width: '100%', height: '40px', boxSizing: 'border-box',
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '0 12px 0 36px',
                  fontFamily: 'var(--font-sans)', fontSize: '13px',
                  color: 'var(--text-primary)', outline: 'none',
                }}
                className="news-search-input"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'recent' | 'relevance')}
              style={{
                height: '40px', background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '0 10px',
                fontFamily: 'var(--font-sans)', fontSize: '13px',
                color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="relevance">Most Relevant</option>
            </select>
          </div>

          {/* Active filters row */}
          {hasActiveFilters && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              flexWrap: 'wrap', marginBottom: '12px',
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                Filtered by:
              </span>
              {activeIndustry && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'var(--navy)', color: 'white',
                  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                }}>
                  {activeIndustry}
                  <button onClick={() => setActiveIndustry(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '12px', lineHeight: 1 }}>×</button>
                </span>
              )}
              {activeSource && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'var(--navy)', color: 'white',
                  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                }}>
                  {sources.find(s => s.source_id === activeSource)?.source_name || activeSource}
                  <button onClick={() => setActiveSource(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '12px', lineHeight: 1 }}>×</button>
                </span>
              )}
              {searchQuery.length > 1 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'var(--navy)', color: 'white',
                  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                }}>
                  &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '12px', lineHeight: 1 }}>×</button>
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '13px',
              color: 'var(--text-secondary)', marginBottom: '16px',
            }}>
              Showing {Math.min(displayCount, filteredArticles.length)} of {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
              {hasMore && filteredArticles.length === articles.length ? ` · ${articles.length}+ total` : ''}
            </p>
          )}

          {/* Article list */}
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ArticleSkeleton key={i} />)
          ) : filteredArticles.length === 0 ? (
            <div style={{
              padding: '48px 24px', textAlign: 'center',
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 16px' }}>
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
              </svg>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--navy)', margin: '0 0 6px' }}>
                No articles found
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Try adjusting your filters or check back after the next sync.
              </p>
              <button
                onClick={clearAllFilters}
                style={{
                  marginTop: '16px', background: 'var(--white)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '8px 20px', fontFamily: 'var(--font-sans)', fontSize: '13px',
                  fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer',
                }}
                className="news-clear-btn"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {visibleArticles.map(article => {
                const { logo_initial, accent_color } = getSourceMeta(article.source_id)
                const fontSize = logo_initial.length > 2 ? '8px' : '10px'
                return (
                  <div
                    key={article.id}
                    onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                    style={{
                      background: 'var(--white)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', marginBottom: '10px',
                      cursor: 'pointer', transition: 'all 140ms ease', overflow: 'hidden',
                    }}
                    className="news-article-card"
                  >
                    <div style={{ padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

                      {/* Source badge */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: accent_color, color: 'white',
                        fontFamily: 'var(--font-sans)', fontSize, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {logo_initial}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Top meta row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {article.source_name}
                            </span>
                            <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {timeAgo(article.published_at)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            {article.is_breaking && (
                              <span style={{
                                background: '#DC2626', color: 'white',
                                fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
                                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                              }}>
                                BREAKING
                              </span>
                            )}
                            {article.industry_tags?.[0] && (
                              <span
                                onClick={(e) => { e.stopPropagation(); setActiveIndustry(article.industry_tags[0]); setDisplayCount(20) }}
                                style={{
                                  fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 500,
                                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                  background: 'var(--cream)', border: '1px solid var(--border)',
                                  color: 'var(--text-secondary)', cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {article.industry_tags[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
                            color: 'var(--navy)', lineHeight: 1.4, marginBottom: '6px',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}
                          className="news-article-title"
                        >
                          {article.title}
                        </div>

                        {/* Description */}
                        {article.description && (
                          <div style={{
                            fontFamily: 'var(--font-sans)', fontSize: '12.5px',
                            color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {article.description}
                          </div>
                        )}

                        {/* Bottom row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {article.related_bill_numbers?.length > 0 && (
                              <>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Related:
                                </span>
                                {article.related_bill_numbers.slice(0, 3).map(bn => (
                                  <Link
                                    key={bn}
                                    href={`/?q=${encodeURIComponent(bn)}#bills`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      background: 'var(--navy)', color: 'white',
                                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                                      padding: '1px 6px', borderRadius: '3px', textDecoration: 'none',
                                    }}
                                  >
                                    {bn}
                                  </Link>
                                ))}
                                {article.related_bill_numbers.length > 3 && (
                                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    +{article.related_bill_numbers.length - 3} more
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
                              color: 'var(--gold)', textDecoration: 'none', whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            Read article →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Load More */}
              {hasMoreDisplay && (
                <button
                  onClick={() => {
                    const next = displayCount + 20
                    setDisplayCount(next)
                    if (next >= articles.length && hasMore) loadMore()
                  }}
                  disabled={loadingMore}
                  style={{
                    width: '100%', marginTop: '8px',
                    background: 'var(--white)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 24px',
                    fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500,
                    color: 'var(--text-secondary)', cursor: loadingMore ? 'wait' : 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  className="news-load-more-btn"
                >
                  {loadingMore ? 'Loading…' : 'Load more articles'}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Right column (sidebar) ── */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="news-sidebar">

          {/* Panel 1: Filter by Subject */}
          <SidebarPanel header="Filter by Subject">
            {/* All subjects option */}
            {[{ id: null as string | null, label: 'All Subjects', count: articles.length }, ...INDUSTRIES.map(ind => ({ id: ind, label: ind, count: industryCounts[ind] || 0 }))].map(({ id, label, count }) => {
              const isActive = activeIndustry === id
              return (
                <div
                  key={label}
                  onClick={() => { setActiveIndustry(id); setDisplayCount(20) }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', marginBottom: '2px', transition: 'background 120ms ease',
                    background: isActive ? 'var(--navy)' : 'transparent',
                  }}
                  className={isActive ? '' : 'news-filter-item'}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: isActive ? 'white' : 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
                    padding: '1px 8px', borderRadius: 'var(--radius-full)',
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--cream)',
                    color: isActive ? 'white' : 'var(--text-muted)',
                  }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </SidebarPanel>

          {/* Panel 2: Sources */}
          <SidebarPanel header="Sources">
            {sources.map(src => {
              const isActive = activeSource === src.source_id
              const { logo_initial, accent_color } = getSourceMeta(src.source_id)
              const fs = logo_initial.length > 2 ? '7px' : '8px'
              return (
                <div
                  key={src.source_id}
                  onClick={() => { setActiveSource(isActive ? null : src.source_id); setDisplayCount(20) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', marginBottom: '2px', transition: 'background 120ms ease',
                    background: isActive ? 'var(--navy)' : 'transparent',
                  }}
                  className={isActive ? '' : 'news-filter-item'}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '3px',
                    background: accent_color, color: 'white',
                    fontFamily: 'var(--font-sans)', fontSize: fs, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {logo_initial}
                  </div>
                  <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 500, color: isActive ? 'white' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {src.source_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }}>
                    {sourceCounts[src.source_id] || src.article_count}
                  </span>
                </div>
              )
            })}
          </SidebarPanel>

          {/* Panel 3: Session Context */}
          <SidebarPanel header="Session Context">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              {sessionInfo.type === 'before' && (
                <>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1 }}>
                    {sessionInfo.days}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--text-muted)' }}>
                    days until session opens
                  </span>
                </>
              )}
              {sessionInfo.type === 'active' && (
                <>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1 }}>
                    Day {sessionInfo.day}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--text-muted)' }}>
                    of the 2026 session
                  </span>
                </>
              )}
              {sessionInfo.type === 'ended' && (
                <>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--navy)' }}>Session Ended</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)' }}>2026 Regular Session</span>
                </>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginBottom: '8px' }} />
            {[
              { label: 'Session opens March 10, 2026' },
              { label: 'Sine Die June 9, 2026' },
              { label: `${articles.length > 0 ? articles.length + '+' : '528'} bills tracked` },
            ].map(({ label }, idx, arr) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 0',
                borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </SidebarPanel>

          {/* Panel 4: About this feed */}
          <SidebarPanel header="About This Feed">
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
              News is aggregated from {sources.length || NEWS_SOURCES.length} Louisiana news sources and filtered for legislative relevance. Articles are updated every 15 minutes during session.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic', margin: '8px 0 12px' }}>
              Articles reflect the editorial positions of their respective sources and do not represent the views of SessionSource.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(sources.length > 0 ? sources.map(s => s.source_name) : NEWS_SOURCES.map(s => s.name)).map(name => (
                <span key={name} style={{
                  fontFamily: 'var(--font-sans)', fontSize: '10px', padding: '2px 8px',
                  borderRadius: 'var(--radius-full)', background: 'var(--cream)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)',
                }}>
                  {name}
                </span>
              ))}
            </div>
          </SidebarPanel>
        </div>
      </div>

      <style>{`
        @keyframes newsShimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes newsPersonalizeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .news-article-card:hover { border-color: var(--navy-light) !important; box-shadow: var(--shadow-sm) !important; transform: translateY(-1px); }
        .news-article-title:hover { color: var(--gold) !important; }
        .news-search-input:focus { border-color: var(--navy) !important; box-shadow: 0 0 0 2px rgba(13,42,74,0.08); }
        .news-filter-item:hover { background: var(--cream) !important; }
        .news-clear-btn:hover { background: var(--cream) !important; border-color: var(--navy) !important; }
        .news-load-more-btn:hover { background: var(--cream) !important; border-color: var(--navy) !important; }
        .news-personal-chip:hover { border-color: rgba(255,255,255,0.4) !important; color: white !important; }
        @media (max-width: 768px) {
          .news-layout-grid { grid-template-columns: 1fr !important; }
          .news-sidebar { position: static !important; top: auto !important; }
        }
      `}</style>
    </div>
  )
}
