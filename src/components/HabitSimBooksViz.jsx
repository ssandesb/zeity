import { BookOpen } from 'lucide-react'

export default function HabitSimBooksViz({ total, threshold = 250, color, label }) {
  const books = Math.min(20, Math.max(1, Math.round(total / threshold)))
  const partial = (total % threshold) / threshold

  return (
    <div className="hsim-books-viz" style={{ '--hsim-accent': color }}>
      <div className="hsim-books-stack">
        {Array.from({ length: Math.min(books, 12) }).map((_, i) => (
          <BookOpen
            key={i}
            size={28 - (i % 4) * 2}
            strokeWidth={2}
            className="hsim-book-icon"
            style={{
              opacity: 0.5 + (i / 12) * 0.5,
              transform: `translateX(${(i % 3) * 4}px) rotate(${(i % 5) - 2}deg)`,
            }}
          />
        ))}
        {partial > 0.1 && books <= 12 && (
          <div className="hsim-book-partial" style={{ width: `${partial * 100}%` }} />
        )}
      </div>
      {label && <p className="hsim-viz-caption">{label}</p>}
    </div>
  )
}
