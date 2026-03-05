// lib/email-templates.ts
// All five email template builders for SessionSource Louisiana.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sessionsource.net'

// ── Shared wrapper ─────────────────────────────────────────────────────────────

function wrap(body: string, userId: string): string {
  const unsubToken = Buffer.from(userId).toString('base64url')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SessionSource Louisiana</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <!-- Header -->
    <div style="background:#0C2340;padding:32px;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#C4922A;font-weight:600;letter-spacing:0.02em;">SessionSource Louisiana</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#AABBD0;margin-top:6px;letter-spacing:0.05em;">Louisiana Legislature Tracker</div>
    </div>
    <!-- Body -->
    <div style="padding:36px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="background:#F7F4EF;padding:24px;border-top:1px solid #DDD8CE;text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:0 0 8px;">
        Legislative data may reflect a 24–48 hour delay. Verify time-sensitive information at
        <a href="https://legis.la.gov" style="color:#C4922A;">legis.la.gov</a>.
      </p>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:0 0 8px;">
        <a href="${SITE_URL}/account#notifications" style="color:#C4922A;text-decoration:none;">Manage Preferences</a>
        &nbsp;|&nbsp;
        <a href="${SITE_URL}/api/notifications/unsubscribe?token=${unsubToken}" style="color:#999;text-decoration:none;">Unsubscribe</a>
      </p>
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#BBB;margin:0;">
        SessionSource Louisiana &middot; Louisiana, USA &middot; ${SITE_URL}
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── Status badge colors ────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const s = (status || '').toLowerCase()
  let bg = '#F7F4EF', color = '#666'
  if (s.includes('pass') || s.includes('sign') || s.includes('enact')) { bg = '#E8F5E9'; color = '#2D7A3A' }
  else if (s.includes('fail') || s.includes('veto') || s.includes('dead') || s.includes('withdraw')) { bg = '#FDECEA'; color = '#C0392B' }
  else if (s.includes('committee') || s.includes('refer')) { bg = '#EEF2FF'; color = '#3730A3' }
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${bg};color:${color};">${status || 'Pending'}</span>`
}

// ── 1. Welcome email ───────────────────────────────────────────────────────────

export function buildWelcomeEmail(user: { id: string; email: string; name?: string }): { subject: string; html: string } {
  const name = user.name || 'there'
  const body = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#0C2340;font-weight:600;margin:0 0 16px;">Welcome, ${name}!</h1>
    <p style="font-family:Arial,sans-serif;font-size:16px;color:#555;line-height:1.7;margin:0 0 24px;">
      Your account is ready. Here's what you can do:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;vertical-align:top;width:36px;font-size:22px;">📋</td>
        <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#0C2340;">Track Bills</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;margin-top:2px;">Add bills to your watchlist from any bill page.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;vertical-align:top;font-size:22px;">🔔</td>
        <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#0C2340;">Get Updates</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;margin-top:2px;">Receive your Sunday digest every week.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;vertical-align:top;font-size:22px;">🏛️</td>
        <td style="padding:14px 0;">
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#0C2340;">Stay Informed</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;margin-top:2px;">Follow Louisiana's 2026 legislative session.</div>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${SITE_URL}" style="display:inline-block;background:#0C2340;color:white;font-family:Arial,sans-serif;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">Browse Bills Now</a>
    </div>
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#AAA;text-align:center;margin:0;">
      You're subscribed to the Sunday Weekly Digest. Change this anytime in
      <a href="${SITE_URL}/account" style="color:#C4922A;text-decoration:none;">My Account</a>.
    </p>
  `
  return {
    subject: 'Welcome to SessionSource Louisiana — You\'re All Set',
    html: wrap(body, user.id),
  }
}

// ── 2. Sunday digest email ─────────────────────────────────────────────────────

export interface DigestPayload {
  user: { id: string; email: string; name?: string }
  weekOf: string
  aiNarrative: string
  activeBills: Array<{
    bill: { id: number; bill_number: string; title: string; status: string; last_action?: string; last_action_date?: string }
    activities: string[]
    voteResult?: { result: string; yeas: number; nays: number }
    amendments?: string[]
    upcomingEvents?: string[]
  }>
  quietBills?: Array<{ id: number; bill_number: string; title: string; status: string; last_action?: string }>
  weekAheadEvents?: Array<{ bill_number: string; event_type: string; scheduled_date: string; committee?: string }>
  sessionSnapshot?: { sessionName: string; daysRemaining: number; userWatchedTotal: number; userWatchedActive: number; userWatchedDead: number; lastSyncedAt: string }
  includeOptions: {
    aiNarrative: boolean; billSummaries: boolean; voteResults: boolean
    amendments: boolean; weekAhead: boolean; sessionSnapshot: boolean; quietBills: boolean
  }
}

export function buildSundayDigestEmail(payload: DigestPayload): { subject: string; html: string } {
  const { user, weekOf, aiNarrative, activeBills, quietBills, weekAheadEvents, sessionSnapshot, includeOptions } = payload
  const name = user.name || 'there'
  const lastSynced = sessionSnapshot?.lastSyncedAt
    ? new Date(sessionSnapshot.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'recently'

  let body = `
    <p style="font-family:Arial,sans-serif;font-size:16px;color:#333;line-height:1.7;margin:0 0 28px;">
      Good morning, ${name} &mdash;<br>
      Here's your Louisiana Legislature roundup for ${weekOf}.
    </p>
  `

  // AI Narrative
  if (includeOptions.aiNarrative && aiNarrative) {
    body += `
      <div style="border-left:3px solid #C4922A;padding-left:20px;margin-bottom:32px;">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#C4922A;letter-spacing:2px;font-weight:700;margin-bottom:10px;text-transform:uppercase;">Week in Review</div>
        <p style="font-family:Arial,sans-serif;font-size:16px;color:#555;font-style:italic;line-height:1.8;margin:0;">${aiNarrative}</p>
      </div>
    `
  }

  // Session snapshot
  if (includeOptions.sessionSnapshot && sessionSnapshot) {
    body += `
      <div style="background:#F7F4EF;border:1px solid #DDD8CE;border-radius:8px;padding:20px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="text-align:center;padding:0 10px;border-right:1px solid #DDD8CE;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;color:#0C2340;font-weight:600;">${sessionSnapshot.daysRemaining}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:4px;">Days Left</div>
            </td>
            <td style="text-align:center;padding:0 10px;border-right:1px solid #DDD8CE;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;color:#0C2340;font-weight:600;">${sessionSnapshot.userWatchedActive}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:4px;">Bills Active</div>
            </td>
            <td style="text-align:center;padding:0 10px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;color:#C0392B;font-weight:600;">${sessionSnapshot.userWatchedDead}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:4px;">Bills Stalled</div>
            </td>
          </tr>
        </table>
      </div>
    `
  }

  // Active bills
  if ((activeBills || []).length > 0) {
    body += `
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#0C2340;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #0C2340;padding-bottom:8px;margin-bottom:20px;">Watchlist Activity This Week</div>
    `
    for (const item of (activeBills || [])) {
      const { bill, activities, voteResult, amendments, upcomingEvents } = item
      body += `
        <div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #F0EDE8;">
          <div style="margin-bottom:6px;">
            <span style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;font-weight:700;">${bill.bill_number}</span>
            &nbsp;&nbsp;${statusBadge(bill.status)}
          </div>
          <h3 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#0C2340;font-weight:600;margin:0 0 12px;line-height:1.3;">
            <a href="${SITE_URL}/bill/${bill.id}" style="color:#0C2340;text-decoration:none;">${bill.title}</a>
          </h3>
          ${(activities || []).length > 0 ? `
            <ul style="font-family:Arial,sans-serif;font-size:14px;color:#444;line-height:1.8;margin:0 0 10px;padding-left:20px;">
              ${(activities || []).map(a => `<li>${a}</li>`).join('')}
            </ul>
          ` : ''}
          ${includeOptions.voteResults && voteResult ? `
            <div style="background:${voteResult.result.toLowerCase().includes('pass') ? '#E8F5E9' : '#FDECEA'};border-radius:6px;padding:10px 14px;margin-bottom:10px;font-family:Arial,sans-serif;font-size:13px;color:${voteResult.result.toLowerCase().includes('pass') ? '#2D7A3A' : '#C0392B'};font-weight:600;">
              Vote: ${voteResult.result} &mdash; Yeas: ${voteResult.yeas}, Nays: ${voteResult.nays}
            </div>
          ` : ''}
          ${includeOptions.amendments && (amendments || []).length > 0 ? `
            <p style="font-family:Arial,sans-serif;font-size:13px;color:#666;font-style:italic;margin:0 0 10px;">Amendment: ${(amendments || []).join('; ')}</p>
          ` : ''}
          ${(upcomingEvents || []).length > 0 ? `
            <div style="background:#FDF8EE;border:1px solid #C4922A;border-radius:4px;padding:8px 12px;margin-bottom:10px;font-family:Arial,sans-serif;font-size:12px;color:#C4922A;">
              📅 Upcoming: ${(upcomingEvents || []).join(' &bull; ')}
            </div>
          ` : ''}
          <a href="${SITE_URL}/bill/${bill.id}" style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;text-decoration:none;font-weight:600;">View Full Bill &rarr;</a>
        </div>
      `
    }
  }

  // Week ahead
  if (includeOptions.weekAhead && (weekAheadEvents || []).length > 0) {
    body += `
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#0C2340;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #0C2340;padding-bottom:8px;margin:32px 0 16px;">Week Ahead</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="background:#F7F4EF;">
            <th style="font-family:Arial,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:left;padding:8px 10px;">Bill</th>
            <th style="font-family:Arial,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:left;padding:8px 10px;">Event</th>
            <th style="font-family:Arial,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:left;padding:8px 10px;">Date</th>
            <th style="font-family:Arial,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:left;padding:8px 10px;">Committee</th>
          </tr>
        </thead>
        <tbody>
          ${(weekAheadEvents || []).map((e, i) => `
            <tr style="background:${i % 2 === 0 ? 'white' : '#F7F4EF'};">
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#C4922A;font-weight:600;padding:9px 10px;">${e.bill_number}</td>
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;padding:9px 10px;">${e.event_type}</td>
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;padding:9px 10px;">${e.scheduled_date}</td>
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;padding:9px 10px;">${e.committee || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="background:#FDF8EE;border:1px solid #C4922A;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#C4922A;margin:0;">
          📅 Louisiana Legislature hearing schedules are frequently posted with limited advance notice. Above reflects data as of ${lastSynced}. Verify at <a href="https://legis.la.gov" style="color:#C4922A;">legis.la.gov</a>.
        </p>
      </div>
    `
  }

  // Quiet bills
  if (includeOptions.quietBills && (quietBills || []).length > 0) {
    body += `
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#888;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #DDD8CE;padding-bottom:8px;margin:32px 0 16px;">No Recent Activity</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        ${(quietBills || []).map((b, i) => `
          <tr style="background:${i % 2 === 0 ? 'white' : '#F7F4EF'};">
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;font-weight:600;padding:8px 10px;white-space:nowrap;">${b.bill_number}</td>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#333;padding:8px 10px;">${b.title}</td>
            <td style="font-family:Arial,sans-serif;font-size:12px;color:#888;padding:8px 10px;white-space:nowrap;">${b.status}</td>
            <td style="font-family:Arial,sans-serif;font-size:12px;color:#AAA;padding:8px 10px;">${b.last_action || ''}</td>
          </tr>
        `).join('')}
      </table>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#AAA;font-style:italic;">These bills remain in your watchlist but had no recorded activity this week.</p>
    `
  }

  // CTA
  body += `
    <div style="background:#0C2340;padding:28px;border-radius:8px;text-align:center;margin-top:32px;">
      <a href="${SITE_URL}" style="display:inline-block;background:#C4922A;color:white;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;">Open SessionSource &rarr;</a>
    </div>
  `

  return {
    subject: `📋 Your Louisiana Legislature Roundup — Week of ${weekOf}`,
    html: wrap(body, user.id),
  }
}

// ── 3. Daily digest email ──────────────────────────────────────────────────────

export function buildDailyDigestEmail(payload: {
  user: { id: string; email: string; name?: string }
  dateLabel: string
  activeBills: Array<{
    bill: { id: number; bill_number: string; title: string; status: string }
    activity: string
  }>
}): { subject: string; html: string } {
  const { user, dateLabel, activeBills } = payload
  const name = user.name || 'there'

  let billRows = ''
  if ((activeBills || []).length === 0) {
    billRows = `
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#888;line-height:1.7;">
        No recorded activity today on your watched bills. Check back Sunday for your full weekly roundup.
      </p>
    `
  } else {
    for (const item of (activeBills || [])) {
      billRows += `
        <div style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <div style="margin-bottom:4px;">
            <span style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;font-weight:700;">${item.bill.bill_number}</span>
            &nbsp;&nbsp;${statusBadge(item.bill.status)}
          </div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#0C2340;font-weight:600;margin-bottom:4px;">
            <a href="${SITE_URL}/bill/${item.bill.id}" style="color:#0C2340;text-decoration:none;">${item.bill.title}</a>
          </div>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#555;">${item.activity}</div>
        </div>
      `
    }
  }

  const body = `
    <p style="font-family:Arial,sans-serif;font-size:16px;color:#333;margin:0 0 20px;">Good morning, ${name} &mdash; here's ${dateLabel}.</p>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#0C2340;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #0C2340;padding-bottom:8px;margin-bottom:16px;">Today's Activity</div>
    ${billRows}
    <div style="text-align:center;margin-top:28px;">
      <a href="${SITE_URL}/watchlist" style="display:inline-block;background:#0C2340;color:white;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">View Your Watchlist &rarr;</a>
    </div>
  `

  return {
    subject: `⚡ Louisiana Legislature Daily — ${dateLabel}`,
    html: wrap(body, user.id),
  }
}

// ── 4. Alert email ─────────────────────────────────────────────────────────────

type AlertEventType = 'committee_hearing' | 'floor_vote' | 'bill_amended' | 'governor_action' | 'committee_vote' | 'bill_withdrawn'

const ALERT_CONFIGS: Record<AlertEventType, { subject: (bn: string) => string; bannerBg: string; bannerColor: string; bannerLabel: string }> = {
  committee_hearing: {
    subject: (bn) => `🏛️ Hearing Alert: ${bn} Scheduled for Committee`,
    bannerBg: '#FDF8EE', bannerColor: '#C4922A', bannerLabel: 'HEARING SCHEDULED',
  },
  floor_vote: {
    subject: (bn) => `🗳️ Floor Vote: ${bn} — Vote Scheduled or Completed`,
    bannerBg: '#EEF2FF', bannerColor: '#3730A3', bannerLabel: 'FLOOR VOTE',
  },
  bill_amended: {
    subject: (bn) => `📝 Amendment: ${bn} Has Been Amended`,
    bannerBg: '#EEF2FF', bannerColor: '#3730A3', bannerLabel: 'AMENDED',
  },
  governor_action: {
    subject: (bn) => `✍️ Governor Action: ${bn}`,
    bannerBg: '#E8F5E9', bannerColor: '#2D7A3A', bannerLabel: 'GOVERNOR ACTION',
  },
  committee_vote: {
    subject: (bn) => `🏛️ Committee Vote: ${bn}`,
    bannerBg: '#F7F4EF', bannerColor: '#0C2340', bannerLabel: 'COMMITTEE VOTE',
  },
  bill_withdrawn: {
    subject: (bn) => `❌ ${bn} Has Been Withdrawn`,
    bannerBg: '#F7F4EF', bannerColor: '#888', bannerLabel: 'WITHDRAWN',
  },
}

export function buildAlertEmail(payload: {
  user: { id: string; email: string; name?: string }
  bill: { id: number; bill_number: string; title: string; status: string }
  eventType: AlertEventType
  eventDetails: string
  scheduledDate?: string
}): { subject: string; html: string } {
  const { user, bill, eventType, eventDetails, scheduledDate } = payload
  const cfg = ALERT_CONFIGS[eventType] || ALERT_CONFIGS.committee_hearing

  const body = `
    <div style="background:${cfg.bannerBg};border:1px solid ${cfg.bannerColor};border-left:4px solid ${cfg.bannerColor};border-radius:6px;padding:12px 16px;margin-bottom:24px;">
      <span style="font-family:Arial,sans-serif;font-size:11px;color:${cfg.bannerColor};letter-spacing:2px;font-weight:700;text-transform:uppercase;">${cfg.bannerLabel}</span>
    </div>
    <div style="margin-bottom:6px;">
      <span style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;font-weight:700;">${bill.bill_number}</span>
      &nbsp;&nbsp;${statusBadge(bill.status)}
    </div>
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#0C2340;font-weight:600;margin:0 0 16px;line-height:1.3;">${bill.title}</h2>
    <p style="font-family:Arial,sans-serif;font-size:15px;color:#444;line-height:1.7;margin:0 0 16px;">${eventDetails}</p>
    ${scheduledDate ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#888;margin:0 0 16px;">Scheduled: ${scheduledDate}</p>` : ''}
    ${eventType === 'committee_hearing' ? `
      <div style="background:#FDF8EE;border:1px solid #C4922A;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#C4922A;margin:0;">⚠️ Louisiana Legislature committee hearings are often posted with limited advance notice. Always verify time-sensitive information at <a href="https://legis.la.gov" style="color:#C4922A;">legis.la.gov</a>.</p>
      </div>
    ` : ''}
    <a href="${SITE_URL}/bill/${bill.id}" style="display:inline-block;background:#0C2340;color:white;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">View Full Bill &rarr;</a>
  `

  return {
    subject: cfg.subject(bill.bill_number),
    html: wrap(body, user.id),
  }
}

// ── 5. Session end email ───────────────────────────────────────────────────────

export function buildSessionEndEmail(payload: {
  user: { id: string; email: string; name?: string }
  sessionName: string
  adjournmentDate: string
  passedBills: Array<{ id: number; bill_number: string; title: string; status: string }>
  failedBills: Array<{ id: number; bill_number: string; title: string; reason?: string }>
}): { subject: string; html: string } {
  const { user, sessionName, adjournmentDate, passedBills, failedBills } = payload

  const body = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#0C2340;font-weight:600;margin:0 0 8px;">Louisiana Legislature Adjourns</h1>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#888;margin:0 0 24px;">${sessionName} &bull; ${adjournmentDate}</p>
    <p style="font-family:Arial,sans-serif;font-size:16px;color:#333;line-height:1.7;margin:0 0 28px;">
      ${passedBills.length} of your ${passedBills.length + failedBills.length} watched bills passed.
    </p>

    ${(passedBills || []).length > 0 ? `
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#2D7A3A;letter-spacing:2px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2D7A3A;padding-bottom:6px;margin-bottom:16px;">Bills That Passed</div>
      ${(passedBills || []).map(b => `
        <div style="padding:10px 0;border-bottom:1px solid #F0EDE8;">
          <a href="${SITE_URL}/bill/${b.id}" style="font-family:Arial,sans-serif;font-size:13px;color:#C4922A;font-weight:700;text-decoration:none;">${b.bill_number}</a>
          <span style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin-left:10px;">${b.title}</span>
          <span style="margin-left:8px;">${statusBadge(b.status)}</span>
        </div>
      `).join('')}
    ` : ''}

    ${(failedBills || []).length > 0 ? `
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#C0392B;letter-spacing:2px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #C0392B;padding-bottom:6px;margin:28px 0 16px;">Bills That Failed or Died</div>
      ${(failedBills || []).map(b => `
        <div style="padding:10px 0;border-bottom:1px solid #F0EDE8;">
          <a href="${SITE_URL}/bill/${b.id}" style="font-family:Arial,sans-serif;font-size:13px;color:#C0392B;font-weight:700;text-decoration:none;">${b.bill_number}</a>
          <span style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin-left:10px;">${b.title}</span>
          ${b.reason ? `<span style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-left:8px;">&mdash; ${b.reason}</span>` : ''}
        </div>
      `).join('')}
    ` : ''}

    <p style="font-family:Arial,sans-serif;font-size:15px;color:#555;line-height:1.7;margin:28px 0 0;border-top:1px solid #F0EDE8;padding-top:24px;">
      Thank you for tracking the ${sessionName} with SessionSource Louisiana.
    </p>
  `

  return {
    subject: `🏛️ Louisiana Legislature Adjourns — Final Status of Your Watched Bills`,
    html: wrap(body, user.id),
  }
}
