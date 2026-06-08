import { toDateKey } from './journalDates'
import { getNow } from './timeProvider'

export const STREAK_DAYS = 182

export function completionLevel(todos = []) {
  if (!todos.length) return 0
  const ratio = todos.filter((t) => t.done).length / todos.length
  if (ratio === 0) return 0
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 1) return 3
  return 4
}

export function withCompletionLog(day, date = getNow()) {
  const key = toDateKey(date)
  const level = completionLevel(day.todos)
  const completionLog = { ...(day.completionLog || {}) }
  if (level === 0) delete completionLog[key]
  else completionLog[key] = level
  return { ...day, completionLog }
}

export function streakStats(completionLog = {}) {
  const series = buildSeriesFromLog(completionLog)
  let trailing = 0
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] > 0) trailing++
    else break
  }
  let run = 0
  let best = 0
  series.forEach((lvl) => {
    if (lvl > 0) {
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  })
  return { current: trailing, best }
}

export function buildSeriesFromLog(completionLog = {}, days = STREAK_DAYS) {
  const arr = new Array(days).fill(0)
  const today = getNow()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    arr[i] = completionLog[toDateKey(d)] ?? 0
  }
  return arr
}
