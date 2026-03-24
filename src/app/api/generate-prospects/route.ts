import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getBestCustomers } from '@/lib/data'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }
    const best = getBestCustomers()
    const bestProfile = best.slice(0, 15).map(c => ({
      company: c.company, industry: c.industry, employees: c.employees,
      stage: c.stage, country: c.country, ltv: c.ltv,
      months_active: c.months_active, expanded: c.expanded,
      support_tickets: c.support_tickets, time_to_value_days: c.time_to_value_days, nps: c.nps,
    }))

    const prompt = `You are a revenue intelligence analyst. Based on these best customers, generate 8 realistic net-new prospect companies matching the profile and showing active buying signals.

BEST CUSTOMERS:
${JSON.stringify(bestProfile, null, 2)}

Return ONLY valid JSON:
{
  "prospects": [
    {
      "company": "Company Name",
      "industry": "Industry",
      "employees": "45-60",
      "stage": "Series A",
      "country": "USA",
      "contact_name": "First Last",
      "contact_title": "VP Sales",
      "icp_match_score": 88,
      "active_signals": ["signal 1", "signal 2", "signal 3"],
      "why_now": "One sentence — why reach out right now",
      "lookalike_reason": "One sentence — how they match your best customers"
    }
  ]
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (message.content[0] as { type: string; text: string }).text
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ prospects: parsed.prospects })
  } catch (error: any) {
    console.error('Prospects error:', error)
    return NextResponse.json({ error: error?.message ?? 'Generation failed' }, { status: 500 })
  }
}
