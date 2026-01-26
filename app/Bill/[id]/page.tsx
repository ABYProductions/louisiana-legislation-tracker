import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

async function getBill(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data, error } = await supabase
    .from('Bills')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching bill:', error)
    return null
  }
  
  return data
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bill = await getBill(id)
  
  if (!bill) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to all bills
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Bill not found</h1>
        </div>
      </main>
    )
  }
  
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to all bills
        </Link>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{bill.bill_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              bill.status === 'Passed' ? 'bg-green-100 text-green-800' :
              bill.status === 'Failed' ? 'bg-red-100 text-red-800' :
              bill.status === 'Prefiled' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {bill.status || 'Unknown Status'}
            </span>
          </div>
          
          <h2 className="text-xl text-gray-700 mb-4">{bill.title}</h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
            <div>
              <span className="font-semibold">Author:</span> {bill.author || 'Not specified'}
            </div>
            <div>
              <span className="font-semibold">Session:</span> {bill.session_year}
            </div>
            <div>
              <span className="font-semibold">Last Action:</span> {bill.last_action || 'None'}
            </div>
            <div>
              <span className="font-semibold">Last Action Date:</span> {bill.last_action_date || 'N/A'}
            </div>
          </div>
          
          {bill.state_link && (
            <a 
              href={bill.state_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Louisiana Legislature website →
            </a>
          )}
        </div>
        
        {bill.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">AI Summary</h3>
            <p className="text-blue-800 whitespace-pre-line">{bill.summary}</p>
          </div>
        )}
        
        {bill.description && bill.description !== bill.title && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700">{bill.description}</p>
          </div>
        )}
        
        {bill.subjects && bill.subjects.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {bill.subjects.map((subject: any, index: number) => (
                <span 
                  key={index}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  {subject.subject_name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {bill.sponsors && bill.sponsors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Sponsors</h3>
            <ul className="space-y-2">
              {bill.sponsors.map((sponsor: any, index: number) => (
                <li key={index} className="text-gray-700">
                  {sponsor.name} 
                  {sponsor.sponsor_type_desc && (
                    <span className="text-gray-500 text-sm ml-2">({sponsor.sponsor_type_desc})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {bill.history && bill.history.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill History</h3>
            <div className="space-y-3">
              {bill.history.map((event: any, index: number) => (
                <div key={index} className="flex border-l-2 border-gray-200 pl-4">
                  <div className="min-w-[100px] text-sm text-gray-500">{event.date}</div>
                  <div className="text-gray-700">{event.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
