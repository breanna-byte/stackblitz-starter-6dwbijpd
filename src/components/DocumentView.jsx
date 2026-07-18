import {
  CATEGORIES, emptyLineItem, lineItemTotal, previewLinePrice,
  computeDocumentTotals, formatCurrency,
} from '../lib/calc'
import { clientLabel } from '../lib/db'

// The Internal Editor View: full editable grid (qty, unit cost, category),
// an internal-only cost/markup/tax ticker, terms. Shared by both the
// Estimates and Invoices pages so a change here applies to both — see
// "extra" for the handful of invoice-only fields (due date today).
export function DocumentEditor({ doc, kind, clients, onChange, extra }) {
  const totals = computeDocumentTotals(doc.lineItems, doc)

  function patch(partial) { onChange({ ...doc, ...partial }) }
  function patchHeader(partial) { patch({ header: { ...doc.header, ...partial } }) }

  function changeClient(clientId) {
    const client = clients.find(c => c.id === clientId)
    patch({ clientId })
    patchHeader({ client: client ? { contactName: client.contactName, businessName: client.businessName || '', email: client.email || '', phone: client.phone || '', address: client.address || '' } : null })
  }

  function updateItem(id, partial) {
    patch({ lineItems: doc.lineItems.map(it => it.id === id ? { ...it, ...partial } : it) })
  }
  function removeItem(id) {
    patch({ lineItems: doc.lineItems.filter(it => it.id !== id) })
  }
  function addItem() {
    patch({ lineItems: [...doc.lineItems, emptyLineItem()] })
  }

  return (
    <>
      <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 18 }}>
        <div className="field">
          <label>Client</label>
          <select value={doc.clientId ?? ''} onChange={e => changeClient(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{kind === 'invoice' ? 'Invoice' : 'Estimate'} #</label>
          <input className="figure" value={doc.header.recordNumber} disabled />
        </div>
        <div className="field">
          <label>Issue date</label>
          <input type="date" value={doc.header.issueDate} onChange={e => patchHeader({ issueDate: e.target.value })} />
        </div>
      </div>

      {extra}

      <div className="builder-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Line items</strong>
          </div>
          <div className="table-wrap">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Description</th>
                  <th style={{ width: 90 }}>Unit</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 100 }}>Unit cost</th>
                  <th style={{ width: 150 }}>Category</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Total</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {doc.lineItems.map(it => (
                  <tr key={it.id}>
                    <td><input type="text" placeholder="What is this line for?" value={it.description}
                      onChange={e => updateItem(it.id, { description: e.target.value })} /></td>
                    <td><input type="text" placeholder="hrs, sq ft…" value={it.unitType}
                      onChange={e => updateItem(it.id, { unitType: e.target.value })} /></td>
                    <td><input type="number" value={it.qty} onChange={e => updateItem(it.id, { qty: e.target.value })} /></td>
                    <td><input type="number" value={it.unitCost} onChange={e => updateItem(it.id, { unitCost: e.target.value })} /></td>
                    <td>
                      <select value={it.category} onChange={e => updateItem(it.id, { category: e.target.value })}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="line-total" style={{ textAlign: 'right' }}>{formatCurrency(lineItemTotal(it))}</td>
                    <td><button className="icon-btn" onClick={() => removeItem(it.id)} title="Remove line">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="add-row-btn" onClick={addItem}>+ Add line item</button>

          <div className="field-row" style={{ gridTemplateColumns: '1fr', marginTop: 18 }}>
            <div className="field">
              <label>Terms &amp; conditions (shown on the client preview and PDF)</label>
              <textarea rows={3} value={doc.terms || ''} onChange={e => patch({ terms: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="ticker">
          <div className="ticker-title">Internal cost &amp; margin (not shown to client)</div>
          <div className="ticker-row"><span>Cost subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
          <div className="ticker-row" style={{ alignItems: 'center' }}>
            <span>Markup for profit (%)</span>
            <input type="number" step="1" className="figure" style={{ width: 70, textAlign: 'right' }}
              value={doc.markupPct} onChange={e => patch({ markupPct: Number(e.target.value) })} />
          </div>
          <div className="ticker-row"><span>Priced subtotal</span><span>{formatCurrency(totals.pricedSubtotal)}</span></div>
          <div className="ticker-row" style={{ alignItems: 'center' }}>
            <span>Local sales tax (%)</span>
            <input type="number" step="0.1" className="figure" style={{ width: 70, textAlign: 'right' }}
              value={doc.taxRate} onChange={e => patch({ taxRate: Number(e.target.value) })} />
          </div>
          <div className="ticker-total">
            <span>Total</span>
            <span className="amt">{formatCurrency(totals.total)}</span>
          </div>
          <div className="margin-note">
            Profit {formatCurrency(totals.profit)} on this {kind}. The client preview and PDF only ever show the priced subtotal, tax, and total — never cost or markup %.
          </div>
        </div>
      </div>
    </>
  )
}

// The Client Preview View: clean, print-ready — no unit costs, quantities,
// or category labels, just description + price per line, plus terms and a
// signature block. Company info is read live from Settings (see
// emptyHeader in lib/calc.js for why), everything else from the document.
export function DocumentPreview({ doc, kind, settings, extra }) {
  const totals = computeDocumentTotals(doc.lineItems, doc)
  const client = doc.header.client

  return (
    <div className="doc-preview">
      <div className="doc-preview-header">
        <div>
          {settings.logo && <img src={settings.logo} alt="" className="doc-preview-logo" />}
          <div className="doc-preview-company-name">{settings.businessName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-600)' }}>{settings.tagline}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-400)', marginTop: 4 }}>
            {[settings.address, settings.phone, settings.email].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="doc-preview-meta">
          <div className="doc-preview-doctype">{kind === 'invoice' ? 'INVOICE' : 'ESTIMATE'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-600)', marginTop: 4 }}>{doc.header.recordNumber}</div>
          <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 2 }}>Issued {doc.header.issueDate}</div>
          {kind === 'invoice' && doc.header.dueDate && (
            <div style={{ fontSize: 11, color: 'var(--text-400)' }}>Due {doc.header.dueDate}</div>
          )}
          {extra}
        </div>
      </div>

      {client && (
        <div>
          <div className="doc-preview-section-label">Bill to</div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{client.businessName || client.contactName}</div>
          {client.businessName && client.contactName && (
            <div style={{ fontSize: 11.5, color: 'var(--text-600)' }}>Attn: {client.contactName}</div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--text-600)' }}>{client.address}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-600)' }}>{[client.phone, client.email].filter(Boolean).join(' · ')}</div>
        </div>
      )}

      <table className="doc-preview-table">
        <thead><tr><th>Description</th><th>Price</th></tr></thead>
        <tbody>
          {doc.lineItems.map(it => (
            <tr key={it.id}>
              <td>{it.description || '—'}</td>
              <td className="figure">{formatCurrency(previewLinePrice(it, doc.markupPct))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-preview-summary">
        <div className="doc-preview-summary-block">
          <div className="doc-preview-summary-row"><span>Subtotal</span><span className="figure">{formatCurrency(totals.pricedSubtotal)}</span></div>
          <div className="doc-preview-summary-row"><span>Tax ({doc.taxRate}%)</span><span className="figure">{formatCurrency(totals.taxAmount)}</span></div>
          <div className="doc-preview-summary-row total"><span>Total</span><span className="figure">{formatCurrency(totals.total)}</span></div>
          {kind === 'invoice' && (
            <div className="doc-preview-summary-row balance">
              <span>Balance due</span>
              <span className="figure">{formatCurrency(doc.paymentStatus === 'paid' ? 0 : totals.total)}</span>
            </div>
          )}
        </div>
      </div>

      {doc.terms && <div className="doc-preview-terms">{doc.terms}</div>}
      {settings.footerNote && <div className="doc-preview-terms" style={{ fontStyle: 'italic', color: 'var(--text-900)' }}>{settings.footerNote}</div>}

      <div className="doc-preview-signature">
        <div className="doc-preview-sig-line">Client signature</div>
        <div className="doc-preview-sig-line">Date</div>
      </div>
    </div>
  )
}
