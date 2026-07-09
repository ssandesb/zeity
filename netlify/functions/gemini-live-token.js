import { GoogleGenAI } from '@google/genai'

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

function geminiApiKeyFromEnv(env) {
  return env.GEMINI_API || env.GEMINI_API_KEY || ''
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

    const client = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1alpha',
    })

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
      },
    })

    return cors(
      {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          token: token.name,
          expireTime,
          newSessionExpireTime,
        }),
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
