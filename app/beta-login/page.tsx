'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BetaLoginPage() {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/beta-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode })
      })

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Invalid access code. Please contact the administrator for access.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0C2340] to-[#1a3a5c]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#FDD023] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#0C2340]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#0C2340] mb-2">
              SessionSource - Louisiana
            </h1>
            <p className="text-slate-600 text-sm">
              Beta Testing Access
            </p>
          </div>

          {/* Beta Notice */}
          <div className="bg-yellow-50 border-l-4 border-[#FDD023] p-4 mb-6 rounded">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-[#FDD023] mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Beta Testing Phase
                </h3>
                <p className="text-xs text-slate-700">
                  This site is currently in beta testing and accessible only to individuals who have been personally granted a beta access code. Features may change and data may be incomplete.
                </p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="accessCode" className="block text-sm font-semibold text-slate-700 mb-2">
                Beta Access Code
              </label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-[#0C2340] focus:outline-none text-slate-900"
                placeholder="Enter your access code"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0C2340] text-white py-3 rounded-lg font-semibold hover:bg-[#1a3a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Access Beta Site'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Need access? Contact the administrator for a beta testing invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
