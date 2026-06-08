import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  Flame,
  Trophy,
  CalendarCheck,
  Plus,
  ListChecks,
  Clock,
  Play,
  Square,
  PieChart,
} from 'lucide-react'
import { getIcon } from '../icons'
import VisualizeDialog from './VisualizeDialog'
import { buildSeriesFromLog, streakStats } from '../utils/streakHistory'

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function DayView({
  day,
  onBack,
  onToggleTodo,
  onToggleSchedule,
  onAddTodo,
  isActive,
  onStart,
  onStop,
}) {
  const [draft, setDraft] = useState('')
  const [showViz, setShowViz] = useState(false)
  const Icon = getIcon(day.icon)

  const done = day.todos.filter((t) => t.done).length
  const pct = day.todos.length ? Math.round((done / day.todos.length) * 100) : 0
  const { current: streak, best } = streakStats(day.completionLog || {})
  const last7 = buildSeriesFromLog(day.completionLog || {})
    .slice(-7)
    .map((lvl) => lvl > 0)

  const style = {
    '--f1': day.gradient[0],
    '--f2': day.gradient[1],
    '--fshadow': day.gradient[1] + '88',
  }

  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    onAddTodo(day.id, draft.trim())
    setDraft('')
  }

  return (
    <div className="day-view" style={style}>
      <div className="day-toolbar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2.4} /> All days
        </button>
        {isActive ? (
          <button className="track-btn stop" onClick={() => onStop()}>
            <Square size={13} strokeWidth={2.6} fill="currentColor" /> Stop
          </button>
        ) : (
          <button className="track-btn start" onClick={() => onStart(day.id)}>
            <Play size={14} strokeWidth={2.6} fill="currentColor" /> Start
          </button>
        )}
      </div>

      <div className="day-hero">
        <div className="day-hero-top">
          <div className="day-hero-icon">
            <Icon size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h1>{day.name}</h1>
            <div className="tagline">{day.tagline}</div>
          </div>
        </div>

        <div className="day-hero-stats">
          <div className="hero-stat">
            <div className="hs-val">
              <Flame size={20} strokeWidth={2.4} /> {streak}
            </div>
            <div className="hs-label">Current streak</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hs-val">
              <Trophy size={19} strokeWidth={2.4} /> {best}
            </div>
            <div className="hs-label">Best streak</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hs-val">
              <CalendarCheck size={19} strokeWidth={2.4} /> {pct}%
            </div>
            <div className="hs-label">Today done</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hs-label" style={{ marginBottom: 2 }}>
              Last 7 days
            </div>
            <div className="streak-row">
              {last7.map((on, i) => (
                <div key={i} className={`streak-dot ${on ? 'on' : ''}`} title={weekDays[i]}>
                  {on ? <Check size={12} strokeWidth={3} /> : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="day-columns">
        {/* Schedule timeline */}
        <div className="panel">
          <div className="panel-head">
            <div className="ph-icon">
              <Clock size={17} strokeWidth={2.2} />
            </div>
            <h3>Daily Schedule</h3>
            <span className="ph-meta">{day.schedule.length} time blocks</span>
          </div>

          <div className="timeline">
            {day.schedule.map((s, i) => {
              const kind = s.kind || 'block'
              const isBlock = kind === 'block'
              return (
                <div key={i} className={`tl-item tl-${kind} ${s.done ? 'done' : ''}`}>
                  <div className="tl-time">
                    {s.time || (isBlock ? '' : '•')}
                    {s.end && <span className="tl-end">{s.end}</span>}
                  </div>
                  <div className="tl-rail">
                    {isBlock ? (
                      <button
                        className="tl-node"
                        onClick={() => onToggleSchedule(day.id, i)}
                        aria-label="toggle"
                      >
                        {s.done && <Check size={9} strokeWidth={3.5} />}
                      </button>
                    ) : (
                      <span className="tl-node mini" />
                    )}
                    <div className="tl-line" />
                  </div>
                  <div className="tl-body">
                    <div className="tl-title">{s.title}</div>
                    {s.note && <div className="tl-note">{s.note}</div>}
                    <span className={`tl-tag tag-${kind}`}>{s.tag}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Checklist */}
        <div className="panel">
          <div className="panel-head">
            <div className="ph-icon">
              <ListChecks size={17} strokeWidth={2.2} />
            </div>
            <h3>Keep List</h3>
            <button className="visualize-btn" onClick={() => setShowViz(true)}>
              <PieChart size={14} strokeWidth={2.4} /> Visualize
            </button>
            <span className="ph-meta" style={{ marginLeft: 10 }}>
              {done}/{day.todos.length} done
            </span>
          </div>

          <div className="checklist">
            {day.todos.map((t) => (
              <button
                key={t.id}
                className={`check ${t.done ? 'done' : ''}`}
                onClick={() => onToggleTodo(day.id, t.id)}
              >
                <span className="cbox">{t.done && <Check size={13} strokeWidth={3} />}</span>
                <span>{t.text}</span>
              </button>
            ))}

            <form className="add-todo" onSubmit={submit}>
              <Plus size={16} strokeWidth={2.4} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a task…"
              />
            </form>
          </div>

          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-pct">{pct}%</div>
          </div>
        </div>
      </div>

      {showViz && <VisualizeDialog day={day} onClose={() => setShowViz(false)} />}
    </div>
  )
}
