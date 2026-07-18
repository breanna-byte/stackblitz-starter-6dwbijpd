import { useMemo, useState } from 'react'
import { PageHeader, EmptyState, TimeInput24 } from '../components/ui'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Schedule({ events, addEvent: onAddEvent, removeEvent: onRemoveEvent, jobs, transactions, clientById }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [modalDate, setModalDate] = useState(null)
  const [form, setForm] = useState({ title: '', time: '09:00' })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthGrid(year, month), [year, month])

  const itemsByDate = useMemo(() => {
    const map = {}
    const push = (date, item) => { if (!map[date]) map[date] = []; map[date].push(item) }

    events.forEach(ev => push(ev.date, { kind: 'event', id: ev.id, label: ev.time ? `${ev.time} ${ev.title}` : ev.title }))

    jobs.forEach(j => {
      if (j.start) push(j.start, { kind: 'job', label: `Job starts: ${j.title}` })
      if (j.end) push(j.end, { kind: 'job', label: `Job ends: ${j.title}` })
    })

    transactions.filter(t => t.type === 'bill' && t.status === 'unpaid' && t.dueDate).forEach(t => {
      push(t.dueDate, { kind: 'bill', label: `Bill due: ${t.vendorOrSource || t.category}` })
    })

    return map
  }, [events, jobs, transactions])

  function addEvent(date) {
    if (!form.title.trim()) return
    onAddEvent({ title: form.title.trim(), date, time: form.time, clientId: null })
    setForm({ title: '', time: '09:00' })
    setModalDate(null)
  }

  function removeEvent(id) {
    onRemoveEvent(id)
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Site visits, deliveries, job dates, and bill due dates in one calendar."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>← Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next →</button>
          </div>
        }
      />

      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <div className="cal-grid cal-dow">
          {DOW.map(d => <div key={d} className="cal-dow-cell">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((day, idx) => {
            const dateStr = day ? toDateStr(year, month, day) : null
            const items = dateStr ? (itemsByDate[dateStr] || []) : []
            return (
              <div
                key={idx}
                className={`cal-cell ${!day ? 'cal-cell-empty' : ''} ${dateStr === todayStr ? 'cal-cell-today' : ''}`}
                onClick={() => day && setModalDate(dateStr)}
              >
                {day && <div className="cal-daynum">{day}</div>}
                {items.slice(0, 3).map((it, i) => (
                  <div key={i} className={`cal-chip cal-chip-${it.kind}`}>{it.label}</div>
                ))}
                {items.length > 3 && <div className="cal-more">+{items.length - 3} more</div>}
              </div>
            )
          })}
        </div>
      </div>

      {modalDate && (
        <div className="modal-backdrop" onClick={() => setModalDate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modalDate}</h2>

            {(itemsByDate[modalDate] || []).length === 0 && (
              <EmptyState title="Nothing scheduled" subtitle="Add an appointment or reminder for this day." />
            )}
            {(itemsByDate[modalDate] || []).map((it, i) => (
              <div key={i} className={`cal-chip cal-chip-${it.kind}`} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{it.label}</span>
                {it.kind === 'event' && (
                  <button className="icon-btn" onClick={() => removeEvent(it.id)} title="Delete appointment">✕</button>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--paper-line)', marginTop: 16, paddingTop: 16 }}>
              <div className="field-row" style={{ gridTemplateColumns: '1fr 110px' }}>
                <div className="field">
                  <label>Add appointment</label>
                  <input placeholder="e.g. Site walk - client name" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="field">
                  <label>Time (24h)</label>
                  <TimeInput24 value={form.time} onChange={time => setForm({ ...form, time })} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => addEvent(modalDate)}>Add to calendar</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setModalDate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
