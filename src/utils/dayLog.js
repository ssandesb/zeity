import { getZeityColumn, patchZeityColumn } from '../lib/zeityDb'
import { getWeekDays, startOfWeekMonday, toDateKey } from './journalDates'

export function loadDayLog() {
  return getZeityColumn('day_log') || {}
}

export function saveDayLogEntry(dateKey, typeId) {
  patchZeityColumn('day_log', (log) => ({ ...log, [dateKey]: typeId }))
}

export function buildWeekStrip(days, today = new Date(), log = loadDayLog()) {
  const monday = startOfWeekMonday(today)
  const weekDays = getWeekDays(monday)
  const todayKey = toDateKey(today)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return weekDays.map((date, i) => {
    const key = toDateKey(date)
    const typeId = log[key]
    const dt = typeId ? days.find((d) => d.id === typeId) : null
    return {
      day: labels[i],
      date,
      dateKey: key,
      typeId,
      dt,
      isToday: key === todayKey,
    }
  })
}
