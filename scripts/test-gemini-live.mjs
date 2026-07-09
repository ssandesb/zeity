import { GoogleGenAI, Modality } from '@google/genai'
import { readFileSync, existsSync } from 'fs'

function loadEnv() {
  if (!existsSync('.env')) return {}
  const env = {}
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const key = loadEnv().GEMINI_API || loadEnv().GEMINI_API_KEY
const client = new GoogleGenAI({ apiKey: key, apiVersion: 'v1alpha' })

async function test(label, config) {
  const token = await client.authTokens.create({ config: { uses: 1, httpOptions: { apiVersion: 'v1alpha' } } })
  const ai = new GoogleGenAI({ apiKey: token.name, httpOptions: { apiVersion: 'v1alpha' } })
  let closed = null
  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config,
    callbacks: {
      onmessage: () => {},
      onclose: (e) => {
        closed = e?.reason || String(e?.code)
      },
    },
  })
  session.sendRealtimeInput({ text: 'Hi' })
  await new Promise((r) => setTimeout(r, 5000))
  session.close()
  console.log(label, closed)
}

await test('empty compression', {
  responseModalities: [Modality.AUDIO],
  contextWindowCompression: {},
  sessionResumption: {},
})

await test('slidingWindow', {
  responseModalities: [Modality.AUDIO],
  contextWindowCompression: { slidingWindow: {} },
  sessionResumption: {},
})
