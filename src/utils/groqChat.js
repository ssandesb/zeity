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
  const endpoint = '/api/chat'

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
    let detail = msg
    try {
      const parsed = JSON.parse(msg)
      detail = parsed.details || parsed.error || msg
    } catch {
      /* use raw text */
    }
    throw new Error(detail || `Chat failed (${res.status})`)
  }

  return res.json()
}
