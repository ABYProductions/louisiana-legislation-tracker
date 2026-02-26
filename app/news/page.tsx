'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import NEWS_SOURCES from '@/lib/news-sources'
import { INDUSTRY_KEYWORDS } from '@/lib/news-sources'
import { useAuth } from '@/app/components/AuthProvider'

const INDUSTRIES = Object.keys(INDUSTRY_KEYWORDS)

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getSourceMeta(sourceId: string) {
  const meta = NEWS_SOURCES.find(s => s.id === sourceId)
  return {
    logo_initial: meta?.logo_initial || sourceId.slice(0, 2).toUpperCase(),
    accent_color: meta?.accent_color || '#555',
  }
}

function ArticleCardSkeleton() {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-5) var(--space-6)',
      marginBottom: 'var(--space-4)',
    }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--cream-dark)', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: 120, height: 12, borderRadius: 2, background: 'var(--cream-dark)', animation: 'shimmer 1.5s infinite' }} />
      </div>
      <div style={{ height: 22, background: 'var(--cream-dark)', borderRadius: 2, marginBottom: 8, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 14, background: 'var(--cream-dark)', borderRadius: 2, width: '70%', animation: 'shimmer 1.5s infinite' }} />
    </div>
  )
}

export default function NewsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [breakingCount, setBreakingCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const [sources, setSources] = useState<SourceInfo[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'breaking' | 'week' | 'source'>('all')

  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedPrefs, setSavedPrefs] = useState(false)

  // Industry counts from current articles
  const industryCounts: Record<string, number> = {}
  for (const a of articles) {
    for (const t of a.industry_tags || []) {
      industryCounts[t] = (industryCounts[t] || 0) + 1
    }
  }

  const fetchArticles = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({ limit: '20', offset: String(offset) })
    if (selectedIndustries.length === 1) params.set('industry', selectedIndustries[0])
    if (selectedSources.length === 1) params.set('source', selectedSources[0])
    if (activeTab === 'breaking') params.set('breaking_only', 'true')

    try {
      const r = await fetch(`/api/news?${params}`)
      const d = await r.json()
      const newArticles = d.articles || []

      // Client-side multi-filter
      const filtered = newArticles.filter((a: NewsArticle) => {
        if (selectedIndustries.length > 1 && !selectedIndustries.some(ind => a.industry_tags?.includes(ind))) return false
        if (selectedSources.length > 1 && !selectedSources.includes(a.source_id)) return false
        return true
      })

      setArticles(prev => append ? [...prev, ...filtered] : filtered)
      setHasMore(d.has_more)
      setTotal(d.total)
      setBreakingCount(d.breaking_count || 0)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedIndustries, selectedSources, activeTab])

  useEffect(() => {
    fetchArticles(0)
  }, [fetchArticles])

  // Load sources
  useEffect(() => {
    fetch('/api/news/sources')
      .then(r => r.json())
      .then(d => setSources(d.sources || []))
      .catch(() => {})
  }, [])

  // Load user prefs
  useEffect(() => {
    if (!user) return
    fetch('/api/user/preferences')
      .then(r => r.json())
      .then(d => {
        if (d.news_industry_preferences?.length) {
          setSelectedIndustries(d.news_industry_preferences)
        }
      })
      .catch(() => {})
  }, [user])

  const savePreferences = async () => {
    setSavingPrefs(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_industry_preferences: selectedIndustries }),
      })
      setSavedPrefs(true)
      setTimeout(() => setSavedPrefs(false), 3000)
    } finally {
      setSavingPrefs(false)
    }
  }

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    )
  }

  const toggleSource = (sid: string) => {
    setSelectedSources(prev =>
      prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]
    )
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'breaking', label: `Breaking${breakingCount > 0 ? ` (${breakingCount})` : ''}` },
    { id: 'week', label: 'This Week' },
    { id: 'source', label: 'By Source' },
  ] as const

  return (
    <>
      <Header />
      <main>
        {/* ── Page header ── */}
        <div style={{ background: 'var(--navy)', padding: 'var(--space-12) 0 var(--space-8)' }}>
          <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 var(--space-12)' }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
              color: 'var(--gold)', textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)',
              marginBottom: 'var(--space-2)',
            }}>
              2026 Regular Session
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 'var(--text-4xl)',
              color: 'white', fontWeight: 'var(--weight-semibold)',
              marginBottom: 'var(--space-3)', lineHeight: 1.1,
            }}>
              Legislative News Feed
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)',
              color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-6)',
            }}>
              Real-time coverage from {NEWS_SOURCES.length} Louisiana news sources, filtered for legislative relevance
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
              {[
                { num: total, label: 'Articles This Week' },
                { num: NEWS_SOURCES.length, label: 'Sources Monitored' },
                { num: breakingCount, label: 'Breaking Today' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div style={{
                    fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--weight-semibold)', color: 'white',
                  }}>{num}</div>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                    color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-wide)',
                  }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{
          maxWidth: 'var(--width-content)', margin: '0 auto',
          padding: 'var(--space-8) var(--space-12)',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 'var(--space-8)',
          alignItems: 'start',
        }}
          className="news-page-grid"
        >
          {/* LEFT COLUMN */}
          <div>
            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: 0,
              borderBottom: '1px solid var(--border)',
              marginBottom: 'var(--space-6)',
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: activeTab === tab.id ? 'var(--weight-semibold)' : 400,
                    color: activeTab === tab.id ? 'var(--navy)' : 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--navy)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Article cards */}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <ArticleCardSkeleton key={i} />)
            ) : articles.length === 0 ? (
              <div style={{
                padding: 'var(--space-12)', textAlign: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
              }}>
                No legislative news found.
              </div>
            ) : (
              <>
                {articles.map(article => {
                  const meta = getSourceMeta(article.source_id)
                  return (
                    <div
                      key={article.id}
                      onClick={() => window.open(article.url, '_blank', 'noopener noreferrer')}
                      style={{
                        background: 'var(--white)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-5) var(--space-6)',
                        marginBottom: 'var(--space-4)',
                        cursor: 'pointer', transition: 'all 150ms ease',
                      }}
                      className="news-article-card"
                    >
                      {/* Row 1: Source + time + breaking */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                          background: meta.accent_color, color: 'white',
                          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--weight-bold)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {meta.logo_initial}
                        </div>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
                          {article.source_name}
                        </span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {timeAgo(article.published_at)}
                        </span>
                        {article.is_breaking && (
                          <span style={{
                            marginLeft: 'auto', background: '#DC2626', color: 'white',
                            fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--weight-bold)', textTransform: 'uppercase',
                            padding: '1px 8px', borderRadius: '2px',
                          }}>
                            Breaking
                          </span>
                        )}
                      </div>

                      {/* Row 2: Title */}
                      <div style={{
                        fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--weight-semibold)', color: 'var(--navy)',
                        lineHeight: 'var(--leading-snug)', marginTop: 'var(--space-3)',
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {article.title}
                      </div>

                      {/* Row 3: Description */}
                      {article.description && (
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                          color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)',
                          marginTop: 'var(--space-2)',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {article.description}
                        </div>
                      )}

                      {/* Row 4: Tags + read more */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginTop: 'var(--space-4)',
                      }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          {article.industry_tags.slice(0, 3).map(tag => (
                            <span key={tag} style={{
                              background: 'rgba(12,35,64,0.06)',
                              color: 'var(--navy)',
                              border: '1px solid rgba(12,35,64,0.15)',
                              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                              padding: '2px 10px', borderRadius: 'var(--radius-full)',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                          color: 'var(--gold)', fontWeight: 'var(--weight-semibold)',
                        }}>
                          Read full article →
                        </span>
                      </div>

                      {/* Related bills */}
                      {article.related_bill_numbers.length > 0 && (
                        <div style={{
                          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
                          borderTop: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            Related bills:
                          </span>
                          {article.related_bill_numbers.map(bn => (
                            <span
                              key={bn}
                              onClick={e => { e.stopPropagation(); router.push(`/?q=${bn}#bills`) }}
                              style={{
                                background: 'var(--navy)', color: 'white',
                                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
                                padding: '1px 8px', borderRadius: '2px', cursor: 'pointer',
                              }}
                            >
                              {bn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                    <button
                      onClick={() => fetchArticles(articles.length, true)}
                      disabled={loadingMore}
                      className="btn btn-secondary"
                    >
                      {loadingMore ? 'Loading…' : `Load 20 more articles`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN — Sidebar */}
          <div style={{ position: 'sticky', top: 'var(--space-6)' }}>

            {/* Industry filter */}
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)',
                marginBottom: 'var(--space-3)',
              }}>
                Filter by Industry
              </div>
              {INDUSTRIES.map((ind, idx) => (
                <div
                  key={ind}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: 'var(--space-2) 0',
                    borderBottom: idx < INDUSTRIES.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    cursor: 'pointer', flex: 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(ind)}
                      onChange={() => toggleIndustry(ind)}
                      style={{ accentColor: 'var(--navy)', cursor: 'pointer' }}
                    />
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}>
                      {ind}
                    </span>
                  </label>
                  {industryCounts[ind] ? (
                    <span style={{
                      background: 'var(--cream)', color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      padding: '1px 6px', borderRadius: 'var(--radius-full)',
                    }}>
                      {industryCounts[ind]}
                    </span>
                  ) : null}
                </div>
              ))}
              {selectedIndustries.length > 0 && (
                <button
                  onClick={() => setSelectedIndustries([])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                    color: 'var(--gold)', marginTop: 'var(--space-3)', padding: 0,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Source filter */}
            <div style={{ marginTop: 'var(--space-6)' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)',
                marginBottom: 'var(--space-3)',
              }}>
                News Sources
              </div>
              {sources.map((src, idx) => (
                <div key={src.source_id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: 'var(--space-2) 0',
                  borderBottom: idx < sources.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', flex: 1 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '2px',
                      background: src.accent_color, color: 'white',
                      fontFamily: 'var(--font-sans)', fontSize: '9px',
                      fontWeight: 'var(--weight-bold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, cursor: 'pointer',
                    }}
                      onClick={() => toggleSource(src.source_id)}
                    >
                      {selectedSources.includes(src.source_id) ? '✓' : src.logo_initial.slice(0, 1)}
                    </div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {src.source_name}
                    </span>
                  </label>
                  <span style={{
                    background: 'var(--cream)', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-medium)',
                    padding: '1px 6px', borderRadius: 'var(--radius-full)',
                  }}>
                    {src.article_count}
                  </span>
                </div>
              ))}
              {selectedSources.length > 0 && (
                <button
                  onClick={() => setSelectedSources([])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                    color: 'var(--gold)', marginTop: 'var(--space-3)', padding: 0,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Save preferences (auth only) */}
            <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-3)',
              }}>
                My Industry Preferences
              </div>
              {user ? (
                <>
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)', margin: 'var(--space-3) 0',
                    lineHeight: 'var(--leading-relaxed)',
                  }}>
                    Save your industry selections to personalize your news feed across all devices.
                  </p>
                  <button
                    onClick={savePreferences}
                    disabled={savingPrefs}
                    style={{
                      width: '100%', background: savedPrefs ? 'var(--success)' : 'var(--navy)',
                      color: 'white', fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-sm)', border: 'none',
                      cursor: savingPrefs ? 'wait' : 'pointer',
                      transition: 'background 200ms ease',
                    }}
                  >
                    {savedPrefs ? '✓ Preferences saved' : savingPrefs ? 'Saving…' : 'Save Preferences'}
                  </button>
                </>
              ) : (
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                  color: 'var(--text-muted)',
                }}>
                  <a href="/auth/login" style={{ color: 'var(--navy)', fontWeight: 'var(--weight-medium)' }}>Sign in</a> to save your industry preferences.
                </p>
              )}
            </div>

            {/* About this feed */}
            <div style={{
              marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--border)',
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)', lineHeight: 'var(--leading-relaxed)',
              }}>
                SessionSource monitors {NEWS_SOURCES.length} Louisiana news sources every 15 minutes during the legislative session. Articles are filtered for legislative relevance and organized by subject area. News content reflects the editorial positions of each source, not SessionSource.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .news-article-card:hover {
          border-color: var(--navy) !important;
          box-shadow: var(--shadow-sm) !important;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .news-page-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
