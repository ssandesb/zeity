import { useCallback, useMemo, useState } from 'react'
import {
  Languages,
  ChevronDown,
  Sparkles,
  Loader2,
  BookOpen,
  Layers,
  HelpCircle,
  Check,
  X,
  RotateCcw,
  Star,
} from 'lucide-react'
import topicsData from '../../data/deutschB1Topics.json'
import { fetchDeutschContent } from '../utils/deutschApi'

const PROGRESS_KEY = 'zeity-deutsch-progress'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

function Collapsible({ title, icon: Icon, open, onToggle, children, badge }) {
  return (
    <div className={`deu-collapse ${open ? 'open' : ''}`}>
      <button type="button" className="deu-collapse-head" onClick={onToggle} aria-expanded={open}>
        {Icon && <Icon size={18} strokeWidth={2.2} />}
        <span className="deu-collapse-title">{title}</span>
        {badge != null && <span className="deu-collapse-badge">{badge}</span>}
        <ChevronDown size={18} className="deu-collapse-chevron" />
      </button>
      {open && <div className="deu-collapse-body">{children}</div>}
    </div>
  )
}

function FlashcardDeck({ cards, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = cards[idx]

  if (!card) return null

  const next = (knew) => {
    onComplete?.(knew)
    setFlipped(false)
    if (idx < cards.length - 1) setIdx(idx + 1)
    else setIdx(0)
  }

  return (
    <div className="deu-flash">
      <div className="deu-flash-meta">
        Card {idx + 1} / {cards.length}
      </div>
      <button
        type="button"
        className={`deu-flash-card ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}
      >
        <div className="deu-flash-front">
          <span>{card.front}</span>
          {card.hint && <small>{card.hint}</small>}
        </div>
        <div className="deu-flash-back">
          <span>{card.back}</span>
        </div>
      </button>
      {flipped && (
        <div className="deu-flash-actions">
          <button type="button" className="deu-btn deu-btn--miss" onClick={() => next(false)}>
            <X size={16} /> Still learning
          </button>
          <button type="button" className="deu-btn deu-btn--hit" onClick={() => next(true)}>
            <Check size={16} /> Got it
          </button>
        </div>
      )}
    </div>
  )
}

function QuizPanel({ questions, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const q = questions[idx]

  if (!q) return null

  const submit = (i) => {
    if (picked != null) return
    setPicked(i)
    const correct = i === q.correctIndex
    if (correct) setScore((s) => s + 1)
    setTimeout(() => {
      const finalScore = score + (correct ? 1 : 0)
      if (idx < questions.length - 1) {
        setIdx(idx + 1)
        setPicked(null)
      } else {
        onComplete?.(finalScore, questions.length)
      }
    }, 1200)
  }

  return (
    <div className="deu-quiz">
      <div className="deu-quiz-meta">
        Question {idx + 1} / {questions.length}
      </div>
      <p className="deu-quiz-q">{q.question}</p>
      <div className="deu-quiz-options">
        {q.options.map((opt, i) => {
          let cls = 'deu-quiz-opt'
          if (picked != null) {
            if (i === q.correctIndex) cls += ' correct'
            else if (i === picked) cls += ' wrong'
          }
          return (
            <button key={opt} type="button" className={cls} onClick={() => submit(i)} disabled={picked != null}>
              {opt}
            </button>
          )
        })}
      </div>
      {picked != null && <p className="deu-quiz-expl">{q.explanation}</p>}
    </div>
  )
}

function LessonView({ lesson }) {
  return (
    <div className="deu-lesson">
      <p className="deu-lesson-summary">{lesson.summary}</p>
      {lesson.sections.map((s) => (
        <div key={s.heading} className="deu-lesson-section">
          <h4>{s.heading}</h4>
          <p>{s.body}</p>
          {s.example && <blockquote className="deu-example">{s.example}</blockquote>}
        </div>
      ))}
      {lesson.tip && (
        <p className="deu-lesson-tip">
          <Star size={14} /> {lesson.tip}
        </p>
      )}
    </div>
  )
}

function TopicPractice({ topic, categoryName, progress, onProgress }) {
  const [mode, setMode] = useState(null)
  const [content, setContent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [aiOpen, setAiOpen] = useState(false)

  const runAi = async (selectedMode) => {
    setMode(selectedMode)
    setBusy(true)
    setError('')
    setContent(null)
    try {
      const result = await fetchDeutschContent(selectedMode, topic, categoryName)
      setContent(result)
      setAiOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI failed')
    } finally {
      setBusy(false)
    }
  }

  const markDone = useCallback(() => {
    const next = { ...progress, [topic.id]: { ...(progress[topic.id] || {}), practiced: true, at: Date.now() } }
    onProgress(next)
  }, [progress, topic.id, onProgress])

  const topicProgress = progress[topic.id]

  return (
    <div className="deu-topic">
      <div className="deu-topic-head">
        <div className={`deu-topic-dot ${topicProgress?.practiced ? 'done' : ''}`} />
        <div className="deu-topic-info">
          <h4>{topic.title}</h4>
          <p>{topic.details}</p>
        </div>
      </div>

      <Collapsible
        title="Practice with AI"
        icon={Sparkles}
        open={aiOpen}
        onToggle={() => setAiOpen(!aiOpen)}
      >
        <div className="deu-ai-modes">
          <button type="button" className="deu-mode-btn" onClick={() => runAi('lesson')} disabled={busy}>
            <BookOpen size={16} /> Lesson
          </button>
          <button type="button" className="deu-mode-btn" onClick={() => runAi('flashcards')} disabled={busy}>
            <Layers size={16} /> Flashcards
          </button>
          <button type="button" className="deu-mode-btn" onClick={() => runAi('quiz')} disabled={busy}>
            <HelpCircle size={16} /> Quiz
          </button>
        </div>

        {busy && (
          <div className="deu-loading">
            <Loader2 size={20} className="spin" /> Generating…
          </div>
        )}
        {error && <p className="deu-error">{error}</p>}

        {content && mode === 'lesson' && <LessonView lesson={content} />}
        {content && mode === 'flashcards' && (
          <FlashcardDeck cards={content.cards} onComplete={() => markDone()} />
        )}
        {content && mode === 'quiz' && (
          <QuizPanel
            questions={content.questions}
            onComplete={(s, total) => {
              if (s >= total * 0.6) markDone()
            }}
          />
        )}

        {content && (
          <button type="button" className="deu-btn deu-btn--ghost" onClick={() => runAi(mode)} disabled={busy}>
            <RotateCcw size={14} /> Regenerate
          </button>
        )}
      </Collapsible>
    </div>
  )
}

export default function DeutschPage() {
  const [progress, setProgress] = useState(loadProgress)
  const [openCats, setOpenCats] = useState(() => ({ [topicsData.categories[0]?.id]: true }))
  const [overviewOpen, setOverviewOpen] = useState(true)

  const stats = useMemo(() => {
    const all = topicsData.categories.flatMap((c) => c.topics)
    const done = all.filter((t) => progress[t.id]?.practiced).length
    return { total: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0 }
  }, [progress])

  const updateProgress = (next) => {
    setProgress(next)
    saveProgress(next)
  }

  const toggleCat = (id) => setOpenCats((o) => ({ ...o, [id]: !o[id] }))

  return (
    <div className="day-view deu-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Deutsch</h1>
          <p className="page-sub">B1 grammar from your Google Sheet — practice with AI lessons, cards & quizzes.</p>
        </div>
      </div>

      <Collapsible
        title="Your progress"
        icon={Languages}
        open={overviewOpen}
        onToggle={() => setOverviewOpen(!overviewOpen)}
        badge={`${stats.done}/${stats.total}`}
      >
        <div className="deu-progress-bar">
          <div className="deu-progress-fill" style={{ width: `${stats.pct}%` }} />
        </div>
        <p className="deu-progress-label">{stats.pct}% topics practiced · {stats.total} from Grammatikthemen B1</p>
      </Collapsible>

      <div className="deu-path">
        {topicsData.categories.map((cat, ci) => {
          const catDone = cat.topics.filter((t) => progress[t.id]?.practiced).length
          return (
            <Collapsible
              key={cat.id}
              title={`${cat.emoji} ${cat.name}`}
              open={!!openCats[cat.id]}
              onToggle={() => toggleCat(cat.id)}
              badge={`${catDone}/${cat.topics.length}`}
            >
              <div className="deu-topics">
                {cat.topics.map((topic, ti) => (
                  <div key={topic.id} className="deu-topic-wrap" style={{ '--deu-i': ci * 10 + ti }}>
                    <TopicPractice
                      topic={topic}
                      categoryName={cat.name}
                      progress={progress}
                      onProgress={updateProgress}
                    />
                  </div>
                ))}
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
