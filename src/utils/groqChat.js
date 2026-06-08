export async function fetchChatCompletion({
  userMessage,
  messages = [],
  images = [],
  days = [],
  activeDay = null,
  foods = [],
  customFoods = [],
  proteinLog = {},
  signal,
}) {
  const endpoint = import.meta.env.DEV ? '/api/chat' : '/.netlify/functions/chat'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage,
      messages,
      images,
      days,
      activeDay,
      foods,
      customFoods,
      proteinLog,
    }),
    signal,
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Chat failed (${res.status})`)
  }

  return res.json()
}
