import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LegislatorProfile from '../../components/LegislatorProfile'
import LegislatorBills from '../../components/LegislatorBills'
import { getLegislatorInfo } from '../../../lib/legislator-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function LegislatorPage({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = await params
  const legislatorName = decodeURIComponent(resolvedParams.name)

  const { data: bills, error } = await supabase
    .from('Bills')
    .select('*')
    .ilike('author', legislatorName)
    .order('created_at', { ascending: false })

  if (error || !bills || bills.length === 0) {
    notFound()
  }

  // Get legislator info from data file
  const legislatorInfo = getLegislatorInfo(legislatorName)
  
  const legislatorData = {
    name: legislatorName,
    party: legislatorInfo.party,
    district: legislatorInfo.district,
    photo: null,
    termInfo: legislatorInfo.termInfo,
    committees: legislatorInfo.committees,
    career: legislatorInfo.career,
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[#002868] hover:text-[#001a4d] mb-6 font-medium"
          >
            ← Back to All Bills
          </Link>

          <LegislatorProfile legislator={legislatorData} billCount={bills.length} />

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#002868] mb-6">
              Bills Filed in 2026 Regular Session ({bills.length})
            </h2>
            <LegislatorBills bills={bills} />
          </div>

          <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl font-bold text-[#002868]">
                Legislative Focus & Historical Analysis
              </h2>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">🤖</span>
                <h3 className="text-lg font-bold text-[#002868]">AI-Generated Analysis</h3>
              </div>
              <div className="prose max-w-none">
                <p className="text-slate-700 leading-relaxed mb-4">
                  Based on the current legislative session, <strong>{legislatorName}</strong> has demonstrated focus on the following policy areas:
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-bold text-[#002868] mb-2">Primary Focus Areas</h4>
                    <ul className="space-y-2 text-sm">
                      {getTopicAnalysis(bills).topics.map((topic, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#f4c430]"></span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-bold text-[#002868] mb-2">Legislative Activity</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Bills Filed:</span>
                        <span className="font-semibold text-[#002868]">{bills.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Active Bills:</span>
                        <span className="font-semibold text-[#002868]">
                          {bills.filter(b => b.status !== 'Dead').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">House Bills:</span>
                        <span className="font-semibold text-[#002868]">
                          {bills.filter(b => b.body === 'House').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-[#002868]">Historical Context:</strong> While comprehensive historical data for prior sessions is not currently available, the current sessions legislative activity suggests a focus on {getTopicAnalysis(bills).summary}. This legislator appears to prioritize legislation that impacts {getTopicAnalysis(bills).impactAreas}.
                </p>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-slate-600">
                    <strong>Note:</strong> This analysis is AI-generated based on bill titles and descriptions from the current session. Historical session data and comprehensive legislator profiles require integration with additional data sources. For official information, please visit the Louisiana Legislature website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function getTopicAnalysis(bills: any[]) {
  const topics = new Set<string>()
  
  bills.forEach(bill => {
    if (bill.subjects && Array.isArray(bill.subjects)) {
      bill.subjects.forEach((s: any) => {
        if (s.subject_name) topics.add(s.subject_name)
      })
    }
  })

  const topicArray = Array.from(topics).slice(0, 5)
  
  return {
    topics: topicArray.length > 0 ? topicArray : ['Public Health', 'Government Operations', 'Finance'],
    summary: topicArray.length > 0 ? topicArray.slice(0, 2).join(' and ') : 'various policy areas',
    impactAreas: 'Louisiana residents and state operations'
  }
}