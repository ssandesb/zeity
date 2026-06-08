const { Groq } = require('groq-sdk')

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

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return cors({ statusCode: 204, headers: {}, body: '' }, '*')
  }

  try {
    const { buildChatSystemPrompt, normalizeAiActions, tryParseChatJson } = await import(
      '../../shared/zeityChatCore.js'
    )

    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*'

    let parsed = {}
    try {
      parsed = JSON.parse(typeof event.body === 'string' ? event.body : '{}')
    } catch {
      parsed = {}
    }

    const userMessage = parsed.userMessage
    const messages = Array.isArray(parsed.messages) ? parsed.messages : []
    const images = Array.isArray(parsed.images) ? parsed.images.slice(0, 5) : []
    const days = Array.isArray(parsed.days) ? parsed.days : []
    const activeDay = parsed.activeDay || null
    const foods = Array.isArray(parsed.foods) ? parsed.foods : []
    const customFoods = Array.isArray(parsed.customFoods) ? parsed.customFoods : []
    const proteinLog =
      parsed.proteinLog && typeof parsed.proteinLog === 'object' ? parsed.proteinLog : {}

    if (!userMessage || typeof userMessage !== 'string') {
      return cors(
        {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({ error: 'Missing `userMessage`' }),
        },
        origin,
      )
    }

    const groqApiKey =
      process.env.GROQ_API_KEY || process.env.groq || process.env.GROQ_KEY || ''
    if (!groqApiKey) {
      return cors(
        {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({ error: 'Missing GROQ_API_KEY in environment variables' }),
        },
        origin,
      )
    }

    const userContentParts = [
      { type: 'text', text: userMessage },
      ...images
        .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
        .map((img) => ({ type: 'image_url', image_url: { url: img } })),
    ]
    const hasImages = userContentParts.length > 1

    const groqMessages = [
      {
        role: 'system',
        content: buildChatSystemPrompt(days, activeDay, foods, customFoods, proteinLog),
      },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? ''),
      })),
      { role: 'user', content: hasImages ? userContentParts : userMessage },
    ]

    const groq = new Groq({ apiKey: groqApiKey })
    const completion = await groq.chat.completions.create({
      model: hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'openai/gpt-oss-120b',
      messages: groqMessages,
      temperature: 0.35,
      max_completion_tokens: hasImages ? 2048 : 1600,
      top_p: 1,
      stream: false,
      ...(hasImages ? {} : { reasoning_effort: 'medium' }),
    })

    const raw = completion?.choices?.[0]?.message?.content ?? ''
    const structured = tryParseChatJson(raw)
    const answer = structured?.reply || raw || 'No answer returned.'
    const actions = normalizeAiActions(structured)

    return cors(
      {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ answer, actions, action: actions[0] || null, raw }),
      },
      origin,
    )
  } catch (e) {
    return cors(
      {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ error: 'Chat failed', details: String(e?.message || e) }),
      },
      '*',
    )
  }
}
