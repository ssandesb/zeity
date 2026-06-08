import { Fragment, useEffect, useMemo, useState } from 'react'

import { Flame, Target, Trophy, CheckCircle2, Drumstick } from 'lucide-react'

import { getIcon } from '../icons'

import { buildSeriesFromLog, STREAK_DAYS } from '../utils/streakHistory'

import { getProteinStreakData, proteinStreakStats } from '../utils/proteinStreak'
import { subscribeTime } from '../utils/timeProvider'
import { ZEITY_DB_EVENT } from '../lib/zeityDb'



const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const proteinHsl = { h: 142, s: 70 }



const ranges = [

  { id: 'week', label: 'Week', days: 7 },

  { id: 'month', label: 'Month', days: 35 },

  { id: 'overall', label: 'Overall', days: STREAK_DAYS },

]



function hexToHsl(hex) {

  let h = hex.replace('#', '')

  if (h.length === 3)

    h = h

      .split('')

      .map((c) => c + c)

      .join('')

  const r = parseInt(h.slice(0, 2), 16) / 255

  const g = parseInt(h.slice(2, 4), 16) / 255

  const b = parseInt(h.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)

  const min = Math.min(r, g, b)

  let hue

  let s

  const l = (max + min) / 2

  if (max === min) {

    hue = 0

    s = 0

  } else {

    const d = max - min

    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {

      case r:

        hue = (g - b) / d + (g < b ? 6 : 0)

        break

      case g:

        hue = (b - r) / d + 2

        break

      default:

        hue = (r - g) / d + 4

    }

    hue /= 6

  }

  return { h: Math.round(hue * 360), s: Math.round(s * 100), l: Math.round(l * 100) }

}



const levelLightness = [null, 86, 73, 60, 48]



function cellColor(level, hsl) {

  if (!level) return 'var(--surface-3)'

  return `hsl(${hsl.h} ${Math.max(hsl.s, 62)}% ${levelLightness[level]}%)`

}



function StreakHeatmap({ slice, hsl, range, rangeDays }) {

  const cols = Math.ceil(rangeDays / 7)



  if (range === 'week') {

    return (

      <div className="weekstrip">

        {weekdayLabels.map((wd, r) => (

          <div className="ws-cell" key={r}>

            <span>{wd}</span>

            <div className="ws-box" style={{ background: cellColor(slice[r] || 0, hsl) }} />

          </div>

        ))}

      </div>

    )

  }



  return (

    <div className="hm" style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))` }}>

      {weekdayLabels.map((wd, r) => (

        <Fragment key={r}>

          <span className="hm-label">{wd}</span>

          {Array.from({ length: cols }).map((_, c) => {

            const v = slice[c * 7 + r]

            return (

              <div key={c} className="hm-cell" style={{ background: cellColor(v || 0, hsl) }} />

            )

          })}

        </Fragment>

      ))}

    </div>

  )

}



export default function StreaksPage({ days, onOpen, onNavigate }) {

  const [range, setRange] = useState('overall')

  const [proteinData, setProteinData] = useState(() => getProteinStreakData())



  useEffect(() => {
    const refresh = () => setProteinData(getProteinStreakData())
    refresh()
    window.addEventListener(ZEITY_DB_EVENT, refresh)
    const unsubTime = subscribeTime(refresh)
    return () => {
      window.removeEventListener(ZEITY_DB_EVENT, refresh)
      unsubTime()
    }
  }, [])



  const seriesMap = useMemo(() => {

    const map = {}

    days.forEach((d) => {

      map[d.id] = buildSeriesFromLog(d.completionLog || {})

    })

    return map

  }, [days])



  const proteinSeries = useMemo(() => buildSeriesFromLog(proteinData.log), [proteinData.log])



  const rangeDays = ranges.find((r) => r.id === range).days



  const dayStats = useMemo(() => {

    let completed = 0

    let totalCells = 0

    let current = 0

    let best = 0

    days.forEach((d) => {

      const s = seriesMap[d.id].slice(-rangeDays)

      let trailing = 0

      for (let i = s.length - 1; i >= 0; i--) {

        if (s[i] > 0) trailing++

        else break

      }

      let run = 0

      let maxRun = 0

      s.forEach((lvl) => {

        totalCells++

        if (lvl > 0) {

          completed++

          run++

          maxRun = Math.max(maxRun, run)

        } else {

          run = 0

        }

      })

      current = Math.max(current, trailing)

      best = Math.max(best, maxRun)

    })

    return { successRate: totalCells ? Math.round((completed / totalCells) * 100) : 0, completed, current, best }

  }, [days, seriesMap, rangeDays])



  const proteinStats = useMemo(() => {

    const slice = proteinSeries.slice(-rangeDays)

    const full = proteinStreakStats(proteinData.log)

    let trailing = 0

    for (let i = slice.length - 1; i >= 0; i--) {

      if (slice[i] === 4) trailing++

      else break

    }

    let run = 0

    let maxRun = 0

    let goalDays = 0

    slice.forEach((lvl) => {

      if (lvl === 4) {

        goalDays++

        run++

        maxRun = Math.max(maxRun, run)

      } else {

        run = 0

      }

    })

    return {

      current: Math.max(proteinData.current, trailing),

      best: Math.max(full.best, maxRun),

      goalDays,

      successRate: slice.length ? Math.round((goalDays / slice.length) * 100) : 0,

    }

  }, [proteinSeries, proteinData, rangeDays])



  const stats = useMemo(

    () => ({

      current: Math.max(dayStats.current, proteinStats.current),

      best: Math.max(dayStats.best, proteinStats.best),

      successRate: Math.max(dayStats.successRate, proteinStats.successRate),

      completed: dayStats.completed + proteinStats.goalDays,

    }),

    [dayStats, proteinStats],

  )



  const summary = [

    { icon: Flame, label: 'Current streak', value: `${stats.current} days`, grad: ['#f97316', '#c2410c'] },

    { icon: Target, label: 'Success rate', value: `${stats.successRate}%`, grad: ['#14b8a6', '#0f766e'] },

    { icon: Trophy, label: 'Best streak', value: `${stats.best} days`, grad: ['#f59e0b', '#b45309'] },

    { icon: CheckCircle2, label: 'Completed habits', value: stats.completed, grad: ['#6366f1', '#4338ca'] },

  ]



  const proteinSlice = proteinSeries.slice(-rangeDays)

  const proteinActive = proteinSlice.filter((l) => l > 0).length

  const proteinPerWeek = Math.round(proteinActive / (rangeDays / 7))

  const proteinFreq =

    proteinPerWeek >= 7

      ? 'Everyday'

      : proteinActive

        ? `${Math.max(proteinPerWeek, 1)} days per week`

        : 'No activity yet'



  const hasProteinActivity = Object.keys(proteinData.log).length > 0

  const hasAnyStreakData = days.length > 0 || hasProteinActivity



  if (!hasAnyStreakData) {

    return (

      <div className="day-view streaks-page">

        <div className="page-head">

          <div>

            <h1 className="page-title">Streaks</h1>

            <p className="page-sub">Hit your protein goal or complete day-type tasks to fill the grid.</p>

          </div>

        </div>

        <div className="empty-state" style={{ padding: '48px 20px' }}>

          <div className="es-icon">

            <Flame size={30} strokeWidth={2} />

          </div>

          <h2>No streak data yet</h2>

          <p>Log foods in Protein Tracker or complete day-type tasks to build your streaks.</p>

        </div>

      </div>

    )

  }



  return (

    <div className="day-view streaks-page">

      <div className="page-head">

        <div>

          <h1 className="page-title">Streaks</h1>

          <p className="page-sub">Every box is a day you showed up. Keep them glowing.</p>

        </div>

      </div>



      <div className="viz-tabs streak-tabs">

        {ranges.map((r) => (

          <button

            key={r.id}

            className={`viz-tab ${range === r.id ? 'active' : ''}`}

            onClick={() => setRange(r.id)}

          >

            {r.label}

          </button>

        ))}

      </div>



      <div className="section-head" style={{ marginTop: 22 }}>

        <h2>Summary</h2>

      </div>

      <div className="streak-summary">

        {summary.map((s, i) => {

          const Icon = s.icon

          return (

            <div className="ss-card" key={i}>

              <div

                className="ss-icon"

                style={{ background: `linear-gradient(140deg, ${s.grad[0]}, ${s.grad[1]})` }}

              >

                <Icon size={16} strokeWidth={2.3} />

              </div>

              <div className="ss-value">{s.value}</div>

              <div className="ss-label">{s.label}</div>

            </div>

          )

        })}

      </div>



      <div className="streak-legend">

        <span>Less</span>

        {[0, 1, 2, 3, 4].map((l) => (

          <span key={l} className="sl-box" style={{ background: cellColor(l, { h: 235, s: 70 }) }} />

        ))}

        <span>More</span>

      </div>



      <div className="section-head" style={{ marginTop: 26 }}>

        <h2>Protein Intake</h2>

        {proteinStats.current > 0 && (

          <span className="see-all" style={{ cursor: 'default' }}>

            <Flame size={13} strokeWidth={2.4} /> {proteinStats.current} day streak

          </span>

        )}

      </div>



      <div

        className="streak-card streak-card-protein"

        onClick={() => onNavigate?.('weight')}

        role={onNavigate ? 'button' : undefined}

        tabIndex={onNavigate ? 0 : undefined}

      >

        <div className="sc-head">

          <div

            className="sc-icon"

            style={{ background: 'linear-gradient(140deg, #22c55e, #15803d)' }}

          >

            <Drumstick size={16} strokeWidth={2.2} />

          </div>

          <span className="sc-name">Protein Intake</span>

          <span className="sc-freq">{proteinFreq}</span>

        </div>

        <StreakHeatmap slice={proteinSlice} hsl={proteinHsl} range={range} rangeDays={rangeDays} />

      </div>



      {days.length > 0 && (

        <>

          <div className="section-head" style={{ marginTop: 26 }}>

            <h2>By Day Type</h2>

            <span className="count">{days.length}</span>

          </div>



          {days.map((d) => {

            const hsl = hexToHsl(d.color)

            const slice = seriesMap[d.id].slice(-rangeDays)

            const activeDays = slice.filter((l) => l > 0).length

            const perWeek = Math.round(activeDays / (rangeDays / 7))

            const freq =

              perWeek >= 7 ? 'Everyday' : activeDays ? `${Math.max(perWeek, 1)} days per week` : 'No activity yet'

            const Icon = getIcon(d.icon)



            return (

              <div className="streak-card" key={d.id} onClick={() => onOpen(d.id)}>

                <div className="sc-head">

                  <div

                    className="sc-icon"

                    style={{ background: `linear-gradient(140deg, ${d.gradient[0]}, ${d.gradient[1]})` }}

                  >

                    <Icon size={16} strokeWidth={2.2} />

                  </div>

                  <span className="sc-name">{d.name}</span>

                  <span className="sc-freq">{freq}</span>

                </div>

                <StreakHeatmap slice={slice} hsl={hsl} range={range} rangeDays={rangeDays} />

              </div>

            )

          })}

        </>

      )}

    </div>

  )

}


