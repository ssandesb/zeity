import { Check, Flame } from 'lucide-react'
import { getIcon } from '../icons'
import { streakStats } from '../utils/streakHistory'
import { useFolderPressSounds } from '../hooks/useFolderPressSounds'

export default function Folder({ day, onOpen, tracking }) {
  const Icon = getIcon(day.icon)
  const doneCount = day.todos.filter((t) => t.done).length
  const previewTodos = day.todos.slice(0, 3)
  const { current: streak } = streakStats(day.completionLog || {})

  const style = {
    '--f1': day.gradient[0],
    '--f2': day.gradient[1],
    // slightly lighter front flap so it reads as a separate layer
    '--f1b': day.gradient[0],
    '--f2b': day.gradient[1],
    '--fshadow': day.gradient[1] + '88',
  }

  const { onMouseEnter, onTouchStart, onTouchEnd, onTouchMove, open } = useFolderPressSounds(
    () => onOpen(day.id),
  )

  return (
    <div
      className={`folder ${tracking ? 'tracking' : ''}`}
      style={style}
      onClick={open}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      role="button"
      tabIndex={0}
    >
      {tracking && (
        <span className="folder-live">
          <span className="fl-dot" /> LIVE
        </span>
      )}
      <div className="folder-back" />

      <div className="folder-note">
        <div className="note-head">
          <span>TO DO TODAY</span>
          <span className="tstamp">
            {doneCount}/{day.todos.length}
          </span>
        </div>
        {previewTodos.map((t) => (
          <div key={t.id} className={`note-todo ${t.done ? 'done' : ''}`}>
            <span className="box">{t.done && <Check size={10} strokeWidth={3} />}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      <div className="folder-front">
        <div className="front-glow" />
      </div>

      <div className="folder-label">
        <div className="fl-icon">
          <Icon size={17} strokeWidth={2.2} />
        </div>
        <h3>{day.name}</h3>
        <div className="fl-meta">
          <span>{day.schedule.length} blocks</span>
          <span className="fl-streak">
            <Flame size={12} strokeWidth={2.4} /> {streak}
          </span>
        </div>
      </div>
    </div>
  )
}
