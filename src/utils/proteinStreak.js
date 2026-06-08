import { getZeityColumn, patchZeityColumn } from '../lib/zeityDb'
import { toDateKey } from './journalDates'
import { getNow } from './timeProvider'
import { loadProteinHistory, loadWeightHistory } from './weightHistory'

const PROTEIN_PER_KG = 1.6

export function todayStr() {
  return toDateKey(getNow())
}

export function yesterdayStr() {
  const d = getNow()
  d.setDate(d.getDate() - 1)
  return toDateKey(d)
}

function defaultStreak() {
  return { current: 0, best: 0, lastCompletedDate: null, log: {} }
}

export function loadProteinStreakRaw() {
  const parsed = getZeityColumn('protein_streak')
  if (!parsed) return defaultStreak()
  return {
    ...defaultStreak(),
    ...parsed,
    log: parsed.log && typeof parsed.log === 'object' ? parsed.log : {},
  }
}

function saveProteinStreak(data) {
  patchZeityColumn('protein_streak', data)
}

export function proteinLevel(consumed, target) {
  if (!target || target <= 0 || !consumed || consumed <= 0) return 0
  const ratio = consumed / target
  if (ratio >= 1) return 4
  if (ratio >= 0.75) return 3
  if (ratio >= 0.5) return 2
  return 1
}

function getTargetForDate(dateKey) {
  const hist = loadWeightHistory()
  const dayEntry = hist.find((e) => e.date === dateKey)
  if (dayEntry?.weight > 0) return Math.round(dayEntry.weight * PROTEIN_PER_KG)
  const latest = hist.length ? hist[hist.length - 1].weight : null
  const fallback = getZeityColumn('weight')?.current ?? 0
  const w = latest ?? (Number.isFinite(fallback) && fallback > 0 ? fallback : 0)
  return w > 0 ? Math.round(w * PROTEIN_PER_KG) : 0
}

export function rebuildLogFromHistory() {
  const proteinHist = loadProteinHistory()
  const log = {}
  Object.entries(proteinHist).forEach(([date, grams]) => {
    const target = getTargetForDate(date)
    const level = proteinLevel(grams, target)
    if (level > 0) log[date] = level
  })
  return log
}

function computeCurrentFromLog(log) {
  const today = todayStr()
  const yesterday = yesterdayStr()
  let start = null
  if (log[today] === 4) start = today
  else if (log[yesterday] === 4) start = yesterday
  else return 0

  let count = 0
  const d = new Date(`${start}T12:00:00`)
  while (true) {
    const key = toDateKey(d)
    if (log[key] === 4) count++
    else break
    d.setDate(d.getDate() - 1)
  }
  return count
}

function computeBestFromLog(log) {
  const dates = Object.keys(log)
    .filter((k) => log[k] === 4)
    .sort()
  if (!dates.length) return 0

  let best = 0
  let run = 0
  let prev = null
  dates.forEach((date) => {
    if (prev) {
      const p = new Date(`${prev}T12:00:00`)
      p.setDate(p.getDate() + 1)
      run = toDateKey(p) === date ? run + 1 : 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = date
  })
  return best
}

/**
 * Ghost streak: if lastCompletedDate is neither today nor yesterday, streak is dead.
 */
export function checkAndGetStreak() {
  const data = loadProteinStreakRaw()
  const today = todayStr()
  const yesterday = yesterdayStr()
  const last = data.lastCompletedDate

  if (!last) {
    const next = { ...data, current: 0 }
    saveProteinStreak(next)
    return next
  }

  if (last !== today && last !== yesterday) {
    const next = { ...data, current: 0 }
    saveProteinStreak(next)
    return next
  }

  return data
}

/**
 * Sync when protein intake changes. Same-day re-logs cannot bump the streak twice.
 */
export function syncProteinStreak(consumed, target) {
  let data = checkAndGetStreak()
  const today = todayStr()
  const yesterday = yesterdayStr()
  const hit = target > 0 && consumed >= target
  const level = proteinLevel(consumed, target)
  const log = { ...data.log }

  if (level === 0) delete log[today]
  else log[today] = level

  if (hit) {
    if (data.lastCompletedDate === today) {
      const next = { ...data, log: { ...log, [today]: 4 } }
      saveProteinStreak(next)
      return next
    }

    let current = 1
    if (data.lastCompletedDate === yesterday) {
      current = (data.current > 0 ? data.current : 0) + 1
    }

    const best = Math.max(data.best, current)
    const next = {
      current,
      best,
      lastCompletedDate: today,
      log: { ...log, [today]: 4 },
    }
    saveProteinStreak(next)
    return next
  }

  if (data.lastCompletedDate === today) {
    let current = 0
    let lastCompletedDate = null
    if (log[yesterday] === 4) {
      current = Math.max(0, data.current - 1)
      lastCompletedDate = yesterday
    }
    const next = { ...data, current, lastCompletedDate, log }
    saveProteinStreak(next)
    return next
  }

  const next = { ...data, log }
  saveProteinStreak(next)
  return next
}

export function getProteinStreakData() {
  const data = checkAndGetStreak()
  const mergedLog = { ...rebuildLogFromHistory(), ...data.log }
  const best = Math.max(data.best, computeBestFromLog(mergedLog))
  return {
    current: data.current,
    best,
    lastCompletedDate: data.lastCompletedDate,
    log: mergedLog,
  }
}

export function proteinStreakStats(log = {}) {
  const slice = Object.values(log)
  const goalDays = slice.filter((l) => l === 4).length
  const totalCells = slice.length
  const successRate = totalCells ? Math.round((goalDays / totalCells) * 100) : 0
  return {
    current: computeCurrentFromLog(log),
    best: computeBestFromLog(log),
    goalDays,
    successRate,
  }
}
