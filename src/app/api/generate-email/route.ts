import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { account, type = 'recover' } = await req.json()
    const isProspect = type === 'prospect'
    const prompt = isProspect
      ? `Write a short cold outreach email. PROSPECT: ${account.company} | ${account.contact_name}, ${account.contact_title} | ${account.industry} | ${account.employees} employees | ${account.stage}. SIGNALS: ${account.active_signals?.join(', ')}. WHY NOW: ${account.why_now}. Under 120 words, human tone, soft CTA. No "I hope this email finds you well". Return JSON: { "subject": "...", "body": "..." }`
      : `Write a 3-email re-engagement sequence. ACCOUNT: ${account.company} | ${account.contact}, ${account.title} | ${account.industry} | ${account.status}. SEGMENT: ${account.segment}. WHY NOW: ${account.why_now}. ANGLE: ${account.reengagement_angle}. Email 1: under 100 words, lead with angle. Email 2 (day 4): case study nudge, under 90 words. Email 3 (day 8): break-up email, under 75 words. No "just checking in". Return JSON: { "email1": { "subject": "...", "body": "...", "send_timing": "Send now", "goal": "Re-open conversation" }, "email2": { "subject": "...", "body": "...", "send_timing": "Day 4 if no reply", "goal": "Social proof nudge" }, "email3": { "subject": "...", "body": "...", "send_timing": "Day 8 if no reply", "goal": "Break-up email" } }`
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 1200, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: `OpenAI error: ${data.error?.message}` }, { status: 500 })
    return NextResponse.json(JSON.parse(data.choices[0].message.content))
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Email generation failed' }, { status: 500 })
  }
}
