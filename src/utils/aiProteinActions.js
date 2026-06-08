import { getZeityColumn, patchZeityColumn } from '../lib/zeityDb'
import { getTodayKey } from './timeProvider'

export const PROTEIN_AI_EVENT = 'zeity-protein-updated'

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findFood(nameOrId, catalogue) {
  if (!nameOrId || !catalogue?.length) return null
  const q = norm(nameOrId)
  return (
    catalogue.find((f) => f.id === nameOrId) ||
    catalogue.find((f) => norm(f.name) === q) ||
    catalogue.find((f) => norm(f.name).includes(q) || q.includes(norm(f.name)))
  )
}

function getProteinState() {
  return getZeityColumn('protein') || { daily: null, history: {}, ai_bonus: null }
}

function loadLoggedIds() {
  const daily = getProteinState().daily
  if (daily?.date === getTodayKey() && Array.isArray(daily.ids)) return daily.ids
  return []
}

function saveLoggedIds(ids) {
  patchZeityColumn('protein', (p) => ({
    history: p?.history || {},
    ai_bonus: p?.ai_bonus ?? null,
    daily: { date: getTodayKey(), ids },
  }))
}

function loadBonusGrams() {
  const bonus = getProteinState().ai_bonus
  if (bonus?.date === getTodayKey()) return Math.max(0, Number(bonus.grams) || 0)
  return 0
}

function saveBonusGrams(grams) {
  patchZeityColumn('protein', (p) => ({
    history: p?.history || {},
    daily: p?.daily ?? null,
    ai_bonus: { date: getTodayKey(), grams },
  }))
}

export function loadAiProteinBonus() {
  return loadBonusGrams()
}

export function applyProteinAction(action, catalogue) {
  const items = Array.isArray(action?.items) ? action.items : []
  const foodIds = new Set(loadLoggedIds())
  let bonusGrams = 0
  const loggedNames = []

  items.forEach((item) => {
    const food = findFood(item.foodId || item.name || item.foodName, catalogue)
    const servings = Number(item.servings)
    const directGrams = Number(item.grams)

    if (food && Number.isFinite(servings) && servings > 0) {
      bonusGrams += Math.round(food.protein * servings)
      loggedNames.push(`${food.name} (${servings}× serving)`)
    } else if (food && (!Number.isFinite(servings) || servings <= 0)) {
      foodIds.add(food.id)
      loggedNames.push(food.name)
    } else if (Number.isFinite(directGrams) && directGrams > 0) {
      bonusGrams += Math.round(directGrams)
      loggedNames.push(`${directGrams}g`)
    }
  })

  if (Number.isFinite(Number(action?.addGrams)) && action.addGrams > 0) {
    bonusGrams += Math.round(action.addGrams)
  }

  ;(Array.isArray(action?.foodIds) ? action.foodIds : []).forEach((id) => {
    const food = findFood(id, catalogue)
    if (food) {
      foodIds.add(food.id)
      loggedNames.push(food.name)
    }
  })

  if (!foodIds.size && bonusGrams <= 0) {
    return { ok: false, message: null }
  }

  const today = getTodayKey()
  patchZeityColumn('protein', (p) => {
    const prevBonus =
      p?.ai_bonus?.date === today ? Math.max(0, Number(p.ai_bonus.grams) || 0) : 0
    return {
      history: p?.history || {},
      daily: { date: today, ids: [...foodIds] },
      ai_bonus:
        bonusGrams > 0
          ? { date: today, grams: prevBonus + bonusGrams }
          : (p?.ai_bonus ?? null),
    }
  })

  window.dispatchEvent(new Event(PROTEIN_AI_EVENT))

  const gramsAdded =
    bonusGrams +
    [...foodIds].reduce((sum, id) => {
      const f = catalogue.find((x) => x.id === id)
      return sum + (f?.protein || 0)
    }, 0)

  const label = loggedNames.length ? loggedNames.join(', ') : `${bonusGrams}g protein`
  return {
    ok: true,
    message: `✓ Logged protein: ${label}.`,
  }
}

export function getProteinLogState() {
  return {
    loggedIds: loadLoggedIds(),
    bonusGrams: loadBonusGrams(),
  }
}
