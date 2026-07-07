import { Flame } from 'lucide-react'
import { formatTotal } from '../utils/habitSimulation'

export default function HabitSimFlameViz({ total, daily, color, label }) {
  const flames = Math.min(24, Math.max(3, Math.round(total / 500)))
  const intensity = Math.min(1, daily / 600)

  return (
    <div className="hsim-flame-viz" style={{ '--hsim-accent': color }}>
      <div className="hsim-flame-header">
        <Flame size={22} strokeWidth={2.2} />
        <strong>{formatTotal(total)}</strong>
        <span>kcal total</span>
      </div>
      <div className="hsim-flame-grid">
        {Array.from({ length: flames }).map((_, i) => {
          const row = Math.floor(i / 8)
          const op = 0.35 + intensity * 0.65 * (1 - row * 0.15)
          const scale = 0.7 + (i % 8) * 0.04
          return (
            <Flame
              key={i}
              size={18 + (i % 3) * 4}
              strokeWidth={2}
              style={{ opacity: op, transform: `scale(${scale})` }}
              className="hsim-flame-icon"
            />
          )
        })}
      </div>
      {label && <p className="hsim-viz-caption">{label}</p>}
    </div>
  )
}
