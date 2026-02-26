'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottom: '2px solid #C4922A',
    paddingBottom: 12,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandName: {
    fontSize: 10,
    color: '#9a9490',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dateText: {
    fontSize: 9,
    color: '#9a9490',
  },
  billNum: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#0d2a4a',
    backgroundColor: '#f5f1ea',
    padding: '3 8',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  priorityBadge: {
    fontSize: 8,
    padding: '2 6',
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginTop: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d2a4a',
    marginTop: 8,
    lineHeight: 1.3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#9a9490',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 10,
    color: '#4a4540',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9a9490',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 4,
    borderBottom: '1px solid #e2ddd4',
    paddingBottom: 4,
  },
  summaryText: {
    fontSize: 10,
    color: '#4a4540',
    lineHeight: 1.6,
  },
  notesBox: {
    backgroundColor: '#f5f1ea',
    padding: 10,
    marginTop: 6,
    borderLeft: '3px solid #C4922A',
  },
  notesText: {
    fontSize: 10,
    color: '#4a4540',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    borderBottom: '1px solid #e2ddd4',
  },
  historyDate: {
    fontSize: 9,
    fontFamily: 'Courier',
    color: '#9a9490',
    width: 60,
    flexShrink: 0,
  },
  historyAction: {
    fontSize: 9,
    color: '#4a4540',
    flex: 1,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e2ddd4',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#9a9490',
  },
})

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626' },
  high: { bg: '#FEF3C7', text: '#D97706' },
  normal: { bg: '#F3F4F6', text: '#6B7280' },
  low: { bg: '#F0FDF4', text: '#16A34A' },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

type HistoryItem = { date: string; action: string }

interface BillForPDF {
  bill_id?: number
  id?: number
  bill_number: string
  title: string
  status: string | null
  author: string | null
  committee: string | null
  last_action: string | null
  last_action_date: string | null
  summary: string | null
  summary_status: string | null
  notes: string | null
  priority: string
  history: HistoryItem[] | null
}

interface Props {
  bills: BillForPDF[]
  title?: string
}

export default function WatchlistPDF({ bills, title }: Props) {
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const total = bills.length

  return (
    <Document title={title || 'SessionSource Watchlist'} author="SessionSource">
      {bills.map((bill, idx) => {
        const priority = bill.priority || 'normal'
        const priorityColors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal
        const history = Array.isArray(bill.history)
          ? [...bill.history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
          : []

        return (
          <Page key={bill.bill_number} size="LETTER" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Text style={styles.brandName}>SessionSource · Louisiana Legislature</Text>
                <Text style={styles.dateText}>Generated {generatedDate}</Text>
              </View>
            </View>

            {/* Bill number + priority */}
            <View style={styles.badgeRow}>
              <Text style={styles.billNum}>{bill.bill_number}</Text>
              {priority !== 'normal' && (
                <Text style={{ ...styles.priorityBadge, backgroundColor: priorityColors.bg, color: priorityColors.text }}>
                  {priority.toUpperCase()}
                </Text>
              )}
            </View>

            {/* Title */}
            <Text style={styles.billTitle}>{bill.title || 'Untitled Bill'}</Text>

            {/* Meta row */}
            <View style={styles.metaRow}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Sponsor</Text>
                <Text style={styles.metaValue}>{bill.author || '—'}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Committee</Text>
                <Text style={styles.metaValue}>{bill.committee || '—'}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={styles.metaValue}>{bill.status || '—'}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Last Action</Text>
                <Text style={styles.metaValue}>{formatDate(bill.last_action_date)}</Text>
              </View>
            </View>

            {/* Summary */}
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <Text style={styles.summaryText}>
              {bill.summary_status === 'complete' && bill.summary
                ? bill.summary
                : 'Summary pending — bill text not yet available.'}
            </Text>

            {/* Notes */}
            {bill.notes && (
              <>
                <Text style={styles.sectionTitle}>Your Notes</Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{bill.notes}</Text>
                </View>
              </>
            )}

            {/* History */}
            {history.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent History</Text>
                {history.map((h, hi) => (
                  <View key={hi} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{formatDate(h.date)}</Text>
                    <Text style={styles.historyAction}>{h.action}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Footer */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>Generated by SessionSource · sessionsource.com</Text>
              <Text style={styles.footerText}>{bill.bill_number} · {idx + 1} of {total}</Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
