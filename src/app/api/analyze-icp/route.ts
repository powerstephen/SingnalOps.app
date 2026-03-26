import { NextResponse } from 'next/server'

export async function POST() {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is missing — not found in environment' }, { status: 500 })
  }

  if (!key.startsWith('sk-')) {
    return NextResponse.json({ error: `Key format wrong — starts with: ${key.substring(0, 8)}` }, { status: 500 })
  }

  return NextResponse.json({ 
    error: `Key found OK — starts with: ${key.substring(0, 15)}... — length: ${key.length}` 
  }, { status: 200 })
}
