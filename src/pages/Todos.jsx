import { useState } from 'react'
import { PageHeader, EmptyState } from '../components/ui'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function Todos({ todos, addTodo, updateTodo, removeTodo }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [hideDone, setHideDone] = useState(false)

  function add() {
    if (!title.trim()) return
    addTodo({ title: title.trim(), done: false, dueDate, priority })
    setTitle(''); setDueDate(''); setPriority('medium')
  }

  function toggle(id) {
    const t = todos.find(t => t.id === id)
    if (t) updateTodo(id, { done: !t.done })
  }

  function remove(id) {
    removeTodo(id)
  }

  const visible = [...todos]
    .filter(t => !hideDone || !t.done)
    .sort((a, b) => (a.done - b.done) || (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || (a.dueDate || '').localeCompare(b.dueDate || ''))

  const openCount = todos.filter(t => !t.done).length

  return (
    <>
      <PageHeader title="To-Do List" subtitle={`${openCount} open task${openCount === 1 ? '' : 's'} across all jobs and clients.`} />

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-row" style={{ gridTemplateColumns: '1fr 150px 130px 100px' }}>
          <div className="field">
            <label>New task</label>
            <input placeholder="e.g. Order tile for Ortega job" value={title}
              onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn btn-amber" onClick={add}>+ Add</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <button className={`pill-toggle ${!hideDone ? 'active' : ''}`} onClick={() => setHideDone(false)}>All</button>{' '}
        <button className={`pill-toggle ${hideDone ? 'active' : ''}`} onClick={() => setHideDone(true)}>Open only</button>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="Add a task above to start tracking it." />
      ) : (
        <div className="card">
          {visible.map(t => (
            <div key={t.id} className={`todo-row ${t.done ? 'todo-done' : ''}`}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              <span className={`priority-dot priority-${t.priority}`} title={`${t.priority} priority`} />
              <span className="todo-title">{t.title}</span>
              {t.dueDate && <span className="figure todo-due">{t.dueDate}</span>}
              <button className="icon-btn" onClick={() => remove(t.id)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
