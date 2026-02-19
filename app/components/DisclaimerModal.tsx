'use client'

import { useState, useEffect } from 'react'

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimer_accepted')
    if (!hasAccepted) {
      setIsOpen(true)
    }
  }, [])

  const handleAccept = () => {
    const acceptanceLog = {
      accepted: true,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
    
    localStorage.setItem('disclaimer_accepted', JSON.stringify(acceptanceLog))
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-[#0C2340] to-[#1a3a5c] p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚖️</span>
            <h2 className="text-2xl font-bold">Important Legal Disclaimer</h2>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm font-semibold text-yellow-800">
              AI-Generated Content Notice
            </p>
          </div>

          <div className="prose max-w-none text-slate-700 leading-relaxed space-y-4">
            <p>
              <strong className="text-[#0C2340]">PLEASE READ CAREFULLY:</strong> This website provides information about Louisiana legislation using artificial intelligence and automated processes. By using this website, you acknowledge and agree to the following:
            </p>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">AI-Generated Content</h3>
            <p>
              All bill summaries, analyses, legislator profiles, and historical analyses on this website are generated using artificial intelligence (AI) technology, including but not limited to Claude AI by Anthropic. This content is computer-generated and has not been reviewed or verified by licensed attorneys, legislative experts, or government officials.
            </p>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">No Warranty of Accuracy</h3>
            <p>
              The SessionSource - Louisiana <strong>does not warrant, guarantee, or represent</strong> that any information provided on this website is accurate, complete, current, or reliable. AI-generated content may contain errors, omissions, or misinterpretations of legislative text, legislative intent, or factual information.
            </p>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">Not Legal, Political, or Professional Advice</h3>
            <p>
              Nothing on this website constitutes legal advice, political advice, professional consultation, or official government communication. This website is for <strong>informational and educational purposes only</strong>. You should not rely on any information from this website for legal, political, financial, or business decisions.
            </p>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">User Responsibility to Verify</h3>
            <p>
              <strong className="text-red-600">YOU ARE SOLELY RESPONSIBLE</strong> for verifying any information obtained from this website before taking any action based on that information. For official, authoritative information about Louisiana legislation, please consult:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The official Louisiana State Legislature website (legis.la.gov)</li>
              <li>Official legislative documents and session records</li>
              <li>A licensed attorney admitted to practice in Louisiana</li>
              <li>Appropriate government agencies and officials</li>
            </ul>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by applicable law, the SessionSource - Louisiana, its operators, developers, and affiliates shall not be liable for any damages, losses, or consequences arising from your use of this website or reliance on AI-generated content, including but not limited to direct, indirect, incidental, consequential, or punitive damages.
            </p>

            <h3 className="text-lg font-bold text-[#0C2340] mt-6 mb-3">Louisiana and Federal Law Compliance</h3>
            <p>
              This disclaimer complies with Louisiana consumer protection laws, federal AI disclosure requirements, and general principles of online content liability. The website operators make no representations about the suitability of this information for any specific purpose or jurisdiction.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <p className="text-sm font-semibold text-[#0C2340] mb-2">
                By clicking I Accept below, you acknowledge that:
              </p>
              <ul className="text-sm space-y-2 text-slate-700">
                <li>✓ You have read and understood this disclaimer</li>
                <li>✓ You understand this website uses AI-generated content</li>
                <li>✓ You agree to verify all information independently</li>
                <li>✓ You will not rely on this website for legal or professional advice</li>
                <li>✓ Your acceptance will be logged with a timestamp</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleAccept}
            className="w-full bg-[#0C2340] text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-[#1a3a5c] transition-colors shadow-lg"
          >
            I Accept - Continue to Website
          </button>
          <p className="text-xs text-center text-slate-500 mt-4">
            Your acceptance will be recorded locally in your browser
          </p>
        </div>
      </div>
    </div>
  )
}