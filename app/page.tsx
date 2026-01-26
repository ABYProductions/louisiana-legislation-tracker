import { createClient } from '@supabase/supabase-js'

async function getBills() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data, error } = await supabase
    .from('Bills')
    .select('*')
    .order('bill_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching bills:', JSON.stringify(error, null, 2))
    return []
  }
  
  return data || []
}

export default async function Home() {
  const bills = await getBills()
  
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Louisiana Legislation Tracker
        </h1>
        <p className="text-gray-600 mb-8">
          Tracking bills for the 2026 Legislative Session
        </p>
        
        <div className="bg-white rounded-lg shadow">
          {bills.length === 0 ? (
            <p className="p-8 text-gray-500">No bills found.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {bills.map((bill) => (
                <div key={bill.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {bill.bill_number}
                      </h2>
                      <p className="text-gray-700 mb-3">
                        {bill.title}
                      </p>
                      
                      {bill.summary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            AI Summary
                          </h3>
                          <p className="text-sm text-blue-800 whitespace-pre-line">
                            {bill.summary}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Author: {bill.author || 'Not specified'}</span>
                        <span>Status: {bill.status || 'Not specified'}</span>
                        {bill.last_action && (
                          <span>Last Action: {bill.last_action}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
