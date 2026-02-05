// lib/database.types.ts
// TypeScript types for our database tables

export interface Amendment {
  id: number
  bill_id: number
  amendment_id: string
  amendment_number: string | null
  mime_id: number | null
  
  title: string | null
  description: string | null
  sponsor: string | null
  date_introduced: string | null
  date_adopted: string | null
  status: 'proposed' | 'adopted' | 'rejected' | 'withdrawn'
  chamber: string | null
  committee_name: string | null
  
  full_text: string | null
  bill_text_before: string | null
  bill_text_after: string | null
  pdf_url: string | null
  
  markup_changes: MarkupChange[] | null
  
  amendment_type: 'addition' | 'deletion' | 'substitution' | 'structural' | 'technical' | null
  sections_affected: string[] | null
  statutes_affected: string[] | null
  
  ai_summary: string | null
  ai_legal_analysis: any | null
  ai_fiscal_impact: string | null
  ai_affected_parties: AffectedParty[] | null
  ai_statute_changes: StatuteChange[] | null
  ai_key_insights: string[] | null
  ai_risks: string[] | null
  
  supersedes_amendment_id: number | null
  related_bill_ids: number[] | null
  
  created_at: string
  updated_at: string
  analyzed_at: string | null
}

export interface MarkupChange {
  type: 'addition' | 'deletion' | 'substitution'
  location: string
  deletedText: string
  addedText: string
  context: string
}

export interface AffectedParty {
  party: string
  impact: string
  timing: string
}

export interface StatuteChange {
  statuteRef: string
  section?: string
  currentText: string
  proposedText: string
  changeType: 'creates' | 'amends' | 'repeals' | 'references'
  legalEffect: string
  practicalEffect: string
}

export interface BillVersion {
  id: number
  bill_id: number
  version_name: string
  version_type: 'introduced' | 'amended' | 'engrossed' | 'enrolled' | 'enacted'
  version_date: string
  version_number: number | null
  full_text: string | null
  summary: string | null
  statute_impacts: any | null
  amendments_applied: number[] | null
  created_at: string
}

export interface StatuteImpact {
  id: number
  statute_reference: string
  statute_section: string | null
  bill_id: number
  amendment_id: number | null
  impact_type: 'creates' | 'amends' | 'repeals' | 'references'
  original_language: string | null
  proposed_language: string | null
  final_language: string | null
  ai_change_summary: string | null
  ai_practical_effect: string | null
  effective_date: string | null
  created_at: string
}

export interface BillChange {
  id: number
  bill_id: number
  amendment_id: number | null
  change_type: string
  field_changed: string | null
  old_value: any | null
  new_value: any | null
  description: string
  significance: 'major' | 'minor' | 'technical' | null
  amendment_analysis: any | null
  detected_at: string
  session_date: string | null
  created_at: string
}

export interface Hearing {
  id: number
  bill_id: number
  hearing_type: 'committee' | 'floor' | 'conference'
  committee_name: string | null
  scheduled_date: string
  actual_date: string | null
  location: string | null
  description: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  outcome: string | null
  vote_results: any | null
  created_at: string
  updated_at: string
}

export interface BillNews {
  id: number
  bill_id: number
  headline: string
  source: string
  url: string
  published_date: string | null
  scraped_at: string
  snippet: string | null
  full_text: string | null
  relevance_score: number | null
  sentiment: 'positive' | 'negative' | 'neutral' | null
  created_at: string
}

// Your existing Bill type (keeping for reference)
export interface Bill {
  id: number
  bill_id: number
  bill_number: string
  title: string
  description: string | null
  author: string | null
  status: string
  summary: string | null
  history: HistoryEvent[]
  amendments: any[] | null
  votes: any[] | null
  texts: any[] | null
  calendar: any[] | null
  subjects: string[] | null
  sponsors: any[] | null
  change_hash: string
  last_action: string | null
  last_action_date: string | null
  created_at: string
  updated_at: string
}

export interface HistoryEvent {
  date: string
  action: string
  chamber: string
  chamber_id: number
  importance: number
}