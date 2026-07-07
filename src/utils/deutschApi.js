export async function fetchDeutschContent(mode, topic, categoryName, signal) {
  const res = await fetch('/api/deutsch-learn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, topic, categoryName }),
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
    throw new Error(detail || `Deutsch AI failed (${res.status})`)
  }

  const data = await res.json()
  return data.content
}
