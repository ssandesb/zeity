import { getZeityColumn, updateZeityColumn } from '../lib/zeityDb'

export function loadCustomFoods() {
  const list = getZeityColumn('custom_foods')
  return Array.isArray(list) ? list : []
}

export function saveCustomFoods(list) {
  updateZeityColumn('custom_foods', list)
}

export function createCustomFood({ name, serving, protein }) {
  const trimmed = String(name || '').trim()
  const proteinNum = Math.round(Number(protein))
  if (!trimmed || !Number.isFinite(proteinNum) || proteinNum <= 0) return null

  return {
    id: `custom-${Date.now().toString(36)}`,
    name: trimmed,
    emoji: '🍽️',
    protein: proteinNum,
    serving: String(serving || '').trim() || 'custom',
    custom: true,
  }
}
