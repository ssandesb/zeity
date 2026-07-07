export default function HabitSimRingViz({ progress, cap = 100, color, label, unit }) {
  const pct = Math.min(100, (progress / cap) * 100)
  const r = 52
  const c = 2 * Math.PI * r

  return (
    <div className="hsim-ring-viz" style={{ '--hsim-accent': color }}>
      <svg viewBox="0 0 120 120" className="hsim-ring-svg">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">
          {Math.round(progress)}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fill="var(--muted)">
          {unit || 'total'}
        </text>
      </svg>
      {label && <p className="hsim-viz-caption">{label}</p>}
    </div>
  )
}
