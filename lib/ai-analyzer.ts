// lib/ai-analyzer.ts
// Uses Claude AI to analyze amendment changes and generate intelligent summaries

import Anthropic from '@anthropic-ai/sdk';
import { MarkupChange, StatuteChange, AffectedParty } from './database.types';
import { SYNC_CONFIG } from './sync-config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface AmendmentAnalysisInput {
  billNumber: string
  billTitle: string
  billDescription: string
  amendmentText: string
  changes: MarkupChange[]
  billTextBefore: string
  billTextAfter: string
  context?: {
    existingStatutes?: any[]
    previousAmendments?: any[]
  }
}

export interface AmendmentAnalysisResult {
  plainEnglishSummary: string
  amendmentType: 'addition' | 'deletion' | 'substitution' | 'structural' | 'technical'
  sectionsAffected: string[]
  statuteChanges: StatuteChange[]
  legalAnalysis: {
    rightsObligations: string
    interaction: string
    conflicts: string
    implementation: string
  }
  fiscalImpact: string
  affectedParties: AffectedParty[]
  cumulativeEffect: string
  keyChanges: Array<{
    location: string
    before: string
    after: string
    significance: string
  }>
  keyInsights: string[]
  risks: string[]
  crossReferences: string[]
  implementationDate: string
}

/**
 * Analyze amendment using Claude AI
 * This is the "intelligence layer" that understands what changes mean
 */
export async function analyzeAmendmentWithClaude(
  input: AmendmentAnalysisInput
): Promise<AmendmentAnalysisResult> {
  
  console.log(`🤖 Analyzing amendment for ${input.billNumber}...`);
  
  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  const prompt = buildAnalysisPrompt(input);
  
  try {
    const message = await anthropic.messages.create({
      model: SYNC_CONFIG.CLAUDE_MODEL,
      max_tokens: SYNC_CONFIG.CLAUDE_MAX_TOKENS,
      temperature: SYNC_CONFIG.CLAUDE_TEMPERATURE,
      messages: [{
        role: 'user',
        content: prompt
      }],
      // Enable extended thinking for complex analysis
      thinking: {
        type: 'enabled',
        budget_tokens: SYNC_CONFIG.CLAUDE_THINKING_BUDGET
      }
    });
    
    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');
    
    console.log('📝 Claude response received');
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }
    
    const analysis: AmendmentAnalysisResult = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ Amendment analysis complete for ${input.billNumber}`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error analyzing amendment with Claude:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Claude analysis failed: ${errorMessage}`);
  }
}

/**
 * Build the detailed analysis prompt for Claude
 */
function buildAnalysisPrompt(input: AmendmentAnalysisInput): string {
  return `You are a Louisiana legislative analyst with expertise in statutory interpretation and bill analysis. Analyze this amendment comprehensively and precisely.

## BILL INFORMATION
Bill Number: ${input.billNumber}
Title: ${input.billTitle}
Description: ${input.billDescription}

## STRUCTURED CHANGES FROM OFFICIAL LEGISLATIVE MARKUP
The following changes were extracted directly from the PDF markup (strikethrough = deleted, underline = added):

${JSON.stringify(input.changes, null, 2)}

## BILL TEXT BEFORE AMENDMENT
${input.billTextBefore.slice(0, 10000)}
${input.billTextBefore.length > 10000 ? '...(truncated for length)' : ''}

## BILL TEXT AFTER AMENDMENT  
${input.billTextAfter.slice(0, 10000)}
${input.billTextAfter.length > 10000 ? '...(truncated for length)' : ''}

${input.context?.existingStatutes && input.context.existingStatutes.length > 0 ? `
## CURRENT LOUISIANA STATUTES REFERENCED
${JSON.stringify(input.context.existingStatutes, null, 2)}
` : ''}

${input.context?.previousAmendments && input.context.previousAmendments.length > 0 ? `
## PREVIOUS AMENDMENTS TO THIS BILL
${JSON.stringify(input.context.previousAmendments, null, 2)}
` : ''}

## ANALYSIS REQUIREMENTS

CRITICAL: The changes shown above were extracted from official Louisiana legislative markup. Strikethrough text represents deletions, underlined text represents additions. These are AUTHORITATIVE - do not speculate about what might have changed.

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown formatting):

{
  "plainEnglishSummary": "2-3 clear sentences explaining what this amendment does that a non-lawyer can understand",
  
  "amendmentType": "addition | deletion | substitution | structural | technical",
  
  "sectionsAffected": ["Section 2(a)", "Section 5(b)", ...],
  
  "statuteChanges": [
    {
      "statuteRef": "R.S. 17:123",
      "section": "Subsection (B)(2)",
      "currentText": "exact current statute text if amending existing law",
      "proposedText": "exact proposed new text",
      "changeType": "creates | amends | repeals | references",
      "legalEffect": "detailed explanation of legal implications",
      "practicalEffect": "what this means in practice for real people"
    }
  ],
  
  "legalAnalysis": {
    "rightsObligations": "What new rights or obligations are created, modified, or removed",
    "interaction": "How this interacts with existing Louisiana law",
    "conflicts": "Any potential conflicts or ambiguities with other statutes",
    "implementation": "What must happen to implement this change"
  },
  
  "fiscalImpact": "Detailed analysis of costs, savings, funding sources, and budget implications. If none, say 'No direct fiscal impact identified.'",
  
  "affectedParties": [
    {
      "party": "Specific group (e.g., 'public school teachers', 'state agencies', 'taxpayers')",
      "impact": "How they are affected",
      "timing": "When the impact takes effect"
    }
  ],
  
  "cumulativeEffect": "How this amendment changes the bill considering all previous amendments and the original bill text",
  
  "keyChanges": [
    {
      "location": "Line numbers or section reference",
      "before": "exact text before change",
      "after": "exact text after change",
      "significance": "why this specific change matters"
    }
  ],
  
  "keyInsights": [
    "Important takeaways that legislators and constituents should know",
    "Context about why this change matters",
    "Connections to broader policy issues"
  ],
  
  "risks": [
    "Potential legal challenges or issues",
    "Implementation difficulties",
    "Unintended consequences",
    "Funding gaps or sustainability concerns"
  ],
  
  "crossReferences": ["HB120", "SB45", ...],
  
  "implementationDate": "When these changes take effect (e.g., 'August 1, 2026', 'Upon passage', 'Contingent on HB120')"
}

IMPORTANT GUIDELINES:
1. Be precise and accurate - this analysis will be used by legislators, advocates, and the public
2. Base your analysis ONLY on the markup changes shown - do not infer changes that aren't documented
3. Cite specific statute sections when discussing legal effects
4. Explain technical legal language in plain English when possible
5. If fiscal impact involves specific dollar amounts, extract them from the changes
6. Identify who benefits and who bears costs
7. Note any contingencies or effective date conditions
8. Highlight any sunset provisions or expiration dates

Respond with ONLY the JSON object, no additional text before or after.`;
}

/**
 * Estimate cost of analyzing an amendment
 */
export function estimateAnalysisCost(amendmentText: string, changes: MarkupChange[]): number {
  // Rough estimation: ~3000 input tokens + ~2000 output tokens per amendment
  // Claude Sonnet 4: $3/M input, $15/M output
  const inputTokens = 3000;
  const outputTokens = 2000;
  
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  
  return inputCost + outputCost;
}

/**
 * Validate that AI analysis is reasonable
 */
export function validateAnalysis(
  analysis: AmendmentAnalysisResult,
  changes: MarkupChange[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check that analysis addresses the changes
  if (changes.length > 0 && !analysis.plainEnglishSummary) {
    issues.push('Analysis missing plain English summary');
  }
  
  if (changes.length > 0 && analysis.statuteChanges.length === 0) {
    issues.push('Changes detected but no statute changes analyzed');
  }
  
  // Check for fiscal impact if money amounts changed
  const hasMoneyChanges = changes.some(c => 
    /\$|\d+\s*(million|thousand|billion)|\d+\s*dollars?/i.test(c.deletedText + c.addedText)
  );
  
  if (hasMoneyChanges && !analysis.fiscalImpact) {
    issues.push('Money amounts changed but no fiscal analysis provided');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Check if we should skip analysis (caching logic)
 */
export function shouldSkipAnalysis(
  existingAmendment: any,
  newAmendmentText: string
): { skip: boolean; reason?: string } {
  
  if (!existingAmendment) {
    return { skip: false };
  }
  
  // Check if already analyzed recently
  if (existingAmendment.analyzed_at) {
    const analyzedDate = new Date(existingAmendment.analyzed_at);
    const daysSinceAnalysis = (Date.now() - analyzedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAnalysis < SYNC_CONFIG.SKIP_IF_ANALYZED_WITHIN_DAYS) {
      return { 
        skip: true, 
        reason: `Already analyzed ${daysSinceAnalysis.toFixed(1)} days ago` 
      };
    }
  }
  
  // Check if text unchanged
  if (SYNC_CONFIG.SKIP_IF_TEXT_UNCHANGED) {
    if (existingAmendment.full_text === newAmendmentText) {
      return { 
        skip: true, 
        reason: 'Amendment text unchanged' 
      };
    }
  }
  
  return { skip: false };
}