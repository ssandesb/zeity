import { getZeityColumn, patchZeityColumn } from '../lib/zeityDb'
import { getNow, getTodayKey } from './timeProvider'
import { toDateKey } from './journalDates'

export function loadWeightHistory() {
  return getZeityColumn('weight')?.history || []
}

export function loadCurrentWeight() {
  const w = getZeityColumn('weight')
  if (w?.current > 0) return w.current
  const hist = loadWeightHistory()
  if (hist.length) return hist[hist.length - 1].weight
  return 0
}

export function saveWeightEntry(weight) {
  if (!Number.isFinite(weight) || weight <= 0) return
  const key = getTodayKey()
  patchZeityColumn('weight', (w) => {
    const hist = (w?.history || []).filter((e) => e.date !== key)
    hist.push({ date: key, weight })
    hist.sort((a, b) => a.date.localeCompare(b.date))
    return { current: weight, history: hist }
  })
}

export function loadProteinDailyLog() {
  const daily = getZeityColumn('protein')?.daily
  if (daily?.date === getTodayKey() && Array.isArray(daily.ids)) return daily.ids
  return []
}

export function saveProteinDailyLog(ids) {
  patchZeityColumn('protein', (p) => ({
    history: p?.history || {},
    ai_bonus: p?.ai_bonus ?? null,
    daily: { date: getTodayKey(), ids },
  }))
}

export function loadProteinHistory() {
  return getZeityColumn('protein')?.history || {}
}

export function saveProteinEntry(grams) {
  const key = getTodayKey()
  patchZeityColumn('protein', (p) => ({
    daily: p?.daily ?? null,
    ai_bonus: p?.ai_bonus ?? null,
    history: { ...(p?.history || {}), [key]: grams },
  }))
}

export function last14WeightSeries(currentWeight) {
  const hist = loadWeightHistory()
  const map = Object.fromEntries(hist.map((e) => [e.date, e.weight]))
  const out = []
  const today = getNow()
  today.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toDateKey(d)
    const w = map[key]
    if (w != null) out.push(w)
    else if (i === 0 && currentWeight > 0) out.push(currentWeight)
  }
  return out
}

export function weekProteinSeries(target, todayGrams) {
  const hist = loadProteinHistory()
  const out = []
  const today = getNow()
  today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toDateKey(d)
    if (i === 0) out.push(todayGrams)
    else out.push(hist[key] ?? 0)
  }
  return out
}

export function weightTrendLabel(currentWeight) {
  const hist = loadWeightHistory()
  if (hist.length < 2) return null
  const sorted = [...hist].sort((a, b) => a.date.localeCompare(b.date))
  const twoWeeksAgo = getNow()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const cutoff = toDateKey(twoWeeksAgo)
  const old = sorted.find((e) => e.date >= cutoff)
  const latest = sorted[sorted.length - 1]?.weight ?? currentWeight
  if (!old) return null
  const delta = +(latest - old.weight).toFixed(1)
  if (delta === 0) return 'No change / 2w'
  return `${delta > 0 ? '+' : ''}${delta} kg / 2w`
}
