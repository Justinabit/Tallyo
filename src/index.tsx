/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'

type Bindings = {
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  AI_API_KEY?: string
  AI_BASE_URL?: string
  AI_MODEL?: string
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

// ---------------------------------------------------------
// Supabase configuration
// ---------------------------------------------------------

app.get('/api/config', (c) => {
  return c.json({
    SUPABASE_URL: c.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY || '',
    AI_ENABLED: Boolean(c.env.AI_API_KEY)
  })
})

// ---------------------------------------------------------
// AI insights proxy
// ---------------------------------------------------------

app.post('/api/ai/insights', async (c) => {
  const apiKey = c.env.AI_API_KEY
  const baseUrl = c.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = c.env.AI_MODEL || 'gpt-5.6-luna'

  const unavailable = () =>
    c.json(
      {
        ok: false,
        error: 'AI_UNAVAILABLE',
        message:
          'AI insights are temporarily unavailable. Your financial calculations and tracking are still working normally.'
      },
      200
    )

  if (!apiKey) {
    return unavailable()
  }

  try {
    const body = await c.req.json()

    const {
      summary,
      categories,
      period,
      comparisons
    } = body || {}

    const prompt = `You are a friendly personal-finance assistant inside a budgeting app called Tallyo.

You are given ALREADY-CALCULATED numbers. Do not recalculate or invent numbers.

Using ONLY the numbers provided, write 2-4 short, specific, encouraging observations that a user would find genuinely useful.

Each observation must highlight a DIFFERENT fact or angle. Never restate the same underlying fact twice in different words (e.g. don't say both "X is your largest expense" and "X was your biggest outflow" — pick one and use the remaining observations to surface something else, like a trend, a comparison to the prior period, or a specific transaction).

Maximum 22 words per observation.

Do not give generic advice.

Do not use markdown.

Return ONLY a JSON array of strings.

Period:
${JSON.stringify(period)}

Summary:
${JSON.stringify(summary)}

Spending by category:
${JSON.stringify(categories)}

Period comparison:
${JSON.stringify(comparisons)}`

    console.log('[AI insights] calling', `${baseUrl}/chat/completions`, 'model:', model)

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You output only valid JSON arrays of short strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4
      })
    })

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      console.error('[AI insights] provider error body:', errBody)
      throw new Error(`AI provider responded ${resp.status}`)
    }

    const data: any = await resp.json()

    const content =
      data?.choices?.[0]?.message?.content || '[]'

    let insights: string[] = []

    try {
      const match = content.match(/\[[\s\S]*\]/)

      insights = JSON.parse(
        match ? match[0] : content
      )
    } catch {
      insights = [
        String(content).slice(0, 200)
      ]
    }

    return c.json({
      ok: true,
      insights
    })
  } catch (error) {
    console.error('AI insights error:', error)
    return unavailable()
  }
})

// ---------------------------------------------------------
// Root route
// ---------------------------------------------------------

app.get('/', async (c) => {
  const response = await fetch(new URL('/index.html', c.req.url))
  return new Response(response.body, response)
})

export default app