import { Home, FolderOpen, Scale, ListChecks, Flame, Clock4 } from 'lucide-react'

const nav = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'days', label: 'My Days', icon: FolderOpen },
  { id: 'weight', label: 'Protein Tracker', icon: Scale },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'streaks', label: 'Streaks', icon: Flame },
]

export default function Sidebar({ active, onNavigate, open, dayTypes, onPickDay, tasksBadge }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Clock4 size={20} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-name">Zeity</div>
          <div className="brand-sub">Habit Switcher</div>
        </div>
      </div>

      <nav className="nav">
        {nav.map((item) => {
          const Icon = item.icon
          const badge = item.id === 'tasks' ? tasksBadge : item.badge
          return (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </button>
          )
        })}
      </nav>

      <div className="nav-label">Day Types</div>
      <nav className="nav">
        {dayTypes.map((d) => (
          <button key={d.id} className="nav-item" onClick={() => onPickDay(d.id)}>
            <span
              className="nav-swatch"
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                background: `linear-gradient(140deg, ${d.gradient[0]}, ${d.gradient[1]})`,
                flexShrink: 0,
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.name}
            </span>
            <span className="nav-dot" style={{ background: d.color }} />
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="profile">
        <div className="avatar">Z</div>
        <div>
          <div className="profile-name">Zeity</div>
          <div className="profile-plan">
            {dayTypes.length ? `${dayTypes.length} day type${dayTypes.length === 1 ? '' : 's'}` : 'No day types yet'}
          </div>
        </div>
      </div>
    </aside>
  )
}
