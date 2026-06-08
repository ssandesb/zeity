export function findDayByName(days, name) {
  if (!name || !Array.isArray(days) || !days.length) return null
  const q = String(name).trim().toLowerCase()
  return (
    days.find((d) => d.name.trim().toLowerCase() === q) ||
    days.find((d) => d.name.trim().toLowerCase().includes(q))
  )
}

export function scheduleToAiRows(schedule) {
  return (schedule || []).map((s) => ({
    kind: s.kind || 'block',
    time: s.time || '',
    end: s.end || '',
    title: s.title || '',
    tag: s.tag || '',
    note: s.note || '',
  }))
}

export function guessCopyFromFromText(text, existingDays) {
  if (!text || !existingDays?.length) return null
  const lower = String(text).toLowerCase()
  const hits = existingDays.filter((d) => lower.includes(d.name.trim().toLowerCase()))
  if (hits.length === 1) return hits[0].name
  if (hits.length > 1) {
    return hits.sort((a, b) => b.name.length - a.name.length)[0].name
  }
  return null
}

export function inferCopySourceName(action, existingDays) {
  if (!action || !existingDays?.length) return null

  const explicit =
    action.copyFrom || action.sourceDayName || action.sourceName || action.day?.copyFrom
  if (explicit) return explicit

  const name = action.day?.name
  if (!name) return null

  const normalized = name.trim().toLowerCase()
  const copySuffix = normalized.match(/^(.+?)\s*(\(copy\)|copy)$/i)
  if (copySuffix) return copySuffix[1].trim()

  const match = findDayByName(existingDays, name)
  if (match && (!action.day.schedule || action.day.schedule.length === 0)) {
    return match.name
  }

  return null
}
