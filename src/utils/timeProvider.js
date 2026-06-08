import { toDateKey } from './journalDates'

const STORAGE_KEY = 'zeity-mock-time'

const listeners = new Set()

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabled: Boolean(parsed.enabled),
        dayOffset: Number.isFinite(parsed.dayOffset) ? parsed.dayOffset : 0,
      }
    }
  } catch {
    /* ignore */
  }
  return { enabled: false, dayOffset: 0 }
}

let state = loadState()

function notify() {
  listeners.forEach((fn) => fn())
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  notify()
}

export function isMockTimeEnabled() {
  return state.enabled
}

export function setMockTimeEnabled(enabled) {
  state = { ...state, enabled: Boolean(enabled) }
  if (!enabled) state.dayOffset = 0
  saveState()
}

export function getDayOffset() {
  return state.enabled ? state.dayOffset : 0
}

/** App "now" — real clock, or shifted when mock time is on. */
export function getNow() {
  const d = new Date()
  if (state.enabled) {
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + state.dayOffset)
  }
  return d
}

export function getTodayKey() {
  return toDateKey(getNow())
}

export function fastForwardOneDay() {
  if (!state.enabled) return
  state = { ...state, dayOffset: state.dayOffset + 1 }
  saveState()
}

export function resetMockDayOffset() {
  state = { ...state, dayOffset: 0 }
  saveState()
}

export function subscribeTime(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
