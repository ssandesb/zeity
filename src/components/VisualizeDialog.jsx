import { useState } from 'react'
import { X, PieChart, BarChart3, Check } from 'lucide-react'
import { getIcon } from '../icons'
import { buildSeriesFromLog } from '../utils/streakHistory'

const pastels = [
  '#a78bfa',
  '#f472b6',
  '#fb7185',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#fb923c',
  '#818cf8',
  '#2dd4bf',
  '#e879f9',
  '#facc15',
  '#4ade80',
  '#60a5fa',
  '#f87171',
]

const tabs = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'overall', label: 'Overall' },
]

export default function VisualizeDialog({ day, onClose }) {
  const [tab, setTab] = useState('today')
  const Icon = getIcon(day.icon)

  const dataFor = (t) => {
    if (t === 'today') {
      return day.todos.map((x, i) => ({ label: x.text, short: `#${i + 1}`, done: x.done }))
    }
    const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const series = buildSeriesFromLog(day.completionLog || {})
    if (t === 'weekly') {
      return series.slice(-7).map((lvl, i) => ({
        label: `Day ${i + 1}`,
        short: dayLetters[i],
        done: lvl >= 4,
      }))
    }
    return series
      .filter((lvl) => lvl > 0)
      .map((lvl, i) => ({ label: `Day ${i + 1}`, short: `${i + 1}`, done: lvl >= 4 }))
  }

  const items = dataFor(tab)
  const total = items.length
  const done = items.filter((i) => i.done).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const score = total ? ((done / total) * 10).toFixed(1) : '0.0'

  // donut geometry
  const r = 78
  const cx = 100
  const cy = 100
  const C = 2 * Math.PI * r
  const N = total || 1
  const slot = C / N
  const seg = slot * 0.62

  const subtitle = pct === 100 ? 'All habits completed!' : 'Your daily habits are not completed.'

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal viz-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="mh-title">
            <div
              className="mh-icon"
              style={{ background: `linear-gradient(140deg, ${day.gradient[0]}, ${day.gradient[1]})` }}
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2>Statistics</h2>
              <p>{day.name} · Keep List</p>
            </div>
          </div>
          <button type="button" className="mh-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <div className="viz-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`viz-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Donut / pie chart */}
          <div className="viz-section-label">
            <PieChart size={16} strokeWidth={2.2} /> Completion
          </div>
          <div className="viz-donut-wrap">
            <svg viewBox="0 0 200 200" className="viz-donut">
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth="22"
              />
              {items.map((it, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={it.done ? pastels[i % pastels.length] : 'var(--line-strong)'}
                  strokeWidth="22"
                  strokeDasharray={`${seg} ${C - seg}`}
                  strokeDashoffset={-slot * i}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  opacity={it.done ? 1 : 0.45}
                />
              ))}
            </svg>
            <div className="viz-center">
              <strong>{score}</strong>
              <span>{subtitle}</span>
            </div>
          </div>

          <div className={`viz-insight ${pct === 100 ? 'good' : 'warn'}`}>
            {pct === 100
              ? 'Nice — every item is checked off. Keep the streak alive!'
              : `${100 - pct}% of your ${tab === 'today' ? 'Keep List' : 'days'} still pending. Let's finish strong.`}
          </div>

          {/* Bar graph */}
          <div className="viz-section-label">
            <BarChart3 size={16} strokeWidth={2.2} /> Summary
          </div>
          <div className="viz-bars">
            {items.map((it, i) => (
              <div className="viz-bar-col" key={i} title={it.label}>
                <div className="viz-bar-track">
                  <div
                    className="viz-bar-fill"
                    style={{
                      height: it.done ? '100%' : '26%',
                      background: it.done ? pastels[i % pastels.length] : 'var(--line-strong)',
                    }}
                  />
                </div>
                <span className="viz-bar-label">{it.short}</span>
              </div>
            ))}
          </div>

          {/* Legend (today only) */}
          {tab === 'today' && total > 0 && (
            <div className="viz-legend">
              {items.map((it, i) => (
                <div className={`viz-leg-item ${it.done ? 'done' : ''}`} key={i}>
                  <span
                    className="viz-leg-dot"
                    style={{ background: it.done ? pastels[i % pastels.length] : 'var(--line-strong)' }}
                  />
                  <span className="viz-leg-text">{it.label}</span>
                  {it.done && <Check size={15} strokeWidth={3} className="viz-leg-check" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
