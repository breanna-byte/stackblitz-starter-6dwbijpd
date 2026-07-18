export const STATUS_LABEL = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined',
  scheduled: 'Scheduled', in_progress: 'In progress', complete: 'Complete',
  paid: 'Paid', overdue: 'Overdue', unpaid: 'Unpaid', recorded: 'Recorded',
}

export function Stat({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-accent" style={{ background: color }} />
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="card empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

// Military-time-only time picker (e.g. "23:00") — deliberately not the
// native <input type="time">, whose picker widget shows 12-hour AM/PM in
// some browsers/locales regardless of the underlying value, which is the
// opposite of what a fixed 24-hour display is supposed to guarantee.
export function TimeInput24({ value, onChange }) {
  const [h, m] = (value || '00:00').split(':')
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select className="figure" value={HOURS.includes(h) ? h : '00'} onChange={e => onChange(`${e.target.value}:${m}`)}>
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span>:</span>
      <select className="figure" value={MINUTES.includes(m) ? m : '00'} onChange={e => onChange(`${h}:${e.target.value}`)}>
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-600)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn btn-danger-ghost' : 'btn btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
