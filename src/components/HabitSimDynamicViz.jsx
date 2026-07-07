import HabitSimFlameViz from './HabitSimFlameViz'
import HabitSimBodyViz from './HabitSimBodyViz'
import HabitSimBooksViz from './HabitSimBooksViz'
import HabitSimRingViz from './HabitSimRingViz'
import HabitSimAreaChart from './HabitSimAreaChart'

export default function HabitSimDynamicViz({ model, result, selectedHorizon, color }) {
  const selected = result?.horizons?.find((h) => h.id === selectedHorizon) || result?.horizons?.[4]
  if (!selected || !model) return null

  const viz = model.visualization || 'chart'
  const total = selected.total
  const insight = selected.insight

  if (viz === 'flame') {
    return (
      <HabitSimFlameViz
        total={total}
        daily={model.metric.daily}
        color={color}
        label={insight?.line}
      />
    )
  }

  if (viz === 'body') {
    return (
      <HabitSimBodyViz
        bodyProgress={selected.bodyProgress}
        fatKg={result.summary?.fatKgEquivalent}
        color={color}
        label={insight?.line}
      />
    )
  }

  if (viz === 'books') {
    const threshold = model.equivalents?.[0]?.threshold || 250
    return (
      <HabitSimBooksViz
        total={total}
        threshold={threshold}
        color={color}
        label={insight?.line || selected.equivalent}
      />
    )
  }

  if (viz === 'ring' || viz === 'steps') {
    return (
      <HabitSimRingViz
        progress={total}
        cap={model.growth?.cap || total * 1.2}
        color={color}
        unit={model.metric.unit}
        label={insight?.line}
      />
    )
  }

  return (
    <div className="hsim-chart-fallback">
      <HabitSimAreaChart series={result.fullSeries} color={color} height={140} />
    </div>
  )
}
