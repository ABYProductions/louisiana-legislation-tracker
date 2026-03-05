'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AuthProvider'
import TopBar from '@/app/components/TopBar'
import NotificationPreferencesPanel from '@/app/components/NotificationPreferencesPanel'

type Tab = 'profile' | 'notifications' | 'interests' | 'activity' | 'security' | 'danger'

interface Profile {
  display_name?: string
  bio?: string
  location?: string
}

interface ActivityEntry {
  id: string
  event_type: string
  event_detail: string
  created_at: string
  bill_id?: number
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'interests', label: 'Interests' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'security', label: 'Security' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function AccountPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile state
  const [profile, setProfile] = useState<Profile>({})
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

  // Activity state
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Security state
  const [pwEmail, setPwEmail] = useState('')
  const [pwSending, setPwSending] = useState(false)
  const [pwSent, setPwSent] = useState(false)

  // Danger zone state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Tab from hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Tab
    if (hash && TAB_LABELS.some(t => t.id === hash)) setActiveTab(hash)
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirectTo=/account')
  }, [user, loading, router])

  // Load profile
  useEffect(() => {
    if (!user) return
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile)
          setDisplayName(data.profile.display_name || '')
          setBio(data.profile.bio || '')
          setLocation(data.profile.location || '')
        }
        setProfileLoading(false)
      })
      .catch(() => setProfileLoading(false))
  }, [user])

  // Load activity when tab is active
  useEffect(() => {
    if (activeTab !== 'activity' || activity.length > 0) return
    setActivityLoading(true)
    fetch('/api/account/activity')
      .then(r => r.json())
      .then(data => {
        setActivity(data.activity || [])
        setActivityLoading(false)
      })
      .catch(() => setActivityLoading(false))
  }, [activeTab, activity.length])

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, bio, location }),
      })
      setProfile({ display_name: displayName, bio, location })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } finally {
      setProfileSaving(false)
    }
  }

  const sendPasswordReset = async () => {
    if (!user?.email) return
    setPwSending(true)
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase')
      const supabase = getSupabaseBrowser()
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      setPwSent(true)
    } finally {
      setPwSending(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      await fetch('/api/account/delete', { method: 'POST' })
      await signOut()
      router.push('/')
    } catch {
      setDeleting(false)
    }
  }

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `/account#${tab}`)
  }

  if (loading) return null
  if (!user) return null

  const userInitial = user.email?.charAt(0).toUpperCase() || '?'
  const userEmail = user.email || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopBar />

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px var(--space-6) 80px',
      }}>
        {/* Page header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '36px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--gold)',
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--navy)',
              margin: 0,
            }}>
              {profile.display_name || userEmail.split('@')[0]}
            </h1>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: '4px 0 0',
            }}>
              {userEmail}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: '2px',
          marginBottom: '28px',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}>
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              style={{
                padding: '10px 16px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: activeTab === id ? 600 : 400,
                color: activeTab === id ? 'var(--navy)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === id ? '2px solid var(--gold)' : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 150ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div>
            {profileLoading ? (
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</p>
            ) : (
              <div style={{ maxWidth: '540px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="How should we address you?"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Baton Rouge, LA"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>Bio <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell us a bit about yourself…"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Email address</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Email changes are handled via the Security tab.
                  </p>
                </div>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  style={{
                    padding: '10px 24px',
                    background: profileSaved ? '#22C55E' : 'var(--navy)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: profileSaving ? 'default' : 'pointer',
                    transition: 'background 200ms',
                  }}
                >
                  {profileSaving ? 'Saving…' : profileSaved ? '✓ Saved' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <NotificationPreferencesPanel />
        )}

        {/* ── INTERESTS TAB ── */}
        {activeTab === 'interests' && (
          <div>
            <h2 style={sectionHeadStyle}>Your Interests</h2>
            <p style={sectionDescStyle}>
              Customize the subjects and bill categories most relevant to you. This helps SessionSource surface the most pertinent legislation in your digest.
            </p>
            <div style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-muted)' }}>
                Interest filtering is coming in a future update. For now, your digest includes all bills on your watchlist.
              </p>
              <a
                href="/watchlist"
                style={{
                  display: 'inline-block',
                  marginTop: '16px',
                  padding: '9px 20px',
                  background: 'var(--navy)',
                  color: 'white',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Manage My Watchlist →
              </a>
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOG TAB ── */}
        {activeTab === 'activity' && (
          <div>
            <h2 style={sectionHeadStyle}>Activity Log</h2>
            <p style={sectionDescStyle}>A record of your recent interactions with SessionSource.</p>
            {activityLoading ? (
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</p>
            ) : activity.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>No activity recorded yet.</p>
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {activity.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}>
                        {formatEventType(entry.event_type)}
                      </span>
                      {entry.event_detail && (
                        <p style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          margin: '2px 0 0',
                        }}>
                          {entry.event_detail}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === 'security' && (
          <div style={{ maxWidth: '540px' }}>
            <h2 style={sectionHeadStyle}>Security</h2>

            <div style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '20px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>
                Change Password
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                We&apos;ll send a password reset link to <strong>{userEmail}</strong>.
              </p>
              {pwSent ? (
                <div style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: '#166534',
                }}>
                  ✓ Reset link sent — check your inbox.
                </div>
              ) : (
                <button
                  onClick={sendPasswordReset}
                  disabled={pwSending}
                  style={{
                    padding: '9px 20px',
                    background: 'var(--navy)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: pwSending ? 'default' : 'pointer',
                  }}
                >
                  {pwSending ? 'Sending…' : 'Send Reset Link'}
                </button>
              )}
            </div>

            <div style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>
                Account created
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>
        )}

        {/* ── DANGER ZONE TAB ── */}
        {activeTab === 'danger' && (
          <div style={{ maxWidth: '540px' }}>
            <h2 style={{ ...sectionHeadStyle, color: '#dc2626' }}>Danger Zone</h2>
            <p style={sectionDescStyle}>
              Permanently delete your account and all associated data. This cannot be undone.
            </p>

            <div style={{
              background: '#fff5f5',
              border: '1.5px solid #fca5a5',
              borderRadius: '8px',
              padding: '24px',
            }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: '#dc2626', margin: '0 0 8px' }}>
                Delete Account
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#7f1d1d', margin: '0 0 16px', lineHeight: 1.5 }}>
                This will delete your profile, watchlist, activity history, and notification preferences. Your account cannot be recovered.
              </p>
              <label style={{ ...labelStyle, color: '#7f1d1d' }}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={{ ...inputStyle, borderColor: '#fca5a5', marginBottom: '14px' }}
              />
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                style={{
                  padding: '10px 20px',
                  background: deleteConfirm === 'DELETE' ? '#dc2626' : '#e5e7eb',
                  color: deleteConfirm === 'DELETE' ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: deleteConfirm === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                  transition: 'background 150ms',
                }}
              >
                {deleting ? 'Deleting…' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  color: 'var(--text-primary)',
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none',
}

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--navy)',
  margin: '0 0 8px',
}

const sectionDescStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  color: 'var(--text-muted)',
  margin: '0 0 24px',
  lineHeight: 1.5,
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
