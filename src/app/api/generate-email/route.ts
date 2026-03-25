import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { account, type = 'recover' } = await req.json()
    const isProspect = type === 'prospect'

    const prompt = isProspect
      ? `You are a senior SDR. Write a short personalised cold outreach email to a net-new prospect.

PROSPECT: ${account.company} | ${account.contact_name}, ${account.contact_title} | ${account.industry} | ${account.employees} employees | ${account.stage} | ${account.country}
ACTIVE SIGNALS: ${account.active_signals?.join(', ')}
WHY NOW: ${account.why_now}
LOOKALIKE REASON: ${account.lookalike_reason}

Write an email referencing 2-3 signals naturally. Human tone, under 120 words, soft CTA.
Do NOT say "I hope this email finds you well". Do NOT mention AI.

Return ONLY valid JSON: { "subject": "...", "body": "..." }`

      : `You are a senior SDR. Write a 3-email re-engagement sequence for a dormant account.

ACCOUNT: ${account.company} | ${account.contact}, ${account.title} | ${account.industry} | ${account.status}
SEGMENT: ${account.segment ?? 'dormant'}
LAST CONTACT: ${account.last_contact} | PREVIOUS LTV: $${account.ltv?.toLocaleString() ?? 'unknown'}
WHY SCORE HIGH: ${account.score_reasons?.join(', ')}
WHY NOW: ${account.why_now}
RE-ENGAGEMENT ANGLE: ${account.reengagement_angle}

Write a 3-email sequence:
- Email 1 (Send now): Lead with the re-engagement angle, acknowledge the gap naturally, soft question. Under 100 words.
- Email 2 (Day 4 if no reply): Short case study from a similar company with specific result. One yes/no question. Under 90 words.
- Email 3 (Day 8 if no reply): Break-up email. Feels genuinely final. Ask if they want to be removed. Under 75 words. This gets the most replies.

Never say "just checking in", "circling back", or "I hope this email finds you well".

Return ONLY valid JSON:
{
  "email1": { "subject": "...", "body": "...", "send_timing": "Send now", "goal": "Re-open conversation" },
  "email2": { "subject": "...", "body": "...", "send_timing": "Day 4 if no reply", "goal": "Social proof nudge" },
  "email3": { "subject": "...", "body": "...", "send_timing": "Day 8 if no reply", "goal": "Break-up email" }
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (message.content[0] as { type: string; text: string }).text
    const cleaned = text.replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(cleaned))
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error?.message ?? 'Email generation failed' }, { status: 500 })
  }
}
