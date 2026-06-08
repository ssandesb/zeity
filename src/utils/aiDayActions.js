import { findDayByName } from './dayAiContext'

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function fuzzyIncludes(haystack, needle) {
  const h = norm(haystack)
  const n = norm(needle)
  if (!h || !n) return false
  return h.includes(n) || n.includes(h)
}

export function resolveDayId(action, days, activeDay) {
  if (action?.dayId && days.some((d) => d.id === action.dayId)) return action.dayId
  const byName = action?.dayName ? findDayByName(days, action.dayName) : null
  if (byName) return byName.id
  if (activeDay?.id) return activeDay.id
  return null
}

function collectMatchQueries(action) {
  const from = [
    ...(Array.isArray(action.activityTexts) ? action.activityTexts : []),
    ...(Array.isArray(action.todoTexts) ? action.todoTexts : []),
    ...(Array.isArray(action.scheduleTitles) ? action.scheduleTitles : []),
  ]
  const seen = new Set()
  return from.filter((q) => {
    const key = norm(q)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchesScheduleBlock(block, query) {
  return fuzzyIncludes(block.title, query) || fuzzyIncludes(block.tag, query)
}

export function applyDayUpdate(day, action) {
  let todos = [...(day.todos || [])]
  let schedule = [...(day.schedule || [])]
  let todosDone = 0
  let scheduleDone = 0

  if (action.completeAllTodos) {
    todos = todos.map((t) => {
      if (!t.done) todosDone++
      return { ...t, done: true }
    })
  }

  const queries = collectMatchQueries(action)
  if (queries.length) {
    todos = todos.map((t) => {
      const hit = queries.some((q) => fuzzyIncludes(t.text, q))
      if (hit && !t.done) todosDone++
      return hit ? { ...t, done: true } : t
    })

    schedule = schedule.map((s) => {
      const hit = queries.some((q) => matchesScheduleBlock(s, q))
      if (hit && !s.done) scheduleDone++
      return hit ? { ...s, done: true } : s
    })
  }

  return {
    day: { ...day, todos, schedule },
    todosDone,
    scheduleDone,
  }
}

export function summarizeDayUpdate(action, result) {
  if (action.completeAllTodos && result.todosDone > 0) {
    return `✓ Checked off all ${result.todosDone} todo${result.todosDone === 1 ? '' : 's'}.`
  }
  const parts = []
  if (action.completeAllTodos) parts.push('all todos')
  else {
    if (result.todosDone) parts.push(`${result.todosDone} todo${result.todosDone === 1 ? '' : 's'}`)
    if (result.scheduleDone)
      parts.push(`${result.scheduleDone} schedule block${result.scheduleDone === 1 ? '' : 's'}`)
  }
  if (!parts.length) return null
  return `✓ Checked off ${parts.join(' and ')}.`
}
