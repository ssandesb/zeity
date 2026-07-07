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

function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

/** Build per-day active mask for totalDays starting today. */
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

function resolveGrowthType(model, filters) {
  if (filters.growthMode === 'linear') return 'linear'
  if (filters.growthMode === 'compound') return 'compound'
  return model.growth?.type || 'linear'
}

function growthRate(model, filters) {
  if (filters.growthMode === 'compound') return 0.01
  return model.growth?.dailyRate || 0.01
}

function dailyOutput(model, growthType, dayIndex, effectiveDayIndex, filters) {
  const base = model.metric.daily
  if (growthType === 'skill') {
    return base
  }
  if (growthType === 'compound') {
    const rate = growthRate(model, filters)
    return base * Math.pow(1 + rate, effectiveDayIndex)
  }
  return base
}

export function runDaySeries(model, totalDays, filters, startDate = new Date()) {
  const mask = buildDayMask(totalDays, filters, startDate)
  const perfectMask = buildDayMask(totalDays, { ...filters, adherence: 100, cheatDaysPerMonth: 0, skipWeekends: false }, startDate)
  const growthType = resolveGrowthType(model, filters)
  const cap = model.growth?.cap

  const series = []
  let cumulative = 0
  let perfectCumulative = 0
  let effectiveDayIndex = 0

  for (let i = 0; i < totalDays; i++) {
    if (mask[i]) {
      const out = dailyOutput(model, growthType, i, effectiveDayIndex, filters)
      cumulative += out
      if (growthType === 'skill' && cap) {
        cumulative = Math.min(cumulative, cap)
      }
      effectiveDayIndex++
    }

    if (perfectMask[i]) {
      const perfectOut = dailyOutput(model, growthType, i, i, filters)
      perfectCumulative += perfectOut
      if (growthType === 'skill' && cap) {
        perfectCumulative = Math.min(perfectCumulative, cap)
      }
    }

    series.push({
      day: i + 1,
      cumulative,
      perfectCumulative,
      active: mask[i],
    })
  }

  return series
}

function milestonesHit(total, milestones) {
  return (milestones || []).filter((m) => total >= m.at)
}

export function runSimulation(model, filters) {
  const maxDays = HORIZONS[HORIZONS.length - 1].days
  const fullSeries = runDaySeries(model, maxDays, filters)

  const horizons = HORIZONS.map((h) => {
    const point = fullSeries[h.days - 1] || fullSeries[fullSeries.length - 1]
    const total = point?.cumulative ?? 0
    const perfect = point?.perfectCumulative ?? 0
    const slice = fullSeries.slice(0, h.days)

    return {
      id: h.id,
      label: h.label,
      days: h.days,
      total,
      perfect,
      equivalent: formatEquivalent(total, model.equivalents),
      series: slice,
      milestonesHit: milestonesHit(total, model.milestones),
      gapPct: perfect > 0 ? Math.round(((perfect - total) / perfect) * 100) : 0,
    }
  })

  return {
    horizons,
    fullSeries,
    effectiveDays: fullSeries.filter((s, i) => buildDayMask(maxDays, filters)[i]).length,
  }
}

export function formatTotal(n, unit) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n).toLocaleString()}`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
