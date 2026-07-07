export default function HabitSimProfileForm({ questions, profile, onChange, accent }) {
  if (!questions?.length) return null

  return (
    <div className="hsim-profile panel" style={{ '--hsim-accent': accent }}>
      <h3>Your stats</h3>
      <p className="hsim-profile-sub">Personalize projections to your body & goals.</p>
      <div className="hsim-profile-grid">
        {questions.map((q) => (
          <label key={q.id} className="hsim-profile-field">
            <span>
              {q.label}
              {q.required && <em> *</em>}
            </span>
            <div className="hsim-profile-input">
              <input
                type="number"
                min={q.min}
                max={q.max}
                step="any"
                value={profile[q.id] ?? q.default}
                onChange={(e) => onChange({ ...profile, [q.id]: Number(e.target.value) })}
              />
              {q.unit && <span className="hsim-profile-unit">{q.unit}</span>}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
