import { buildDayFromAiAction } from './aiDayParser'
import { applyDayUpdate, resolveDayId, summarizeDayUpdate } from './aiDayActions'
import { applyProteinAction } from './aiProteinActions'
import { guessCopyFromFromText } from './dayAiContext'
import { loadCustomFoods } from './customFoods'
import { foods } from '../data'
import { normalizeAiActions } from '../../shared/zeityChatCore.js'

export { normalizeAiActions }

export function runAiActions(actions, ctx) {
  const notes = []
  let createDay = null

  for (const action of actions) {
    if (action.type === 'create_day') {
      let patched = action
      if (
        !patched.copyFrom &&
        (!patched.day?.schedule || patched.day.schedule.length === 0)
      ) {
        const guessed = guessCopyFromFromText(ctx.lastUserMessage || '', ctx.days)
        if (guessed) patched = { ...patched, copyFrom: guessed }
      }
      const day = buildDayFromAiAction(patched, ctx.days)
      if (day) {
        ctx.onCreateDay?.(day)
        createDay = day
        notes.push(
          `✓ Created “${day.name}” with ${day.schedule.length} schedule block${day.schedule.length === 1 ? '' : 's'} and ${day.todos.length} todo${day.todos.length === 1 ? '' : 's'}.`,
        )
      }
      continue
    }

    if (action.type === 'update_day') {
      const dayId = resolveDayId(action, ctx.days, ctx.activeDay)
      if (!dayId) {
        notes.push('Could not update — start tracking a day type first.')
        continue
      }
      const current = ctx.days.find((d) => d.id === dayId)
      if (!current) continue
      const result = applyDayUpdate(current, action)
      ctx.onUpdateDay?.(dayId, () => result.day)
      const summary = summarizeDayUpdate(action, result)
      if (summary) notes.push(summary)
      else notes.push('No matching todos or schedule blocks to check off.')
      continue
    }

    if (action.type === 'log_protein') {
      const catalogue = [...foods, ...loadCustomFoods()]
      const result = applyProteinAction(action, catalogue)
      if (result.ok && result.message) notes.push(result.message)
      else notes.push('Could not log protein — try naming a food from the catalogue.')
    }
  }

  return { notes, createDay }
}
