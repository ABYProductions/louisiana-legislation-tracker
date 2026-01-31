import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getBill(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.from('Bills').select('*').eq('id', id).single()
  if (error) return null
  return data
}

function getStatusStyle(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case 'passed': return 'bg-emerald-100 text-emerald-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'prefiled': return 'bg-amber-100 text-amber-800'
    default: return 'bg-slate-100 text-slate-800'
  }
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bill = await getBill(id)
  if (!bill) notFound()

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-slate-600 hover:text-indigo-600">← Back to all bills</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl">
                {bill.bill_number?.replace(/[^A-Z]/g, '') || 'B'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{bill.bill_number}</h1>
                <p className="text-slate-500">{bill.session_year} Regular Session</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusStyle(bill.status)}`}>
              {bill.status || 'Unknown'}
            </span>
          </div>

          <h2 className="text-xl text-slate-700 mb-6">{bill.title}</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-sm">Author</p>
              <p className="font-semibold text-slate-900">{bill.author || 'Not specified'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-sm">Last Action</p>
              <p className="font-semibold text-slate-900">{formatDate(bill.last_action_date)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-sm">Committee</p>
              <p className="font-semibold text-slate-900">{bill.committee || 'Not assigned'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-sm">Chamber</p>
              <p className="font-semibold text-slate-900">{bill.body || 'Not specified'}</p>
            </div>
          </div>

          {bill.state_link && (
            <a
              href={bill.state_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              View Official Document →
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {bill.summary && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-8">
                <h3 className="font-bold text-slate-900 mb-2">AI Summary</h3>
                <div className="text-slate-700 space-y-4">
  {bill.summary.split('\n').map((line: string, i: number) => {
    const cleanLine = line
      .replace(/^#{1,3}\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^[-•]\s*/g, '• ')
      .trim()
    
    if (!cleanLine) return null
    
    const isHeader = line.startsWith('#') || 
      ['Executive Summary', 'Existing Statutes Impacted', 'Affected Parties', 'Impact Potential', 'Plain-Language Summary', 'What this bill does', 'Who Would Be Affected', 'Potential Impact'].some(h => cleanLine.includes(h))
    
    if (isHeader) {
      return <h4 key={i} className="font-semibold text-slate-900 pt-2">{cleanLine}</h4>
    }
    return <p key={i}>{cleanLine}</p>
  })}
</div>
              </div>
            )}

            {bill.description && bill.description !== bill.title && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="font-bold text-slate-900 mb-4">Description</h3>
                <p className="text-slate-700">{bill.description}</p>
              </div>
            )}

            {bill.history && bill.history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="font-bold text-slate-900 mb-6">Bill History</h3>
                <div className="space-y-4">
                  {bill.history.map((event: { date: string; action: string }, index: number) => (
                    <div key={index} className="flex gap-4 pb-4 border-b border-slate-100 last:border-0">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${index === 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-sm text-slate-500">{formatDate(event.date)}</p>
                        <p className="text-slate-900">{event.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bill.votes && bill.votes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="font-bold text-slate-900 mb-6">Votes</h3>
                <div className="space-y-4">
                  {bill.votes.map((vote: { date: string; desc: string; yea?: number; nay?: number }, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{vote.desc}</p>
                        <p className="text-sm text-slate-500">{formatDate(vote.date)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {vote.yea !== undefined && <div className="text-center"><p className="text-lg font-bold text-emerald-600">{vote.yea}</p><p className="text-xs text-slate-500">Yea</p></div>}
                        {vote.nay !== undefined && <div className="text-center"><p className="text-lg font-bold text-red-600">{vote.nay}</p><p className="text-xs text-slate-500">Nay</p></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bill.texts && bill.texts.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="font-bold text-slate-900 mb-6">Bill Documents</h3>
                <div className="space-y-3">
                  {bill.texts.map((text: { type: string; date: string; state_link?: string; url?: string }, index: number) => (
                    <a key={index} href={text.state_link || text.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-slate-900">{text.type}</p>
                        <p className="text-sm text-slate-500">{formatDate(text.date)}</p>
                      </div>
                      <span className="text-slate-400">→</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {bill.sponsors && bill.sponsors.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Sponsors ({bill.sponsors.length})</h3>
                <div className="space-y-3">
                  {bill.sponsors.map((sponsor: { name: string; sponsor_type_desc?: string }, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm">
                        {sponsor.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{sponsor.name}</p>
                        <p className="text-sm text-slate-500">{sponsor.sponsor_type_desc || 'Sponsor'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bill.subjects && bill.subjects.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {bill.subjects.map((subject: { subject_name: string }, index: number) => (
                    <span key={index} className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm">
                      {subject.subject_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {bill.last_action && (
              <div className="bg-indigo-50 rounded-2xl p-6">
                <h3 className="font-bold text-indigo-900 mb-2">Latest Action</h3>
                <p className="text-indigo-800">{bill.last_action}</p>
                {bill.last_action_date && <p className="text-sm text-indigo-600 mt-2">{formatDate(bill.last_action_date)}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
