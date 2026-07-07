import { useMemo, useState, useEffect } from 'react'
import {
  Telescope,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Info,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { getIcon } from '../icons'
import { defaultProfile, profileComplete } from '../../shared/habitSimCore.js'
import { fetchHabitModel } from '../utils/habitSimApi'
import { applyProfileToModel, DEFAULT_FILTERS, runSimulation, formatTotal } from '../utils/habitSimulation'
import HabitSimAreaChart from './HabitSimAreaChart'
import HabitSimHorizonCard from './HabitSimHorizonCard'
import HabitSimMilestones from './HabitSimMilestones'
import HabitSimProfileForm from './HabitSimProfileForm'
import HabitSimDynamicViz from './HabitSimDynamicViz'

const EXAMPLES = [
  'Walk 10,000 steps every day — I want calories burned',
  'Abs workout 20 minutes daily — lose belly fat',
  'Read 1 hour a day (~25 pages)',
  'Eat 100g protein daily',
]

export default function HabitSimulator() {
  const [prompt, setPrompt] = useState('')
  const [baseModel, setBaseModel] = useState(null)
  const [profile, setProfile] = useState({})
  const [dailyOverride, setDailyOverride] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedHorizon, setSelectedHorizon] = useState('1y')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (baseModel?.profileQuestions?.length) {
      setProfile(defaultProfile(baseModel))
    }
  }, [baseModel])

  const accent = baseModel?.accentColor || '#6366f1'

  const personalizedModel = useMemo(() => {
    if (!baseModel) return null
    let m = applyProfileToModel(baseModel, profile)
    if (dailyOverride != null) {
      m = { ...m, metric: { ...m.metric, daily: dailyOverride } }
    }
    return m
  }, [baseModel, profile, dailyOverride])

  const needsProfile = baseModel?.profileQuestions?.some((q) => q.required)
  const profileReady = !needsProfile || profileComplete(baseModel, profile)

  const result = useMemo(() => {
    if (!personalizedModel || !profileReady) return null
    return runSimulation(personalizedModel, filters)
  }, [personalizedModel, filters, profileReady])

  const selected = result?.horizons.find((h) => h.id === selectedHorizon) || result?.horizons?.[4]
  const Icon = getIcon(personalizedModel?.icon || 'TrendingUp')

  const runSim = async () => {
    const text = prompt.trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      const parsed = await fetchHabitModel(text)
      setBaseModel(parsed)
      const prof = defaultProfile(parsed)
      setProfile(prof)
      setDailyOverride(null)
      setSelectedHorizon('1y')

      if (parsed.profileQuestions?.some((q) => q.required)) {
        const withProfile = await fetchHabitModel(text, prof)
        setBaseModel(withProfile)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse habit')
    } finally {
      setBusy(false)
    }
  }

  const refreshWithProfile = async () => {
    if (!prompt.trim() || !baseModel || !profileReady) return
    setBusy(true)
    setError('')
    try {
      const refined = await fetchHabitModel(prompt.trim(), profile)
      setBaseModel(refined)
    } catch {
      /* client-side applyProfile still works */
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
          <p className="page-sub">AI reads your goal — calories, core, books — and paints your path.</p>
        </div>
      </div>

      <div className="hsim-prompt-row">
        <div className="hsim-prompt-wrap">
          <Telescope size={18} strokeWidth={2.2} className="hsim-prompt-icon" />
          <textarea
            className="hsim-prompt"
            placeholder="e.g. 10k steps to burn calories, or 20 min abs to lose belly…"
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
          <span>{busy ? 'Thinking…' : 'Simulate'}</span>
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

      {!baseModel && !busy && (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="es-icon">
            <TrendingUp size={30} strokeWidth={2} />
          </div>
          <h2>See your future self</h2>
          <p>Tell Zeity the habit and the outcome you care about — not just the activity.</p>
        </div>
      )}

      {baseModel && (
        <HabitSimProfileForm
          questions={baseModel.profileQuestions}
          profile={profile}
          onChange={(p) => {
            setProfile(p)
          }}
          accent={accent}
        />
      )}

      {baseModel && needsProfile && profileReady && (
        <button
          type="button"
          className="btn-primary hsim-refresh-profile"
          onClick={refreshWithProfile}
          disabled={busy}
          style={{ marginBottom: 16 }}
        >
          <Zap size={16} />
          <span>Recalculate with my stats</span>
        </button>
      )}

      {personalizedModel && result && profileReady && (
        <div className="hsim-layout">
          <aside className="hsim-filters panel">
            <div className="panel-head">
              <div className="ph-icon">
                <SlidersHorizontal size={17} strokeWidth={2.2} />
              </div>
              <h3>Reality filters</h3>
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
              <select value={filters.growthMode} onChange={(e) => setFilter('growthMode', e.target.value)}>
                <option value="auto">Auto</option>
                <option value="linear">Linear</option>
                <option value="compound">Compound 1%/day</option>
              </select>
            </label>

            <label className="hsim-filter">
              <span>Daily {personalizedModel.metric.name}</span>
              <input
                type="number"
                min={0.1}
                step="any"
                value={dailyOverride ?? personalizedModel.metric.daily}
                onChange={(e) => setDailyOverride(Number(e.target.value) || personalizedModel.metric.daily)}
              />
              <span className="hsim-filter-unit">{personalizedModel.metric.unit}</span>
            </label>

            <p className="hsim-disclaimer">
              <Info size={13} strokeWidth={2.2} />
              Estimates for motivation — not medical advice.
            </p>
          </aside>

          <div className="hsim-main">
            <div className="hsim-hero panel" style={{ '--hsim-accent': accent }}>
              <div className="hsim-hero-icon">
                <Icon size={28} strokeWidth={2.2} />
              </div>
              <div className="hsim-hero-text">
                <h2>{personalizedModel.title}</h2>
                <p>{personalizedModel.subtitle}</p>
                <span className="hsim-hero-note">{personalizedModel.motivation}</span>
              </div>
              {selected && (
                <div className="hsim-hero-stat">
                  <strong>{formatTotal(selected.total)}</strong>
                  <span>{personalizedModel.metric.unit} · {selected.label}</span>
                </div>
              )}
            </div>

            <div className="hsim-viz-row panel">
              <HabitSimDynamicViz
                model={personalizedModel}
                result={result}
                selectedHorizon={selectedHorizon}
                color={accent}
              />
              <div className="hsim-viz-side">
                <div className="hsim-chart-legend">
                  <span className="hsim-leg real">Your path</span>
                  <span className="hsim-leg perfect">Perfect</span>
                </div>
                <HabitSimAreaChart series={result.fullSeries} color={accent} height={100} />
                {selected?.insight?.sub && (
                  <p className="hsim-insight-sub">{selected.insight.sub}</p>
                )}
              </div>
            </div>

            <div className="hsim-horizons">
              {result.horizons.map((h) => (
                <HabitSimHorizonCard
                  key={h.id}
                  horizon={h}
                  unit={personalizedModel.metric.unit}
                  color={accent}
                  selected={selectedHorizon === h.id}
                  onClick={() => setSelectedHorizon(h.id)}
                />
              ))}
            </div>

            {personalizedModel.milestones?.length > 0 && selected && (
              <div className="panel hsim-ms-panel">
                <h3>Milestones · {selected.label}</h3>
                <HabitSimMilestones
                  milestones={personalizedModel.milestones}
                  total={selected.total}
                  color={accent}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {baseModel && needsProfile && !profileReady && (
        <p className="hsim-profile-hint">Enter your stats above to unlock the projection.</p>
      )}
    </div>
  )
}
