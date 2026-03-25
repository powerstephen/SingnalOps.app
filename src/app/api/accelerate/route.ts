import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pipelineDeals from '../../../../data/pipeline-deals.json'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const deals = pipelineDeals

    const prompt = `You are a senior sales intelligence analyst. Score each active pipeline deal on health across six dimensions and identify what the rep should do today.

Analyse each deal on:
1. ENGAGEMENT VELOCITY: ratio of emails/calls received vs sent (bidirectional = healthy, one-way = bad)
2. STAKEHOLDER BREADTH: number of prospect contacts engaged (multi-threaded = healthy, single = risk)
3. MEETING MOMENTUM: next meeting booked, frequency trend
4. RECIPROCAL COMMITMENTS: depth of commitments made by prospect (trial, data connected, legal review, exec engaged)
5. STAGE VELOCITY: days in current stage vs days_in_stage_avg_won (overdue = at risk)
6. CHAMPION SIGNAL: is the champion still active and responsive

DEALS:
${JSON.stringify(deals.map(d => ({
  id: d.id, company: d.company, contact: d.contact, title: d.title,
  stage: d.stage, deal_value: d.deal_value,
  stage_entered_date: d.stage_entered_date, close_date_expected: d.close_date_expected,
  emails_sent: d.emails_sent, emails_received: d.emails_received,
  calls_attempted: d.calls_attempted, calls_answered: d.calls_answered,
  meetings_held: d.meetings_held, next_meeting_booked: d.next_meeting_booked,
  prospect_contacts_engaged: d.prospect_contacts_engaged,
  last_prospect_email: d.last_prospect_email,
  reciprocal_commitments: d.reciprocal_commitments,
  champion_active: d.champion_active,
  days_in_stage_avg_won: d.days_in_stage_avg_won,
})), null, 2)}

Today's date: 2024-07-24

Return ONLY valid JSON:
{
  "deals": [
    {
      "id": "d001",
      "health_score": 85,
      "status": "Accelerating",
      "engagement_score": 88,
      "commitment_score": 75,
      "velocity_score": 90,
      "stakeholder_score": 80,
      "top_signal": "Prospect is replying faster than rep is sending — strong buying intent",
      "risk_flags": [],
      "next_action": "Send contract today while momentum is peak",
      "next_action_why": "Engagement ratio is at its highest — every day you wait, close probability drops"
    }
  ]
}

status must be exactly one of: "Accelerating", "On Track", "At Risk", "Stalling"`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (message.content[0] as { type: string; text: string }).text
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const scored = parsed.deals
      .map((score: any) => {
        const deal = deals.find(d => d.id === score.id)
        if (!deal) return null
        return { ...deal, ...score }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const order: Record<string, number> = { 'Stalling': 0, 'At Risk': 1, 'On Track': 2, 'Accelerating': 3 }
        return (order[a.status] ?? 2) - (order[b.status] ?? 2)
      })

    return NextResponse.json({ deals: scored })
  } catch (error: any) {
    console.error('Accelerate error:', error)
    return NextResponse.json({ error: error?.message ?? 'Scoring failed' }, { status: 500 })
  }
}
