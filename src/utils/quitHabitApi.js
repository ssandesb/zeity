export async function fetchQuitHabitModel(habitPrompt, signal) {
  const res = await fetch('/api/quit-habit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habitPrompt }),
    signal,
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    let detail = msg
    try {
      const parsed = JSON.parse(msg)
      detail = parsed.details || parsed.error || msg
    } catch {
      /* use raw */
    }
    throw new Error(detail || `Quit habit parse failed (${res.status})`)
  }

  const data = await res.json()
  return data.model
}
