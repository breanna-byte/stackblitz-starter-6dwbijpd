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
