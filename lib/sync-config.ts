// lib/sync-config.ts
// Configuration for sync behavior, rate limits, and cost controls

export const SYNC_CONFIG = {
  // ============================================
  // COST CONTROLS
  // ============================================
  MONTHLY_BUDGET_USD: 30,              // Hard limit: $30/month
  WARNING_THRESHOLD: 0.8,              // Warn at 80% ($24)
  ESTIMATED_COST_PER_AMENDMENT: 0.15,  // ~$0.15 per amendment analysis
  
  // ============================================
  // RATE LIMITING
  // ============================================
  MAX_AMENDMENTS_PER_SYNC: 15,         // Process max 15 amendments per sync run
  DELAY_BETWEEN_API_CALLS_MS: 2000,    // 2 second delay between Claude API calls
  DELAY_BETWEEN_LEGISCAN_CALLS_MS: 500, // 0.5 second delay between LegiScan calls
  
  // ============================================
  // CACHING & OPTIMIZATION
  // ============================================
  SKIP_IF_ANALYZED_WITHIN_DAYS: 7,     // Don't re-analyze if done within 7 days
  SKIP_IF_TEXT_UNCHANGED: true,        // Skip if amendment text identical
  CACHE_PDF_DOWNLOADS: true,           // Cache downloaded PDFs to avoid re-fetching
  
  // ============================================
  // PRIORITY PROCESSING
  // ============================================
  PRIORITIZE_ADOPTED: true,            // Process adopted amendments first
  PRIORITIZE_RECENT: true,             // Process recent amendments first
  PRIORITIZE_HIGH_IMPORTANCE: true,    // Process important bills first
  
  // ============================================
  // SYNC FREQUENCY (for GitHub Actions)
  // ============================================
  SYNC_SCHEDULE_SESSION: '0 */4 * * 1-5',      // Every 4 hours, Mon-Fri during session
  SYNC_SCHEDULE_OFF_SESSION: '0 6 * * *',      // Daily at 6 AM Central off-session
  
  // Session dates (update these for current legislative session)
  SESSION_START_DATE: '2026-03-10',    // Louisiana 2026 Regular Session
  SESSION_END_DATE: '2026-06-08',      // 60 legislative days (85 calendar days)
  
  // ============================================
  // AMENDMENT ANALYSIS SETTINGS
  // ============================================
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  CLAUDE_MAX_TOKENS: 16000,
  CLAUDE_TEMPERATURE: 0.2,             // Low temperature for accuracy
  CLAUDE_THINKING_BUDGET: 10000,       // Extended thinking tokens
  
  // ============================================
  // PDF PARSING SETTINGS
  // ============================================
  PDF_TIMEOUT_MS: 30000,               // 30 second timeout for PDF downloads
  MAX_PDF_SIZE_MB: 10,                 // Skip PDFs larger than 10MB
  
  // ============================================
  // LOGGING & MONITORING
  // ============================================
  LOG_LEVEL: 'info',                   // 'debug' | 'info' | 'warn' | 'error'
  LOG_API_COSTS: true,                 // Log estimated costs for each operation
  LOG_CACHE_HITS: true,                // Log when we skip analysis due to caching
  
  // ============================================
  // SAFETY FLAGS
  // ============================================
  DRY_RUN: false,                      // Set to true to preview without making changes
  DISABLE_AI_ANALYSIS: false,          // Emergency flag to disable Claude calls
  REQUIRE_CONFIRMATION: false,         // Require manual confirmation before analysis
} as const;

// Helper function to check if we're in active legislative session
export function isActiveSession(date: Date = new Date()): boolean {
  const sessionStart = new Date(SYNC_CONFIG.SESSION_START_DATE);
  const sessionEnd = new Date(SYNC_CONFIG.SESSION_END_DATE);
  return date >= sessionStart && date <= sessionEnd;
}

// Helper function to get current sync schedule
export function getCurrentSyncSchedule(): string {
  return isActiveSession() 
    ? SYNC_CONFIG.SYNC_SCHEDULE_SESSION 
    : SYNC_CONFIG.SYNC_SCHEDULE_OFF_SESSION;
}

// Helper function to calculate if we're approaching budget
export function checkBudgetStatus(currentSpend: number): {
  status: 'safe' | 'warning' | 'exceeded'
  percentUsed: number
  remaining: number
  message: string
} {
  const percentUsed = (currentSpend / SYNC_CONFIG.MONTHLY_BUDGET_USD) * 100;
  const remaining = SYNC_CONFIG.MONTHLY_BUDGET_USD - currentSpend;
  
  if (currentSpend >= SYNC_CONFIG.MONTHLY_BUDGET_USD) {
    return {
      status: 'exceeded',
      percentUsed,
      remaining: 0,
      message: `🛑 BUDGET EXCEEDED: $${currentSpend.toFixed(2)} / $${SYNC_CONFIG.MONTHLY_BUDGET_USD} (${percentUsed.toFixed(1)}%)`
    };
  }
  
  if (percentUsed >= SYNC_CONFIG.WARNING_THRESHOLD * 100) {
    return {
      status: 'warning',
      percentUsed,
      remaining,
      message: `⚠️  WARNING: $${currentSpend.toFixed(2)} / $${SYNC_CONFIG.MONTHLY_BUDGET_USD} (${percentUsed.toFixed(1)}%) - $${remaining.toFixed(2)} remaining`
    };
  }
  
  return {
    status: 'safe',
    percentUsed,
    remaining,
    message: `✅ Budget OK: $${currentSpend.toFixed(2)} / $${SYNC_CONFIG.MONTHLY_BUDGET_USD} (${percentUsed.toFixed(1)}%)`
  };
}

// Export type for configuration
export type SyncConfig = typeof SYNC_CONFIG;