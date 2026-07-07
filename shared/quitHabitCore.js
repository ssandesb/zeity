export const QUIT_HABIT_SYSTEM = [
  'You parse BAD HABITS the user wants to QUIT into a simple impact model.',
  'Focus on time spent — no guilt, no moralizing. Return ONLY valid JSON (no markdown).',
  '',
  'Schema:',
  '{',
  '  "habitName": string,',
  '  "dailyMinutes": number,',
  '  "yearsProjection": number',
  '}',
  '',
  'Rules:',
  '- habitName: short label (e.g. "Social scrolling", "Late-night snacks")',
  '- dailyMinutes: realistic minutes per day on that habit (integer, 5–720)',
  '- yearsProjection: how far ahead to project (1–30, default 5 if not stated)',
  '- Parse "2 hours" → 120, "30 min" → 30, "1.5h" → 90',
  '- If user gives a range, use the midpoint',
].join('\n')

export function tryParseQuitHabitJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export function normalizeQuitHabitModel(parsed) {
  const habitName =
    typeof parsed?.habitName === 'string' && parsed.habitName.trim()
      ? parsed.habitName.trim()
      : 'This habit'

  let dailyMinutes = Number(parsed?.dailyMinutes)
  if (!Number.isFinite(dailyMinutes) || dailyMinutes < 1) dailyMinutes = 30
  dailyMinutes = Math.round(Math.min(720, Math.max(5, dailyMinutes)))

  let yearsProjection = Number(parsed?.yearsProjection)
  if (!Number.isFinite(yearsProjection) || yearsProjection < 1) yearsProjection = 5
  yearsProjection = Math.min(30, Math.max(1, Math.round(yearsProjection * 10) / 10))

  return { habitName, dailyMinutes, yearsProjection }
}

export function computeQuitImpact({ dailyMinutes, yearsProjection }) {
  const totalDays = Math.round(yearsProjection * 365)
  const totalMinutes = dailyMinutes * totalDays
  const totalHours = totalMinutes / 60
  const totalDaysEquiv = totalHours / 24

  const wakeMinutes = 16 * 60
  const drainRatio = Math.min(0.85, dailyMinutes / wakeMinutes)
  const beforeEnergy = Math.max(10, Math.round(100 - drainRatio * 78))
  const afterEnergy = Math.min(98, Math.round(beforeEnergy + drainRatio * 42 + 18))

  return {
    totalDays,
    totalMinutes,
    totalHours,
    totalDaysEquiv,
    beforeEnergy,
    afterEnergy,
    mentalHoursGained: Math.round((totalMinutes * 0.35) / 60),
  }
}

export function formatImpactTime(totalMinutes) {
  const hours = totalMinutes / 60
  const days = hours / 24
  if (days >= 365) {
    const years = days / 365
    return {
      primary: years >= 10 ? years.toFixed(0) : years.toFixed(1),
      unit: years === 1 ? 'year' : 'years',
      secondary: `${Math.round(days).toLocaleString()} days`,
    }
  }
  if (days >= 14) {
    return {
      primary: Math.round(days).toLocaleString(),
      unit: days === 1 ? 'day' : 'days',
      secondary: `${Math.round(hours).toLocaleString()} hours`,
    }
  }
  if (hours >= 24) {
    return {
      primary: Math.round(hours).toLocaleString(),
      unit: 'hours',
      secondary: `${Math.round(totalMinutes).toLocaleString()} min`,
    }
  }
  return {
    primary: Math.round(totalMinutes).toLocaleString(),
    unit: 'minutes',
    secondary: null,
  }
}
