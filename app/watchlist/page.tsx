'use client'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function WatchlistPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F4EF' }}>
        <p style={{ color: '#0C2340' }}>Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EF' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: '#0C2340', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              My Watchlist
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{user.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium" style={{ color: '#0C2340' }}>
              ← Browse Bills
            </Link>
            <button
              onClick={signOut}
              className="text-sm px-4 py-2 rounded-lg border border-[#DDD8CE] bg-white"
              style={{ color: '#6B7280' }}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DDD8CE] p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#0C2340' }}>
            Your watchlist is empty
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Browse bills and click "Watch Bill" to track them here.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: '#0C2340' }}
          >
            Browse Bills
          </Link>
        </div>
      </div>
    </div>
  )
}