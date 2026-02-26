'use client'

import { useState, useEffect } from 'react'

interface Article {
  title: string
  source_name: string
  url: string
  published_at: string
}

function formatTimeAgo(isoDate: string): string {
  if (!isoDate) return ''
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function BillNewsPanel({ billNumber }: { billNumber: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/news/bill/${encodeURIComponent(billNumber)}`)
      .then(r => r.json())
      .then(d => {
        setArticles(d.articles || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [billNumber])

  if (loading) {
    return (
      <div style={{ padding: '20px 18px', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div style={{ padding: '20px 18px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>
        No news coverage found for this bill.
      </div>
    )
  }

  const shown = articles.slice(0, 5)
  return (
    <div>
      {shown.map((a, i) => (
        <div
          key={i}
          style={{
            padding: '12px 18px',
            borderBottom: i < shown.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
          }}>
            {a.source_name}{a.published_at ? ` · ${formatTimeAgo(a.published_at)}` : ''}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            marginBottom: '6px',
          }}>
            {a.title}
          </div>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: '#C4922A',
              textDecoration: 'none',
            }}
          >
            Read article →
          </a>
        </div>
      ))}
    </div>
  )
}
