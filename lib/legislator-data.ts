// Legislator profile data
// TODO: Manually populate this data for each legislator
// You can find this information at: https://house.louisiana.gov and https://senate.la.gov

interface LegislatorInfo {
  name: string
  party: 'Republican' | 'Democrat' | 'Independent'
  district: string
  chamber: 'House' | 'Senate'
  termInfo: string
  committees: string[]
  career: string
  email?: string
  phone?: string
}

export const legislatorData: Record<string, LegislatorInfo> = {
  'Michael Fesi': {
    name: 'Michael Fesi',
    party: 'Republican',
    district: 'District 62 (Jefferson, Orleans)',
    chamber: 'House',
    termInfo: 'Elected November 2023, term expires January 2028',
    committees: [
      'House Committee on Health and Welfare',
      'House Committee on Commerce'
    ],
    career: 'Attorney and small business owner. Previously served on the Jefferson Parish Council.',
    email: 'fesim@legis.la.gov',
    phone: '(225) 342-6945'
  },
  'Patrick McMath': {
    name: 'Patrick McMath',
    party: 'Republican',
    district: 'District 26 (East Baton Rouge)',
    chamber: 'Senate',
    termInfo: 'Elected November 2023, term expires January 2028',
    committees: [
      'Senate Committee on Health and Welfare',
      'Senate Committee on Revenue and Fiscal Affairs'
    ],
    career: 'Physician and healthcare administrator with over 15 years of experience.',
    email: 'mcmathp@legis.la.gov'
  },
  // Add more legislators here as you collect their information
  // You can gradually populate this over time
}

// Fallback for legislators not in the database
export function getLegislatorInfo(name: string): LegislatorInfo {
  return legislatorData[name] || {
    name: name,
    party: 'Republican', // Default - update manually
    district: 'District information not available - visit legis.la.gov for official information',
    chamber: name.includes('Sen') ? 'Senate' : 'House',
    termInfo: 'Term information not available - visit legis.la.gov for official information',
    committees: [],
    career: 'Career information not available - visit legis.la.gov for official information',
  }
}