import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { previewLinePrice, computeDocumentTotals, formatCurrency } from './calc'

// The PDF is the client-facing deliverable, so it mirrors the Client
// Preview view exactly: description + price per line, never unit cost,
// quantity, or category — see src/components/DocumentView.jsx.

function hexToRgb(hex) {
  const clean = (hex || '#F2A31F').replace('#', '')
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function drawHeader(doc, settings, docLabel, docMeta) {
  const accent = hexToRgb(settings.accentColor)
  const pageWidth = doc.internal.pageSize.getWidth()
  let logoBottom = 20

  if (settings.logo) {
    try {
      const format = /^data:image\/jpe?g/i.test(settings.logo) ? 'JPEG' : 'PNG'
      doc.addImage(settings.logo, format, 40, 32, 56, 56, undefined, 'FAST')
      logoBottom = 32 + 56
    } catch {
      // unsupported image format for this jsPDF build — skip silently, text header still renders
    }
  }

  const textX = settings.logo ? 108 : 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(20, 24, 28)
  doc.text(settings.businessName || 'Your Business', textX, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(90, 96, 107)
  const infoLines = [settings.tagline, settings.address, [settings.phone, settings.email].filter(Boolean).join('  ·  '), settings.website]
    .filter(Boolean)
  infoLines.forEach((line, i) => doc.text(line, textX, 64 + i * 12))

  // Document label, right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...accent)
  doc.text(docLabel, pageWidth - 40, 50, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(90, 96, 107)
  docMeta.forEach((line, i) => doc.text(line, pageWidth - 40, 68 + i * 12, { align: 'right' }))

  const ruleY = Math.max(logoBottom, 64 + infoLines.length * 12) + 14
  doc.setDrawColor(...accent)
  doc.setLineWidth(1.5)
  doc.line(40, ruleY, pageWidth - 40, ruleY)

  return ruleY + 20
}

function drawClientBlock(doc, y, client) {
  if (!client) return y

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(140, 145, 150)
  doc.text('BILL TO', 40, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20, 24, 28)
  doc.text(client.businessName || client.contactName || 'Client', 40, y + 16)

  doc.setFontSize(9.5)
  doc.setTextColor(90, 96, 107)
  const attn = client.businessName && client.contactName ? `Attn: ${client.contactName}` : null
  const lines = [attn, client.address, client.phone, client.email].filter(Boolean)
  lines.forEach((line, i) => doc.text(line, 40, y + 32 + i * 12))

  return y + 32 + lines.length * 12 + 20
}

function drawTotalsBlock(doc, y, rows, accent, pageWidth) {
  const x = pageWidth - 220
  let cursorY = y
  rows.forEach(([label, value, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 12 : 10)
    doc.setTextColor(bold ? 20 : 90, bold ? 24 : 96, bold ? 28 : 107)
    doc.text(label, x, cursorY)
    doc.text(value, pageWidth - 40, cursorY, { align: 'right' })
    cursorY += bold ? 20 : 15
  })
  doc.setDrawColor(...accent)
  doc.setLineWidth(1)
  doc.line(x, y - 12, pageWidth - 40, y - 12)
  return cursorY
}

function drawFooter(doc, y, terms, footerNote, pageWidth, pageHeight) {
  const footerY = Math.max(y + 30, pageHeight - 90)
  const accentGray = 140
  doc.setDrawColor(220, 223, 217)
  doc.line(40, footerY, pageWidth - 40, footerY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(accentGray, accentGray, accentGray)
  doc.text('TERMS', 40, footerY + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 96, 107)
  const wrapped = doc.splitTextToSize(terms || '', pageWidth - 80)
  doc.text(wrapped, 40, footerY + 32)

  if (footerNote) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(20, 24, 28)
    doc.text(footerNote, 40, footerY + 32 + wrapped.length * 11 + 16)
  }

  // Print-ready signature block, matching the in-app Client Preview.
  const sigY = footerY + 32 + wrapped.length * 11 + (footerNote ? 30 : 10) + 30
  doc.setDrawColor(20, 24, 28)
  doc.setLineWidth(0.75)
  doc.line(40, sigY, 260, sigY)
  doc.line(300, sigY, 420, sigY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(140, 145, 150)
  doc.text('Client signature', 40, sigY + 12)
  doc.text('Date', 300, sigY + 12)
}

function drawLineItemsTable(doc, y, lineItems, markupPct, accent, pageWidth) {
  const body = lineItems.map(it => [it.description || '—', formatCurrency(previewLinePrice(it, markupPct))])
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Price']],
    body,
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: [20, 24, 28], cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 245] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  })
  return doc.lastAutoTable.finalY + 24
}

export function generateEstimatePDF(estimate, settings) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const accent = hexToRgb(settings.accentColor)

  let y = drawHeader(doc, settings, 'ESTIMATE', [
    estimate.header.recordNumber,
    `Date: ${estimate.header.issueDate}`,
  ])
  y = drawClientBlock(doc, y, estimate.header.client)
  y = drawLineItemsTable(doc, y, estimate.lineItems, estimate.markupPct, accent, pageWidth)

  const totals = computeDocumentTotals(estimate.lineItems, estimate)
  const rows = [
    ['Subtotal', formatCurrency(totals.pricedSubtotal), false],
    [`Tax (${estimate.taxRate}%)`, formatCurrency(totals.taxAmount), false],
    ['Total', formatCurrency(totals.total), true],
  ]
  y = drawTotalsBlock(doc, y, rows, accent, pageWidth)

  drawFooter(doc, y, estimate.terms || settings.estimateTerms, settings.footerNote, pageWidth, pageHeight)

  doc.save(`Estimate-${estimate.header.recordNumber}.pdf`)
}

export function generateInvoicePDF(invoice, settings) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const accent = hexToRgb(settings.accentColor)

  let y = drawHeader(doc, settings, 'INVOICE', [
    invoice.header.recordNumber,
    `Issued: ${invoice.header.issueDate}`,
    invoice.header.dueDate ? `Due: ${invoice.header.dueDate}` : null,
  ].filter(Boolean))
  y = drawClientBlock(doc, y, invoice.header.client)
  y = drawLineItemsTable(doc, y, invoice.lineItems, invoice.markupPct, accent, pageWidth)

  const totals = computeDocumentTotals(invoice.lineItems, invoice)
  const balanceDue = invoice.paymentStatus === 'paid' ? 0 : totals.total
  const rows = [
    ['Subtotal', formatCurrency(totals.pricedSubtotal), false],
    [`Tax (${invoice.taxRate}%)`, formatCurrency(totals.taxAmount), false],
    ['Total', formatCurrency(totals.total), true],
    ['Balance due', formatCurrency(balanceDue), true],
  ]
  y = drawTotalsBlock(doc, y, rows, accent, pageWidth)

  drawFooter(doc, y, invoice.terms || settings.invoiceTerms, settings.footerNote, pageWidth, pageHeight)

  doc.save(`Invoice-${invoice.header.recordNumber}.pdf`)
}
