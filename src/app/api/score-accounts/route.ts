import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAllCustomers, getBestCustomers } from '@/lib/data'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }
    const all = getAllCustomers()
    const best = getBestCustomers()

    const bestProfile = {
      avg_employees: Math.round(best.reduce((s, c) => s + c.employees, 0) / best.length),
      top_industries: Array.from(new Set(best.slice(0, 10).map(c => c.industry))).slice(0, 5),
      top_stages: Array.from(new Set(best.map(c => c.stage))),
      avg_ltv: Math.round(best.reduce((s, c) => s + c.ltv, 0) / best.length),
    }

    const now = new Date()
    const dormant = all.filter(c => {
      const last = new Date(c.last_contact)
      const monthsAgo = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo > 5 || c.status === 'churned' || c.status === 'lost' || c.deal_stage === 'closed_lost'
    }).slice(0, 15)

    const prompt = `You are a revenue intelligence analyst. Score these dormant accounts against the ICP profile and segment by why they went cold.

BEST CUSTOMER PROFILE:
${JSON.stringify(bestProfile, null, 2)}

DORMANT ACCOUNTS:
${JSON.stringify(dormant.map(c => ({
  id: c.id, company: c.company, industry: c.industry, employees: c.employees,
  stage: c.stage, country: c.country, contact: c.contact, title: c.title,
  status: c.status, last_contact: c.last_contact, ltv: c.ltv,
  deal_value: c.deal_value, support_tickets: c.support_tickets,
})), null, 2)}

Return ONLY valid JSON:
{
  "accounts": [
    {
      "id": "c001",
      "icp_score": 85,
      "score_label": "Strong fit",
      "segment": "Late-stage ghosted",
      "segment_reason": "Had demo and proposal, went cold at contracting stage",
      "score_reasons": ["reason1", "reason2", "reason3"],
      "why_now": "One sentence signal-based reason to re-engage right now",
      "reengagement_angle": "Specific hook to use for this account"
    }
  ]
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (message.content[0] as { type: string; text: string }).text
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const scored = parsed.accounts
      .map((score: any) => {
        const account = dormant.find(d => d.id === score.id)
        if (!account) return null
        return { ...account, ...score }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.icp_score - a.icp_score)

    return NextResponse.json({ accounts: scored })
  } catch (error: any) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: error?.message ?? 'Scoring failed' }, { status: 500 })
  }
}
