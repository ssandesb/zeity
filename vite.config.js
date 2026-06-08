import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Groq } from 'groq-sdk'
import {
  buildChatSystemPrompt,
  normalizeAiActions,
  tryParseChatJson,
} from './shared/zeityChatCore.js'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function corsHeaders(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = env.GROQ_API_KEY || env.groq || process.env.GROQ_API_KEY || process.env.groq

  return {
    plugins: [
      react(),
      {
        name: 'zeity-groq-chat-api',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            corsHeaders(req, res)

            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            if (!groqApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing Groq API key in .env (GROQ_API_KEY or groq)' }))
              return
            }

            try {
              const parsed = await readJsonBody(req)
              const userMessage = parsed.userMessage
              const messages = Array.isArray(parsed.messages) ? parsed.messages : []
              const images = Array.isArray(parsed.images) ? parsed.images.slice(0, 5) : []
              const days = Array.isArray(parsed.days) ? parsed.days : []
              const activeDay = parsed.activeDay || null
              const foods = Array.isArray(parsed.foods) ? parsed.foods : []
              const customFoods = Array.isArray(parsed.customFoods) ? parsed.customFoods : []
              const proteinLog = parsed.proteinLog && typeof parsed.proteinLog === 'object' ? parsed.proteinLog : {}

              if (!userMessage || typeof userMessage !== 'string') {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing `userMessage`' }))
                return
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
                model: hasImages
                  ? 'meta-llama/llama-4-scout-17b-16e-instruct'
                  : 'openai/gpt-oss-120b',
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

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ answer, actions, action: actions[0] || null, raw }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Chat failed', details: String(e?.message || e) }))
            }
          })
        },
      },
    ],
    server: {
      port: 5173,
      open: true,
    },
  }
})
