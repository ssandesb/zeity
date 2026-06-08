import { supabase } from './supabaseClient'

export const ZEITY_DB_TABLE = 'zeity_db'
export const ZEITY_DB_ROW_ID = 1
export const ZEITY_MIGRATED_FLAG = 'zeity-migrated-v1'
export const ZEITY_DB_EVENT = 'zeity-db-updated'

const LS = {
  days: 'zeity-days-v2',
  active: 'zeity-active',
  day_log: 'zeity-day-log',
  weight: 'zeity-weight',
  weight_history: 'zeity-weight-history',
  protein: 'zeity-protein',
  protein_history: 'zeity-protein-history',
  protein_bonus: 'zeity-protein-ai-bonus',
  protein_streak: 'zeity-protein-streak',
  custom_foods: 'zeity-custom-foods',
  ai_chat: 'zeity-ai-chat',
}

export const DEFAULT_PROTEIN_STREAK = {
  current: 0,
  best: 0,
  lastCompletedDate: null,
  log: {},
}

export const DEFAULT_ROW = {
  days: [],
  active: null,
  day_log: {},
  weight: { current: null, history: [] },
  protein: { daily: null, history: {}, ai_bonus: null },
  protein_streak: { ...DEFAULT_PROTEIN_STREAK },
  custom_foods: [],
  ai_chat: [],
  updated_at: null,
}

let cache = null
let hydratePromise = null
let localWriteEpoch = 0
let writeChain = Promise.resolve()
const listeners = new Set()

function notifyListeners() {
  window.dispatchEvent(new Event(ZEITY_DB_EVENT))
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('zeityDb listener error:', e)
    }
  })
}

export function subscribeZeityDb(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function markLocalWrite() {
  localWriteEpoch = Date.now()
}

export function shouldIgnoreRemoteEvent() {
  return Date.now() - localWriteEpoch < 800
}

function readLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw != null) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return fallback
}

function hasLocalStorageData() {
  return Object.values(LS).some((key) => localStorage.getItem(key) != null)
}

export function buildRowFromLocalStorage() {
  const weightHist = readLs(LS.weight_history, [])
  let current = parseFloat(localStorage.getItem(LS.weight))
  if (!Number.isFinite(current) || current <= 0) {
    current = weightHist.length ? weightHist[weightHist.length - 1].weight : null
  } else {
    current = current > 0 ? current : null
  }

  const streakRaw = readLs(LS.protein_streak, {})
  return {
    days: readLs(LS.days, []),
    active: readLs(LS.active, null),
    day_log: readLs(LS.day_log, {}),
    weight: { current, history: Array.isArray(weightHist) ? weightHist : [] },
    protein: {
      daily: readLs(LS.protein, null),
      history: readLs(LS.protein_history, {}),
      ai_bonus: readLs(LS.protein_bonus, null),
    },
    protein_streak: {
      ...DEFAULT_PROTEIN_STREAK,
      ...streakRaw,
      log:
        streakRaw?.log && typeof streakRaw.log === 'object' ? streakRaw.log : {},
    },
    custom_foods: readLs(LS.custom_foods, []),
    ai_chat: readLs(LS.ai_chat, []),
    updated_at: null,
  }
}

function normalizeRow(row) {
  if (!row) return { ...DEFAULT_ROW }
  const streak = row.protein_streak || {}
  return {
    days: Array.isArray(row.days) ? row.days : [],
    active: row.active ?? null,
    day_log: row.day_log && typeof row.day_log === 'object' ? row.day_log : {},
    weight: {
      current: row.weight?.current ?? null,
      history: Array.isArray(row.weight?.history) ? row.weight.history : [],
    },
    protein: {
      daily: row.protein?.daily ?? null,
      history:
        row.protein?.history && typeof row.protein.history === 'object'
          ? row.protein.history
          : {},
      ai_bonus: row.protein?.ai_bonus ?? null,
    },
    protein_streak: {
      ...DEFAULT_PROTEIN_STREAK,
      ...streak,
      log: streak.log && typeof streak.log === 'object' ? streak.log : {},
    },
    custom_foods: Array.isArray(row.custom_foods) ? row.custom_foods : [],
    ai_chat: Array.isArray(row.ai_chat) ? row.ai_chat : [],
    updated_at: row.updated_at ?? null,
  }
}

function ensureCache() {
  if (!cache) {
    cache = normalizeRow(buildRowFromLocalStorage())
  }
  return cache
}

export function getZeityColumn(column) {
  return ensureCache()[column]
}

export function getZeityRow() {
  return { ...ensureCache() }
}

export function setZeityCache(row) {
  cache = normalizeRow(row)
  notifyListeners()
}

export async function fetchZeityDb({ force = false } = {}) {
  if (!force && cache) return cache

  if (!supabase) {
    cache = normalizeRow(buildRowFromLocalStorage())
    return cache
  }

  try {
    const { data, error } = await supabase
      .from(ZEITY_DB_TABLE)
      .select('*')
      .eq('id', ZEITY_DB_ROW_ID)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const seeded = normalizeRow(DEFAULT_ROW)
      const { error: insertError } = await supabase.from(ZEITY_DB_TABLE).insert({
        id: ZEITY_DB_ROW_ID,
        ...seeded,
      })
      if (insertError) throw insertError
      cache = seeded
      return cache
    }

    cache = normalizeRow(data)
    return cache
  } catch (e) {
    console.error('fetchZeityDb error:', e)
    cache = normalizeRow(buildRowFromLocalStorage())
    return cache
  }
}

async function upsertFullRow(row) {
  const payload = {
    id: ZEITY_DB_ROW_ID,
    days: row.days,
    active: row.active,
    day_log: row.day_log,
    weight: row.weight,
    protein: row.protein,
    protein_streak: row.protein_streak,
    custom_foods: row.custom_foods,
    ai_chat: row.ai_chat,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from(ZEITY_DB_TABLE).upsert(payload, { onConflict: 'id' })
  if (error) throw error
  cache = normalizeRow({ ...row, updated_at: payload.updated_at })
}

export async function importLocalStorageIfNeeded() {
  if (!supabase) {
    cache = normalizeRow(buildRowFromLocalStorage())
    return cache
  }

  if (localStorage.getItem(ZEITY_MIGRATED_FLAG)) {
    return fetchZeityDb({ force: true })
  }

  if (!hasLocalStorageData()) {
    const row = await fetchZeityDb({ force: true })
    localStorage.setItem(ZEITY_MIGRATED_FLAG, '1')
    return row
  }

  const imported = normalizeRow(buildRowFromLocalStorage())
  try {
    await upsertFullRow(imported)
    localStorage.setItem(ZEITY_MIGRATED_FLAG, '1')
    notifyListeners()
    return cache
  } catch (e) {
    console.error('importLocalStorageIfNeeded error:', e)
    cache = imported
    return cache
  }
}

export async function hydrateZeityDb() {
  if (!hydratePromise) {
    hydratePromise = importLocalStorageIfNeeded()
  }
  return hydratePromise
}

export async function updateZeityColumn(column, value) {
  const row = ensureCache()
  const updatedAt = new Date().toISOString()
  cache = { ...row, [column]: value, updated_at: updatedAt }
  notifyListeners()

  if (!supabase) return { ok: true }

  markLocalWrite()
  try {
    const { error } = await supabase
      .from(ZEITY_DB_TABLE)
      .update({ [column]: value, updated_at: updatedAt })
      .eq('id', ZEITY_DB_ROW_ID)

    if (error) throw error
    return { ok: true }
  } catch (e) {
    console.error(`updateZeityColumn(${column}) error:`, e)
    return { ok: false, error: e }
  }
}

export function patchZeityColumn(column, fn) {
  writeChain = writeChain
    .then(async () => {
      const current = getZeityColumn(column)
      const next = fn(current)
      return updateZeityColumn(column, next)
    })
    .catch((e) => {
      console.error(`patchZeityColumn(${column}) error:`, e)
    })
  return writeChain
}

export function invalidateZeityCache() {
  cache = null
  hydratePromise = null
}
