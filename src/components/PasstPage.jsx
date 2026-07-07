import { useState } from 'react'
import { LayoutGrid, Sparkles, Loader2, TrendingDown } from 'lucide-react'
import { fetchQuitHabitModel } from '../utils/quitHabitApi'
import QuitHabitImpact from './QuitHabitImpact'

const EXAMPLES = [
  'Social media scrolling 2 hours a day for 5 years',
  'Smoking breaks — 45 minutes daily',
  'Late-night TV binge, 90 min before bed',
  'Mindless snacking, 30 min scattered through the day',
]

export default function PasstPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const runSim = async () => {
    const text = prompt.trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      const parsed = await fetchQuitHabitModel(text)
      setModel(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse habit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="day-view hsim-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Passt</h1>
          <p className="page-sub">See the time and energy you reclaim when a habit leaves your life.</p>
        </div>
      </div>

      <div className="hsim-prompt-row">
        <div className="hsim-prompt-wrap">
          <LayoutGrid size={18} strokeWidth={2.2} className="hsim-prompt-icon" />
          <textarea
            className="hsim-prompt"
            placeholder="e.g. Instagram scrolling 2 hours a day — what do I gain if I quit?"
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

      {!model && !busy && (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="es-icon">
            <TrendingDown size={30} strokeWidth={2} />
          </div>
          <h2>Picture life without the drag</h2>
          <p>Describe a habit you want to leave behind — Zeity shows the time and headspace you get back.</p>
        </div>
      )}

      {model && (
        <QuitHabitImpact
          habitName={model.habitName}
          dailyMinutes={model.dailyMinutes}
          yearsProjection={model.yearsProjection}
        />
      )}
    </div>
  )
}
