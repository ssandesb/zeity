export const DEUTSCH_MODES = ['lesson', 'flashcards', 'quiz']

export const DEUTSCH_LEARN_SYSTEM = [
  'You are Zeity Deutsch — a B1 German grammar tutor.',
  'Return ONLY valid JSON (no markdown fences).',
  '',
  'Modes:',
  '- lesson: short explainer with examples',
  '- flashcards: vocabulary/grammar cards',
  '- quiz: multiple-choice questions',
  '',
  'Schema by mode:',
  'lesson: { "title": string, "summary": string, "sections": [{ "heading": string, "body": string, "example": string }], "tip": string }',
  'flashcards: { "cards": [{ "front": string, "back": string, "hint": string|null }] }',
  'quiz: { "questions": [{ "question": string, "options": [string,string,string,string], "correctIndex": 0-3, "explanation": string }] }',
  '',
  'Rules:',
  '- B1 level German, explanations can use simple English where helpful',
  '- Stay focused on the given grammar topic only',
  '- flashcards: 5-8 cards, front in German, back concise',
  '- quiz: 4-5 questions, plausible distractors, one correct answer each',
  '- lesson: 2-4 sections, one clear example per section',
].join('\n')

export function tryParseDeutschJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export function normalizeDeutschContent(parsed, mode) {
  if (!parsed || typeof parsed !== 'object') return null

  if (mode === 'lesson') {
    const sections = (Array.isArray(parsed.sections) ? parsed.sections : [])
      .filter((s) => s?.heading)
      .map((s) => ({
        heading: String(s.heading).slice(0, 80),
        body: String(s.body || '').slice(0, 500),
        example: String(s.example || '').slice(0, 200),
      }))
    if (!sections.length) return null
    return {
      title: String(parsed.title || 'Lesson').slice(0, 80),
      summary: String(parsed.summary || '').slice(0, 300),
      sections,
      tip: String(parsed.tip || '').slice(0, 200),
    }
  }

  if (mode === 'flashcards') {
    const cards = (Array.isArray(parsed.cards) ? parsed.cards : [])
      .filter((c) => c?.front && c?.back)
      .map((c) => ({
        front: String(c.front).slice(0, 120),
        back: String(c.back).slice(0, 200),
        hint: c.hint ? String(c.hint).slice(0, 100) : null,
      }))
    if (!cards.length) return null
    return { cards }
  }

  if (mode === 'quiz') {
    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .filter((q) => q?.question && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => {
        const options = q.options.slice(0, 4).map((o) => String(o).slice(0, 120))
        let correctIndex = Number(q.correctIndex)
        if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
          correctIndex = 0
        }
        return {
          question: String(q.question).slice(0, 200),
          options,
          correctIndex,
          explanation: String(q.explanation || '').slice(0, 300),
        }
      })
    if (!questions.length) return null
    return { questions }
  }

  return null
}

export function buildDeutschUserPrompt(mode, topic, categoryName) {
  const count = mode === 'flashcards' ? 6 : mode === 'quiz' ? 5 : 1
  return [
    `Mode: ${mode}`,
    `Category: ${categoryName}`,
    `Topic: ${topic.title}`,
    `Details: ${topic.details}`,
    mode === 'flashcards' ? `Generate ${count} flashcards.` : '',
    mode === 'quiz' ? `Generate ${count} multiple-choice questions.` : '',
    mode === 'lesson' ? 'Generate a concise B1 lesson.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}
