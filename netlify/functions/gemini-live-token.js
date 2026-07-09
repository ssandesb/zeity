import { createGeminiLiveEphemeralToken, geminiApiKeyFromEnv } from '../../shared/geminiLiveToken.js'

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

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x)
  } catch {
    return ''
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return cors({ statusCode: 204, headers: {}, body: '' }, '*')
  }

  if (event.httpMethod !== 'POST') {
    return cors(
      {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ error: 'Method Not Allowed' }),
      },
      '*',
    )
  }

  try {
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*'
    const apiKey = geminiApiKeyFromEnv(process.env)

    if (!apiKey) {
      return cors(
        {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({
            error: 'Missing Gemini API key (set GEMINI_API or GEMINI_API_KEY in Netlify env)',
          }),
        },
        origin,
      )
    }

    const payload = await createGeminiLiveEphemeralToken(apiKey)

    return cors(
      {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload),
      },
      origin,
    )
  } catch (e) {
    return cors(
      {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          error: 'Failed to create ephemeral token',
          details: String(e?.message || e),
        }),
      },
      '*',
    )
  }
}
