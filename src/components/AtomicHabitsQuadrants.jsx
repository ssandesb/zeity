import { getIcon } from '../icons'

function RockSvg({ tone, size = 48, pump = 0 }) {
  const scale = 1 + pump * 0.06
  return (
    <svg
      className="ahq-rock"
      viewBox="0 0 56 48"
      width={size}
      height={size * (48 / 56)}
      aria-hidden
      style={{ '--ahq-rock-scale': scale, '--ahq-rock-tone': tone }}
    >
      <ellipse cx="28" cy="40" rx="18" ry="5" fill="currentColor" opacity="0.15" />
      <path
        d="M12 32 C10 22, 18 10, 28 8 C38 10, 46 22, 44 32 C42 38, 14 38, 12 32 Z"
        fill={tone}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      <path
        d="M20 18 C22 14, 30 12, 34 16"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StackedRocks({ quadrants, accent }) {
  return (
    <div className="ahq-stack" aria-hidden>
      {quadrants.map((q, i) => (
        <div
          key={q.law}
          className="ahq-stack-rock"
          style={{
            '--ahq-stack-i': i,
            '--ahq-rock-tone': q.rockTone,
            '--ahq-accent': accent,
          }}
        >
          <RockSvg tone={q.rockTone} size={36} pump={i} />
        </div>
      ))}
    </div>
  )
}

const COPY = {
  build: {
    title: 'Atomic Habits · 4 laws to start & stick',
    subtitle: (name) => (
      <>
        James Clear&apos;s loop — <strong>Cue → Craving → Response → Reward</strong> — tuned to build{' '}
        <em>{name}</em>.
      </>
    ),
    footnote: 'Stack all four rocks — obvious, attractive, easy, satisfying — and the habit sticks.',
    suggestionLabel: 'Start here',
  },
  break: {
    title: 'Atomic Habits · 4 laws inverted',
    subtitle: (name) => (
      <>
        James Clear&apos;s habit loop — <strong>Cue → Craving → Response → Reward</strong> — flipped to
        break <em>{name}</em>.
      </>
    ),
    footnote: 'Each rock is one lever — stack all four and the habit loop loses its grip.',
    suggestionLabel: 'Your move',
  },
}

export default function AtomicHabitsQuadrants({
  quadrants,
  habitName,
  accent = '#34d399',
  mode = 'break',
}) {
  if (!quadrants?.length) return null

  const copy = COPY[mode] || COPY.break
  const isBuild = mode === 'build'

  return (
    <section className={`panel ahq-panel ${isBuild ? 'ahq-panel--build' : ''}`}>
      <header className="ahq-head">
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.subtitle(habitName)}</p>
        </div>
        <StackedRocks quadrants={quadrants} accent={accent} />
      </header>

      <div className="ahq-grid">
        {quadrants.map((q, i) => {
          const Icon = getIcon(q.icon)
          const headline = isBuild ? q.buildLaw : q.breakLaw
          return (
            <article
              key={q.law}
              className={`ahq-quadrant ahq-quadrant--${q.law} ${isBuild ? 'ahq-quadrant--build' : ''}`}
              style={{ '--ahq-accent': accent, '--ahq-i': i }}
            >
              <div className="ahq-quadrant-top">
                <div className="ahq-quadrant-rock-wrap">
                  <RockSvg tone={q.rockTone} size={44} pump={i} />
                  <span className="ahq-law-num">{q.law}</span>
                </div>
                <div className="ahq-quadrant-meta">
                  <span className="ahq-loop-step">{q.loopStep}</span>
                  <h4>{headline}</h4>
                  {!isBuild && q.buildLaw && (
                    <span className="ahq-build-ref">Build: {q.buildLaw}</span>
                  )}
                </div>
                <Icon size={20} strokeWidth={2.2} className="ahq-quadrant-icon" />
              </div>
              <p className="ahq-framework">{q.framework}</p>
              <div className="ahq-suggestion">
                <strong>{copy.suggestionLabel}</strong>
                <p>{q.suggestion}</p>
              </div>
            </article>
          )
        })}
      </div>

      <p className="ahq-footnote">{copy.footnote}</p>
    </section>
  )
}
