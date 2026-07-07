import { getIcon } from '../icons'
import { formatTotal } from '../utils/habitSimulation'

function Sparkline({ series, color }) {
  if (!series?.length) return null
  const w = 80
  const h = 28
  const vals = series.map((s) => s.cumulative)
  const max = Math.max(...vals, 1)
  const pts = vals.map((v, i) => {
    const x = vals.length > 1 ? (i / (vals.length - 1)) * w : w / 2
    const y = h - (v / max) * (h - 4) - 2
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return (
    <svg className="hsim-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function HabitSimHorizonCard({ horizon, unit, color, selected, onClick }) {
  const Icon = getIcon(horizon.icon || 'TrendingUp')

  return (
    <button
      type="button"
      className={`hsim-horizon-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ '--hsim-accent': color }}
    >
      <div className="hsim-hc-top">
        <span className="hsim-hc-label">{horizon.label}</span>
        {horizon.gapPct > 0 && (
          <span className="hsim-hc-gap">−{horizon.gapPct}%</span>
        )}
      </div>
      <div className="hsim-hc-value">
        {formatTotal(horizon.total, unit)}
        <span className="hsim-hc-unit">{unit}</span>
      </div>
      {horizon.equivalent && (
        <div className="hsim-hc-equiv">
          <Icon size={14} strokeWidth={2.2} />
          {horizon.equivalent}
        </div>
      )}
      <Sparkline series={horizon.series} color={color} />
    </button>
  )
}
