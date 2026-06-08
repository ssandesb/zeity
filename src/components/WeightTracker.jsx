import { useEffect, useMemo, useState } from 'react'
import {
  Scale,
  Drumstick,
  Plus,
  Check,
  TrendingDown,
  TrendingUp,
  Target,
  Flame,
  Minus,
} from 'lucide-react'
import { foods } from '../data'
import { createCustomFood, loadCustomFoods, saveCustomFoods } from '../utils/customFoods'
import {
  last14WeightSeries,
  loadCurrentWeight,
  loadProteinDailyLog,
  saveProteinDailyLog,
  saveProteinEntry,
  saveWeightEntry,
  weekProteinSeries,
  weightTrendLabel,
} from '../utils/weightHistory'
import { ZEITY_DB_EVENT } from '../lib/zeityDb'
import { checkAndGetStreak, syncProteinStreak } from '../utils/proteinStreak'
import { loadAiProteinBonus, PROTEIN_AI_EVENT } from '../utils/aiProteinActions'
import { getTodayKey, isMockTimeEnabled, subscribeTime } from '../utils/timeProvider'
import { addTestGrams, loadTestGrams } from '../utils/proteinTestGrams'
import { useAppTime } from '../hooks/useAppTime'
import TimeTravelPanel from './TimeTravelPanel'

const PROTEIN_PER_KG = 1.6
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeightTracker() {
  const [weight, setWeight] = useState(loadCurrentWeight)
  const [tab, setTab] = useState('daily')
  const [logged, setLogged] = useState(loadProteinDailyLog)
  const [aiBonusGrams, setAiBonusGrams] = useState(() => loadAiProteinBonus())
  const [customFoods, setCustomFoods] = useState(loadCustomFoods)
  const [customName, setCustomName] = useState('')
  const [customServing, setCustomServing] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [proteinStreak, setProteinStreak] = useState(() => checkAndGetStreak())
  const [testGrams, setTestGrams] = useState(() =>
    isMockTimeEnabled() ? loadTestGrams() : 0,
  )
  const { todayKey: appDate } = useAppTime()

  const allFoods = useMemo(() => [...foods, ...customFoods], [customFoods])

  const refreshForAppDate = () => {
    setWeight(loadCurrentWeight())
    setLogged(loadProteinDailyLog())
    setCustomFoods(loadCustomFoods())
    setAiBonusGrams(loadAiProteinBonus())
    setTestGrams(isMockTimeEnabled() ? loadTestGrams() : 0)
    setProteinStreak(checkAndGetStreak())
  }

  useEffect(() => {
    if (weight > 0) saveWeightEntry(weight)
  }, [weight])

  useEffect(() => {
    saveProteinDailyLog(logged)
  }, [logged])

  useEffect(() => subscribeTime(refreshForAppDate), [])

  useEffect(() => {
    const onRefresh = () => refreshForAppDate()
    window.addEventListener(PROTEIN_AI_EVENT, onRefresh)
    window.addEventListener(ZEITY_DB_EVENT, onRefresh)
    return () => {
      window.removeEventListener(PROTEIN_AI_EVENT, onRefresh)
      window.removeEventListener(ZEITY_DB_EVENT, onRefresh)
    }
  }, [])

  useEffect(() => {
    refreshForAppDate()
  }, [appDate])

  useEffect(() => {
    const valid = new Set(allFoods.map((f) => f.id))
    setLogged((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [allFoods])

  const target = weight > 0 ? Math.round(weight * PROTEIN_PER_KG) : 0
  const foodConsumed = useMemo(
    () => allFoods.filter((f) => logged.includes(f.id)).reduce((a, f) => a + f.protein, 0),
    [logged, allFoods],
  )

  const consumed = foodConsumed + aiBonusGrams + (isMockTimeEnabled() ? testGrams : 0)

  useEffect(() => {
    if (consumed > 0 || logged.length === 0) saveProteinEntry(consumed)
  }, [consumed, logged.length])

  useEffect(() => {
    setProteinStreak(syncProteinStreak(consumed, target))
  }, [consumed, target])

  const handleAddTestProtein = (grams) => {
    const next = addTestGrams(grams)
    setTestGrams(next)
  }

  const pct = target ? Math.min(100, Math.round((consumed / target) * 100)) : 0
  const remaining = Math.max(0, target - consumed)

  const weightSeries = useMemo(() => last14WeightSeries(weight), [weight])
  const weekProtein = useMemo(() => weekProteinSeries(target, consumed), [target, consumed])
  const trendLabel = weight > 0 ? weightTrendLabel(weight) : null

  const toggleFood = (id) =>
    setLogged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const addCustomFood = (e) => {
    e.preventDefault()
    const entry = createCustomFood({
      name: customName,
      serving: customServing,
      protein: customProtein,
    })
    if (!entry) return
    setCustomFoods((prev) => {
      const next = [...prev, entry]
      saveCustomFoods(next)
      return next
    })
    setCustomName('')
    setCustomServing('')
    setCustomProtein('')
  }

  const adjustWeight = (delta) => setWeight((w) => Math.max(0, +(w + delta).toFixed(1)))

  const chartW = 300
  const chartH = 96
  const hasChart = weightSeries.length >= 2
  const wMin = hasChart ? Math.min(...weightSeries) - 0.6 : 0
  const wMax = hasChart ? Math.max(...weightSeries) + 0.6 : 1
  const pts = weightSeries.map((v, i) => {
    const x = weightSeries.length > 1 ? (i / (weightSeries.length - 1)) * chartW : chartW / 2
    const y = chartH - ((v - wMin) / (wMax - wMin)) * chartH
    return [x, y]
  })
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const areaPath = pts.length ? `${linePath} L${chartW} ${chartH} L0 ${chartH} Z` : ''

  const maxBar = Math.max(target, ...weekProtein, 1) * 1.1
  const weekAvg = weekProtein.length
    ? Math.round(weekProtein.reduce((a, b) => a + b, 0) / weekProtein.length)
    : 0

  return (
    <div className="day-view wt-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Protein Tracker</h1>
          <p className="page-sub">Track your weight and hit your daily protein goal.</p>
        </div>
      </div>

      <TimeTravelPanel
        onTimeChange={refreshForAppDate}
        onAddProtein={handleAddTestProtein}
        streakCurrent={proteinStreak.current}
        target={target}
      />

      <div className="wt-top">
        <div className="panel wt-weight">
          <div className="panel-head">
            <div className="ph-icon">
              <Scale size={17} strokeWidth={2.2} />
            </div>
            <h3>Body Weight</h3>
            {trendLabel && (
              <span className={`ph-meta ${trendLabel.startsWith('+') ? 'trend-up' : 'trend-down'}`}>
                {trendLabel.startsWith('+') ? (
                  <TrendingUp size={14} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={14} strokeWidth={2.4} />
                )}{' '}
                {trendLabel}
              </span>
            )}
          </div>

          <div className="weight-input">
            <button className="wi-step" onClick={() => adjustWeight(-0.5)} aria-label="decrease">
              <Minus size={16} strokeWidth={2.6} />
            </button>
            <div className="wi-value">
              <input
                type="number"
                value={weight || ''}
                placeholder="—"
                step="0.1"
                min="0"
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              />
              <span>kg</span>
            </div>
            <button className="wi-step" onClick={() => adjustWeight(0.5)} aria-label="increase">
              <Plus size={16} strokeWidth={2.6} />
            </button>
          </div>

          {hasChart ? (
            <>
              <svg className="wt-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
                    <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#wgrad)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="var(--accent)" />
              </svg>
              <div className="wt-chart-cap">Weight history</div>
            </>
          ) : (
            <div className="wt-chart-empty">Log your weight on multiple days to see a trend.</div>
          )}
        </div>

        <div className="panel wt-protein">
          <div className="panel-head">
            <div className="ph-icon">
              <Drumstick size={17} strokeWidth={2.2} />
            </div>
            <h3>Protein Goal</h3>
          </div>

          {weight > 0 ? (
            <>
              <div className="ring-wrap">
                <ProteinRing pct={pct} />
                <div className="ring-center">
                  <strong>{consumed}</strong>
                  <span>of {target} g</span>
                </div>
              </div>

              <div className="formula">
                <Target size={14} strokeWidth={2.4} />
                <span>
                  {weight} kg × {PROTEIN_PER_KG} = <b>{target} g</b> protein / day
                </span>
              </div>
              <div className="remaining-pill">
                {remaining > 0 ? `${remaining} g to go today` : 'Goal smashed! 💪'}
              </div>
              {proteinStreak.current > 0 && (
                <div className="wt-streak-pill">
                  <Flame size={14} strokeWidth={2.4} />
                  {proteinStreak.current} day protein streak
                </div>
              )}
            </>
          ) : (
            <div className="wt-chart-empty">Set your weight above to calculate a protein target.</div>
          )}
        </div>
      </div>

      <div className="viz-tabs streak-tabs" style={{ marginTop: 4 }}>
        <button className={`viz-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          Daily
        </button>
        <button
          className={`viz-tab ${tab === 'weekly' ? 'active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          Weekly
        </button>
      </div>

      {tab === 'daily' ? (
        <>
          <div className="section-head" style={{ marginTop: 22 }}>
            <h2>Foods to eat</h2>
            <span className="count">{allFoods.length}</span>
            <span className="see-all" style={{ cursor: 'default' }}>
              {logged.length} logged
            </span>
          </div>
          <div className="food-grid">
            {allFoods.map((f) => {
              const on = logged.includes(f.id)
              return (
                <button
                  key={f.id}
                  className={`food-item ${on ? 'on' : ''}`}
                  onClick={() => toggleFood(f.id)}
                  disabled={!weight}
                >
                  <span className="food-emoji">{f.emoji}</span>
                  <span className="food-info">
                    <span className="food-name">{f.name}</span>
                    <span className="food-serv">{f.serving}</span>
                  </span>
                  <span className="food-protein">{f.protein}g</span>
                  <span className="food-add">
                    {on ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={2.6} />}
                  </span>
                </button>
              )
            })}
            <form className="food-custom" onSubmit={addCustomFood}>
              <span className="food-emoji">✏️</span>
              <div className="food-custom-fields">
                <input
                  className="food-custom-in"
                  placeholder="Custom food"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  disabled={!weight}
                />
                <input
                  className="food-custom-in food-custom-serv"
                  placeholder="Serving"
                  value={customServing}
                  onChange={(e) => setCustomServing(e.target.value)}
                  disabled={!weight}
                />
                <input
                  className="food-custom-in food-custom-g"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="g"
                  value={customProtein}
                  onChange={(e) => setCustomProtein(e.target.value)}
                  disabled={!weight}
                />
              </div>
              <button
                type="submit"
                className="food-add food-custom-add"
                disabled={!weight || !customName.trim() || !customProtein}
                aria-label="Add custom food"
              >
                <Plus size={15} strokeWidth={2.6} />
              </button>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="section-head" style={{ marginTop: 22 }}>
            <h2>This Week's Protein</h2>
            <span className="see-all" style={{ cursor: 'default' }}>
              {weekProtein.some((g) => g > 0) ? `avg ${weekAvg} g` : 'No data yet'}
            </span>
          </div>
          <div className="panel">
            {weekProtein.some((g) => g > 0) && target > 0 ? (
              <>
                <div className="pbars">
                  {weekProtein.map((g, i) => {
                    const isToday = i === weekProtein.length - 1
                    const hit = g >= target
                    return (
                      <div className="pbar-col" key={i} title={`${g} g`}>
                        <div className="pbar-track">
                          <div
                            className="pbar-target"
                            style={{ bottom: `${(target / maxBar) * 100}%` }}
                          />
                          <div
                            className={`pbar-fill ${hit ? 'hit' : ''} ${isToday ? 'today' : ''}`}
                            style={{ height: `${(g / maxBar) * 100}%` }}
                          />
                        </div>
                        <span className="pbar-label">{isToday ? 'Today' : weekdayLabels[i]}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="pbar-legend">
                  <span className="pl-target">— target {target} g</span>
                  <span className="pl-hit">
                    <Flame size={13} strokeWidth={2.4} />{' '}
                    {weekProtein.filter((g) => g >= target).length}/7 days hit
                  </span>
                </div>
              </>
            ) : (
              <div className="wt-chart-empty" style={{ padding: '24px 16px' }}>
                Log foods daily to build your weekly protein chart.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ProteinRing({ pct }) {
  const r = 64
  const C = 2 * Math.PI * r
  const off = C - (pct / 100) * C
  return (
    <svg className="pring" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="url(#pgrad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={off}
        transform="rotate(-90 80 80)"
      />
      <defs>
        <linearGradient id="pgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
    </svg>
  )
}
