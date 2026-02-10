'use client'

import { useState } from 'react'

interface TextComparisonProps {
  beforeText: string
  afterText: string
  sectionTitle?: string
}

export default function TextComparison({ 
  beforeText, 
  afterText, 
  sectionTitle = 'Text Changes' 
}: TextComparisonProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side')

  // Simple diff highlighting (word-level)
  const highlightChanges = (text: string, isOriginal: boolean) => {
    const words = text.split(' ')
    return words.map((word, idx) => {
      // This is simplified - in production you'd use a proper diff library
      const className = isOriginal 
        ? 'bg-red-100 text-red-900 px-1 rounded' 
        : 'bg-green-100 text-green-900 px-1 rounded'
      
      // For demo purposes, highlight random words as "changed"
      const isChanged = idx % 7 === 0
      
      return (
        <span key={idx} className={isChanged ? className : ''}>
          {word}{' '}
        </span>
      )
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#002868]">{sectionTitle}</h2>
        
        {/* View mode toggle */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-white text-[#002868] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'unified'
                ? 'bg-white text-[#002868] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before (Original) */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h3 className="font-semibold text-red-900 flex items-center gap-2">
                <span>❌</span>
                Original Text
              </h3>
            </div>
            <div className="p-4 bg-white">
              <p className="text-slate-700 text-sm leading-relaxed font-mono">
                {beforeText || 'No original text available'}
              </p>
            </div>
          </div>

          {/* After (Proposed) */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <span>✅</span>
                Proposed Text
              </h3>
            </div>
            <div className="p-4 bg-white">
              <p className="text-slate-700 text-sm leading-relaxed font-mono">
                {afterText || 'No proposed text available'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Unified Diff View</h3>
          </div>
          <div className="p-4 bg-white space-y-4">
            {/* Deletions */}
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-xs font-semibold text-red-800 mb-2">REMOVED:</p>
              <p className="text-slate-700 text-sm leading-relaxed font-mono">
                {beforeText || 'No deletions'}
              </p>
            </div>
            
            {/* Additions */}
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
              <p className="text-xs font-semibold text-green-800 mb-2">ADDED:</p>
              <p className="text-slate-700 text-sm leading-relaxed font-mono">
                {afterText || 'No additions'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
          <span>Removed text</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
          <span>Added text</span>
        </div>
      </div>

      {/* Note */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Full text comparison with precise word-level diff highlighting will be available once PDF parsing is enabled.
        </p>
      </div>
    </div>
  )
}