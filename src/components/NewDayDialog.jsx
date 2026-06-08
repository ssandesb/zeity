import { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Clock,
  Hourglass,
  StickyNote,
  ListChecks,
  FolderPlus,
  Check,
} from 'lucide-react'
import { getIcon, iconChoices, colorChoices } from '../icons'

let rid = 0
const newRow = (kind) => ({
  id: `r${Date.now()}_${rid++}`,
  kind,
  start: '',
  end: '',
  title: '',
  tag: '',
  note: '',
})

const tagSuggestions = ['Focus', 'Ritual', 'Break', 'Move', 'Fuel', 'Learn', 'Connect', 'Rest']

export default function NewDayDialog({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [icon, setIcon] = useState('BrainCircuit')
  const [colorIdx, setColorIdx] = useState(0)
  const [rows, setRows] = useState([])
  const [todos, setTodos] = useState([''])

  const PreviewIcon = getIcon(icon)
  const picked = colorChoices[colorIdx]

  const setRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id))
  const addRow = (kind) => setRows((rs) => [...rs, newRow(kind)])

  const setTodo = (i, v) => setTodos((t) => t.map((x, idx) => (idx === i ? v : x)))
  const addTodo = () => setTodos((t) => [...t, ''])
  const removeTodo = (i) => setTodos((t) => t.filter((_, idx) => idx !== i))

  const canSave = name.trim().length > 0

  const submit = (e) => {
    e.preventDefault()
    if (!canSave) return

    const schedule = rows
      .filter((r) =>
        r.kind === 'block' ? r.title.trim() || r.start : r.note.trim() || r.title.trim(),
      )
      .map((r) => {
        if (r.kind === 'block') {
          return {
            time: r.start || '',
            end: r.end || '',
            title: r.title.trim() || 'Untitled block',
            tag: r.tag.trim() || 'Block',
            note: r.note.trim(),
            kind: 'block',
            done: false,
          }
        }
        if (r.kind === 'buffer') {
          return {
            time: r.start || '',
            end: r.end || '',
            title: r.note.trim() || r.title.trim() || 'Buffer',
            tag: 'Buffer',
            kind: 'buffer',
            done: false,
          }
        }
        return {
          time: r.start || '',
          title: r.note.trim() || r.title.trim() || 'Note',
          tag: 'Special',
          kind: 'note',
          done: false,
        }
      })

    const cleanTodos = todos
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => ({ id: `u${Date.now()}_${i}`, text: t, done: false }))

    const day = {
      id: `${slug(name)}-${Date.now().toString(36)}`,
      name: name.trim(),
      tagline: tagline.trim() || 'A new kind of day',
      icon,
      color: picked.color,
      gradient: picked.gradient,
      completionLog: {},
      schedule,
      todos: cleanTodos,
      custom: true,
    }
    onCreate(day)
  }

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="modal-form">
          <header className="modal-head">
            <div className="mh-title">
              <div
                className="mh-icon"
                style={{ background: `linear-gradient(140deg, ${picked.gradient[0]}, ${picked.gradient[1]})` }}
              >
                <FolderPlus size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2>New Day Type</h2>
                <p>Create a folder and curate its schedule</p>
              </div>
            </div>
            <button type="button" className="mh-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div className="modal-body">
            {/* Live folder preview */}
            <div
              className="day-preview"
              style={{
                '--f1': picked.gradient[0],
                '--f2': picked.gradient[1],
                '--fshadow': picked.gradient[1] + '88',
              }}
            >
              <div className="dp-icon">
                <PreviewIcon size={20} strokeWidth={2.2} />
              </div>
              <div className="dp-text">
                <strong>{name.trim() || 'Untitled day'}</strong>
                <span>{tagline.trim() || 'Add a short tagline…'}</span>
              </div>
              <div className="dp-meta">
                {rows.filter((r) => r.kind === 'block').length} blocks ·{' '}
                {todos.filter((t) => t.trim()).length} tasks
              </div>
            </div>

            {/* 1. Folder */}
            <section className="fld-section">
              <div className="sec-label">
                <span className="sec-num">1</span> Folder
              </div>
              <div className="grid-2">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monk Mode"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Tagline</span>
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Discipline = freedom"
                  />
                </label>
              </div>

              <div className="field">
                <span>Icon</span>
                <div className="icon-picker">
                  {iconChoices.map((ic) => {
                    const Ic = getIcon(ic)
                    return (
                      <button
                        type="button"
                        key={ic}
                        className={`ic-opt ${icon === ic ? 'active' : ''}`}
                        onClick={() => setIcon(ic)}
                        style={icon === ic ? { borderColor: picked.color, color: picked.color } : {}}
                      >
                        <Ic size={18} strokeWidth={2} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="field">
                <span>Color</span>
                <div className="color-picker">
                  {colorChoices.map((c, i) => (
                    <button
                      type="button"
                      key={i}
                      className={`col-opt ${colorIdx === i ? 'active' : ''}`}
                      onClick={() => setColorIdx(i)}
                      style={{ background: `linear-gradient(140deg, ${c.gradient[0]}, ${c.gradient[1]})` }}
                      aria-label={`Color ${i + 1}`}
                    >
                      {colorIdx === i && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. Schedule */}
            <section className="fld-section">
              <div className="sec-label">
                <span className="sec-num">2</span> Daily Schedule
                <span className="sec-hint">time ranges, buffers & specials</span>
              </div>

              <div className="row-builder">
                {rows.map((r) => (
                  <div key={r.id} className={`build-row ${r.kind}`}>
                    {r.kind === 'block' && (
                      <>
                        <input
                          type="time"
                          className="t-in"
                          value={r.start}
                          onChange={(e) => setRow(r.id, { start: e.target.value })}
                        />
                        <span className="t-dash">–</span>
                        <input
                          type="time"
                          className="t-in"
                          value={r.end}
                          onChange={(e) => setRow(r.id, { end: e.target.value })}
                        />
                        <input
                          className="title-in"
                          value={r.title}
                          onChange={(e) => setRow(r.id, { title: e.target.value })}
                          placeholder="What's happening?"
                        />
                        <input
                          className="tag-in"
                          list="tag-suggest"
                          value={r.tag}
                          onChange={(e) => setRow(r.id, { tag: e.target.value })}
                          placeholder="Tag"
                        />
                      </>
                    )}

                    {r.kind === 'buffer' && (
                      <>
                        <span className="row-badge buffer">
                          <Hourglass size={13} strokeWidth={2.4} /> Buffer
                        </span>
                        <input
                          className="title-in wide"
                          value={r.note}
                          onChange={(e) => setRow(r.id, { note: e.target.value })}
                          placeholder="e.g. 30 min buffer before sleep"
                        />
                      </>
                    )}

                    {r.kind === 'note' && (
                      <>
                        <span className="row-badge note">
                          <StickyNote size={13} strokeWidth={2.4} /> Special
                        </span>
                        <input
                          className="title-in wide"
                          value={r.note}
                          onChange={(e) => setRow(r.id, { note: e.target.value })}
                          placeholder="e.g. 8 hrs sleep · sleep by 9:30"
                        />
                      </>
                    )}

                    <button
                      type="button"
                      className="row-del"
                      onClick={() => removeRow(r.id)}
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <datalist id="tag-suggest">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <div className="add-row-btns">
                <button type="button" className="add-pill" onClick={() => addRow('block')}>
                  <Clock size={15} /> Time block
                </button>
                <button type="button" className="add-pill" onClick={() => addRow('buffer')}>
                  <Hourglass size={15} /> Buffer zone
                </button>
                <button type="button" className="add-pill" onClick={() => addRow('note')}>
                  <StickyNote size={15} /> Note / Special
                </button>
              </div>
            </section>

            {/* 3. Tasks */}
            <section className="fld-section">
              <div className="sec-label">
                <span className="sec-num">3</span> Keep List
                <span className="sec-hint">things to check off</span>
              </div>
              <div className="todo-builder">
                {todos.map((t, i) => (
                  <div className="todo-row" key={i}>
                    <ListChecks size={15} className="tr-icon" />
                    <input
                      value={t}
                      onChange={(e) => setTodo(i, e.target.value)}
                      placeholder={`Task ${i + 1}`}
                    />
                    {todos.length > 1 && (
                      <button
                        type="button"
                        className="row-del"
                        onClick={() => removeTodo(i)}
                        aria-label="Remove task"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-pill ghost" onClick={addTodo}>
                  <Plus size={15} /> Add task
                </button>
              </div>
            </section>
          </div>

          <footer className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSave}
              style={!canSave ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <FolderPlus size={16} strokeWidth={2.4} />
              <span>Create Day Type</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function slug(s) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'day'
  )
}
