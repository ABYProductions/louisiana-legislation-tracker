'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function EmailOptInModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (searchParams.get('new_signup') === 'true') {
      setShow(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('new_signup')
      router.replace(url.pathname + (url.search || ''), { scroll: false })
    }
  }, [searchParams, router])

  if (!show || done) return null

  const handleOptIn = async () => {
    setLoading(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_opt_in: true,
          email_frequency: 'weekly',
          digest_vote_results: true,
          digest_amendments: true,
          digest_committee: true,
          digest_ai_analysis: true,
          digest_news: true,
          digest_week_ahead: true,
          digest_quiet_bills: false,
          alert_floor_vote: true,
          alert_committee_hearing: true,
          alert_signed_into_law: true,
          alert_vetoed: true,
          alert_amended: true,
          alert_referred: false,
          milestone_session_end: true,
          milestone_halfway: true,
          milestone_sine_die: true,
          milestone_new_session: true,
        }),
      })
    } catch {
      // silent fail — preferences can be set later in account settings
    }
    setDone(true)
    setShow(false)
  }

  const handleDecline = () => {
    setDone(true)
    setShow(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDecline}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 2000,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal card */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2001,
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '480px',
        margin: '0 16px',
        overflow: 'hidden',
      }}>
        {/* Gold header stripe */}
        <div style={{
          background: 'var(--navy)',
          padding: '24px 28px 20px',
          borderBottom: '3px solid var(--gold)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
            }}>
              Stay in the loop
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}>
            Get a weekly summary of your watched bills delivered every Sunday morning.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { icon: '📋', text: 'Vote results, amendments, and committee hearings for bills you follow' },
              { icon: '🤖', text: 'AI-generated summaries of the week\'s most significant developments' },
              { icon: '📅', text: 'What\'s coming up next week in the legislature' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', lineHeight: '20px', flexShrink: 0 }}>{icon}</span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '20px',
          }}>
            You can adjust your email preferences or unsubscribe at any time from My Account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleOptIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: loading ? 'rgba(196,146,42,0.6)' : 'var(--gold)',
                color: 'var(--navy)',
                border: 'none',
                borderRadius: '7px',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background 150ms',
              }}
            >
              {loading ? 'Setting up…' : 'Yes, Keep Me Informed'}
            </button>

            <button
              onClick={handleDecline}
              style={{
                width: '100%',
                padding: '10px 20px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              No thanks, I&apos;ll check manually
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
