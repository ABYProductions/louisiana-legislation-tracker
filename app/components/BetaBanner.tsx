'use client'

import { useState } from 'react'

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 border-b-2 border-yellow-600">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">
                <span className="inline-block px-2 py-0.5 bg-yellow-900 text-yellow-100 rounded text-xs font-bold mr-2">BETA</span>
                This site is in beta testing. Features and data may be incomplete or subject to change.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 ml-4 p-1 hover:bg-yellow-600 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <svg className="w-5 h-5 text-yellow-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
