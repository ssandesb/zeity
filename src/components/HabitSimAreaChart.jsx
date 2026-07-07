export default function HabitSimAreaChart({ series, color = '#6366f1', height = 120 }) {
  if (!series?.length) return null

  const chartW = 400
  const chartH = height
  const vals = series.flatMap((s) => [s.cumulative, s.perfectCumulative])
  const max = Math.max(...vals, 1)
  const min = 0

  const toPoint = (v, i, len) => {
    const x = len > 1 ? (i / (len - 1)) * chartW : chartW / 2
    const y = chartH - ((v - min) / (max - min)) * (chartH - 8) - 4
    return [x, y]
  }

  const realPts = series.map((s, i) => toPoint(s.cumulative, i, series.length))
  const perfectPts = series.map((s, i) => toPoint(s.perfectCumulative, i, series.length))

  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = (pts) =>
    pts.length ? `${line(pts)} L${chartW} ${chartH} L0 ${chartH} Z` : ''

  return (
    <svg className="hsim-area-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="hsimGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area(perfectPts)} fill="var(--surface-3)" opacity="0.6" />
      <path
        d={line(perfectPts)}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.5"
      />
      <path d={area(realPts)} fill="url(#hsimGrad)" />
      <path d={line(realPts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
