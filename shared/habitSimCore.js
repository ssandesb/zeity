export const HABIT_SIM_ICONS = [
  'BookOpen',
  'BookMarked',
  'Library',
  'Dumbbell',
  'Drumstick',
  'Footprints',
  'GraduationCap',
  'Languages',
  'BrainCircuit',
  'Heart',
  'Flame',
  'Target',
  'TrendingUp',
  'Coffee',
  'Moon',
  'Sun',
  'Leaf',
  'Sparkles',
]

export const HABIT_SIM_SYSTEM = [
  'You parse habit descriptions into measurable simulation models for a projection app.',
  'Return ONLY valid JSON (no markdown fences, no extra text).',
  '',
  'Schema:',
  '{',
  '  "title": string,',
  '  "subtitle": string,',
  '  "icon": string,',
  '  "metric": { "name": string, "unit": string, "daily": number },',
  '  "growth": { "type": "linear" | "compound" | "skill", "dailyRate": number, "cap": number | null },',
  '  "equivalents": [{ "threshold": number, "label": string, "plural": string }],',
  '  "milestones": [{ "at": number, "label": string, "icon": string }],',
  '  "compoundNote": string',
  '}',
  '',
  'Rules:',
  '- metric.daily: numeric amount per habit day (e.g. 25 pages, 100 grams, 10000 steps, 1 topic).',
  '- growth.type "linear": same output each day (reading pages, protein, steps).',
  '- growth.type "compound": daily output grows by dailyRate each day (e.g. 0.01 = 1% more per day). Use for skill/speed improvements.',
  '- growth.type "skill": cumulative count capped at growth.cap (e.g. 365 grammar topics, cap 400). dailyRate unused.',
  '- equivalents: convert totals to friendly units (250 pages = 1 book, 10000 steps ≈ 8 km if relevant).',
  '- milestones: 3-5 visual checkpoints with Lucide icon names.',
  `- icon and milestone icons must be one of: ${HABIT_SIM_ICONS.join(', ')}`,
  '- compoundNote: max 12 words, motivational not medical.',
  '- Infer reasonable daily numbers when user gives duration (1 hr reading ≈ 25-40 pages).',
  '- For protein/health habits use linear growth only; no medical claims.',
].join('\n')

export function tryParseHabitSimJson(raw) {
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

const DEFAULT_MODEL = {
  title: 'Habit',
  subtitle: 'Daily progress',
  icon: 'TrendingUp',
  metric: { name: 'Progress', unit: 'units', daily: 1 },
  growth: { type: 'linear', dailyRate: 0, cap: null },
  equivalents: [],
  milestones: [],
  compoundNote: '',
}

export function normalizeHabitModel(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_MODEL }

  const growthType = ['linear', 'compound', 'skill'].includes(parsed.growth?.type)
    ? parsed.growth.type
    : 'linear'

  const daily = Number(parsed.metric?.daily)
  const icon = HABIT_SIM_ICONS.includes(parsed.icon) ? parsed.icon : 'TrendingUp'

  const equivalents = (Array.isArray(parsed.equivalents) ? parsed.equivalents : [])
    .filter((e) => Number(e?.threshold) > 0)
    .map((e) => ({
      threshold: Number(e.threshold),
      label: String(e.label || 'unit'),
      plural: String(e.plural || e.label || 'units'),
    }))

  const milestones = (Array.isArray(parsed.milestones) ? parsed.milestones : [])
    .filter((m) => Number(m?.at) > 0)
    .map((m) => ({
      at: Number(m.at),
      label: String(m.label || ''),
      icon: HABIT_SIM_ICONS.includes(m.icon) ? m.icon : icon,
    }))
    .sort((a, b) => a.at - b.at)

  return {
    title: String(parsed.title || DEFAULT_MODEL.title).slice(0, 60),
    subtitle: String(parsed.subtitle || DEFAULT_MODEL.subtitle).slice(0, 80),
    icon,
    metric: {
      name: String(parsed.metric?.name || 'Progress').slice(0, 40),
      unit: String(parsed.metric?.unit || 'units').slice(0, 20),
      daily: Number.isFinite(daily) && daily > 0 ? daily : 1,
    },
    growth: {
      type: growthType,
      dailyRate: Number(parsed.growth?.dailyRate) || 0.01,
      cap: growthType === 'skill' && Number(parsed.growth?.cap) > 0 ? Number(parsed.growth.cap) : null,
    },
    equivalents,
    milestones,
    compoundNote: String(parsed.compoundNote || '').slice(0, 80),
  }
}

export function formatEquivalent(total, equivalents) {
  if (!equivalents?.length || total <= 0) return null
  const eq = equivalents[0]
  const count = total / eq.threshold
  if (count < 0.1) return null
  const rounded = count >= 10 ? Math.round(count) : +(count).toFixed(1)
  const word = rounded === 1 ? eq.label : eq.plural
  return `${rounded} ${word}`
}
