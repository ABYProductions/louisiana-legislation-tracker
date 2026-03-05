import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateWeekInReviewNarrative(payload: {
  userName: string
  weekOf: string
  activeBills: Array<{
    bill_number: string
    title: string
    recentActivity: string[]
    currentStatus: string
    lastAction: string
    lastActionDate: string
  }>
  sessionDaysRemaining: number
  totalWatchedBills: number
}): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `You are a senior legislative correspondent for a Louisiana politics publication. Write a concise 'Week in Review' paragraph (3-5 sentences maximum) summarizing the most significant developments across the provided bill activity data.
Style: plain accessible language, not legalese. Lead with the most significant development. Mention specific bill numbers when relevant. Note patterns when they exist. If session end is under 14 days away, note urgency. Never say 'as an AI' or 'based on the data provided'. Maximum 5 sentences.`,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    })
    const content = message.content[0]
    return content.type === 'text' ? content.text.trim() : getFallback()
  } catch {
    return getFallback()
  }
}

function getFallback(): string {
  return 'Your watched bills had notable activity this week. See the detailed breakdown below for a full recap.'
}
