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
  'You are Zeity Future — parse habits into GOAL-FOCUSED simulation models.',
  'Identify what the user actually wants to achieve, not just the activity.',
  'Return ONLY valid JSON (no markdown fences).',
  '',
  'Examples of goal identification:',
  '- "10k steps" → goalType "calories", visualization "flame", metric in kcal (needs weight to compute)',
  '- "abs workout 20 min" → goalType "body_composition", visualization "body", ask weight_kg, target belly/core',
  '- "read 25 pages" → goalType "knowledge", visualization "books"',
  '- "100g protein" → goalType "fitness", visualization "ring", metric protein grams',
  '- "learn German" → goalType "skill", visualization "ring", growth skill with cap',
  '',
  'Schema:',
  '{',
  '  "title": string,',
  '  "subtitle": string,',
  '  "icon": string,',
  '  "goalType": "calories" | "body_composition" | "knowledge" | "skill" | "fitness" | "generic",',
  '  "visualization": "flame" | "body" | "books" | "ring" | "steps" | "chart",',
  '  "accentColor": "#hex",',
  '  "metric": { "name": string, "unit": string, "daily": number },',
  '  "growth": { "type": "linear" | "compound" | "skill", "dailyRate": number, "cap": number | null },',
  '  "compute": {',
  '    "method": "direct" | "steps_calories" | "workout_body" | "walking_calories",',
  '    "stepsDaily": number | null,',
  '    "minutesDaily": number | null,',
  '    "met": number | null,',
  '    "focusArea": "core" | "full" | null',
  '  },',
  '  "profileQuestions": [{',
  '    "id": string,',
  '    "label": string,',
  '    "unit": string,',
  '    "type": "number",',
  '    "default": number,',
  '    "required": boolean,',
  '    "min": number,',
  '    "max": number',
  '  }],',
  '  "equivalents": [{ "threshold": number, "label": string, "plural": string }],',
  '  "milestones": [{ "at": number, "label": string, "icon": string }],',
  '  "motivation": string,',
  '  "compoundNote": string,',
  '  "atomicHabits": [{ "law": 1|2|3|4, "suggestion": string }]',
  '}',
  '',
  'Rules:',
  '- profileQuestions: include weight_kg (required) for steps, walking, abs, cardio, fat-loss goals.',
  '- For body_composition / abs / belly: compute.method = "workout_body", minutesDaily from habit, met 4-6.',
  '- For steps: compute.method = "steps_calories", stepsDaily = parsed steps (default 10000).',
  '- equivalents: calories → threshold 500 "meal", steps → 10000 "marathon day" fraction, pages → 250 books.',
  '- milestones: 4-5 checkpoints on the PRIMARY metric (kcal, pages, etc.).',
  '- motivation: one punchy line (max 15 words) about what consistency unlocks.',
  '- atomicHabits: exactly 4 items (laws 1–4), each suggestion is ONE concrete action to START and CONTINUE this habit.',
  '  Law 1 obvious: design a clear cue. Law 2 attractive: pair with something enjoyable.',
  '  Law 3 easy: two-minute version or reduce friction. Law 4 satisfying: immediate reward or tracker.',
  '- accentColor: hex matching goal (orange flame, green fitness, purple knowledge).',
  `- icons from: ${HABIT_SIM_ICONS.join(', ')}`,
  '- No medical guarantees; frame body results as "estimated" and motivational.',
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
  goalType: 'generic',
  visualization: 'chart',
  accentColor: '#6366f1',
  metric: { name: 'Progress', unit: 'units', daily: 1 },
  growth: { type: 'linear', dailyRate: 0, cap: null },
  compute: { method: 'direct', stepsDaily: null, minutesDaily: null, met: null, focusArea: null },
  profileQuestions: [],
  equivalents: [],
  milestones: [],
  motivation: 'Small daily wins compound into big results.',
  compoundNote: '',
}

export const ATOMIC_HABITS_BUILD_META = [
  {
    law: 1,
    loopStep: 'Cue',
    buildLaw: 'Make it obvious',
    framework: 'Design a clear trigger — time, place, or object that says “start now.”',
    icon: 'Eye',
    rockTone: '#38bdf8',
  },
  {
    law: 2,
    loopStep: 'Craving',
    buildLaw: 'Make it attractive',
    framework: 'Pair the habit with something you enjoy so your brain wants the routine.',
    icon: 'Sparkles',
    rockTone: '#34d399',
  },
  {
    law: 3,
    loopStep: 'Response',
    buildLaw: 'Make it easy',
    framework: 'Shrink to a two-minute version — lower friction beats motivation every time.',
    icon: 'Zap',
    rockTone: '#2dd4bf',
  },
  {
    law: 4,
    loopStep: 'Reward',
    buildLaw: 'Make it satisfying',
    framework: 'Track a streak or give yourself an immediate win right after you finish.',
    icon: 'Target',
    rockTone: '#14b8a6',
  },
]

export function normalizeAtomicHabitsBuild(parsed, habitTitle) {
  const defaults = [
    `Set a daily cue: same time and place — leave your gear visible for ${habitTitle}.`,
    `Stack ${habitTitle} right after something you love (coffee, shower, favorite playlist).`,
    `Start with just 2 minutes of ${habitTitle} — make the first step embarrassingly small.`,
    `Check off each day on a wall calendar or app streak — never break the chain twice.`,
  ]

  const byLaw = new Map()
  if (Array.isArray(parsed?.atomicHabits)) {
    for (const item of parsed.atomicHabits) {
      const law = Number(item.law)
      if (law >= 1 && law <= 4 && item.suggestion) {
        byLaw.set(law, String(item.suggestion).slice(0, 200))
      }
    }
  }

  return ATOMIC_HABITS_BUILD_META.map((meta, i) => ({
    ...meta,
    suggestion: byLaw.get(meta.law) || defaults[i],
  }))
}

export function normalizeHabitModel(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_MODEL }

  const growthType = ['linear', 'compound', 'skill'].includes(parsed.growth?.type)
    ? parsed.growth.type
    : 'linear'

  const daily = Number(parsed.metric?.daily)
  const icon = HABIT_SIM_ICONS.includes(parsed.icon) ? parsed.icon : 'TrendingUp'

  const goalTypes = ['calories', 'body_composition', 'knowledge', 'skill', 'fitness', 'generic']
  const vizTypes = ['flame', 'body', 'books', 'ring', 'steps', 'chart']

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

  const profileQuestions = (Array.isArray(parsed.profileQuestions) ? parsed.profileQuestions : [])
    .filter((q) => q?.id)
    .map((q) => ({
      id: String(q.id),
      label: String(q.label || q.id),
      unit: String(q.unit || ''),
      type: 'number',
      default: Number(q.default) || 70,
      required: Boolean(q.required),
      min: Number(q.min) || 1,
      max: Number(q.max) || 300,
    }))

  const compute = parsed.compute || {}
  const methods = ['direct', 'steps_calories', 'workout_body', 'walking_calories']

  const title = String(parsed.title || DEFAULT_MODEL.title).slice(0, 60)
  const atomicHabits = normalizeAtomicHabitsBuild(parsed, title)

  return {
    title,
    subtitle: String(parsed.subtitle || DEFAULT_MODEL.subtitle).slice(0, 100),
    icon,
    goalType: goalTypes.includes(parsed.goalType) ? parsed.goalType : 'generic',
    visualization: vizTypes.includes(parsed.visualization) ? parsed.visualization : 'chart',
    accentColor: /^#[0-9a-fA-F]{6}$/.test(parsed.accentColor) ? parsed.accentColor : '#6366f1',
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
    compute: {
      method: methods.includes(compute.method) ? compute.method : 'direct',
      stepsDaily: Number(compute.stepsDaily) || null,
      minutesDaily: Number(compute.minutesDaily) || null,
      met: Number(compute.met) || null,
      focusArea: compute.focusArea || null,
    },
    profileQuestions,
    equivalents,
    milestones,
    motivation: String(parsed.motivation || DEFAULT_MODEL.motivation).slice(0, 120),
    compoundNote: String(parsed.compoundNote || '').slice(0, 100),
    atomicHabits,
  }
}

export function defaultProfile(model) {
  const profile = {}
  for (const q of model.profileQuestions || []) {
    profile[q.id] = q.default
  }
  return profile
}

export function profileComplete(model, profile) {
  for (const q of model.profileQuestions || []) {
    if (!q.required) continue
    const v = Number(profile[q.id])
    if (!Number.isFinite(v) || v < q.min || v > q.max) return false
  }
  return true
}

export function formatEquivalent(total, equivalents) {
  if (!equivalents?.length || total <= 0) return null
  const eq = equivalents[0]
  const count = total / eq.threshold
  if (count < 0.1) return null
  const rounded = count >= 10 ? Math.round(count) : +count.toFixed(1)
  const word = rounded === 1 ? eq.label : eq.plural
  return `${rounded} ${word}`
}
