import { useEffect, useMemo, useState } from 'react'
import { Clock, Brain, Activity, Sun, Sparkles } from 'lucide-react'
import { computeQuitImpact, formatImpactTime } from '../../shared/quitHabitCore.js'

function LowEnergySvg({ level }) {
  const fill = Math.max(8, Math.min(92, level))
  return (
    <svg className="qhab-svg qhab-svg--before" viewBox="0 0 88 44" aria-hidden>
      <rect x="4" y="10" width="72" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.35" />
      <rect x="76" y="17" width="6" height="10" rx="2" fill="currentColor" opacity="0.35" />
      <rect
        x="8"
        y="14"
        width={`${(fill / 100) * 64}`}
        height="16"
        rx="4"
        className="qhab-svg-fill qhab-svg-fill--drain"
      />
      <path d="M22 22 L30 22 M38 22 L46 22 M54 22 L62 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
    </svg>
  )
}

function RisingEnergySvg({ level }) {
  const h = Math.max(6, Math.min(28, (level / 100) * 28))
  return (
    <svg className="qhab-svg qhab-svg--after" viewBox="0 0 88 44" aria-hidden>
      <defs>
        <linearGradient id="qhab-wave-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path
        d={`M4 36 Q16 ${36 - h * 0.4} 28 36 T52 36 T76 36`}
        fill="none"
        stroke="url(#qhab-wave-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        className="qhab-wave"
      />
      <path
        d={`M4 30 Q20 ${30 - h * 0.7} 36 30 T68 30`}
        fill="none"
        stroke="url(#qhab-wave-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.65"
        className="qhab-wave qhab-wave--delay"
      />
      <circle cx="72" cy="12" r="6" fill="#fbbf24" opacity="0.9" className="qhab-sun-dot" />
    </svg>
  )
}

function useAnimatedNumber(target, duration = 600) {
  const [value, setValue] = useState(target)
  useEffect(() => {
    const from = value
    const to = target
    if (from === to) return undefined
    const start = performance.now()
    let frame
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  return value
}

export default function QuitHabitImpact({ habitName, dailyMinutes, yearsProjection }) {
  const impact = useMemo(
    () => computeQuitImpact({ dailyMinutes, yearsProjection }),
    [dailyMinutes, yearsProjection],
  )
  const timeFmt = useMemo(() => formatImpactTime(impact.totalMinutes), [impact.totalMinutes])

  const animEnergyBefore = useAnimatedNumber(impact.beforeEnergy)
  const animEnergyAfter = useAnimatedNumber(impact.afterEnergy)
  const animDaily = useAnimatedNumber(dailyMinutes)

  return (
    <div className="qhab">
      <header className="qhab-head">
        <h2 className="qhab-title">If you keep {habitName}</h2>
        <p className="qhab-sub">
          Over <strong>{yearsProjection}</strong> {yearsProjection === 1 ? 'year' : 'years'} — and what
          you gain by walking away.
        </p>
      </header>

      <div className="qhab-grid">
        <section className="qhab-panel qhab-panel--before" aria-label="Before quitting">
          <div className="qhab-panel-tag">
            <Activity size={14} strokeWidth={2.2} />
            <span>Before</span>
          </div>
          <LowEnergySvg level={animEnergyBefore} />
          <div className="qhab-stat">
            <Clock size={18} strokeWidth={2.2} className="qhab-stat-icon" />
            <div>
              <span className="qhab-stat-value qhab-stat-value--transition">{timeFmt.primary}</span>
              <span className="qhab-stat-unit">{timeFmt.unit} lost</span>
            </div>
          </div>
          {timeFmt.secondary && <p className="qhab-detail">{timeFmt.secondary} on the habit</p>}
          <div className="qhab-stat qhab-stat--compact">
            <Brain size={18} strokeWidth={2.2} className="qhab-stat-icon" />
            <div>
              <span className="qhab-stat-value qhab-stat-value--transition">{animEnergyBefore}%</span>
              <span className="qhab-stat-unit">mental energy</span>
            </div>
          </div>
          <p className="qhab-note">
            ~<span className="qhab-stat-value--transition">{animDaily}</span> min/day drained from focus
            and recovery.
          </p>
        </section>

        <section className="qhab-panel qhab-panel--after" aria-label="After quitting">
          <div className="qhab-panel-tag qhab-panel-tag--after">
            <Sun size={14} strokeWidth={2.2} />
            <span>After quitting</span>
          </div>
          <RisingEnergySvg level={animEnergyAfter} />
          <div className="qhab-stat">
            <Sparkles size={18} strokeWidth={2.2} className="qhab-stat-icon qhab-stat-icon--after" />
            <div>
              <span className="qhab-stat-value qhab-stat-value--transition qhab-stat-value--gain">
                {timeFmt.primary}
              </span>
              <span className="qhab-stat-unit">regained</span>
            </div>
          </div>
          {timeFmt.secondary && (
            <p className="qhab-detail qhab-detail--after">{timeFmt.secondary} back for you</p>
          )}
          <div className="qhab-stat qhab-stat--compact">
            <Brain size={18} strokeWidth={2.2} className="qhab-stat-icon qhab-stat-icon--after" />
            <div>
              <span className="qhab-stat-value qhab-stat-value--transition qhab-stat-value--gain">
                {animEnergyAfter}%
              </span>
              <span className="qhab-stat-unit">mental energy</span>
            </div>
          </div>
          <p className="qhab-note qhab-note--after">
            ~{impact.mentalHoursGained.toLocaleString()} extra hours of clear headspace over{' '}
            {yearsProjection} {yearsProjection === 1 ? 'year' : 'years'}.
          </p>
        </section>
      </div>
    </div>
  )
}
