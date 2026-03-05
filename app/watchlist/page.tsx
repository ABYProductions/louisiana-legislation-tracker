'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../components/AuthProvider'
import TopBar from '../components/TopBar'
import CreateFolderModal from '../components/watchlist/CreateFolderModal'
import ShareModal from '../components/watchlist/ShareModal'
import AdoptWatchlistModal from '../components/AdoptWatchlistModal'
import BillIndicatorPills from '../components/BillIndicatorPills'
import { hasUrgentIndicator } from '@/lib/bill-indicators'
import { LEGIS_URL } from '@/lib/disclaimer'
import type { Folder } from '../api/watchlist/folders/route'
import type { WatchedBillRecord, PriorityLevel, WatchlistSummary } from '../api/watchlist/bills/route'
import type { FolderFormData } from '../components/watchlist/CreateFolderModal'

// ── Priority helpers ──────────────────────────────────────────────────────────

const PRIORITY_META: Record<PriorityLevel, { label: string; color: string; barColor: string }> = {
  critical: { label: '🔴 Critical', color: '#DC2626', barColor: '#DC2626' },
  high:     { label: '🟠 High',     color: '#F97316', barColor: '#F97316' },
  normal:   { label: '⚪ Normal',   color: 'var(--border)', barColor: 'var(--border)' },
  low:      { label: '⬇ Low',      color: 'var(--cream-dark)', barColor: 'var(--cream-dark)' },
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLastComputed(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch { return '' }
}

function isThisWeek(dateStr: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diff = Math.abs(now.getTime() - d.getTime())
  return diff < 7 * 24 * 60 * 60 * 1000
}

function isNextWeek(dateStr: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000
}

function PDFPill({ url, billNumber }: { url: string; billNumber: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View official bill text PDF for ${billNumber} (opens Louisiana Legislature website)`}
      onClick={(e) => e.stopPropagation()}
      className="pdf-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 140ms ease',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
      Bill Text
    </a>
  )
}

// ── Priority selector component ───────────────────────────────────────────────

function PrioritySelector({ billId, current, onUpdate }: {
  billId: number
  current: PriorityLevel
  onUpdate: (billId: number, priority: PriorityLevel) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const meta = PRIORITY_META[current]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        role="listbox"
        aria-label={`Bill priority: ${current}`}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          background: 'var(--cream)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color, flexShrink: 0, display: 'inline-block' }} />
        {current.charAt(0).toUpperCase() + current.slice(1)}
        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 20,
          minWidth: '140px',
          overflow: 'hidden',
        }}>
          {(Object.entries(PRIORITY_META) as [PriorityLevel, typeof PRIORITY_META[PriorityLevel]][]).map(([p, m]) => (
            <button
              key={p}
              role="option"
              aria-selected={p === current}
              onClick={() => { onUpdate(billId, p); setOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 'var(--space-2) var(--space-3)',
                border: 'none',
                background: p === current ? 'var(--cream)' : 'white',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: p === current ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              }}
              className="priority-option"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bill card component ───────────────────────────────────────────────────────

function BillCard({
  bill,
  folders,
  onPriorityUpdate,
  onNotesUpdate,
  onFoldersUpdate,
}: {
  bill: WatchedBillRecord
  folders: Folder[]
  onPriorityUpdate: (billId: number, priority: PriorityLevel) => void
  onNotesUpdate: (billId: number, notes: string) => void
  onFoldersUpdate: (billId: number, folderIds: string[]) => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [localNotes, setLocalNotes] = useState(bill.notes || '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const priority = bill.priority || 'normal'
  const indicators = bill.indicators || []

  // Left accent bar color: urgent → red, attention → gold, else → priority color (Part 8)
  const accentColor = hasUrgentIndicator(indicators)
    ? '#C0392B'
    : indicators.some(i => i.tier === 'attention')
      ? '#C4922A'
      : PRIORITY_META[priority as PriorityLevel]?.barColor || 'var(--border)'

  const handleNotesChange = (val: string) => {
    setLocalNotes(val)
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      onNotesUpdate(bill.bill_id, val)
      await fetch('/api/watchlist/bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: bill.bill_id, notes: val }),
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    }, 1000)
  }

  const toggleFolder = async (folderId: string) => {
    const currentIds = Array.isArray(bill.folder_ids) ? bill.folder_ids : []
    const newIds = currentIds.includes(folderId)
      ? currentIds.filter(id => id !== folderId)
      : [...currentIds, folderId]
    onFoldersUpdate(bill.bill_id, newIds)
    await fetch('/api/watchlist/bills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill_id: bill.bill_id, folder_ids: newIds }),
    })
  }

  const history = Array.isArray(bill.history)
    ? [...bill.history].sort((a, b) => b.date.localeCompare(a.date))
    : []

  const nextEvent = bill.next_event as { date?: string; description?: string; type?: string } | null
  const isToday = nextEvent?.date ? new Date(nextEvent.date + 'T00:00:00').toDateString() === new Date().toDateString() : false

  return (
    <article style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-3)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left accent bar (Part 8) */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: accentColor,
      }} />

      {/* Top section */}
      <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-4) calc(var(--space-5) + 4px)' }}>

        {/* Row 1: badges + priority */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'var(--cream)',
              padding: '2px 8px',
              borderRadius: '3px',
              border: '1px solid var(--border)',
            }}>{bill.bill_number}</span>

            {bill.status && (
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                background: 'var(--cream)',
                padding: '2px 8px',
                borderRadius: '3px',
                border: '1px solid var(--border)',
              }}>{bill.status}</span>
            )}

            {bill.summary_status === 'complete' && (
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                color: '#16A34A',
                background: '#F0FDF4',
                border: '1px solid #86EFAC',
                padding: '2px 8px',
                borderRadius: '3px',
                letterSpacing: '0.06em',
              }}>AI Summary</span>
            )}
          </div>

          <PrioritySelector billId={bill.bill_id} current={priority as PriorityLevel} onUpdate={onPriorityUpdate} />
        </div>

        {/* Row 2: title */}
        <Link
          href={`/bill/${bill.bill_id}`}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--navy)',
            textDecoration: 'none',
            lineHeight: 1.35,
            marginBottom: 'var(--space-2)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}
          className="watchlist-bill-title"
        >
          {bill.title || 'Untitled Bill'}
        </Link>

        {/* Indicator pills — below title, above sponsor line (Part 4) */}
        {indicators.length > 0 && (
          <BillIndicatorPills
            indicators={indicators}
            billId={bill.bill_id}
          />
        )}

        {/* Row 3: sponsor + committee + PDF */}
        {(bill.author || bill.committee || bill.pdf_url) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            marginTop: indicators.length > 0 ? 'var(--space-2)' : 0,
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
            }}>
              {bill.author && <span>{bill.author}</span>}
              {bill.author && bill.committee && <span style={{ margin: '0 6px' }}>·</span>}
              {bill.committee && <span>{bill.committee}</span>}
            </div>
            {bill.pdf_url && <PDFPill url={bill.pdf_url} billNumber={bill.bill_number} />}
          </div>
        )}

        {/* Row 4: next event */}
        {nextEvent?.date && nextEvent?.description && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: isToday ? 'rgba(196,146,42,0.08)' : 'var(--cream)',
            border: `1px solid ${isToday ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '3px 10px',
            maxWidth: '100%',
          }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              fontWeight: 700,
              color: isToday ? 'var(--gold)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}>
              {isToday ? 'TODAY' : formatDate(nextEvent.date)}
            </span>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{nextEvent.description}</span>
          </div>
        )}

        {/* Row 5: portfolio assignment */}
        {folders.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            marginTop: nextEvent?.date ? 'var(--space-3)' : 'var(--space-2)',
            paddingTop: nextEvent?.date ? 'var(--space-3)' : 0,
            borderTop: nextEvent?.date ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              Portfolio:
            </span>
            {(folders || []).map(f => {
              const isSelected = (bill.folder_ids || []).includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFolder(f.id)}
                  title={isSelected ? `Remove from ${f.name}` : `Add to ${f.name}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isSelected ? f.color : 'var(--border)'}`,
                    background: isSelected ? f.color : 'transparent',
                    color: isSelected ? 'white' : 'var(--text-muted)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    whiteSpace: 'nowrap',
                  }}
                  className="portfolio-chip"
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isSelected ? 'rgba(255,255,255,0.7)' : f.color,
                    flexShrink: 0,
                    display: 'inline-block',
                  }} />
                  {f.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Section A: Notes */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setNotesOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-5) var(--space-3) calc(var(--space-5) + 4px)',
            background: 'var(--cream)',
            border: 'none',
            cursor: 'pointer',
            gap: 'var(--space-2)',
          }}
          aria-expanded={notesOpen}
          aria-label={`Notes for ${bill.bill_number}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {localNotes ? `Notes: ${localNotes.slice(0, 60)}${localNotes.length > 60 ? '…' : ''}` : 'Add a note…'}
            </span>
          </div>
          <span style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            transform: notesOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
            display: 'inline-block',
          }}>▾</span>
        </button>

        {notesOpen && (
          <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-3) calc(var(--space-5) + 4px)', background: 'var(--cream)' }}>
            <textarea
              value={localNotes}
              onChange={e => handleNotesChange(e.target.value)}
              aria-label={`Private notes for ${bill.bill_number}`}
              aria-describedby={`notes-hint-${bill.bill_id}`}
              placeholder="Add private notes about this bill. Only you can see these."
              style={{
                width: '100%',
                minHeight: '80px',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              className="notes-textarea"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              {saveState === 'saving' && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)' }}>Saving…</span>
              )}
              {saveState === 'saved' && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#16A34A' }}>Saved</span>
              )}
            </div>
            <span id={`notes-hint-${bill.bill_id}`} style={{ display: 'none' }}>Only you can see these notes</span>
          </div>
        )}
      </div>

      {/* Section B: History */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setHistoryOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-5) var(--space-3) calc(var(--space-5) + 4px)',
            background: 'var(--white)',
            border: 'none',
            cursor: 'pointer',
            gap: 'var(--space-2)',
          }}
          aria-expanded={historyOpen}
          aria-label={`Bill history for ${bill.bill_number}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              History{bill.last_action ? `: ${bill.last_action.slice(0, 60)}${(bill.last_action?.length || 0) > 60 ? '…' : ''}` : ''}
            </span>
          </div>
          <span style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            transform: historyOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
            display: 'inline-block',
          }}>▾</span>
        </button>

        {historyOpen && (
          <div
            role="list"
            aria-label={`Bill history for ${bill.bill_number}`}
            style={{ padding: 'var(--space-3) var(--space-5) var(--space-4) calc(var(--space-5) + 4px)', background: 'var(--white)' }}
          >
            {history.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-3) 0' }}>
                No history available
              </div>
            ) : history.map((h, idx) => (
              <div
                key={idx}
                role="listitem"
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  padding: 'var(--space-2) 0',
                  borderBottom: idx < history.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  width: '72px',
                  flexShrink: 0,
                }}>
                  {formatDate(h.date)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  flex: 1,
                }}>
                  {h.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [bills, setBills] = useState<WatchedBillRecord[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [summary, setSummary] = useState<WatchlistSummary | null>(null)
  const [billsLoading, setBillsLoading] = useState(true)
  const [foldersLoading, setFoldersLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | null>(null)
  const [sortBy, setSortBy] = useState('recent_activity')
  const [activityFilter, setActivityFilter] = useState<'all' | 'recent' | 'scheduled'>('all')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderFormData | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [adoptToken, setAdoptToken] = useState<string | null>(null)
  const [showAdoptModal, setShowAdoptModal] = useState(false)
  const [adoptSuccessMsg, setAdoptSuccessMsg] = useState<string | null>(null)

  // Load sort preference from localStorage on mount (Part 6)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('watchlist_sort_preference')
      if (stored) setSortBy(stored)
    } catch { /* ignore */ }
  }, [])

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    try { localStorage.setItem('watchlist_sort_preference', newSort) } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/watchlist')
    }
  }, [user, authLoading, router])

  // Check for ?adopt= token in URL
  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('adopt')
      if (token) {
        setAdoptToken(token)
        setShowAdoptModal(true)
        const url = new URL(window.location.href)
        url.searchParams.delete('adopt')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [user])

  const loadFolders = useCallback(async () => {
    if (!user) return
    setFoldersLoading(true)
    try {
      const res = await fetch('/api/watchlist/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } finally {
      setFoldersLoading(false)
    }
  }, [user?.id])

  const loadBills = useCallback(async () => {
    if (!user) return
    setBillsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedFolder) params.set('folder_id', selectedFolder)
      if (selectedPriority) params.set('priority', selectedPriority)
      params.set('sort', sortBy)
      const res = await fetch(`/api/watchlist/bills?${params}`)
      const data = await res.json()
      setBills(data.bills || [])
      setSummary(data.summary || null)

      // Broadcast urgentCount to nav badge via localStorage + custom event (Part 7)
      if (data.summary) {
        const urgentCount = data.summary.withUrgentIndicators || 0
        try { localStorage.setItem('watchlist_urgent_count', String(urgentCount)) } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { urgentCount } }))
      }
    } finally {
      setBillsLoading(false)
    }
  }, [user?.id, selectedFolder, selectedPriority, sortBy])

  useEffect(() => { loadFolders() }, [loadFolders])
  useEffect(() => { loadBills() }, [loadBills])

  // Client-side activity filter (Part 6)
  const recentThreshold = useMemo(
    () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const filteredBills = useMemo(() => {
    if (activityFilter === 'all') return bills
    if (activityFilter === 'recent') {
      return (bills || []).filter(b => {
        const hasUrgent = (b.indicators || []).some(i => i.tier === 'urgent')
        const hasRecentDate = b.last_action_date
          ? new Date(b.last_action_date + 'T00:00:00') >= recentThreshold
          : false
        return hasUrgent || hasRecentDate
      })
    }
    if (activityFilter === 'scheduled') {
      return (bills || []).filter(b =>
        (b.indicators || []).some(i => i.id === 'hearing_scheduled' || i.id === 'floor_calendar')
      )
    }
    return bills
  }, [bills, activityFilter, recentThreshold])

  const handlePriorityUpdate = useCallback(async (billId: number, priority: PriorityLevel) => {
    setBills(prev => prev.map(b => b.bill_id === billId ? { ...b, priority } : b))
    await fetch('/api/watchlist/bills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill_id: billId, priority }),
    })
  }, [])

  const handleNotesUpdate = useCallback((billId: number, notes: string) => {
    setBills(prev => prev.map(b => b.bill_id === billId ? { ...b, notes } : b))
  }, [])

  const handleFoldersUpdate = useCallback((billId: number, folderIds: string[]) => {
    setBills(prev => prev.map(b => b.bill_id === billId ? { ...b, folder_ids: folderIds } : b))
  }, [])

  const handleCreateFolder = async (data: FolderFormData) => {
    const method = data.id ? 'PATCH' : 'POST'
    await fetch('/api/watchlist/folders', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await loadFolders()
  }

  const handleDeleteFolder = async (id: string) => {
    await fetch('/api/watchlist/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (selectedFolder === id) setSelectedFolder(null)
    await loadFolders()
    await loadBills()
  }

  const handleExportPDF = async () => {
    setPdfGenerating(true)
    try {
      const params = new URLSearchParams()
      if (selectedFolder) params.set('folder_id', selectedFolder)
      const res = await fetch(`/api/watchlist/export?${params}`)
      const data = await res.json()
      if (!data.bills?.length) return

      const { pdf } = await import('@react-pdf/renderer')
      const { saveAs } = await import('file-saver')
      const { default: WatchlistPDF } = await import('../components/watchlist/WatchlistPDF')

      const { createElement } = await import('react')
      const blob = await pdf(createElement(WatchlistPDF, { bills: data.bills })).toBlob()
      saveAs(blob, `sessionsource-watchlist-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('[PDF export]', err)
    } finally {
      setPdfGenerating(false)
    }
  }

  // Stats
  const totalBills = bills.length
  const weekActivity = (bills || []).filter(b => isThisWeek(b.last_action_date)).length
  const upcomingHearings = (bills || []).filter(b => {
    const evt = b.next_event as { date?: string } | null
    return evt?.date ? isNextWeek(evt.date) : false
  }).length
  const portfolioCount = folders.length

  const priorityCounts = (bills || []).reduce<Record<string, number>>((acc, b) => {
    const p = b.priority || 'normal'
    acc[p] = (acc[p] || 0) + 1
    return acc
  }, {})

  const contextLabel = selectedFolder
    ? `${folders.find(f => f.id === selectedFolder)?.name || 'Portfolio'} · ${filteredBills.length} bill${filteredBills.length !== 1 ? 's' : ''}`
    : `All Bills · ${activityFilter !== 'all' ? filteredBills.length : totalBills} watching`

  if (authLoading) return null
  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopBar />

      {/* Page header */}
      <div style={{
        background: 'linear-gradient(180deg, var(--navy) 0%, #0d2244 100%)',
        padding: 'var(--space-8) 0 var(--space-6)',
        borderBottom: '3px solid var(--gold)',
      }}>
        <div style={{ maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 var(--space-6)' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginBottom: 'var(--space-1)',
              }}>Account</div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--weight-semibold)',
                color: 'white',
                margin: 0,
                lineHeight: 1.1,
              }}>My Watchlist</h1>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportPDF}
                disabled={pdfGenerating || totalBills === 0}
                aria-label="Export watchlist as PDF"
                aria-busy={pdfGenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                  cursor: pdfGenerating || totalBills === 0 ? 'not-allowed' : 'pointer',
                  opacity: totalBills === 0 ? 0.5 : 1,
                  transition: 'all 150ms ease',
                }}
                className="header-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {pdfGenerating ? 'Generating…' : 'Export PDF'}
              </button>

              <button
                onClick={() => setShowShare(true)}
                aria-haspopup="dialog"
                disabled={totalBills === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'var(--gold)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--navy)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: totalBills === 0 ? 'not-allowed' : 'pointer',
                  opacity: totalBills === 0 ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>

              <button
                onClick={() => { setEditingFolder(null); setShowCreateFolder(true) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                className="header-btn"
              >
                + New Portfolio
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-5)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: 'var(--space-8)',
            flexWrap: 'wrap',
          }}>
            {[
              { number: String(totalBills), label: 'Bills Watched' },
              { number: String(weekActivity), label: 'Active This Week' },
              { number: String(upcomingHearings), label: 'Upcoming Hearings' },
              { number: String(portfolioCount), label: portfolioCount === 1 ? 'Portfolio' : 'Portfolios' },
            ].map(stat => (
              <div key={stat.label}>
                <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'white', lineHeight: 1.1 }}>
                  {stat.number}
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginTop: '2px' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 'var(--width-content)',
        margin: '0 auto',
        padding: 'var(--space-6) var(--space-6) var(--space-16)',
        display: 'grid',
        gridTemplateColumns: '28fr 72fr',
        gap: 'var(--space-6)',
        alignItems: 'start',
      }}
        className="watchlist-grid"
      >
        {/* ── Left sidebar ── */}
        <aside style={{ position: 'sticky', top: 'var(--space-6)', alignSelf: 'start' }} className="watchlist-sidebar">

          {/* Folder panel */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}>
              Portfolios
            </div>

            <div role="list" aria-label="Portfolio navigation">
              <div
                role="listitem"
                aria-current={!selectedFolder}
                onClick={() => setSelectedFolder(null)}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: !selectedFolder ? 'var(--navy)' : 'var(--white)',
                  transition: 'background 120ms ease',
                }}
                className={!selectedFolder ? '' : 'folder-item-inactive'}
              >
                <span style={{
                  flex: 1,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                  color: !selectedFolder ? 'white' : 'var(--text-primary)',
                }}>All Bills</span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                  color: !selectedFolder ? 'var(--gold)' : 'var(--text-muted)',
                  background: !selectedFolder ? 'rgba(255,255,255,0.1)' : 'var(--cream)',
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-full)',
                }}>{foldersLoading ? '…' : totalBills}</span>
              </div>

              {!foldersLoading && folders.length === 0 && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Create portfolios to organize bills by client or topic.
                </div>
              )}

              {(folders || []).map((folder, idx) => {
                const isActive = selectedFolder === folder.id
                return (
                  <div
                    key={folder.id}
                    role="listitem"
                    aria-current={isActive}
                    aria-label={`${folder.name} portfolio, ${folder.bill_count} bills`}
                    style={{
                      padding: isActive ? `var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) - 3px)` : 'var(--space-3) var(--space-4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      cursor: 'pointer',
                      borderBottom: idx < folders.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: isActive ? `3px solid ${folder.color}` : '3px solid transparent',
                      background: isActive ? 'rgba(13,42,74,0.05)' : 'var(--white)',
                      transition: 'background 120ms ease',
                      position: 'relative',
                    }}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={isActive ? '' : 'folder-item-inactive'}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: folder.color, flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                      color: isActive ? 'var(--navy)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{folder.name}</span>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      color: 'var(--text-muted)',
                      background: 'var(--cream)',
                      padding: '1px 7px',
                      borderRadius: 'var(--radius-full)',
                      flexShrink: 0,
                    }}>{folder.bill_count}</span>

                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', fontSize: '16px', lineHeight: 1 }}
                        aria-label={`Folder options for ${folder.name}`}
                        className="folder-menu-btn"
                      >
                        ⋯
                      </button>
                      {folderMenuOpen === folder.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 30,
                          minWidth: '130px',
                          overflow: 'hidden',
                        }}>
                          <button onClick={() => {
                            setFolderMenuOpen(null)
                            setEditingFolder({ id: folder.id, name: folder.name, color: folder.color, description: folder.description || '' })
                            setShowCreateFolder(true)
                          }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 'var(--space-2) var(--space-3)', border: 'none', background: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', cursor: 'pointer' }} className="folder-menu-option">
                            Rename
                          </button>
                          <button onClick={() => {
                            setFolderMenuOpen(null)
                            setEditingFolder({ id: folder.id, name: folder.name, color: folder.color, description: folder.description || '' })
                            setShowCreateFolder(true)
                          }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 'var(--space-2) var(--space-3)', border: 'none', background: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', cursor: 'pointer' }} className="folder-menu-option">
                            Change Color
                          </button>
                          <button onClick={() => { setFolderMenuOpen(null); handleDeleteFolder(folder.id) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 'var(--space-2) var(--space-3)', border: 'none', background: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: '#DC2626', cursor: 'pointer', borderTop: '1px solid var(--border)' }} className="folder-menu-option">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => { setEditingFolder(null); setShowCreateFolder(true) }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                border: 'none',
                background: 'var(--white)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                borderTop: '1px solid var(--border)',
              }}
              className="new-portfolio-btn"
            >
              <span>+</span> New Portfolio
            </button>
          </div>

          {/* Priority filter */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}>
              Filter by Priority
            </div>
            {[null, 'critical', 'high', 'normal', 'low'].map((p, idx, arr) => {
              const isActive = selectedPriority === p
              const label = p === null ? 'All Priorities' : PRIORITY_META[p as PriorityLevel].label
              const count = p === null ? totalBills : (priorityCounts[p] || 0)
              return (
                <button
                  key={p ?? 'all'}
                  onClick={() => setSelectedPriority(p as PriorityLevel | null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: 'var(--space-2) var(--space-4)',
                    border: 'none',
                    borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isActive ? 'var(--cream)' : 'var(--white)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                    color: 'var(--text-primary)',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                  className="priority-filter-btn"
                >
                  <span>{label}</span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'var(--cream)',
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-full)',
                  }}>{count}</span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Right main ── */}
        <div>
          {/* Column header: context label + sort dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--space-3)',
            paddingTop: 'var(--space-4)',
            marginBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--cream)',
            zIndex: 10,
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>
              {contextLabel}
            </span>
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value)}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="recent_activity">Most Recent Activity</option>
              <option value="added_at">Recently Added</option>
              <option value="priority">Priority</option>
              <option value="last_action">Last Action</option>
              <option value="bill_number">Bill Number</option>
            </select>
          </div>

          {/* Activity filter pills (Part 6) */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              color: '#AAA',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Activity Filter
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([
                { value: 'all', label: 'All Bills' },
                { value: 'recent', label: 'Has Recent Activity' },
                { value: 'scheduled', label: 'Has Scheduled Events' },
              ] as const).map(({ value, label }) => {
                const isActive = activityFilter === value
                return (
                  <button
                    key={value}
                    onClick={() => setActivityFilter(value)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '20px',
                      border: `1px solid ${isActive ? '#0C2340' : 'var(--border)'}`,
                      background: isActive ? '#0C2340' : 'white',
                      color: isActive ? 'white' : 'var(--navy)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bill list */}
          {billsLoading ? (
            <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Loading bills…
            </div>
          ) : bills.length === 0 ? (
            /* Main empty state */
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-12)',
              textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ margin: '0 auto var(--space-4)', display: 'block' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', color: 'var(--navy)', marginBottom: 'var(--space-2)' }}>
                {selectedFolder ? 'No bills in this portfolio yet' : 'Your watchlist is empty'}
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)', maxWidth: '360px', margin: '0 auto var(--space-5)' }}>
                {selectedFolder
                  ? 'Add bills to this portfolio from your main watchlist or by clicking the bookmark icon on any bill.'
                  : 'Start tracking bills that matter to you. Search for bills and click the bookmark icon to add them here.'}
              </p>
              <Link href="/" style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--navy)',
                textDecoration: 'none',
                border: '1px solid var(--navy)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-4)',
              }}>
                Browse all bills →
              </Link>
            </div>
          ) : (
            <>
              {/* Summary banner (Part 5) */}
              {summary && summary.recentActivityCount > 0 && (
                <>
                  <div style={{
                    background: 'linear-gradient(135deg, #0C2340, #1a3a5c)',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}>
                    {/* Left */}
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '20px', color: '#C4922A', marginRight: '12px', flexShrink: 0 }}>⚡</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '20px',
                          fontWeight: 600,
                          color: 'white',
                          lineHeight: 1.2,
                        }}>
                          {summary.recentActivityCount} bill{summary.recentActivityCount !== 1 ? 's' : ''} with recent developments
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '12px',
                          color: '#AABBD0',
                          marginTop: '3px',
                        }}>
                          Activity recorded in the last 3 days · as of {formatLastComputed(summary.lastComputedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {summary.withUrgentIndicators > 0 && (
                        <span style={{
                          background: 'rgba(192,57,43,0.2)',
                          border: '1px solid #C0392B',
                          color: '#FF8A80',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '6px 14px',
                          borderRadius: '20px',
                          whiteSpace: 'nowrap',
                        }}>
                          {summary.withUrgentIndicators} urgent
                        </span>
                      )}
                      <button
                        onClick={() => setActivityFilter(f => f === 'recent' ? 'all' : 'recent')}
                        style={{
                          background: activityFilter === 'recent'
                            ? 'rgba(196,146,42,0.3)'
                            : 'rgba(255,255,255,0.1)',
                          border: `1px solid ${activityFilter === 'recent' ? '#C4922A' : 'rgba(255,255,255,0.2)'}`,
                          color: 'white',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '13px',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activityFilter === 'recent' ? 'Showing Active Only ×' : 'Show Active Only'}
                      </button>
                    </div>
                  </div>

                  {/* Data freshness note (Part 5) */}
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: '#AAA',
                    fontStyle: 'italic',
                    marginBottom: '16px',
                    lineHeight: 1.6,
                  }}>
                    Indicators reflect data as of last sync. Louisiana Legislature schedules may change without notice. Verify at{' '}
                    <a
                      href={LEGIS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#C4922A', textDecoration: 'none' }}
                    >
                      legis.la.gov
                    </a>.
                  </div>
                </>
              )}

              {/* No recent activity line */}
              {summary && summary.recentActivityCount === 0 && (
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  color: '#AAA',
                  marginBottom: '12px',
                }}>
                  No recorded activity in the last 3 days on your watched bills. Data syncs daily.
                </div>
              )}

              {/* Activity filter empty state (Part 6) */}
              {filteredBills.length === 0 && activityFilter !== 'all' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#AAA', marginBottom: '8px' }}>
                    No bills match this filter right now.
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#BBB', marginBottom: '16px' }}>
                    Schedules are often posted late — check back or view all bills.
                  </div>
                  <button
                    onClick={() => setActivityFilter('all')}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      color: 'var(--gold)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    View All Bills
                  </button>
                </div>
              ) : (
                (filteredBills || []).map(bill => (
                  <BillCard
                    key={bill.bill_id}
                    bill={bill}
                    folders={folders}
                    onPriorityUpdate={handlePriorityUpdate}
                    onNotesUpdate={handleNotesUpdate}
                    onFoldersUpdate={handleFoldersUpdate}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          editingFolder={editingFolder}
          onClose={() => { setShowCreateFolder(false); setEditingFolder(null) }}
          onSave={handleCreateFolder}
          onDelete={editingFolder?.id ? handleDeleteFolder : undefined}
        />
      )}

      {showShare && (
        <ShareModal
          folders={folders}
          onClose={() => setShowShare(false)}
        />
      )}

      {showAdoptModal && adoptToken && (
        <AdoptWatchlistModal
          token={adoptToken}
          onClose={() => setShowAdoptModal(false)}
          onSuccess={(added) => {
            setShowAdoptModal(false)
            setAdoptSuccessMsg(`${added} bill${added !== 1 ? 's' : ''} added to your watchlist`)
            loadBills()
            setTimeout(() => setAdoptSuccessMsg(null), 5000)
          }}
        />
      )}

      {adoptSuccessMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#16A34A',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {adoptSuccessMsg}
        </div>
      )}

      <style>{`
        .pdf-pill:hover { background: var(--cream) !important; border-color: var(--navy) !important; color: var(--navy) !important; }
        .portfolio-chip:hover { opacity: 0.85; border-color: currentColor !important; }
        .folder-item-inactive:hover { background: var(--cream) !important; }
        .new-portfolio-btn:hover { background: var(--cream) !important; color: var(--navy) !important; }
        .folder-menu-option:hover { background: var(--cream) !important; }
        .priority-option:hover { background: var(--cream) !important; }
        .priority-filter-btn:hover { background: var(--cream) !important; }
        .header-btn:hover { border-color: white !important; background: rgba(255,255,255,0.1) !important; }
        .watchlist-bill-title:hover { color: var(--gold) !important; }
        .notes-textarea:focus { outline: none !important; border-color: var(--navy) !important; box-shadow: 0 0 0 2px rgba(13,42,74,0.1); }
        @media (max-width: 900px) {
          .watchlist-grid { grid-template-columns: 1fr !important; }
          .watchlist-sidebar { position: static !important; }
        }
      `}</style>
    </div>
  )
}
