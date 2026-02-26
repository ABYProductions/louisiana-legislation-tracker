export interface NewsSource {
  id: string
  name: string
  rss_url: string
  website: string
  category: 'local_politics' | 'state_news' | 'national'
  reliability: 'high' | 'medium'
  logo_initial: string
  accent_color: string
  industry_focus?: string[]
}

const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'the_advocate',
    name: 'The Advocate',
    rss_url: 'https://www.theadvocate.com/search/?f=rss&t=article&c=baton_rouge%2Fnews%2Fpolitics&l=50&s=start_time&sd=desc',
    website: 'theadvocate.com',
    category: 'local_politics',
    reliability: 'high',
    logo_initial: 'TA',
    accent_color: '#C4003B',
  },
  {
    id: 'la_illuminator',
    name: 'Louisiana Illuminator',
    rss_url: 'https://lailluminator.com/feed/',
    website: 'lailluminator.com',
    category: 'local_politics',
    reliability: 'high',
    logo_initial: 'LI',
    accent_color: '#1a5fa8',
  },
  {
    id: 'lapolitics',
    name: 'LaPolitics Weekly',
    rss_url: 'https://lapoliticsweekly.com/?feed=rss2',
    website: 'lapoliticsweekly.com',
    category: 'local_politics',
    reliability: 'high',
    logo_initial: 'LP',
    accent_color: '#8B0000',
  },
  {
    id: 'wwltv',
    name: 'WWL-TV',
    rss_url: 'https://www.wwltv.com/feeds/syndication/rss/news/politics',
    website: 'wwltv.com',
    category: 'state_news',
    reliability: 'high',
    logo_initial: 'WWL',
    accent_color: '#003087',
  },
  {
    id: 'wdsu',
    name: 'WDSU News',
    rss_url: 'https://www.wdsu.com/rss',
    website: 'wdsu.com',
    category: 'state_news',
    reliability: 'medium',
    logo_initial: 'WDSU',
    accent_color: '#E31837',
  },
  {
    id: 'center_square',
    name: 'The Center Square',
    rss_url: 'https://www.thecentersquare.com/louisiana/feed.rss/',
    website: 'thecentersquare.com',
    category: 'state_news',
    reliability: 'high',
    logo_initial: 'CS',
    accent_color: '#2C5F2E',
  },
  {
    id: 'klfy',
    name: 'KLFY News',
    rss_url: 'https://www.klfy.com/feed/',
    website: 'klfy.com',
    category: 'state_news',
    reliability: 'medium',
    logo_initial: 'KLFY',
    accent_color: '#CC0000',
  },
  {
    id: 'bayou_brief',
    name: 'Bayou Brief',
    rss_url: 'https://www.bayoubrief.com/feed/',
    website: 'bayoubrief.com',
    category: 'local_politics',
    reliability: 'high',
    logo_initial: 'BB',
    accent_color: '#1B4D8E',
  },
  {
    id: 'nola_com',
    name: 'NOLA.com',
    rss_url: 'https://www.nola.com/search/?f=rss&t=article&c=news%2Fpolitics&l=50&s=start_time&sd=desc',
    website: 'nola.com',
    category: 'local_politics',
    reliability: 'high',
    logo_initial: 'NOLA',
    accent_color: '#006DB6',
  },
  {
    id: 'louisiana_radio',
    name: 'Louisiana Radio Network',
    rss_url: 'https://louisianaradionetwork.com/feed/',
    website: 'louisianaradionetwork.com',
    category: 'state_news',
    reliability: 'medium',
    logo_initial: 'LRN',
    accent_color: '#4A235A',
  },
]

export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Energy & Natural Resources': [
    'energy', 'oil', 'gas', 'pipeline', 'carbon', 'sequestration',
    'injection well', 'offshore', 'fossil fuel', 'renewable', 'solar',
    'wind', 'utility', 'electricity', 'power grid', 'CLECO', 'Entergy',
    'refinery', 'petrochemical',
  ],
  'Healthcare': [
    'healthcare', 'health care', 'Medicaid', 'Medicare', 'hospital',
    'nurse', 'physician', 'medical', 'insurance', 'pharmacy',
    'certificate of need', 'Ochsner', 'LCMC', 'behavioral health',
    'mental health', 'substance abuse', 'DHH', 'LDH',
  ],
  'Criminal Justice': [
    'criminal', 'crime', 'prison', 'incarceration', 'sentencing',
    'parole', 'probation', 'police', 'law enforcement', 'judiciary',
    'prosecutor', 'public defender', 'bail', 'juvenile', 'corrections',
    'DOC', 'DPSC',
  ],
  'Education': [
    'education', 'school', 'teacher', 'student', 'curriculum', 'charter',
    'voucher', 'TOPS', 'university', 'college', 'literacy', 'BESE',
    'superintendent', 'classroom', 'tuition', 'scholarship',
    'Louisiana Department of Education',
  ],
  'Taxation & Finance': [
    'tax', 'revenue', 'budget', 'appropriation', 'fiscal', 'income tax',
    'sales tax', 'property tax', 'exemption', 'incentive', 'credit',
    'rebate', 'LDR', 'treasury', 'bond', 'debt', 'deficit', 'surplus',
  ],
  'Agriculture': [
    'agriculture', 'farm', 'crop', 'livestock', 'forestry', 'timber',
    'crawfish', 'shrimp', 'seafood', 'LDAF', 'rural', 'irrigation',
    'pesticide', 'fertilizer', 'commodity', 'sugar cane', 'rice',
  ],
  'Insurance': [
    'insurance', 'insurer', 'premium', 'homeowner', 'property insurance',
    'casualty', 'LDI', 'commissioner', 'Citizens', 'wind pool', 'flood',
    'reinsurance', 'underwriter', 'policyholder', 'claims',
  ],
  'Local Government': [
    'parish', 'municipality', 'mayor', 'council', 'sheriff', 'assessor',
    'clerk of court', 'police jury', 'home rule', 'annexation', 'millage',
    'zoning', 'ordinance', 'consolidated government',
  ],
  'Labor & Employment': [
    'labor', 'employment', 'worker', 'wage', 'minimum wage', 'union',
    'workforce', 'unemployment', 'LDOL', 'workers compensation', 'OSHA',
    'workplace', 'hiring', 'discrimination', 'leave',
  ],
  'Environmental': [
    'environment', 'pollution', 'wetlands', 'coastal', 'LDEQ', 'DEQ',
    'climate', 'emissions', 'remediation', 'Superfund', 'water quality',
    'air quality', 'CPRA', 'restoration', 'habitat',
  ],
  'Gaming & Hospitality': [
    'casino', 'gaming', 'gambling', 'lottery', 'sports betting',
    'horse racing', 'video poker', 'hotel', 'tourism', 'convention',
    'hospitality', 'restaurant', 'alcohol', 'beverage control',
  ],
  'Construction & Infrastructure': [
    'construction', 'contractor', 'infrastructure', 'highway', 'bridge',
    'DOTD', 'road', 'transportation', 'port', 'building code', 'permit',
    'procurement', 'public works',
  ],
}

export const LEGISLATIVE_KEYWORDS = {
  high: [
    'Louisiana legislature', 'Louisiana House', 'Louisiana Senate',
    'committee hearing', '2026 session', 'regular session',
    'Governor Landry', 'Baton Rouge legislation', 'House Bill',
    'Senate Bill', 'signed into law', 'vetoed', 'passed committee',
    'State Capitol',
  ],
  medium: [
    'Louisiana law', 'state budget', 'Louisiana bill', 'state legislature',
    'lawmakers', 'legislators', 'legislation', 'Baton Rouge',
    'state government', 'state agency',
  ],
  low: ['Louisiana', 'state', 'policy', 'reform', 'regulation'],
}

export { NEWS_SOURCES }
export default NEWS_SOURCES
