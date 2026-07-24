import { useState } from 'react'
import { PageHeader, EmptyState, Stat, STATUS_LABEL } from '../components/ui'
import RecurrenceFields from '../components/RecurrenceFields'
import { emptyRecurrence } from '../lib/recurrence'
import { computeDocumentTotals, formatCurrency } from '../lib/calc'
import { clientLabel } from '../lib/db'

export default function Jobs({ jobs, clients, clientById, estimates, addJob, updateJob, onDelete, onDeleteSeries }) {
  const [detailJob, setDetailJob] = useState(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Schedule and track work through completion."
        action={<button className="btn btn-amber" onClick={() => setCreating(true)}>+ New job</button>}
      />
      {jobs.length === 0 ? (
        <EmptyState title="No jobs scheduled" subtitle="Convert an accepted estimate into a job, or create one directly." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Job</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>{clientById(j.clientId) ? clientLabel(clientById(j.clientId)) : '—'}</td>
                    <td>{j.title}{j.seriesId && <span className="series-badge">↻ recurring</span>}</td>
                    <td className="figure">{j.start || '—'}</td>
                    <td className="figure">{j.end || '—'}</td>
                    <td>
                      <select value={j.status} onChange={e => updateJob(j.id, { status: e.target.value })}
                        style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13 }}>
                        {['scheduled', 'in_progress', 'complete'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailJob(j)}>Open</button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(j.id, j.title)}>Delete</button>
                        {j.seriesId && (
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteSeries(j.seriesId, j.title)}>Delete series</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailJob && (
        <JobDetail
          job={jobs.find(j => j.id === detailJob.id) || detailJob}
          clients={clients}
          estimates={estimates}
          onClose={() => setDetailJob(null)}
          onSave={(partial) => { updateJob(detailJob.id, partial); setDetailJob(null) }}
        />
      )}

      {creating && (
        <JobModal
          clients={clients}
          onClose={() => setCreating(false)}
          onSave={(form) => { addJob(form); setCreating(false) }}
        />
      )}
    </>
  )
}

function JobModal({ clients, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', clientId: clients[0]?.id ?? '', start: '', end: '' })
  const [recurrence, setRecurrence] = useState(emptyRecurrence())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>New job</h2>
        <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="field"><label>Job title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Client</label>
            <select value={form.clientId ?? ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Start date</label>
              <input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></div>
            <div className="field"><label>End date</label>
              <input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <RecurrenceFields recurrence={recurrence} onChange={setRecurrence} disabled={!form.start} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.title || !form.clientId}
            onClick={() => onSave({ ...form, recurrence })}>
            Create job
          </button>
        </div>
      </div>
    </div>
  )
}

function emptyChecklistItem() { return { id: crypto.randomUUID(), text: '', done: false } }
function emptyReminder() { return { id: crypto.randomUUID(), text: '' } }
function emptyMaterial() { return { id: crypto.randomUUID(), name: '', qty: '' } }

function JobDetail({ job, clients, estimates, onClose, onSave }) {
  const [form, setForm] = useState({
    title: job.title, clientId: job.clientId, status: job.status,
    start: job.start || '', end: job.end || '',
    notes: job.notes || '',
    reminders: job.reminders || [],
    checklist: job.checklist || [],
    materials: job.materials || [],
  })

  const estimate = estimates.find(e => e.id === job.estimateId) || null
  const totals = estimate ? computeDocumentTotals(estimate.lineItems, estimate) : null
  const estimatedHours = estimate
    ? estimate.lineItems.filter(it => it.category === 'Labor').reduce((s, it) => s + (Number(it.qty) || 0), 0)
    : 0

  function patch(partial) { setForm(f => ({ ...f, ...partial })) }

  function updateListItem(key, id, itemPartial) {
    patch({ [key]: form[key].map(it => it.id === id ? { ...it, ...itemPartial } : it) })
  }
  function removeListItem(key, id) {
    patch({ [key]: form[key].filter(it => it.id !== id) })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <h2>{job.title}{job.seriesId && <span className="series-badge">↻ recurring</span>}</h2>

        <div className="field-row" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div className="field"><label>Job title</label>
            <input value={form.title} onChange={e => patch({ title: e.target.value })} /></div>
          <div className="field"><label>Client</label>
            <select value={form.clientId ?? ''} onChange={e => patch({ clientId: e.target.value })}>
              {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
          </div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={e => patch({ status: e.target.value })}>
              {['scheduled', 'in_progress', 'complete'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
          <div className="field"><label>Start date</label>
            <input type="date" value={form.start} onChange={e => patch({ start: e.target.value })} /></div>
          <div className="field"><label>End date</label>
            <input type="date" value={form.end} onChange={e => patch({ end: e.target.value })} /></div>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 16 }}>
          <Stat label="Estimated hours" value={estimate ? estimatedHours : '—'} color="var(--ink-700)" />
          <Stat label="Predicted billing" value={estimate ? formatCurrency(totals.total) : '—'} color="var(--green)" />
          <Stat label="Predicted profit" value={estimate ? formatCurrency(totals.profit) : '—'} color="var(--amber-dark)" />
        </div>
        {!estimate && (
          <p style={{ fontSize: 11.5, color: 'var(--text-400)', marginTop: 6 }}>
            Not linked to an estimate, so hours/billing/profit can't be pulled in automatically.
          </p>
        )}

        <div className="field" style={{ marginTop: 16 }}>
          <label>Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => patch({ notes: e.target.value })} />
        </div>

        <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12, alignItems: 'start' }}>
          <div className="field">
            <label>Important reminders</label>
            {form.reminders.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={r.text} onChange={e => updateListItem('reminders', r.id, { text: e.target.value })}
                  placeholder="e.g. Get gate code from client" />
                <button className="icon-btn" onClick={() => removeListItem('reminders', r.id)} title="Remove">✕</button>
              </div>
            ))}
            <button className="add-row-btn" style={{ marginTop: 8 }}
              onClick={() => patch({ reminders: [...form.reminders, emptyReminder()] })}>+ Add reminder</button>
          </div>

          <div className="field">
            <label>Checklist / to-dos</label>
            {form.checklist.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={c.done} onChange={e => updateListItem('checklist', c.id, { done: e.target.checked })} />
                <input value={c.text} onChange={e => updateListItem('checklist', c.id, { text: e.target.value })}
                  placeholder="e.g. Haul away old flooring" />
                <button className="icon-btn" onClick={() => removeListItem('checklist', c.id)} title="Remove">✕</button>
              </div>
            ))}
            <button className="add-row-btn" style={{ marginTop: 8 }}
              onClick={() => patch({ checklist: [...form.checklist, emptyChecklistItem()] })}>+ Add checklist item</button>
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Tools / materials needed</label>
          {form.materials.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={m.name} onChange={e => updateListItem('materials', m.id, { name: e.target.value })}
                placeholder="e.g. Concrete mix" style={{ flex: 2 }} />
              <input value={m.qty} onChange={e => updateListItem('materials', m.id, { qty: e.target.value })}
                placeholder="Qty (e.g. 10 bags)" style={{ flex: 1 }} />
              <button className="icon-btn" onClick={() => removeListItem('materials', m.id)} title="Remove">✕</button>
            </div>
          ))}
          <button className="add-row-btn" style={{ marginTop: 8 }}
            onClick={() => patch({ materials: [...form.materials, emptyMaterial()] })}>+ Add item</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.title || !form.clientId} onClick={() => onSave(form)}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
