import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
            <h1 className="text-4xl font-bold text-[#0C2340] mb-6">
              About SessionSource - Louisiana
            </h1>
            
            <div className="prose max-w-none space-y-6 text-slate-700 leading-relaxed">
              <p className="text-lg">
                The SessionSource - Louisiana is a public service tool designed to make Louisiana state legislation more accessible and understandable for all citizens of the Pelican State.
              </p>

              <h2 className="text-2xl font-bold text-[#0C2340] mt-8 mb-4">Our Mission</h2>
              <p>
                We believe that an informed citizenry is essential to democracy. Our mission is to provide Louisiana residents with clear, accessible summaries of state legislation using artificial intelligence technology to break down complex legal language into plain English.
              </p>

              <h2 className="text-2xl font-bold text-[#0C2340] mt-8 mb-4">How It Works</h2>
              <p>
                Our system automatically syncs with the Louisiana Legislature's LegiScan database every 4 hours during active legislative sessions. When new bills are introduced or updated, we use Claude AI (by Anthropic) to generate comprehensive summaries that explain:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>What the bill does in plain language</li>
                <li>Who would be affected by the legislation</li>
                <li>Potential impacts on Louisiana residents and businesses</li>
                <li>Which Louisiana Revised Statutes would be modified</li>
              </ul>

              <h2 className="text-2xl font-bold text-[#0C2340] mt-8 mb-4">Features</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Real-time Updates:</strong> Automated synchronization with official legislative data</li>
                <li><strong>AI-Powered Summaries:</strong> Complex bills explained in accessible language</li>
                <li><strong>Legislator Profiles:</strong> Track bills by sponsor and view legislative activity</li>
                <li><strong>Search & Filter:</strong> Find bills by chamber, sponsor, subject, or status</li>
                <li><strong>Bill Timeline:</strong> Track legislation through the legislative process</li>
              </ul>

              <h2 className="text-2xl font-bold text-[#0C2340] mt-8 mb-4">Technology</h2>
              <p>
                This project is built with modern web technologies including Next.js, Supabase, and the Anthropic Claude API. We believe in transparency and open-source principles.
              </p>

              <h2 className="text-2xl font-bold text-[#0C2340] mt-8 mb-4">Contact</h2>
              <p>
                For questions, feedback, or technical issues, please reach out through the official Louisiana Legislature channels or consult a licensed attorney for legal matters.
              </p>
            </div>
          </div>

          {/* Legal Disclaimer Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">⚖️</span>
              <div>
                <h2 className="text-2xl font-bold text-[#0C2340] mb-2">
                  Legal Disclaimer & Terms of Use
                </h2>
                <p className="text-sm text-slate-600">
                  Important information about AI-generated content and legal limitations
                </p>
              </div>
            </div>

            <div className="prose max-w-none space-y-6 text-slate-700 leading-relaxed">
              <div className="bg-white border-l-4 border-red-500 p-4 rounded">
                <p className="font-semibold text-red-700 mb-2">
                  ⚠️ AI-GENERATED CONTENT NOTICE
                </p>
                <p className="text-sm">
                  All bill summaries, analyses, and legislator information on this website are generated using artificial intelligence and have NOT been reviewed by licensed attorneys or legislative experts.
                </p>
              </div>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">No Warranty of Accuracy</h3>
              <p>
                The SessionSource - Louisiana <strong>does not warrant, guarantee, or represent</strong> that any information provided on this website is accurate, complete, current, or reliable. AI-generated content may contain errors, omissions, or misinterpretations of legislative text.
              </p>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">Not Legal or Professional Advice</h3>
              <p>
                <strong className="text-red-600">This website does NOT provide legal advice.</strong> Nothing on this website constitutes legal advice, political advice, professional consultation, or official government communication. This website is for informational and educational purposes only.
              </p>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">User Responsibility</h3>
              <p>
                <strong className="text-red-600">YOU ARE SOLELY RESPONSIBLE</strong> for verifying any information obtained from this website before taking action. For official legislative information, please consult:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Official Louisiana State Legislature website: <a href="https://legis.la.gov" target="_blank" rel="noopener noreferrer" className="text-[#0C2340] underline font-medium">legis.la.gov</a></li>
                <li>A licensed attorney admitted to practice in Louisiana</li>
                <li>Official legislative documents and government agencies</li>
              </ul>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">Limitation of Liability</h3>
              <p className="text-sm">
                To the maximum extent permitted by law, the SessionSource - Louisiana, its operators, developers, and affiliates shall not be liable for any damages, losses, or consequences arising from use of this website or reliance on AI-generated content, including direct, indirect, incidental, consequential, or punitive damages.
              </p>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">Compliance Statement</h3>
              <p className="text-sm">
                This disclaimer complies with Louisiana consumer protection laws (Louisiana Revised Statutes Title 51), federal AI disclosure requirements, and general principles of online content liability. This website makes no representations about suitability of information for any specific purpose.
              </p>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">Data Sources & Attribution</h3>
              <p className="text-sm">
                Legislative data is sourced from LegiScan, a third-party legislative tracking service. AI summaries are generated using Claude AI by Anthropic. Neither LegiScan nor Anthropic endorse or verify the accuracy of content on this website.
              </p>

              <h3 className="text-lg font-bold text-[#0C2340] mt-6">User Acceptance</h3>
              <p className="text-sm">
                By using this website, you acknowledge that you have read, understood, and agreed to this disclaimer. If you do not agree, you should not use this website. Your use of this website, including acceptance of the initial disclaimer modal, is logged locally in your browser for compliance purposes.
              </p>

              <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mt-8">
                <p className="text-sm font-semibold text-[#0C2340] mb-3">
                  Summary of Your Responsibilities:
                </p>
                <ul className="text-sm space-y-2 text-slate-700">
                  <li>✓ Verify all information independently before relying on it</li>
                  <li>✓ Consult licensed professionals for legal or professional advice</li>
                  <li>✓ Use official government sources for authoritative information</li>
                  <li>✓ Understand that AI-generated content may contain errors</li>
                  <li>✓ Accept full responsibility for decisions based on website content</li>
                </ul>
              </div>

              <p className="text-xs text-slate-500 mt-8 italic">
                Last Updated: February 10, 2026
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}