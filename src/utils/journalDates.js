export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const WEEK_LABELS = ['Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function startOfWeekMonday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

export function formatWeekLabel(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()}`
  }
  return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
}

export function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d - start) / 86400000)
}
