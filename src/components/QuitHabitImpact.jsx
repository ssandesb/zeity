import { useEffect, useMemo, useState } from 'react'
import { Clock, Brain, Activity, Sun, Sparkles, TrendingDown } from 'lucide-react'
import {
  formatImpactTime,
  horizonToId,
  runQuitSimulation,
  QUIT_EQUIVALENTS,
} from '../../shared/quitHabitCore.js'
import { formatTotal } from '../utils/habitSimulation'
import HabitSimAreaChart from './HabitSimAreaChart'
import HabitSimMilestones from './HabitSimMilestones'
import QuitHabitHorizonCard from './QuitHabitHorizonCard'

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

function StatTile({ icon: Icon, label, value, unit, accent }) {
  return (
    <div className="qhab-stat-tile" style={{ '--qhab-accent': accent }}>
      <Icon size={18} strokeWidth={2.2} />
      <div>
        <span className="qhab-stat-tile-value">{value}</span>
        <span className="qhab-stat-tile-unit">{unit}</span>
        <span className="qhab-stat-tile-label">{label}</span>
      </div>
    </div>
  )
}

export default function QuitHabitImpact({ model }) {
  const { habitName, dailyMinutes, motivation, accentColor, milestones } = model
  const accent = accentColor || '#34d399'

  const [selectedHorizon, setSelectedHorizon] = useState(() => horizonToId(model.yearsProjection))

  const result = useMemo(() => runQuitSimulation(model), [model])
  const selected = result.horizons.find((h) => h.id === selectedHorizon) || result.horizons[4]

  const timeFmt = useMemo(() => formatImpactTime(selected.totalMinutes), [selected.totalMinutes])

  const animEnergyBefore = useAnimatedNumber(selected.beforeEnergy)
  const animEnergyAfter = useAnimatedNumber(selected.afterEnergy)
  const animDaily = useAnimatedNumber(dailyMinutes)

  const chartSeries = useMemo(
    () =>
      result.fullSeries.slice(0, selected.days).map((s) => ({
        cumulative: s.cumulativeMinutes / 60,
        perfectCumulative: s.cumulativeMinutes / 60,
      })),
    [result.fullSeries, selected.days],
  )

  const milestoneModel = useMemo(
    () => ({
      milestones: milestones.map((m) => ({ at: m.atHours, label: m.label, icon: m.icon })),
    }),
    [milestones],
  )

  const equivStats = QUIT_EQUIVALENTS.map((eq) => ({
    ...eq,
    count: Math.floor(selected.totalMinutes / eq.threshold),
  })).filter((e) => e.count > 0)

  return (
    <div className="qhab">
      <div className="hsim-hero panel qhab-hero" style={{ '--hsim-accent': accent }}>
        <div className="hsim-hero-icon">
          <TrendingDown size={28} strokeWidth={2.2} />
        </div>
        <div className="hsim-hero-text">
          <h2>{habitName}</h2>
          <p>
            {animDaily} min/day — what you reclaim by letting this go.
          </p>
          <span className="hsim-hero-note">{motivation}</span>
        </div>
        <div className="hsim-hero-stat">
          <strong>{formatTotal(selected.totalHours)}</strong>
          <span>hours · {selected.label}</span>
        </div>
      </div>

      <div className="hsim-viz-row panel qhab-chart-panel">
        <div className="qhab-chart-side">
          <h3 className="qhab-chart-title">Time regained</h3>
          <p className="qhab-chart-sub">Cumulative hours back if you quit today</p>
        </div>
        <div className="hsim-viz-side qhab-chart-wrap">
          <HabitSimAreaChart series={chartSeries} color={accent} height={100} />
          {selected.insight?.sub && <p className="hsim-insight-sub">{selected.insight.sub}</p>}
        </div>
      </div>

      <div className="hsim-horizons">
        {result.horizons.map((h) => (
          <QuitHabitHorizonCard
            key={h.id}
            horizon={h}
            color={accent}
            selected={selectedHorizon === h.id}
            onClick={() => setSelectedHorizon(h.id)}
          />
        ))}
      </div>

      <div className="qhab-numbers panel">
        <h3 className="qhab-numbers-title">By the numbers · {selected.label}</h3>
        <div className="qhab-numbers-grid">
          <StatTile
            icon={Clock}
            label="Hours regained"
            value={formatTotal(selected.totalHours)}
            unit="hrs"
            accent={accent}
          />
          <StatTile
            icon={Brain}
            label="Mental energy"
            value={`${animEnergyAfter}%`}
            unit={`from ${animEnergyBefore}%`}
            accent={accent}
          />
          <StatTile
            icon={Sparkles}
            label="Clear headspace"
            value={selected.mentalHoursGained.toLocaleString()}
            unit="hrs"
            accent={accent}
          />
          <StatTile
            icon={Sun}
            label="Waking days back"
            value={(selected.totalHours / 16).toFixed(1)}
            unit="days"
            accent={accent}
          />
        </div>
        {equivStats.length > 0 && (
          <div className="qhab-equiv-row">
            {equivStats.map((e) => (
              <span key={e.label} className="chip qhab-equiv-chip">
                {e.count.toLocaleString()} {e.count === 1 ? e.label : e.plural}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="qhab-grid">
        <section className="qhab-panel qhab-panel--before" aria-label="Before quitting">
          <div className="qhab-panel-tag">
            <Activity size={14} strokeWidth={2.2} />
            <span>Before · {selected.label}</span>
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
        </section>

        <section className="qhab-panel qhab-panel--after" aria-label="After quitting">
          <div className="qhab-panel-tag qhab-panel-tag--after">
            <Sun size={14} strokeWidth={2.2} />
            <span>After quitting · {selected.label}</span>
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
            ~{selected.mentalHoursGained.toLocaleString()} extra hours of clear headspace.
          </p>
        </section>
      </div>

      {milestones.length > 0 && (
        <div className="panel hsim-ms-panel">
          <h3>Milestones · {selected.label}</h3>
          <HabitSimMilestones
            milestones={milestoneModel.milestones}
            total={selected.totalHours}
            color={accent}
          />
        </div>
      )}
    </div>
  )
}
