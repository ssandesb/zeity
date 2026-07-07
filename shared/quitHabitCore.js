export const QUIT_HORIZONS = [
  { id: '1w', label: '1 week', days: 7 },
  { id: '2w', label: '2 weeks', days: 14 },
  { id: '3m', label: '3 months', days: 90 },
  { id: '6m', label: '6 months', days: 180 },
  { id: '1y', label: '1 year', days: 365 },
  { id: '2y', label: '2 years', days: 730 },
  { id: '5y', label: '5 years', days: 1825 },
]

export const QUIT_EQUIVALENTS = [
  { threshold: 45, label: 'episode', plural: 'episodes' },
  { threshold: 300, label: 'book', plural: 'books' },
  { threshold: 30, label: 'workout', plural: 'workouts' },
  { threshold: 25, label: 'focus block', plural: 'focus blocks' },
]

export const QUIT_HABIT_SYSTEM = [
  'You parse BAD HABITS the user wants to QUIT into a simple impact model.',
  'Focus on time spent — no guilt, no moralizing. Return ONLY valid JSON (no markdown).',
  '',
  'Schema:',
  '{',
  '  "habitName": string,',
  '  "dailyMinutes": number,',
  '  "yearsProjection": number,',
  '  "motivation": string,',
  '  "accentColor": "#hex",',
  '  "milestones": [{ "atHours": number, "label": string, "icon": string }]',
  '}',
  '',
  'Rules:',
  '- habitName: short label (e.g. "Social scrolling", "Late-night snacks")',
  '- dailyMinutes: realistic minutes per day on that habit (integer, 5–720)',
  '- yearsProjection: how far ahead to project (1–30, default 5 if not stated)',
  '- motivation: one uplifting line (max 18 words) about freedom, energy, or time reclaimed',
  '- accentColor: calm blue-green hex for positive framing (#38bdf8, #34d399, #2dd4bf)',
  '- milestones: 4–5 checkpoints in hours regained (e.g. 24, 168, 720, 4380)',
  '- icons from: Clock, Brain, Sun, Sparkles, Heart, Leaf, BookOpen, Footprints',
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

const DEFAULT_MILESTONES = [
  { atHours: 24, label: 'A full day back', icon: 'Sun' },
  { atHours: 168, label: 'One week of life', icon: 'Clock' },
  { atHours: 720, label: 'A month reclaimed', icon: 'Sparkles' },
  { atHours: 4380, label: 'Half a year of you', icon: 'Brain' },
  { atHours: 8760, label: 'A year of freedom', icon: 'Heart' },
]

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

  const motivation =
    typeof parsed?.motivation === 'string' && parsed.motivation.trim()
      ? parsed.motivation.trim()
      : 'Every minute you reclaim is yours to invest in what matters.'

  const accentColor =
    typeof parsed?.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accentColor)
      ? parsed.accentColor
      : '#34d399'

  let milestones = DEFAULT_MILESTONES
  if (Array.isArray(parsed?.milestones) && parsed.milestones.length) {
    milestones = parsed.milestones
      .map((m) => ({
        atHours: Number(m.atHours) || 0,
        label: String(m.label || '').slice(0, 60),
        icon: String(m.icon || 'Sparkles'),
      }))
      .filter((m) => m.atHours > 0 && m.label)
  }

  return { habitName, dailyMinutes, yearsProjection, motivation, accentColor, milestones }
}

function formatEquivalentCount(totalMinutes, equivalents = QUIT_EQUIVALENTS) {
  for (const eq of equivalents) {
    if (totalMinutes >= eq.threshold) {
      const n = Math.floor(totalMinutes / eq.threshold)
      const word = n === 1 ? eq.label : eq.plural
      return `${n.toLocaleString()} ${word}`
    }
  }
  return null
}

export function horizonToId(yearsProjection) {
  if (yearsProjection >= 5) return '5y'
  if (yearsProjection >= 2) return '2y'
  if (yearsProjection >= 1) return '1y'
  return '3m'
}

export function runQuitSimulation(model) {
  const { dailyMinutes, milestones } = model
  const maxDays = QUIT_HORIZONS[QUIT_HORIZONS.length - 1].days

  const fullSeries = []
  for (let i = 0; i < maxDays; i++) {
    const day = i + 1
    const cumulativeMinutes = dailyMinutes * day
    fullSeries.push({ day, cumulativeMinutes })
  }

  const horizons = QUIT_HORIZONS.map((h) => {
    const point = fullSeries[h.days - 1] || fullSeries[fullSeries.length - 1]
    const totalMinutes = point?.cumulativeMinutes ?? 0
    const totalHours = totalMinutes / 60
    const slice = fullSeries.slice(0, h.days)
    const energy = computeEnergyScores(dailyMinutes, h.days)
    const equivalent = formatEquivalentCount(totalMinutes)
    const milestonesHit = milestones.filter((m) => totalHours >= m.atHours)

    const insight = {
      line: equivalent ? `≈ ${equivalent} you could enjoy instead` : `${Math.round(totalHours)} hours back`,
      sub:
        totalHours >= 24
          ? `${(totalHours / 24).toFixed(1)} days of waking life · ${energy.afterEnergy}% energy`
          : `${Math.round(totalMinutes)} minutes · energy rises to ${energy.afterEnergy}%`,
    }

    return {
      id: h.id,
      label: h.label,
      days: h.days,
      totalMinutes,
      totalHours,
      total: totalHours,
      ...energy,
      equivalent,
      insight,
      series: slice.map((s) => ({ day: s.day, cumulative: s.cumulativeMinutes / 60 })),
      milestonesHit,
    }
  })

  return { horizons, fullSeries, summary: horizons[horizons.length - 1] }
}

function computeEnergyScores(dailyMinutes, totalDays) {
  const wakeMinutes = 16 * 60
  const drainRatio = Math.min(0.85, dailyMinutes / wakeMinutes)
  const beforeEnergy = Math.max(10, Math.round(100 - drainRatio * 78))
  const afterEnergy = Math.min(98, Math.round(beforeEnergy + drainRatio * 42 + 18))
  const mentalHoursGained = Math.round((dailyMinutes * totalDays * 0.35) / 60)

  return { beforeEnergy, afterEnergy, mentalHoursGained }
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
