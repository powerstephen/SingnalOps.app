import { NextResponse } from 'next/server'
import { getBestCustomers } from '@/lib/data'

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set in Vercel environment variables' }, { status: 500 })
    }
    const best = getBestCustomers()
    const bestProfile = best.slice(0, 15).map(c => ({ company: c.company, industry: c.industry, employees: c.employees, stage: c.stage, country: c.country, ltv: c.ltv, months_active: c.months_active, expanded: c.expanded, support_tickets: c.support_tickets, time_to_value_days: c.time_to_value_days, nps: c.nps }))
    const prompt = `You are a revenue intelligence analyst. Generate 8 net-new prospect companies matching these best customers.
BEST CUSTOMERS: ${JSON.stringify(bestProfile, null, 2)}
Return ONLY valid JSON:
{ "prospects": [{ "company": "Name", "industry": "Industry", "employees": "45-60", "stage": "Series A", "country": "USA", "contact_name": "First Last", "contact_title": "VP Sales", "icp_match_score": 88, "active_signals": ["signal1","signal2","signal3"], "why_now": "one sentence", "lookalike_reason": "one sentence" }] }`
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 2500, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: `OpenAI error: ${data.error?.message}` }, { status: 500 })
    const parsed = JSON.parse(data.choices[0].message.content)
    return NextResponse.json({ prospects: parsed.prospects })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Generation failed' }, { status: 500 })
  }
}
