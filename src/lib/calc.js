// Shared document engine behind both Estimates and Invoices — same header
// + line-item shape, same calculation, so the two pages stay structurally
// identical and any fix here applies to both at once.
//
// A document's line items store raw *cost* (qty × unit cost), not a
// customer-facing price — markup is applied once, at the whole-document
// level, via markupPct. That's a deliberate difference from a per-line
// markup model: it makes "what's my margin on this job" a single number
// instead of a per-line average, and it's what lets the Client Preview
// hide unit costs entirely while still showing an honest per-line price
// (see previewLinePrice below).

export const CATEGORIES = ['Labor', 'Materials', 'Subcontractor', 'Equipment']

export function emptyLineItem(category = 'Labor') {
  return { id: crypto.randomUUID(), description: '', unitType: '', qty: 1, unitCost: 0, category }
}

export function lineItemTotal(item) {
  return (Number(item.qty) || 0) * (Number(item.unitCost) || 0)
}

// The price a client sees for one line: its cost-basis total, scaled by
// the same markup % applied to the whole document, so line prices always
// add up to the document's priced subtotal without exposing raw cost.
export function previewLinePrice(item, markupPct) {
  return lineItemTotal(item) * (1 + (Number(markupPct) || 0) / 100)
}

export function computeDocumentTotals(lineItems, { markupPct = 0, taxRate = 0 } = {}) {
  const subtotal = lineItems.reduce((sum, it) => sum + lineItemTotal(it), 0)
  const markupAmount = subtotal * (Number(markupPct) / 100)
  const pricedSubtotal = subtotal + markupAmount
  const taxAmount = pricedSubtotal * (Number(taxRate) / 100)
  const total = pricedSubtotal + taxAmount

  return {
    subtotal,       // raw cost basis (internal only — never shown to the client)
    markupAmount,   // == profit
    pricedSubtotal, // what the client sees as "Subtotal"
    taxAmount,
    total,
    profit: markupAmount,
  }
}

export function emptyHeader({ recordNumber = '', client = null, issueDate = null, dueDate = null } = {}) {
  return {
    recordNumber,
    issueDate: issueDate || new Date().toISOString().slice(0, 10),
    dueDate,
    // A snapshot of the client's details at creation time, not a live
    // reference — so an old estimate/invoice still shows who it was
    // actually sent to even if that client's info changes (or the client
    // is deleted) later. Company info is deliberately NOT snapshotted
    // here; both views read it live from Settings, same as PDF export
    // already did, so a business-info fix applies to every document.
    client: client ? {
      contactName: client.contactName, businessName: client.businessName || '',
      email: client.email || '', phone: client.phone || '', address: client.address || '',
    } : null,
  }
}

// e.g. nextRecordNumber('EST', estimates) -> 'EST-0007'. Based on the
// highest existing number rather than list length, so deleting a record
// never causes the next one created to reuse a number.
export function nextRecordNumber(prefix, existingList) {
  const max = existingList.reduce((m, doc) => {
    const n = Number((doc.header?.recordNumber || '').split('-')[1])
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

export function formatCurrency(n) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
