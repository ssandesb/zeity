import { Groq } from 'groq-sdk'
import { groqApiKeyFromEnv } from '../../shared/zeityChatCore.js'
import {
  DEUTSCH_LEARN_SYSTEM,
  buildDeutschUserPrompt,
  normalizeDeutschContent,
  tryParseDeutschJson,
} from '../../shared/deutschLearnCore.js'

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

    const { mode, topic, categoryName } = parsed
    if (!mode || !topic?.title) {
      return cors(
        {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing mode or topic' }),
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
        { role: 'system', content: DEUTSCH_LEARN_SYSTEM },
        { role: 'user', content: buildDeutschUserPrompt(mode, topic, categoryName || '') },
      ],
      temperature: 0.35,
      max_completion_tokens: 1800,
      top_p: 1,
      stream: false,
      reasoning_effort: 'low',
    })

    const raw = completion?.choices?.[0]?.message?.content ?? ''
    const structured = tryParseDeutschJson(raw)
    const content = normalizeDeutschContent(structured, mode)

    if (!content) {
      return cors(
        {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to parse AI response', raw }),
        },
        origin,
      )
    }

    return cors(
      {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, raw }),
      },
      origin,
    )
  } catch (e) {
    return cors(
      {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Deutsch learn failed', details: String(e?.message || e) }),
      },
      '*',
    )
  }
}
