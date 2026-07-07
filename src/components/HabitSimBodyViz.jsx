export default function HabitSimBodyViz({ bodyProgress, fatKg, color, label }) {
  const coreFill = Math.min(95, bodyProgress)
  const bellyScale = Math.max(0.55, 1 - coreFill / 200)

  return (
    <div className="hsim-body-viz" style={{ '--hsim-accent': color }}>
      <svg viewBox="0 0 120 200" className="hsim-body-svg">
        <defs>
          <linearGradient id="coreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="60" cy="28" r="18" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
        {/* Torso outline */}
        <path
          d="M 38 48 Q 60 44 82 48 L 88 95 Q 60 110 32 95 Z"
          fill="var(--surface-3)"
          stroke="var(--line-strong)"
          strokeWidth="2"
        />
        {/* Core / belly zone — shrinks as progress grows */}
        <ellipse
          cx="60"
          cy="78"
          rx={22 * bellyScale}
          ry={18 * bellyScale}
          fill="url(#coreGrad)"
          opacity={0.4 + coreFill / 150}
        />
        {/* Definition lines */}
        <path
          d="M 48 72 Q 60 68 72 72"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity={coreFill / 100}
          strokeLinecap="round"
        />
        <path
          d="M 50 82 Q 60 78 70 82"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={coreFill / 120}
          strokeLinecap="round"
        />
        {/* Arms */}
        <path d="M 38 52 L 22 100" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
        <path d="M 82 52 L 98 100" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
        {/* Legs */}
        <path d="M 48 95 L 44 165" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
        <path d="M 72 95 L 76 165" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
        {/* Progress ring */}
        <circle
          cx="60"
          cy="175"
          r="14"
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="4"
        />
        <circle
          cx="60"
          cy="175"
          r="14"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${(coreFill / 100) * 88} 88`}
          strokeLinecap="round"
          transform="rotate(-90 60 175)"
        />
        <text x="60" y="179" textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600">
          {Math.round(coreFill)}%
        </text>
      </svg>
      <div className="hsim-body-stats">
        <div>
          <strong>{Math.round(coreFill)}%</strong>
          <span>core definition</span>
        </div>
        {fatKg > 0 && (
          <div>
            <strong>{fatKg} kg</strong>
            <span>energy burned</span>
          </div>
        )}
      </div>
      {label && <p className="hsim-viz-caption">{label}</p>}
    </div>
  )
}
