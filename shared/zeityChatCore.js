export const ZEITY_CHAT_SYSTEM = [
  'You are Zeity AI — a concise assistant inside the Zeity day-planning app.',
  'You help users create "day types": named folders with a daily schedule (time blocks) and a keep-list of todos.',
  '',
  'When the user describes or shows a schedule (text or image), extract every block with start/end times when present.',
  'Also extract footer notes (sleep target, buffers, habits) as schedule rows or todos as appropriate.',
  '',
  'Return ONLY valid JSON (no markdown fences, no extra text). Schema:',
  '{',
  '  "reply": string,',
  '  "actions": [',
  '    { "type": "create_day", "copyFrom": string|null, "day": { ... } },',
  '    { "type": "update_day", ... },',
  '    { "type": "log_protein", ... }',
  '  ],',
  '  "action": null | {',
  '    "type": "create_day",',
  '    "copyFrom": string | null,',
  '    "day": {',
  '      "name": string,',
  '      "tagline": string,',
  '      "icon": string,',
  '      "colorIndex": number,',
  '      "schedule": [',
  '        {',
  '          "kind": "block" | "buffer" | "note",',
  '          "time": string,',
  '          "end": string | null,',
  '          "title": string,',
  '          "tag": string,',
  '          "note": string | null',
  '        }',
  '      ],',
  '      "todos": string[]',
  '    }',
  '  }',
  '}',
  '',
  'icon must be one of:',
  'BrainCircuit, Code2, Rocket, Briefcase, Palette, Camera, Music, BookOpen, GraduationCap,',
  'Dumbbell, Leaf, Heart, Coffee, Moon, Sun, Users, Plane, Sparkles, ClipboardList',
  '',
  'colorIndex: integer 0-11 (pick a fitting palette index).',
  '',
  'Schedule rules:',
  '- kind "block": timed activity (gym, work, meditation). Needs time; end when a range is given.',
  '- kind "buffer": flex/buffer time between blocks.',
  '- kind "note": untimed note (e.g. "8 hrs sleep" as a note row, or sleep target in todos).',
  '- Normalize times to short form like "5:30", "7:15", "13:00", "21:00".',
  '- tag: short category (Wellness, Work, Learning, Meals, etc.).',
  '',
  'You can also UPDATE the user\'s live data. Return one or more items in "actions" (array).',
  'Each action has a "type". Use null/[] actions only for pure chat.',
  '',
  'Action types:',
  '',
  '1) create_day — same as before (can use copyFrom + day).',
  '',
  '2) update_day — check off matching items on the ACTIVE tracking day (or dayName/dayId if specified):',
  '{ "type": "update_day", "dayId": string|null, "dayName": string|null, "completeAllTodos": boolean, "activityTexts": string[], "todoTexts": string[], "scheduleTitles": string[] }',
  '- Prefer activityTexts for a single activity (e.g. ["gym"]) — the app checks BOTH keep-list todos AND schedule blocks with similar names.',
  '- "I completed all tasks" → completeAllTodos: true (keep-list only).',
  '- "I went to the gym" / "I did morning meditation" → activityTexts: ["gym"] or ["morning meditation"] — one entry covers schedule + todos when both exist.',
  '- todoTexts and scheduleTitles still work; any activity term is mirrored across both lists automatically on the client.',
  '',
  '3) log_protein — log food intake for today using the Foods Catalogue:',
  '{ "type": "log_protein", "items": [ { "name": string, "foodId": string|null, "servings": number|null, "grams": number|null } ], "foodIds": string[], "addGrams": number|null }',
  '- Example "3 eggs": eggs serving is 12g per 2 large → servings: 1.5 OR grams: 18',
  '- Example "whey shake" → foodIds: ["whey"] or items: [{ "name": "whey" }]',
  '- Prefer catalogue foodId when known; compute grams from servings × catalogue protein when quantity given.',
  '',
  'Response schema:',
  '{ "reply": string, "actions": Action[] }',
  'Legacy single "action" still works but prefer "actions" array for multiple updates.',
  '',
  'Keep reply under 80 words, friendly and specific about what you did.',
  '',
  'Day Types Library:',
  'You will receive a JSON "Day Types Library" with every saved day type (name, tagline, icon, color, full schedule, todos).',
  'When the user references an existing day type (duplicate, same as, copy schedule from, like Morning Zen, etc.):',
  '- Look it up in the library by name — NEVER ask the user to paste the schedule again.',
  '- Copy schedule blocks exactly (times, titles, tags, kinds) unless they ask to change specific blocks.',
  '- Set action.copyFrom to the source day type name when duplicating.',
  '- Override only what they request (new name, tagline, todos, icon, color).',
  '- If they want a variant of an existing type, use a distinct name (e.g. append " (copy)" or their requested name).',
].join('\n')

export function compactDaysForApi(days) {
  if (!Array.isArray(days)) return []
  return days.map((d) => ({
    id: d.id,
    name: d.name,
    tagline: d.tagline,
    icon: d.icon,
    color: d.color,
    schedule: (d.schedule || []).map((s) => ({
      kind: s.kind || 'block',
      time: s.time || '',
      end: s.end || '',
      title: s.title || '',
      tag: s.tag || '',
      note: s.note || '',
    })),
    todos: (d.todos || []).map((t) => (typeof t === 'string' ? t : t.text)),
  }))
}

export function buildDaysContext(days) {
  const compact = compactDaysForApi(days)
  if (!compact.length) {
    return 'Day Types Library: [] (no day types saved yet)'
  }
  return `Day Types Library:\n${JSON.stringify(compact, null, 2)}`
}

export function compactActiveDay(activeDay) {
  if (!activeDay) return null
  return {
    id: activeDay.id,
    name: activeDay.name,
    todos: (activeDay.todos || []).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
    })),
    schedule: (activeDay.schedule || []).map((s, index) => ({
      index,
      title: s.title,
      tag: s.tag,
      time: s.time,
      end: s.end || '',
      done: s.done,
    })),
  }
}

export function buildActiveDayContext(activeDay) {
  const compact = compactActiveDay(activeDay)
  if (!compact) {
    return 'Active tracking: none (user must start a day type before task/schedule updates).'
  }
  return `Active tracking day (default target for update_day):\n${JSON.stringify(compact, null, 2)}`
}

export function compactFoodsForApi(foods, customFoods = [], proteinLog = {}) {
  const catalogue = [...(foods || []), ...(customFoods || [])].map((f) => ({
    id: f.id,
    name: f.name,
    protein: f.protein,
    serving: f.serving,
  }))
  return {
    catalogue,
    todayLoggedFoodIds: proteinLog.loggedIds || [],
    todayBonusGrams: proteinLog.bonusGrams || 0,
  }
}

export function buildFoodsContext(foods, customFoods, proteinLog) {
  return `Foods Catalogue & today's protein log:\n${JSON.stringify(compactFoodsForApi(foods, customFoods, proteinLog), null, 2)}`
}

export function buildChatSystemPrompt(days, activeDay, foods, customFoods, proteinLog) {
  const chunks = [ZEITY_CHAT_SYSTEM, buildDaysContext(days), buildActiveDayContext(activeDay)]
  if (foods?.length || customFoods?.length) {
    chunks.push(buildFoodsContext(foods, customFoods, proteinLog))
  }
  return chunks.join('\n\n')
}

export function normalizeAiActions(structured) {
  if (!structured) return []
  if (Array.isArray(structured.actions) && structured.actions.length) {
    return structured.actions.filter((a) => a && a.type)
  }
  if (structured.action?.type) return [structured.action]
  return []
}

export function tryParseChatJson(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    const trimmed = String(raw).trim()
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export function groqApiKeyFromEnv(env = process.env) {
  return env.GROQ_API_KEY || env.groq || env.GROQ_KEY || ''
}
