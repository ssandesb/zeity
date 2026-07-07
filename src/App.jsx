import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Menu,
  Bell,
  Sparkles,
  Plus,
  Moon,
  Sun,
  Square,
  ListChecks,
  FolderOpen,
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import Folder from './components/Folder'
import DayView from './components/DayView'
import NewDayDialog from './components/NewDayDialog'
import AiChatDialog from './components/AiChatDialog'
import StreaksPage from './components/StreaksPage'
import WeightTracker from './components/WeightTracker'
import HabitSimulator from './components/HabitSimulator'
import JournalBook from './components/JournalBook'
import { getIcon } from './icons'
import { buildWeekStrip, loadDayLog, saveDayLogEntry } from './utils/dayLog'
import { withCompletionLog } from './utils/streakHistory'
import { getZeityColumn, updateZeityColumn } from './lib/zeityDb'
import { useZeitySync } from './context/ZeitySyncProvider'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function App() {
  const { version } = useZeitySync()
  const [days, setDays] = useState(() => getZeityColumn('days') || [])
  const [selectedId, setSelectedId] = useState(null)
  const [nav, setNav] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [active, setActive] = useState(() => getZeityColumn('active'))
  const [theme, setTheme] = useState(() => localStorage.getItem('zeity-theme') || 'dark')

  useEffect(() => {
    setDays(getZeityColumn('days') || [])
    setActive(getZeityColumn('active'))
  }, [version])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('zeity-theme', theme)
  }, [theme])

  useEffect(() => {
    updateZeityColumn('days', days)
  }, [days])

  useEffect(() => {
    if (active && !days.some((d) => d.id === active.dayId)) {
      setActive(null)
      return
    }
    updateZeityColumn('active', active)
  }, [active, days])

  const selected = days.find((d) => d.id === selectedId)
  const activeDay = active ? days.find((d) => d.id === active.dayId) : null

  const weekStrip = useMemo(() => buildWeekStrip(days, new Date(), loadDayLog()), [days, version])

  const startTracking = (dayId) => {
    saveDayLogEntry(todayKey(), dayId)
    setActive({ dayId, startedAt: Date.now() })
  }
  const stopTracking = () => setActive(null)

  const openDay = (id) => {
    setSelectedId(id)
    setMenuOpen(false)
  }

  const updateDay = (dayId, updater) =>
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d
        const next = updater(d)
        return withCompletionLog(next)
      }),
    )

  const toggleTodo = (dayId, todoId) =>
    updateDay(dayId, (d) => ({
      ...d,
      todos: d.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
    }))

  const toggleSchedule = (dayId, idx) =>
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, schedule: d.schedule.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)) }
          : d,
      ),
    )

  const addTodo = (dayId, text) =>
    updateDay(dayId, (d) => ({
      ...d,
      todos: [...d.todos, { id: `n${Date.now()}`, text, done: false }],
    }))

  const createDay = (day) => {
    setDays((prev) => [...prev, day])
    setShowNew(false)
    setSelectedId(day.id)
  }

  return (
    <div className="app">
      <Sidebar
        active={nav}
        onNavigate={(id) => {
          setMenuOpen(false)
          if (id === 'tasks') {
            setNav('tasks')
            setSelectedId(active ? active.dayId : null)
            return
          }
          setNav(id)
          setSelectedId(null)
        }}
        tasksBadge={activeDay ? activeDay.todos.filter((t) => !t.done).length : undefined}
        open={menuOpen}
        dayTypes={days}
        onPickDay={openDay}
      />

      <div className={`scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      <main className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="search">
            <Search size={17} />
            <input placeholder="Search days, tasks, schedules…" />
            <span className="kbd">
              <span>⌘</span>
              <span>K</span>
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn">
              <Bell size={18} />
              <span className="ping" />
            </button>
            <button
              className="btn-ai"
              onClick={() => setShowAi(true)}
              aria-label="Zeity AI"
              title="Zeity AI — create day types from text or photos"
            >
              <Sparkles size={17} strokeWidth={2.2} />
              <span>AI</span>
            </button>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={17} strokeWidth={2.4} />
              <span>New Day Type</span>
            </button>
          </div>
        </div>

        <div className="content">
          {selected ? (
            <DayView
              day={selected}
              onBack={() => setSelectedId(null)}
              onToggleTodo={toggleTodo}
              onToggleSchedule={toggleSchedule}
              onAddTodo={addTodo}
              isActive={active?.dayId === selected.id}
              onStart={startTracking}
              onStop={stopTracking}
            />
          ) : nav === 'days' ? (
            <JournalBook activeDay={activeDay} onToggleTodo={toggleTodo} />
          ) : nav === 'streaks' ? (
            <StreaksPage
              days={days}
              onOpen={openDay}
              onNavigate={(id) => {
                setMenuOpen(false)
                setNav(id)
                setSelectedId(null)
              }}
            />
          ) : nav === 'weight' ? (
            <WeightTracker />
          ) : nav === 'future' ? (
            <HabitSimulator />
          ) : nav === 'tasks' ? (
            <div className="empty-state">
              <div className="es-icon">
                <ListChecks size={30} strokeWidth={2} />
              </div>
              <h2>No day started yet</h2>
              <p>Open a day type and hit Start to see its tasks here.</p>
              <button className="btn-primary" onClick={() => setNav('days')}>
                <FolderOpen size={17} strokeWidth={2.2} />
                <span>Browse day types</span>
              </button>
            </div>
          ) : (
            <>
              {activeDay && (
                <div
                  className="track-banner"
                  onClick={() => openDay(activeDay.id)}
                  style={{
                    '--f1': activeDay.gradient[0],
                    '--f2': activeDay.gradient[1],
                    '--fshadow': activeDay.gradient[1] + '88',
                  }}
                >
                  <div className="tb-icon">
                    {(() => {
                      const Ic = getIcon(activeDay.icon)
                      return <Ic size={18} strokeWidth={2.2} />
                    })()}
                  </div>
                  <div className="tb-text">
                    <strong>Now tracking · {activeDay.name}</strong>
                    <span>{activeDay.todos.filter((t) => t.done).length}/{activeDay.todos.length} tasks done</span>
                  </div>
                  <div className="tb-bar">
                    <div
                      className="tb-bar-fill"
                      style={{
                        width: `${
                          activeDay.todos.length
                            ? Math.round(
                                (activeDay.todos.filter((t) => t.done).length /
                                  activeDay.todos.length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <button
                    className="tb-stop"
                    onClick={(e) => {
                      e.stopPropagation()
                      stopTracking()
                    }}
                  >
                    <Square size={13} strokeWidth={2.6} fill="currentColor" /> Stop
                  </button>
                </div>
              )}

              <div className="page-head">
                <div>
                  <h1 className="page-title">Home</h1>
                  <p className="page-sub">
                    Pick the type of day you're having — open a folder to reveal its plan.
                  </p>
                </div>
                <div className="filters">
                  <button className="chip active">All</button>
                  <button className="chip">Active</button>
                  <button className="chip">Favorites</button>
                </div>
              </div>

              {days.length > 0 && (
                <>
                  <div className="section-head" style={{ marginTop: 22 }}>
                    <h2>This Week's Plan</h2>
                    <span className="count">{weekStrip.filter((w) => w.dt).length}</span>
                  </div>
                  <div className="week-strip">
                    {weekStrip.map((w) => {
                      const style =
                        w.isToday && w.dt
                          ? {
                              '--f1': w.dt.gradient[0],
                              '--f2': w.dt.gradient[1],
                              '--fshadow': w.dt.gradient[1] + '88',
                            }
                          : {}
                      const Icon = w.dt ? getIcon(w.dt.icon) : null
                      return (
                        <div
                          key={w.dateKey}
                          className={`week-day ${w.isToday ? 'today' : ''} ${w.dt ? '' : 'empty'}`}
                          style={style}
                          onClick={() => w.dt && openDay(w.dt.id)}
                        >
                          <div className="wd-name">{w.day}</div>
                          <div
                            className="wd-dot"
                            style={
                              w.dt
                                ? {
                                    background: `linear-gradient(140deg, ${w.dt.gradient[0]}, ${w.dt.gradient[1]})`,
                                  }
                                : undefined
                            }
                          >
                            {Icon ? <Icon size={16} strokeWidth={2.2} /> : <span className="wd-empty">—</span>}
                          </div>
                          <div className="wd-type">{w.dt ? w.dt.name : 'Unassigned'}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div className="section-head">
                <h2>Day Folders</h2>
                <span className="count">{days.length}</span>
              </div>
              {days.length === 0 ? (
                <div className="empty-state" style={{ padding: '48px 20px' }}>
                  <div className="es-icon">
                    <FolderOpen size={30} strokeWidth={2} />
                  </div>
                  <h2>No day types yet</h2>
                  <p>Create your first folder to plan schedules and track tasks.</p>
                  <button className="btn-primary" onClick={() => setShowNew(true)}>
                    <Plus size={17} strokeWidth={2.4} />
                    <span>New Day Type</span>
                  </button>
                </div>
              ) : (
                <div className="folder-grid">
                  {days.map((d) => (
                    <Folder key={d.id} day={d} onOpen={openDay} tracking={active?.dayId === d.id} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showNew && <NewDayDialog onClose={() => setShowNew(false)} onCreate={createDay} />}
      {showAi && (
        <AiChatDialog
          onClose={() => setShowAi(false)}
          onCreateDay={createDay}
          onUpdateDay={updateDay}
          days={days}
          activeDay={activeDay}
        />
      )}
    </div>
  )
}
