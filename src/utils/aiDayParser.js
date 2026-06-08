import { colorChoices, iconChoices } from '../icons'
import { findDayByName, inferCopySourceName, scheduleToAiRows } from './dayAiContext'

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapScheduleRow(row) {
  const kind = ['block', 'buffer', 'note'].includes(row?.kind) ? row.kind : 'block'

  if (kind === 'block') {
    return {
      time: row.time || '',
      end: row.end || '',
      title: String(row.title || 'Untitled block').trim(),
      tag: String(row.tag || 'Block').trim(),
      note: row.note ? String(row.note).trim() : '',
      kind: 'block',
      done: false,
    }
  }

  if (kind === 'buffer') {
    return {
      time: row.time || '',
      end: row.end || '',
      title: String(row.title || row.note || 'Buffer').trim(),
      tag: 'Buffer',
      kind: 'buffer',
      done: false,
    }
  }

  return {
    time: row.time || '',
    title: String(row.title || row.note || 'Note').trim(),
    tag: 'Special',
    kind: 'note',
    done: false,
  }
}

export function buildDayFromAiAction(action, existingDays = []) {
  if (!action || action.type !== 'create_day' || !action.day) return null

  const payload = { ...action.day }
  const sourceName = inferCopySourceName(action, existingDays)
  const source = sourceName ? findDayByName(existingDays, sourceName) : null

  if (source) {
    if (!payload.schedule?.length) {
      payload.schedule = scheduleToAiRows(source.schedule)
    }
    if (!payload.icon) payload.icon = source.icon
    if (!payload.color && source.color) {
      payload.color = source.color
      payload.gradient = source.gradient
    }
    if (!payload.tagline || payload.tagline === 'AI-generated day') {
      payload.tagline = source.tagline
    }
  }

  return buildDayFromPayload(payload)
}

function buildDayFromPayload(payload) {
  const name = String(payload.name || 'New Day').trim()
  if (!name) return null

  const icon = iconChoices.includes(payload.icon) ? payload.icon : 'Sparkles'
  const colorIndex = Math.min(
    Math.max(0, Number.isFinite(Number(payload.colorIndex)) ? Number(payload.colorIndex) : 0),
    colorChoices.length - 1,
  )
  const picked = colorChoices[colorIndex]
  let color = picked.color
  let gradient = picked.gradient
  if (payload.color) {
    const byHex = colorChoices.find((c) => c.color === payload.color)
    if (byHex) {
      color = byHex.color
      gradient = byHex.gradient
    } else {
      color = payload.color
      gradient =
        Array.isArray(payload.gradient) && payload.gradient.length >= 2
          ? payload.gradient
          : [payload.color, payload.color]
    }
  }

  const schedule = (Array.isArray(payload.schedule) ? payload.schedule : [])
    .map(mapScheduleRow)
    .filter((row) => row.title || row.time)

  const todos = (Array.isArray(payload.todos) ? payload.todos : [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `ai${Date.now()}_${i}`, text, done: false }))

  return {
    id: `${slug(name) || 'day'}-${Date.now().toString(36)}`,
    name,
    tagline: String(payload.tagline || 'AI-generated day').trim() || 'AI-generated day',
    icon,
    color,
    gradient,
    completionLog: {},
    schedule,
    todos,
    custom: true,
  }
}
