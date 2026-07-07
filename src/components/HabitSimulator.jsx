import { useMemo, useState } from 'react'
import {
  Telescope,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Info,
  TrendingUp,
} from 'lucide-react'
import { getIcon } from '../icons'
import { fetchHabitModel } from '../utils/habitSimApi'
import { DEFAULT_FILTERS, runSimulation, formatTotal } from '../utils/habitSimulation'
import HabitSimAreaChart from './HabitSimAreaChart'
import HabitSimHorizonCard from './HabitSimHorizonCard'
import HabitSimMilestones from './HabitSimMilestones'

const EXAMPLES = [
  'Read 1 hour a day (~25 pages)',
  'Eat 100g protein daily',
  'Walk 10,000 steps every day',
  'Learn 1 German grammar topic + speak 15 min',
]

const ACCENT = '#6366f1'

export default function HabitSimulator() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(null)
  const [dailyOverride, setDailyOverride] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedHorizon, setSelectedHorizon] = useState('1y')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const effectiveModel = useMemo(() => {
    if (!model) return null
    if (dailyOverride == null) return model
    return {
      ...model,
      metric: { ...model.metric, daily: dailyOverride },
    }
  }, [model, dailyOverride])

  const result = useMemo(() => {
    if (!effectiveModel) return null
    return runSimulation(effectiveModel, filters)
  }, [effectiveModel, filters])

  const selected = result?.horizons.find((h) => h.id === selectedHorizon) || result?.horizons[4]
  const Icon = getIcon(effectiveModel?.icon || 'TrendingUp')

  const runSim = async () => {
    const text = prompt.trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      const parsed = await fetchHabitModel(text)
      setModel(parsed)
      setDailyOverride(null)
      setSelectedHorizon('1y')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse habit')
    } finally {
      setBusy(false)
    }
  }

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))

  return (
    <div className="day-view hsim-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Future</h1>
          <p className="page-sub">See where consistency takes you — 2 weeks to 1 year.</p>
        </div>
      </div>

      <div className="hsim-prompt-row">
        <div className="hsim-prompt-wrap">
          <Telescope size={18} strokeWidth={2.2} className="hsim-prompt-icon" />
          <textarea
            className="hsim-prompt"
            placeholder="Describe your habit… e.g. Read 25 pages daily"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                runSim()
              }
            }}
          />
        </div>
        <button className="btn-primary hsim-run" onClick={runSim} disabled={busy || !prompt.trim()}>
          {busy ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} strokeWidth={2.2} />}
          <span>{busy ? 'Parsing…' : 'Simulate'}</span>
        </button>
      </div>

      <div className="hsim-examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setPrompt(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="hsim-error">{error}</div>}

      {!model && !busy && (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="es-icon">
            <TrendingUp size={30} strokeWidth={2} />
          </div>
          <h2>Project your habit</h2>
          <p>Enter a daily habit and see graphic projections with cheat-day filters.</p>
        </div>
      )}

      {effectiveModel && result && (
        <div className="hsim-layout">
          <aside className="hsim-filters panel">
            <div className="panel-head">
              <div className="ph-icon">
                <SlidersHorizontal size={17} strokeWidth={2.2} />
              </div>
              <h3>Filters</h3>
            </div>

            <label className="hsim-filter">
              <span>Adherence {filters.adherence}%</span>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={filters.adherence}
                onChange={(e) => setFilter('adherence', Number(e.target.value))}
              />
            </label>

            <label className="hsim-filter">
              <span>Cheat days / month</span>
              <div className="hsim-stepper">
                <button type="button" onClick={() => setFilter('cheatDaysPerMonth', Math.max(0, filters.cheatDaysPerMonth - 1))}>−</button>
                <span>{filters.cheatDaysPerMonth}</span>
                <button type="button" onClick={() => setFilter('cheatDaysPerMonth', Math.min(12, filters.cheatDaysPerMonth + 1))}>+</button>
              </div>
            </label>

            <label className="hsim-filter toggle">
              <span>Skip weekends</span>
              <input
                type="checkbox"
                checked={filters.skipWeekends}
                onChange={(e) => setFilter('skipWeekends', e.target.checked)}
              />
            </label>

            <label className="hsim-filter">
              <span>Growth</span>
              <select
                value={filters.growthMode}
                onChange={(e) => setFilter('growthMode', e.target.value)}
              >
                <option value="auto">Auto (from habit)</option>
                <option value="linear">Linear</option>
                <option value="compound">Compound 1%/day</option>
              </select>
            </label>

            <label className="hsim-filter">
              <span>Daily amount</span>
              <input
                type="number"
                min={0.1}
                step="any"
                value={dailyOverride ?? effectiveModel.metric.daily}
                onChange={(e) => setDailyOverride(Number(e.target.value) || effectiveModel.metric.daily)}
              />
              <span className="hsim-filter-unit">{effectiveModel.metric.unit}</span>
            </label>

            <p className="hsim-disclaimer">
              <Info size={13} strokeWidth={2.2} />
              Projections for motivation — not medical advice.
            </p>
          </aside>

          <div className="hsim-main">
            <div className="hsim-hero panel" style={{ '--hsim-accent': ACCENT }}>
              <div className="hsim-hero-icon">
                <Icon size={28} strokeWidth={2.2} />
              </div>
              <div className="hsim-hero-text">
                <h2>{effectiveModel.title}</h2>
                <p>{effectiveModel.subtitle}</p>
                {effectiveModel.compoundNote && (
                  <span className="hsim-hero-note">{effectiveModel.compoundNote}</span>
                )}
              </div>
              {selected && (
                <div className="hsim-hero-stat">
                  <strong>{formatTotal(selected.total)}</strong>
                  <span>{effectiveModel.metric.unit} · {selected.label}</span>
                </div>
              )}
            </div>

            <div className="panel hsim-chart-panel">
              <div className="hsim-chart-legend">
                <span className="hsim-leg real">Your path</span>
                <span className="hsim-leg perfect">Perfect</span>
              </div>
              <HabitSimAreaChart series={result.fullSeries} color={ACCENT} height={140} />
            </div>

            <div className="hsim-horizons">
              {result.horizons.map((h) => (
                <HabitSimHorizonCard
                  key={h.id}
                  horizon={h}
                  unit={effectiveModel.metric.unit}
                  color={ACCENT}
                  selected={selectedHorizon === h.id}
                  onClick={() => setSelectedHorizon(h.id)}
                />
              ))}
            </div>

            {effectiveModel.milestones?.length > 0 && selected && (
              <div className="panel hsim-ms-panel">
                <h3>Milestones · {selected.label}</h3>
                <HabitSimMilestones
                  milestones={effectiveModel.milestones}
                  total={selected.total}
                  color={ACCENT}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
