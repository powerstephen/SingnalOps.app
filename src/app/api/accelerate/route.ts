import { NextResponse } from 'next/server'
import pipelineDeals from '../../../../data/pipeline-deals.json'

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set in Vercel environment variables' }, { status: 500 })
    }
    const deals = pipelineDeals
    const prompt = `You are a sales intelligence analyst. Score each pipeline deal on health across six dimensions.
Analyse: engagement velocity (email/call ratio), stakeholder breadth, meeting momentum, reciprocal commitments, stage velocity vs average, champion signal.
DEALS: ${JSON.stringify(deals.map(d => ({ id: d.id, company: d.company, contact: d.contact, title: d.title, stage: d.stage, deal_value: d.deal_value, stage_entered_date: d.stage_entered_date, close_date_expected: d.close_date_expected, emails_sent: d.emails_sent, emails_received: d.emails_received, calls_attempted: d.calls_attempted, calls_answered: d.calls_answered, meetings_held: d.meetings_held, next_meeting_booked: d.next_meeting_booked, prospect_contacts_engaged: d.prospect_contacts_engaged, last_prospect_email: d.last_prospect_email, reciprocal_commitments: d.reciprocal_commitments, champion_active: d.champion_active, days_in_stage_avg_won: d.days_in_stage_avg_won })), null, 2)}
Today: 2024-07-24
Return ONLY valid JSON:
{ "deals": [{ "id": "d001", "health_score": 85, "status": "Accelerating", "engagement_score": 88, "commitment_score": 75, "velocity_score": 90, "stakeholder_score": 80, "top_signal": "...", "risk_flags": [], "next_action": "...", "next_action_why": "..." }] }
status must be exactly: "Accelerating", "On Track", "At Risk", or "Stalling"`
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 3000, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: `OpenAI error: ${data.error?.message}` }, { status: 500 })
    const parsed = JSON.parse(data.choices[0].message.content)
    const scored = parsed.deals.map((score: any) => {
      const deal = deals.find(d => d.id === score.id)
      if (!deal) return null
      return { ...deal, ...score }
    }).filter(Boolean).sort((a: any, b: any) => {
      const order: Record<string, number> = { 'Stalling': 0, 'At Risk': 1, 'On Track': 2, 'Accelerating': 3 }
      return (order[a.status] ?? 2) - (order[b.status] ?? 2)
    })
    return NextResponse.json({ deals: scored })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Scoring failed' }, { status: 500 })
  }
}
