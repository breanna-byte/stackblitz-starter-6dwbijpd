import { useState } from 'react'
import { PageHeader, EmptyState, Badge, STATUS_LABEL } from '../components/ui'
import { DocumentEditor, DocumentPreview } from '../components/DocumentView'
import { computeDocumentTotals, formatCurrency } from '../lib/calc'
import { clientLabel } from '../lib/db'

export default function Estimates({ estimates, clients, clientById, settings, activeEstimate, onOpen, onBack, onNew, onChange, onDelete, onConvertJob, onConvertInvoice, onDownload }) {
  if (!activeEstimate) {
    return (
      <EstimateList
        estimates={estimates} clientById={clientById}
        onOpen={onOpen} onNew={onNew} onDelete={onDelete} onDownload={onDownload}
      />
    )
  }
  return (
    <EstimateDetail
      estimate={activeEstimate} clients={clients} settings={settings}
      onChange={onChange} onBack={onBack}
      onConvertJob={onConvertJob} onConvertInvoice={onConvertInvoice}
      onDelete={onDelete} onDownload={onDownload}
    />
  )
}

function EstimateList({ estimates, clientById, onOpen, onNew, onDelete, onDownload }) {
  return (
    <>
      <PageHeader
        title="Estimates & Bids"
        subtitle="Build a quote and watch cost, margin, and tax calculate live."
        action={<button className="btn btn-amber" onClick={onNew}>+ New estimate</button>}
      />

      {estimates.length === 0 ? (
        <EmptyState title="No estimates yet" subtitle="Create your first estimate to start quoting jobs." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Client</th><th>Title</th><th>Issued</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
              </thead>
              <tbody>
                {estimates.map(e => {
                  const t = computeDocumentTotals(e.lineItems, e)
                  return (
                    <tr key={e.id}>
                      <td className="figure">{e.header.recordNumber}</td>
                      <td>{clientById(e.clientId) ? clientLabel(clientById(e.clientId)) : '—'}</td>
                      <td>{e.title}</td>
                      <td className="figure">{e.header.issueDate}</td>
                      <td><Badge status={e.status} /></td>
                      <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(t.total)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => onDownload(e)}>PDF</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => onOpen(e.id)}>Open</button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(e.id, e.title)}>Delete</button>
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
    </>
  )
}

function EstimateDetail({ estimate, clients, settings, onChange, onBack, onConvertJob, onConvertInvoice, onDelete, onDownload }) {
  const [view, setView] = useState('editor')

  function patch(partial) { onChange({ ...estimate, ...partial }) }

  return (
    <>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={onBack}>← All estimates</button>
          <input
            className="page-title"
            style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'var(--font-display)', width: '100%' }}
            value={estimate.title}
            onChange={e => patch({ title: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <select value={estimate.status} onChange={e => patch({ status: e.target.value })} style={{ maxWidth: 140 }}>
            {['draft', 'sent', 'accepted', 'declined'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={() => onDownload(estimate)}>⬇ PDF</button>
          <button className="btn btn-ghost" onClick={() => onConvertJob(estimate)}>Convert to job</button>
          <button className="btn btn-primary" onClick={() => onConvertInvoice(estimate)}>Convert to invoice</button>
          <button className="btn btn-danger-ghost" onClick={() => onDelete(estimate.id, estimate.title)}>Delete</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button className={`pill-toggle ${view === 'editor' ? 'active' : ''}`} onClick={() => setView('editor')}>Internal editor</button>
        <button className={`pill-toggle ${view === 'preview' ? 'active' : ''}`} onClick={() => setView('preview')}>Client preview</button>
      </div>

      {view === 'editor' ? (
        <DocumentEditor doc={estimate} kind="estimate" clients={clients} onChange={onChange} />
      ) : (
        <DocumentPreview doc={estimate} kind="estimate" settings={settings} />
      )}
    </>
  )
}
