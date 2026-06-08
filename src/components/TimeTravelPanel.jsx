import { useState } from 'react'
import { CalendarClock, FastForward, FlaskConical, Plus } from 'lucide-react'
import {
  fastForwardOneDay,
  isMockTimeEnabled,
  resetMockDayOffset,
  setMockTimeEnabled,
} from '../utils/timeProvider'
import { useAppTime } from '../hooks/useAppTime'

export default function TimeTravelPanel({ onTimeChange, onAddProtein, streakCurrent, target }) {
  const { todayKey, weekday, mockEnabled, dayOffset } = useAppTime()
  const [enabled, setEnabled] = useState(isMockTimeEnabled)
  const [gramsIn, setGramsIn] = useState('100')

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setMockTimeEnabled(next)
    onTimeChange?.()
  }

  const forward = () => {
    fastForwardOneDay()
    onTimeChange?.()
  }

  const reset = () => {
    resetMockDayOffset()
    onTimeChange?.()
  }

  const addProtein = (e) => {
    e.preventDefault()
    const g = Math.round(Number(gramsIn) || 0)
    if (g <= 0) return
    onAddProtein?.(g)
  }

  return (
    <div className={`time-travel-panel ${enabled ? 'on' : ''}`}>
      <div className="ttp-head">
        <FlaskConical size={18} strokeWidth={2.2} />
        <div>
          <h3>Streak test lab</h3>
          <p>Mock time travel for protein streak QA</p>
        </div>
        <label className="ttp-toggle">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="ttp-switch" />
          <span>{enabled ? 'Mock on' : 'Mock off'}</span>
        </label>
      </div>

      {enabled && (
        <div className="ttp-body">
          <div className="ttp-date">
            <CalendarClock size={16} />
            <div>
              <strong>Current app date</strong>
              <span>
                {weekday}, {todayKey}
                {dayOffset > 0 ? ` (+${dayOffset}d)` : ''}
              </span>
            </div>
          </div>

          <div className="ttp-streak">
            Streak: <b>{streakCurrent}</b> day{streakCurrent === 1 ? '' : 's'}
            {target > 0 && (
              <span className="ttp-target">
                · goal {target}g{target === 100 ? ' (use 62.5 kg weight)' : ''}
              </span>
            )}
          </div>

          <div className="ttp-actions">
            <button type="button" className="btn-primary ttp-forward" onClick={forward}>
              <FastForward size={16} strokeWidth={2.4} />
              Fast forward 1 day
            </button>
            <button type="button" className="ttp-reset" onClick={reset}>
              Reset offset
            </button>
          </div>

          <form className="ttp-quick" onSubmit={addProtein}>
            <label>Quick protein (g)</label>
            <div className="ttp-quick-row">
              <input
                type="number"
                min="1"
                step="1"
                value={gramsIn}
                onChange={(e) => setGramsIn(e.target.value)}
                placeholder="100"
              />
              <button type="submit" className="btn-primary">
                <Plus size={16} strokeWidth={2.6} />
                Add
              </button>
            </div>
          </form>

          <ol className="ttp-steps">
            <li>Add protein until you hit today&apos;s goal → streak +1 (once per day).</li>
            <li>Fast forward → today resets to 0g; streak keeps if yesterday counted.</li>
            <li>Skip days without logging → ghost streak clears to 0 on next check.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
