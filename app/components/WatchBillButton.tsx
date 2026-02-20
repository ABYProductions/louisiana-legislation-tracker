'use client'
import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function WatchBillButton({ billId }: { billId: number }) {
  const { user, loading } = useAuth()
  const [watching, setWatching] = useState(false)
  const [added, setAdded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleWatch = async () => {
    if (!user) {
      window.location.href = '/auth/login'
      return
    }
    setWatching(true)
    const { error } = await supabase
      .from('user_bills')
      .upsert({ user_id: user.id, bill_id: billId }, { onConflict: 'user_id,bill_id' })
    setWatching(false)
    if (!error) setAdded(true)
  }

  if (!mounted || loading) return (
    <div style={{
      padding: '10px 16px',
      border: '1px solid #DDD8CE',
      background: '#fff',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
      color: '#888',
    }}>
      Loading...
    </div>
  )

  return (
    <button
      onClick={handleWatch}
      disabled={watching || added}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: added ? '#C4922A' : '#fff',
        background: added ? '#FDF8F0' : '#C4922A',
        border: added ? '1px solid #C4922A' : '1px solid #C4922A',
        padding: '10px 16px',
        textAlign: 'center',
        cursor: added ? 'default' : 'pointer',
        width: '100%',
        transition: 'all 0.15s',
      }}
    >
      {added ? '✓ Watching this Bill' : watching ? 'Adding...' : '+ Watch this Bill'}
    </button>
  )
}