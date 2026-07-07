import { Groq } from 'groq-sdk'
import { groqApiKeyFromEnv } from '../../shared/zeityChatCore.js'
import {
  QUIT_HABIT_SYSTEM,
  normalizeQuitHabitModel,
  tryParseQuitHabitJson,
} from '../../shared/quitHabitCore.js'

function cors(res, origin = '*') {
  res.headers = {
    ...res.headers,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
  return res
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return cors({ statusCode: 204, headers: {}, body: '' }, '*')
  }

  try {
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*'

    let parsed = {}
    try {
      parsed = JSON.parse(typeof event.body === 'string' ? event.body : '{}')
    } catch {
      parsed = {}
    }

    const habitPrompt = parsed.habitPrompt
    if (!habitPrompt || typeof habitPrompt !== 'string') {
      return cors(
        {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing `habitPrompt`' }),
        },
        origin,
      )
    }

    const groqApiKey = groqApiKeyFromEnv(process.env)
    if (!groqApiKey) {
      return cors(
        {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing Groq API key' }),
        },
        origin,
      )
    }

    const groq = new Groq({ apiKey: groqApiKey })
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: QUIT_HABIT_SYSTEM },
        { role: 'user', content: habitPrompt.trim() },
      ],
      temperature: 0.2,
      max_completion_tokens: 400,
      top_p: 1,
      stream: false,
      reasoning_effort: 'low',
    })

    const raw = completion?.choices?.[0]?.message?.content ?? ''
    const structured = tryParseQuitHabitJson(raw)
    const model = normalizeQuitHabitModel(structured)

    return cors(
      {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, raw }),
      },
      origin,
    )
  } catch (e) {
    return cors(
      {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Quit habit parse failed', details: String(e?.message || e) }),
      },
      '*',
    )
  }
}
