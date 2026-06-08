import { getTodayKey } from './timeProvider'

const KEY = 'zeity-protein-test-grams'

export function loadTestGrams() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw?.date === getTodayKey()) return Math.max(0, Number(raw.grams) || 0)
  } catch {
    /* ignore */
  }
  return 0
}

export function saveTestGrams(grams) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ date: getTodayKey(), grams: Math.max(0, Math.round(grams)) }),
  )
}

export function addTestGrams(amount) {
  const next = loadTestGrams() + Math.max(0, Math.round(Number(amount) || 0))
  saveTestGrams(next)
  return next
}
