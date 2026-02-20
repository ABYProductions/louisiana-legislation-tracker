'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/watchlist')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F4EF' }}>
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md border border-[#DDD8CE]">
        <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: '#0C2340', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
          Sign In
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#6B7280' }}>
          Access your SessionSource watchlist
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0C2340' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-[#DDD8CE] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4922A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0C2340' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-[#DDD8CE] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4922A]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-opacity"
            style={{ backgroundColor: '#0C2340' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm mt-6" style={{ color: '#6B7280' }}>
          No account?{' '}
          <Link href="/auth/signup" className="font-medium" style={{ color: '#C4922A' }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}