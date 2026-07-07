import { formatEquivalent } from '../../shared/habitSimCore.js'

export const HORIZONS = [
  { id: '2w', label: '2 weeks', days: 14 },
  { id: '1m', label: '1 month', days: 30 },
  { id: '3m', label: '3 months', days: 90 },
  { id: '6m', label: '6 months', days: 180 },
  { id: '1y', label: '1 year', days: 365 },
]

export const DEFAULT_FILTERS = {
  adherence: 100,
  cheatDaysPerMonth: 0,
  skipWeekends: false,
  growthMode: 'auto',
}

const KCAL_PER_KG_FAT = 7700

function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function buildDayMask(totalDays, filters, startDate = new Date()) {
  const start = new Date(startDate)
  start.setHours(12, 0, 0, 0)

  const mask = []
  let cheatBudget = 0

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)

    if (filters.skipWeekends && isWeekend(date)) {
      mask.push(false)
      continue
    }

    const monthIndex = Math.floor(i / 30)
    const prevMonth = Math.floor((i - 1) / 30)
    if (monthIndex > prevMonth && i > 0) {
      cheatBudget += filters.cheatDaysPerMonth || 0
    }

    if (cheatBudget > 0) {
      mask.push(false)
      cheatBudget--
      continue
    }

    mask.push(true)
  }

  const activeCount = mask.filter(Boolean).length
  const targetActive = Math.floor(activeCount * ((filters.adherence ?? 100) / 100))

  if (targetActive < activeCount) {
    let toRemove = activeCount - targetActive
    for (let i = mask.length - 1; i >= 0 && toRemove > 0; i--) {
      if (mask[i]) {
        mask[i] = false
        toRemove--
      }
    }
  }

  return mask
}

/** Personalize model using profile + Groq compute recipe */
export function applyProfileToModel(model, profile = {}) {
  const weight = Number(profile.weight_kg) || 70
  const compute = model.compute || { method: 'direct' }
  const next = { ...model, profile }

  if (compute.method === 'steps_calories' || compute.method === 'walking_calories') {
    const steps = compute.stepsDaily || model.metric.daily || 10000
    const kcalPerStep = 0.04 * (weight / 70)
    const dailyKcal = Math.round(steps * kcalPerStep)
    next.metric = {
      name: 'Calories burned',
      unit: 'kcal',
      daily: dailyKcal,
    }
    next.subtitle = `${steps.toLocaleString()} steps → ~${dailyKcal} kcal/day at ${weight}kg`
    next.visualization = 'flame'
    next.goalType = 'calories'
    next.equivalents = model.equivalents?.length
      ? model.equivalents
      : [{ threshold: 500, label: 'meal', plural: 'meals' }]
    next.rawSteps = steps
  }

  if (compute.method === 'workout_body') {
    const mins = compute.minutesDaily || 20
    const met = compute.met || 5
    const dailyKcal = Math.round(met * weight * (mins / 60))
    next.metric = {
      name: 'Calories burned',
      unit: 'kcal',
      daily: dailyKcal,
    }
    next.bodyDefinitionPerDay = 0.35
    next.subtitle = `${mins} min core work → ~${dailyKcal} kcal + definition build`
    next.visualization = 'body'
    next.goalType = 'body_composition'
    next.equivalents = model.equivalents?.length
      ? model.equivalents
      : [{ threshold: KCAL_PER_KG_FAT, label: 'kg fat equivalent', plural: 'kg fat equivalent' }]
  }

  if (model.goalType === 'knowledge' && !next.visualization) {
    next.visualization = 'books'
  }

  return next
}

function resolveGrowthType(model, filters) {
  if (filters.growthMode === 'linear') return 'linear'
  if (filters.growthMode === 'compound') return 'compound'
  return model.growth?.type || 'linear'
}

function growthRate(model, filters) {
  if (filters.growthMode === 'compound') return 0.01
  return model.growth?.dailyRate || 0.01
}

function dailyOutput(model, growthType, effectiveDayIndex, filters) {
  const base = model.metric.daily
  if (growthType === 'skill') return base
  if (growthType === 'compound') {
    const rate = growthRate(model, filters)
    return base * Math.pow(1 + rate, effectiveDayIndex)
  }
  return base
}

export function runDaySeries(model, totalDays, filters, startDate = new Date()) {
  const mask = buildDayMask(totalDays, filters, startDate)
  const perfectMask = buildDayMask(
    totalDays,
    { ...filters, adherence: 100, cheatDaysPerMonth: 0, skipWeekends: false },
    startDate,
  )
  const growthType = resolveGrowthType(model, filters)
  const cap = model.growth?.cap

  const series = []
  let cumulative = 0
  let perfectCumulative = 0
  let effectiveDayIndex = 0
  let bodyProgress = 0
  let sessions = 0

  for (let i = 0; i < totalDays; i++) {
    if (mask[i]) {
      const out = dailyOutput(model, growthType, effectiveDayIndex, filters)
      cumulative += out
      if (growthType === 'skill' && cap) cumulative = Math.min(cumulative, cap)

      if (model.bodyDefinitionPerDay) {
        sessions++
        bodyProgress = Math.min(95, bodyProgress + model.bodyDefinitionPerDay * (1 + sessions * 0.002))
      }

      effectiveDayIndex++
    }

    if (perfectMask[i]) {
      const perfectOut = dailyOutput(model, growthType, i, filters)
      perfectCumulative += perfectOut
      if (growthType === 'skill' && cap) perfectCumulative = Math.min(perfectCumulative, cap)
    }

    series.push({
      day: i + 1,
      cumulative,
      perfectCumulative,
      bodyProgress,
      active: mask[i],
    })
  }

  return series
}

function milestonesHit(total, milestones) {
  return (milestones || []).filter((m) => total >= m.at)
}

function horizonInsight(model, horizon) {
  const { total, bodyProgress, days } = horizon

  if (model.goalType === 'calories') {
    const meals = (total / 500).toFixed(1)
    const fatKg = (total / KCAL_PER_KG_FAT).toFixed(1)
    return { line: `≈ ${meals} meals worth of energy`, sub: `~${fatKg} kg fat equivalent` }
  }

  if (model.goalType === 'body_composition') {
    const fatKg = (total / KCAL_PER_KG_FAT).toFixed(2)
    return {
      line: `Core definition ~${Math.round(bodyProgress)}%`,
      sub: `~${fatKg} kg energy burned from workouts`,
    }
  }

  if (model.goalType === 'knowledge') {
    return { line: formatEquivalent(total, model.equivalents) || 'Knowledge stack growing', sub: `${days} days of reps` }
  }

  return {
    line: formatEquivalent(total, model.equivalents) || `${formatTotal(total)} ${model.metric.unit}`,
    sub: null,
  }
}

export function runSimulation(model, filters) {
  const maxDays = HORIZONS[HORIZONS.length - 1].days
  const fullSeries = runDaySeries(model, maxDays, filters)

  const horizons = HORIZONS.map((h) => {
    const point = fullSeries[h.days - 1] || fullSeries[fullSeries.length - 1]
    const total = point?.cumulative ?? 0
    const perfect = point?.perfectCumulative ?? 0
    const bodyProgress = point?.bodyProgress ?? 0
    const slice = fullSeries.slice(0, h.days)
    const insight = horizonInsight(model, { total, bodyProgress, days: h.days })

    return {
      id: h.id,
      label: h.label,
      days: h.days,
      total,
      perfect,
      bodyProgress,
      equivalent: formatEquivalent(total, model.equivalents),
      insight,
      series: slice,
      milestonesHit: milestonesHit(total, model.milestones),
      gapPct: perfect > 0 ? Math.round(((perfect - total) / perfect) * 100) : 0,
    }
  })

  const last = horizons[horizons.length - 1]
  return {
    horizons,
    fullSeries,
    summary: {
      bodyProgress: last.bodyProgress,
      fatKgEquivalent: +(last.total / KCAL_PER_KG_FAT).toFixed(2),
      totalKcal: model.metric.unit === 'kcal' ? last.total : null,
    },
  }
}

export function formatTotal(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n).toLocaleString()}`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
