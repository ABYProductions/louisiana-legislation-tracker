'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NotifPrefs {
  email_opted_in: boolean
  digest_frequency: string
  digest_hour_ct: number
  alert_committee_hearing: boolean
  alert_floor_vote: boolean
  alert_bill_amended: boolean
  alert_governor_action: boolean
  alert_committee_vote: boolean
  alert_bill_withdrawn: boolean
  alert_session_open: boolean
  alert_session_adjourn: boolean
  alert_filing_deadline: boolean
  alert_special_session: boolean
  digest_include_ai_narrative: boolean
  digest_include_bill_summaries: boolean
  digest_include_vote_results: boolean
  digest_include_amendments: boolean
  digest_include_week_ahead: boolean
  digest_include_session_snapshot: boolean
  digest_include_quiet_bills: boolean
}

const DEFAULTS: NotifPrefs = {
  email_opted_in: false,
  digest_frequency: 'never',
  digest_hour_ct: 8,
  alert_committee_hearing: false,
  alert_floor_vote: false,
  alert_bill_amended: false,
  alert_governor_action: false,
  alert_committee_vote: false,
  alert_bill_withdrawn: false,
  alert_session_open: false,
  alert_session_adjourn: false,
  alert_filing_deadline: false,
  alert_special_session: false,
  digest_include_ai_narrative: true,
  digest_include_bill_summaries: true,
  digest_include_vote_results: true,
  digest_include_amendments: true,
  digest_include_week_ahead: true,
  digest_include_session_snapshot: true,
  digest_include_quiet_bills: false,
}

const FREQUENCIES = [
  { value: 'sunday_weekly', label: 'Sunday Weekly Digest', icon: '📋', desc: 'Full week recap + week ahead. Delivered Sunday mornings.', recommended: true },
  { value: 'daily', label: 'Daily Catch-Up', icon: '📅', desc: 'Brief activity update Mon–Sat.' },
  { value: 'wednesday_checkin', label: 'Wednesday Check-In', icon: '📆', desc: 'Mid-week snapshot.' },
  { value: 'session_end', label: 'Session End Only', icon: '🏛️', desc: 'One email when session adjourns.' },
  { value: 'alerts_only', label: 'Alerts Only', icon: '⚡', desc: 'No digest. Instant alerts only.' },
  { value: 'never', label: 'Never', icon: '🔕', desc: 'No emails of any kind.' },
]

const HOURS = [6, 7, 8, 9, 10, 12, 14, 16, 18, 20]
function hourLabel(h: number): string {
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

// Toggle component
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: value ? '#C4922A' : '#DDD8CE',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 200ms ease', flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: value ? '22px' : '2px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'white', transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// Toggle row
function ToggleRow({ label, desc, value, onChange, last }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: last ? 'none' : '1px solid #F0EDE8',
    }}>
      <div style={{ flex: 1, paddingRight: '16px' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: '#0C2340', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#999', marginTop: '2px' }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

interface Props {
  showOptInBanner?: boolean
  onOptInChange?: (v: boolean) => void
}

export default function NotificationPreferencesPanel({ showOptInBanner = true, onOptInChange }: Props) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [testSent, setTestSent] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!previewOpen) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewOpen(false) }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [previewOpen])

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(d => setPrefs({ ...DEFAULTS, ...d }))
      .catch(() => {})
  }, [])

  const save = useCallback(async (updated: NotifPrefs) => {
    setSaveState('saving')
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }, [])

  const update = useCallback((patch: Partial<NotifPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(next), 600)
      return next
    })
  }, [save])

  const enableEmails = () => {
    update({
      email_opted_in: true,
      digest_frequency: 'sunday_weekly',
      alert_committee_hearing: true,
      alert_floor_vote: true,
      alert_bill_amended: true,
      alert_governor_action: true,
    })
    onOptInChange?.(true)
  }

  const unsubscribe = () => {
    update({ email_opted_in: false, digest_frequency: 'never' })
    onOptInChange?.(false)
  }

  const hasDigest = !['alerts_only', 'never'].includes(prefs.digest_frequency)

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Save failed' : ''

  async function handlePreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase')
      const supabase = getSupabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const r = await fetch('/api/notifications/preview', { headers })
      if (r.ok) {
        const html = await r.text()
        setPreviewHtml(html)
        setPreviewOpen(true)
      } else {
        setPreviewError('Could not load preview. Make sure you have bills on your watchlist and try again.')
      }
    } catch {
      setPreviewError('Could not load preview. Make sure you have bills on your watchlist and try again.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSendTest() {
    setTestSent('sending')
    try {
      const r = await fetch('/api/notifications/send-test', { method: 'POST' })
      if (r.ok) { setTestSent('sent'); setTimeout(() => setTestSent('idle'), 3000) }
      else { setTestSent('error'); setTimeout(() => setTestSent('idle'), 3000) }
    } catch { setTestSent('error'); setTimeout(() => setTestSent('idle'), 3000) }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Floating save indicator */}
      {saveLabel && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 500,
          background: saveState === 'error' ? '#C0392B' : '#0C2340',
          color: 'white', fontFamily: 'var(--font-sans)', fontSize: '13px',
          fontWeight: 600, padding: '8px 16px', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {saveLabel}
        </div>
      )}

      {/* Opt-in banner */}
      {showOptInBanner && !prefs.email_opted_in && (
        <div style={{
          background: '#FDF8EE', border: '1px solid #C4922A',
          borderRadius: '8px', padding: '16px 20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#555' }}>
            📧 You're not currently subscribed to email updates.
          </span>
          <button
            onClick={enableEmails}
            style={{
              background: '#C4922A', color: 'white', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
              padding: '8px 20px', borderRadius: '6px', whiteSpace: 'nowrap',
            }}
          >
            Enable Email Updates
          </button>
        </div>
      )}

      {showOptInBanner && prefs.email_opted_in && (
        <div style={{
          background: '#E8F5E9', border: '1px solid #2D7A3A',
          borderRadius: '8px', padding: '14px 20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#2D7A3A', fontWeight: 500 }}>
            ✓ Email updates are active. Your next digest sends Sunday morning.
          </span>
          <button
            onClick={unsubscribe}
            style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Unsubscribe
          </button>
        </div>
      )}

      {/* Section A — Digest Schedule */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#0C2340', fontWeight: 600, margin: '0 0 8px' }}>Digest Schedule</h3>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#888', margin: '0 0 20px' }}>How often would you like to receive email updates?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {FREQUENCIES.map(f => (
            <button
              key={f.value}
              onClick={() => update({ digest_frequency: f.value })}
              style={{
                background: prefs.digest_frequency === f.value ? '#F0EDE8' : 'white',
                border: prefs.digest_frequency === f.value ? '2px solid #0C2340' : '1px solid #DDD8CE',
                borderRadius: '8px', padding: '14px 16px', cursor: 'pointer',
                textAlign: 'left', position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#0C2340' }}>
                  {f.icon} {f.label}
                </span>
                {f.recommended && (
                  <span style={{ background: '#C4922A', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>{f.desc}</div>
            </button>
          ))}
        </div>

        {hasDigest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#333', flexShrink: 0 }}>Delivery time (Central):</label>
            <select
              value={prefs.digest_hour_ct}
              onChange={e => update({ digest_hour_ct: parseInt(e.target.value) })}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#333',
                border: '1px solid #DDD8CE', borderRadius: '6px', padding: '7px 12px',
                background: 'white', cursor: 'pointer',
              }}
            >
              {HOURS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#999' }}>
              Sunday digest always delivers Sunday at your chosen time.
            </span>
          </div>
        )}
      </div>

      {/* Section B — Digest Content */}
      {hasDigest && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#0C2340', fontWeight: 600, margin: '0 0 8px' }}>Digest Content</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#888', margin: '0 0 4px' }}>Choose what to include in your digest emails.</p>
          <ToggleRow label="AI Week in Review Narrative" value={prefs.digest_include_ai_narrative} onChange={v => update({ digest_include_ai_narrative: v })} />
          <ToggleRow label="Bill Activity Summaries" value={prefs.digest_include_bill_summaries} onChange={v => update({ digest_include_bill_summaries: v })} />
          <ToggleRow label="Vote Results" value={prefs.digest_include_vote_results} onChange={v => update({ digest_include_vote_results: v })} />
          <ToggleRow label="Amendment Tracking" value={prefs.digest_include_amendments} onChange={v => update({ digest_include_amendments: v })} />
          <ToggleRow label="Week Ahead Preview" value={prefs.digest_include_week_ahead} onChange={v => update({ digest_include_week_ahead: v })} />
          <ToggleRow label="Session Health Snapshot" value={prefs.digest_include_session_snapshot} onChange={v => update({ digest_include_session_snapshot: v })} />
          <ToggleRow label="Quiet Bills (no activity)" desc="Include watched bills with no recent activity" value={prefs.digest_include_quiet_bills} onChange={v => update({ digest_include_quiet_bills: v })} last />
        </div>
      )}

      {/* Section C — Instant Alerts */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#0C2340', fontWeight: 600, margin: '0 0 8px' }}>Instant Alert Emails</h3>
        <div style={{ background: '#FDF8EE', border: '1px solid #C4922A', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#C4922A', margin: 0, lineHeight: 1.6 }}>
            ⚠️ The Louisiana Legislature often posts hearing schedules with limited advance notice. Alerts are sent as soon as data is available — always verify time-sensitive information at legis.la.gov.
          </p>
        </div>
        <ToggleRow
          label="Committee Hearing Scheduled"
          desc="Alert when a watched bill is added to committee agenda. May arrive same-day due to late posting."
          value={prefs.alert_committee_hearing} onChange={v => update({ alert_committee_hearing: v })}
        />
        <ToggleRow label="Floor Vote Scheduled or Completed" value={prefs.alert_floor_vote} onChange={v => update({ alert_floor_vote: v })} />
        <ToggleRow label="Bill Amended" value={prefs.alert_bill_amended} onChange={v => update({ alert_bill_amended: v })} />
        <ToggleRow label="Governor Action" value={prefs.alert_governor_action} onChange={v => update({ alert_governor_action: v })} />
        <ToggleRow label="Committee Vote Result" value={prefs.alert_committee_vote} onChange={v => update({ alert_committee_vote: v })} />
        <ToggleRow label="Bill Withdrawn or Died" value={prefs.alert_bill_withdrawn} onChange={v => update({ alert_bill_withdrawn: v })} last />
      </div>

      {/* Section D — Session Milestones */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#0C2340', fontWeight: 600, margin: '0 0 8px' }}>Session Milestone Alerts</h3>
        <ToggleRow label="Session Convenes" value={prefs.alert_session_open} onChange={v => update({ alert_session_open: v })} />
        <ToggleRow label="Session Adjourns" desc="With final bill status summary" value={prefs.alert_session_adjourn} onChange={v => update({ alert_session_adjourn: v })} />
        <ToggleRow label="Filing Deadlines" value={prefs.alert_filing_deadline} onChange={v => update({ alert_filing_deadline: v })} />
        <ToggleRow label="Special Session Called" value={prefs.alert_special_session} onChange={v => update({ alert_special_session: v })} last />
      </div>

      {/* Section E — Preview & Test */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#0C2340', fontWeight: 600, margin: '0 0 16px' }}>Preview & Test</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePreview}
            disabled={previewLoading}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
              color: previewLoading ? 'rgba(12,35,64,0.5)' : '#0C2340',
              background: 'white', border: '2px solid #0C2340',
              borderRadius: '6px', padding: '10px 20px',
              cursor: previewLoading ? 'not-allowed' : 'pointer',
              opacity: previewLoading ? 0.7 : 1,
            }}
          >
            {previewLoading ? 'Loading preview…' : 'Preview Sunday Digest'}
          </button>
          <button
            onClick={handleSendTest}
            disabled={testSent === 'sending'}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
              color: 'white', background: '#0C2340', border: 'none',
              borderRadius: '6px', padding: '10px 20px', cursor: testSent === 'sending' ? 'not-allowed' : 'pointer',
              opacity: testSent === 'sending' ? 0.7 : 1,
            }}
          >
            {testSent === 'sending' ? 'Sending…' : testSent === 'sent' ? '✓ Sent!' : testSent === 'error' ? 'Failed' : 'Send Test Email'}
          </button>
          </div>
          {previewError && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#C0392B', margin: 0 }}>
              {previewError}
            </p>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewOpen(false) }}
        >
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '660px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ background: '#0C2340', padding: '16px 24px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'white' }}>Email Preview</span>
              <button onClick={() => setPreviewOpen(false)} style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'white', cursor: 'pointer', background: 'transparent', border: 'none' }}>✕ Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ padding: 0 }} />
          </div>
        </div>
      )}
    </div>
  )
}
