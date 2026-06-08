import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Moon, Sun, MapPin, ChevronLeft, ChevronRight, Loader2, Check, ListChecks } from 'lucide-react'
import { fetchNoteRows, hasNotesBefore, saveNoteText } from '../utils/notesStorage'
import {
  extractImageFilenames,
  noteHasContent,
  reconstructNoteText,
  stripImageMarkers,
} from '../utils/noteImages'
import { isSupabaseConfigured, NOTE_IMG_BASE } from '../lib/supabaseClient'
import {
  DAY_NAMES,
  MONTH_NAMES,
  WEEK_LABELS,
  formatWeekLabel,
  getWeekDays,
  startOfWeekMonday,
  toDateKey,
} from '../utils/journalDates'
import { replacePageText, splitIntoPages } from '../utils/journalPages'

const BOOK_THEME_KEY = 'zeity-journal-book-theme'

function localPrefsKey(dateKey) {
  return `zeity-journal-prefs-${dateKey}`
}

function loadBookDark() {
  const saved = localStorage.getItem(BOOK_THEME_KEY)
  if (saved === null) return true
  return saved === 'dark'
}

function loadLocalPrefs(dateKey) {
  try {
    const raw = localStorage.getItem(localPrefsKey(dateKey))
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { location: '' }
}

function useDebounce(fn, delay) {
  const timerRef = useRef(null)
  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fn(...args), delay)
    },
    [fn, delay],
  )
}

function useMobileJournal() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

function JournalTasks({ activeDay, isToday, onToggleTodo }) {
  if (!activeDay) {
    return (
      <p className="jp-tasks-empty">
        Start tracking a day type from Home to see today&apos;s keep list here.
      </p>
    )
  }

  if (!isToday) {
    return (
      <p className="jp-tasks-empty">
        Viewing {activeDay.name} tasks on today&apos;s date — pick today in the week strip.
      </p>
    )
  }

  if (!activeDay.todos.length) {
    return <p className="jp-tasks-empty">No tasks in {activeDay.name} yet.</p>
  }

  const done = activeDay.todos.filter((t) => t.done).length

  return (
    <>
      <div className="jp-tasks-head">
        <ListChecks size={15} strokeWidth={2.2} />
        <span>
          {activeDay.name} · {done}/{activeDay.todos.length}
        </span>
      </div>
      <ul className="jp-tasks">
        {activeDay.todos.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={`jp-task ${t.done ? 'done' : ''}`}
              onClick={() => onToggleTodo?.(activeDay.id, t.id)}
            >
              <span className="jp-task-box">{t.done ? <Check size={10} strokeWidth={3} /> : null}</span>
              <span className="jp-task-text">{t.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function JournalBook({ activeDay = null, onToggleTodo }) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayKey = toDateKey(today)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today))
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [notesData, setNotesData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageTurn, setPageTurn] = useState(null)
  const [canGoPrevWeek, setCanGoPrevWeek] = useState(false)
  const [imageIdx, setImageIdx] = useState(0)
  const [bookDark, setBookDark] = useState(loadBookDark)
  const [prefs, setPrefs] = useState(() => loadLocalPrefs(todayKey))
  const [leftPane, setLeftPane] = useState('photos')
  const isMobile = useMobileJournal()

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekStartKey = toDateKey(weekStart)
  const isCurrentWeek = weekStartKey === toDateKey(startOfWeekMonday(today))

  const selectedDate =
    weekDays.find((d) => toDateKey(d) === selectedKey) ??
    weekDays.find((d) => toDateKey(d) === todayKey) ??
    weekDays[0]

  const selectedDateKey = toDateKey(selectedDate)
  const rawText = notesData[selectedDateKey]?.note_text ?? ''
  const imageFilenames = useMemo(() => extractImageFilenames(rawText), [rawText])
  const displayText = useMemo(() => stripImageMarkers(rawText), [rawText])
  const hasImages = imageFilenames.length > 0
  const pages = useMemo(() => splitIntoPages(displayText), [displayText])
  const pageCount = pages.length
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1))
  const pageText = pages[safePageIndex] ?? ''

  const weekStrip = useMemo(
    () =>
      weekDays.map((d, i) => ({
        lbl: WEEK_LABELS[i],
        num: d.getDate(),
        key: toDateKey(d),
        today: toDateKey(d) === todayKey,
        selected: toDateKey(d) === selectedDateKey,
        hasNote: noteHasContent(notesData[toDateKey(d)]?.note_text || ''),
      })),
    [weekDays, todayKey, selectedDateKey, notesData],
  )

  useEffect(() => {
    let cancelled = false
    async function loadWeek() {
      setLoading(true)
      const keys = weekDays.map((d) => toDateKey(d))
      const [rows, earlier] = await Promise.all([
        fetchNoteRows(keys),
        hasNotesBefore(weekStartKey),
      ])
      if (!cancelled) {
        setNotesData(rows)
        setCanGoPrevWeek(earlier)
        setLoading(false)
      }
    }
    loadWeek()
    return () => {
      cancelled = true
    }
  }, [weekStart, weekDays, weekStartKey])

  useEffect(() => {
    setPageIndex(0)
    setImageIdx(0)
    setPrefs(loadLocalPrefs(selectedDateKey))
  }, [selectedDateKey])

  useEffect(() => {
    if (!hasImages) setLeftPane('tasks')
  }, [hasImages])

  const isSelectedToday = selectedDateKey === todayKey
  const showPhoto = hasImages && leftPane === 'photos'
  const showTasks = !hasImages || leftPane === 'tasks'
  const showViewToggle = hasImages

  useEffect(() => {
    setImageIdx(0)
  }, [imageFilenames.join('|')])

  useEffect(() => {
    localStorage.setItem(localPrefsKey(selectedDateKey), JSON.stringify(prefs))
  }, [prefs, selectedDateKey])

  useEffect(() => {
    localStorage.setItem(BOOK_THEME_KEY, bookDark ? 'dark' : 'light')
  }, [bookDark])

  const debouncedSave = useDebounce(async (dateKey, text) => {
    setSaving(true)
    await saveNoteText(dateKey, text)
    setSaving(false)
  }, 800)

  const updateDisplayText = (nextDisplay) => {
    const nextRaw = reconstructNoteText(nextDisplay, imageFilenames)
    setNotesData((prev) => ({
      ...prev,
      [selectedDateKey]: { ...prev[selectedDateKey], note_text: nextRaw },
    }))
    debouncedSave(selectedDateKey, nextRaw)
  }

  const handlePageTextChange = (value) => {
    const nextDisplay = replacePageText(pages, safePageIndex, value)
    updateDisplayText(nextDisplay)
  }

  const cycleImage = () => {
    if (imageFilenames.length <= 1) return
    setImageIdx((i) => (i + 1) % imageFilenames.length)
  }

  const turnPage = (dir) => {
    const next = safePageIndex + dir
    if (next < 0 || next >= pageCount) return
    setPageTurn(dir > 0 ? 'fwd' : 'back')
    setTimeout(() => {
      setPageIndex(next)
      setPageTurn(null)
    }, 180)
  }

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
    const monday = new Date(weekStart)
    monday.setDate(monday.getDate() - 7)
    setSelectedKey(toDateKey(monday))
  }

  const nextWeek = () => {
    if (isCurrentWeek) return
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
    const monday = new Date(weekStart)
    monday.setDate(monday.getDate() + 7)
    setSelectedKey(toDateKey(monday))
  }

  const goToday = () => {
    const monday = startOfWeekMonday(today)
    setWeekStart(monday)
    setSelectedKey(todayKey)
  }

  return (
    <div className="journal-stage">
      {!isSupabaseConfigured() && (
        <div className="journal-warn">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your <code>.env</code> file.
        </div>
      )}

      <div className={`book ${hasImages ? '' : 'no-images'} ${bookDark ? 'book-dark' : ''}`}>
        <div className="book-page left">
          {isMobile && (
            <div className="jp-mobile-head">
              {activeDay && (
                <div className="jp-tracking-chip">
                  <span className="jp-tracking-dot" />
                  Tracking · {activeDay.name}
                </div>
              )}
              {showViewToggle && (
                <div className="jp-view-tabs">
                  <button
                    type="button"
                    className={leftPane === 'photos' ? 'active' : ''}
                    onClick={() => setLeftPane('photos')}
                  >
                    Photos
                  </button>
                  <button
                    type="button"
                    className={leftPane === 'tasks' ? 'active' : ''}
                    onClick={() => setLeftPane('tasks')}
                  >
                    Tasks
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="jp-top">
            <div className="jp-date">
              <span className="jp-emoji">☀️</span>
              <div>
                <div className="jp-day">{DAY_NAMES[selectedDate.getDay()]}</div>
                <div className="jp-full">
                  {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()},{' '}
                  {selectedDate.getFullYear()}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`jp-icon-btn ${bookDark ? 'on' : ''}`}
              onClick={() => setBookDark((d) => !d)}
              aria-label={bookDark ? 'Switch journal to light pages' : 'Switch journal to dark pages'}
              title={bookDark ? 'Light pages' : 'Dark pages'}
            >
              {bookDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {!isMobile && showViewToggle && (
            <div className="jp-view-tabs jp-view-tabs-desktop">
              <button
                type="button"
                className={leftPane === 'photos' ? 'active' : ''}
                onClick={() => setLeftPane('photos')}
              >
                Photos
              </button>
              <button
                type="button"
                className={leftPane === 'tasks' ? 'active' : ''}
                onClick={() => setLeftPane('tasks')}
              >
                Tasks
              </button>
            </div>
          )}

          {showPhoto && (
            <button
              type="button"
              className="jp-photo"
              onClick={cycleImage}
              aria-label={
                imageFilenames.length > 1
                  ? `Photo ${imageIdx + 1} of ${imageFilenames.length}. Click for next.`
                  : 'Journal photo'
              }
            >
              <img
                src={NOTE_IMG_BASE + imageFilenames[imageIdx]}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {imageFilenames.length > 1 && (
                <div className="jp-photo-dots">
                  {imageFilenames.map((fn, i) => (
                    <span key={fn + i} className={`jp-dot ${i === imageIdx ? 'on' : ''}`} />
                  ))}
                </div>
              )}
            </button>
          )}

          {showTasks && (
            <div className="jp-tasks-wrap">
              <JournalTasks
                activeDay={activeDay}
                isToday={isSelectedToday}
                onToggleTodo={onToggleTodo}
              />
            </div>
          )}

          <div className="journal-nav">
            {canGoPrevWeek ? (
              <button type="button" className="jn-btn" onClick={prevWeek} aria-label="Previous week">
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
            ) : (
              <span className="jn-spacer" />
            )}

            <div className="jn-center">
              <div className="jn-week">{formatWeekLabel(weekStart)}</div>
              {!isCurrentWeek && (
                <button type="button" className="jn-today" onClick={goToday}>
                  Today
                </button>
              )}
              {loading && <Loader2 size={14} className="jn-spin" />}
              {saving && !loading && <span className="jn-saving">Saving…</span>}
            </div>

            {!isCurrentWeek ? (
              <button type="button" className="jn-btn" onClick={nextWeek} aria-label="Next week">
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <span className="jn-spacer" />
            )}
          </div>

          <div className="jp-week">
            {weekStrip.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`jw-cell ${d.today ? 'today' : ''} ${d.selected ? 'selected' : ''} ${d.hasNote ? 'has-note' : ''}`}
                onClick={() => setSelectedKey(d.key)}
              >
                <span className="jw-lbl">{d.lbl}</span>
                <span className="jw-num">{d.num}</span>
              </button>
            ))}
          </div>

          <div className="jp-streak">
            <div className="jp-streak-n">
              {weekStrip.filter((d) => d.hasNote).length} Day
              {weekStrip.filter((d) => d.hasNote).length === 1 ? '' : 's'} This Week
            </div>
            <div className="jp-streak-sub">
              {weekStrip.filter((d) => d.hasNote).length
                ? "You're on fire! Keep the flame lit every day!"
                : 'Tap a day above and start writing on the right page.'}
            </div>
          </div>
        </div>

        <div className="book-spine" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="ring" />
          ))}
        </div>

        <div className={`book-page right ${pageTurn ? `turn-${pageTurn}` : ''}`}>
          <div className="jp-write-col">
            <textarea
              className="jp-entry"
              placeholder="Feel free to journal your current thoughts or anything else you'd like…"
              value={pageText}
              onChange={(e) => handlePageTextChange(e.target.value)}
              disabled={loading}
            />

            {pageCount > 1 && (
              <div className="jp-pager">
                <button
                  type="button"
                  className="jp-pager-btn"
                  disabled={safePageIndex === 0}
                  onClick={() => turnPage(-1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="jp-pager-label">
                  Page {safePageIndex + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  className="jp-pager-btn"
                  disabled={safePageIndex >= pageCount - 1}
                  onClick={() => turnPage(1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="jp-loc">
              <MapPin size={15} strokeWidth={2} />
              <input
                placeholder="Where are you right now…"
                value={prefs.location}
                onChange={(e) => setPrefs((s) => ({ ...s, location: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
