'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useWatchlist } from './WatchlistProvider'
import WatchBillButton from './WatchBillButton'

export default function BillWatchlistPanel({ billId }: { billId: number }) {
  const { user } = useAuth()
  const { watchedIds } = useWatchlist()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isWatching = watchedIds.has(billId)

  useEffect(() => { setMounted(true) }, [])

  // Fetch existing notes when watching
  useEffect(() => {
    if (!mounted || !user || !isWatching) return
    fetch('/api/watchlist/bills')
      .then(r => r.json())
      .then(d => {
        const bill = (d.bills || []).find((b: any) => b.bill_id === billId)
        if (bill?.notes) setNotes(bill.notes)
      })
      .catch(() => {})
  }, [mounted, user, isWatching, billId])

  const handleBlur = async () => {
    if (!user || !isWatching) return
    setSaving(true)
    try {
      await fetch('/api/watchlist/bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: billId, notes }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <WatchBillButton billId={billId} />

      {mounted && user && isWatching && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            Private Notes {saving && '· Saving…'}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleBlur}
            placeholder="Add private notes…"
            style={{
              width: '100%',
              minHeight: '80px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 10px',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
              background: 'white',
            }}
          />
        </div>
      )}
    </div>
  )
}
