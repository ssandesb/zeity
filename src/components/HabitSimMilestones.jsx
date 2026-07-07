import { getIcon } from '../icons'

export default function HabitSimMilestones({ milestones, total, color }) {
  if (!milestones?.length) return null

  return (
    <div className="hsim-milestones">
      {milestones.map((m) => {
        const hit = total >= m.at
        const Icon = getIcon(m.icon)
        return (
          <div
            key={m.at}
            className={`hsim-ms-item ${hit ? 'hit' : ''}`}
            style={{ '--hsim-accent': color }}
            title={m.label}
          >
            <div className="hsim-ms-icon">
              <Icon size={18} strokeWidth={hit ? 2.4 : 2} />
            </div>
            <span className="hsim-ms-label">{m.label}</span>
          </div>
        )
      })}
    </div>
  )
}
