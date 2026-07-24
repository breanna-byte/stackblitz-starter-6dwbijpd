import { useState } from 'react'
import { PageHeader, EmptyState, Badge } from '../components/ui'
import RecurrenceFields from '../components/RecurrenceFields'
import { emptyRecurrence } from '../lib/recurrence'
import { DocumentEditor, DocumentPreview } from '../components/DocumentView'
import { computeDocumentTotals, formatCurrency } from '../lib/calc'
import { clientLabel } from '../lib/db'

// Paid is the only status actually stored — Overdue is always derived
// from "unpaid + past its due date" so it can never drift out of sync
// with the due date the way a manually-set status could.
export function invoiceStatus(invoice) {
  if (invoice.paymentStatus === 'paid') return 'paid'
  const today = new Date().toISOString().slice(0, 10)
  if (invoice.header.dueDate && invoice.header.dueDate < today) return 'overdue'
  return 'unpaid'
}

export default function Invoices({ invoices, clients, clientById, settings, activeInvoice, onOpen, onBack, onCreate, onChange, onDelete, onDeleteSeries, onDownload }) {
  const [creating, setCreating] = useState(false)

  if (activeInvoice) {
    return (
      <InvoiceDetail
        invoice={activeInvoice} clients={clients} settings={settings}
        onChange={onChange} onBack={onBack} onDelete={onDelete} onDownload={onDownload}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track what's owed, sent, and paid."
        action={<button className="btn btn-amber" onClick={() => setCreating(true)}>+ New invoice</button>}
      />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" subtitle="Convert an estimate to an invoice, or create one directly." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Client</th><th>Issued</th><th>Due</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
              <tbody>
                {invoices.map(inv => {
                  const total = computeDocumentTotals(inv.lineItems, inv).total
                  const client = clientById(inv.clientId)
                  return (
                    <tr key={inv.id}>
                      <td className="figure">{inv.header.recordNumber}</td>
                      <td>{client ? clientLabel(client) : '—'}{inv.seriesId && <span className="series-badge">↻ recurring</span>}</td>
                      <td className="figure">{inv.header.issueDate}</td>
                      <td className="figure">{inv.header.dueDate || '—'}</td>
                      <td><Badge status={invoiceStatus(inv)} /></td>
                      <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(total)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => onDownload(inv)}>PDF</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => onOpen(inv.id)}>Open</button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(inv.id, client ? clientLabel(client) : 'this invoice')}>Delete</button>
                          {inv.seriesId && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteSeries(inv.seriesId, client ? clientLabel(client) : 'this series')}>Delete series</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <InvoiceCreateModal
          clients={clients}
          onClose={() => setCreating(false)}
          onCreate={(form) => { onCreate(form); setCreating(false) }}
        />
      )}
    </>
  )
}

function InvoiceDetail({ invoice, clients, settings, onChange, onBack, onDelete, onDownload }) {
  const [view, setView] = useState('editor')
  const status = invoiceStatus(invoice)

  function patch(partial) { onChange({ ...invoice, ...partial }) }
  function togglePaid() { patch({ paymentStatus: invoice.paymentStatus === 'paid' ? 'unpaid' : 'paid' }) }

  const dueDateField = (
    <div className="field" style={{ marginTop: 0 }}>
      <label>Due date</label>
      <input type="date" value={invoice.header.dueDate || ''}
        onChange={e => patch({ header: { ...invoice.header, dueDate: e.target.value } })} />
    </div>
  )

  return (
    <>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={onBack}>← All invoices</button>
          <h1 className="page-title">{invoice.header.recordNumber}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge status={status} />
          <button className="btn btn-ghost" onClick={togglePaid}>{invoice.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}</button>
          <button className="btn btn-ghost" onClick={() => onDownload(invoice)}>⬇ PDF</button>
          <button className="btn btn-danger-ghost" onClick={() => onDelete(invoice.id, invoice.header.client?.businessName || invoice.header.client?.contactName)}>Delete</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button className={`pill-toggle ${view === 'editor' ? 'active' : ''}`} onClick={() => setView('editor')}>Internal editor</button>
        <button className={`pill-toggle ${view === 'preview' ? 'active' : ''}`} onClick={() => setView('preview')}>Client preview</button>
      </div>

      {view === 'editor' ? (
        <DocumentEditor doc={invoice} kind="invoice" clients={clients} onChange={onChange}
          extra={<div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 18 }}>{dueDateField}</div>} />
      ) : (
        <DocumentPreview doc={invoice} kind="invoice" settings={settings} />
      )}
    </>
  )
}

function InvoiceCreateModal({ clients, onClose, onCreate }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [recurrence, setRecurrence] = useState(emptyRecurrence())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>New invoice</h2>
        <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="field"><label>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Issue date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
            <div className="field"><label>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          </div>
          <RecurrenceFields recurrence={recurrence} onChange={setRecurrence} disabled={!issueDate} />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-400)', marginTop: 10 }}>
          Line items are added next, in the invoice editor.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!clientId}
            onClick={() => onCreate({ clientId, issueDate, dueDate, recurrence })}>
            Create invoice
          </button>
        </div>
      </div>
    </div>
  )
}
