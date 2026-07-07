export async function fetchHabitModel(habitPrompt, profile = null, signal) {
  const res = await fetch('/api/habit-sim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habitPrompt, profile }),
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
    throw new Error(detail || `Simulation parse failed (${res.status})`)
  }

  const data = await res.json()
  return data.model
}
