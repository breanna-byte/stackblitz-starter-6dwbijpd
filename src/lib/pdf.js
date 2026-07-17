import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { linePrice, computeEstimateTotals, formatCurrency } from './calc'

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

function drawClientBlock(doc, y, client, label = 'Bill to') {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(140, 145, 150)
  doc.text(label.toUpperCase(), 40, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20, 24, 28)
  doc.text(client?.businessName || client?.contactName || 'Client', 40, y + 16)

  doc.setFontSize(9.5)
  doc.setTextColor(90, 96, 107)
  const attn = client?.businessName && client?.contactName ? `Attn: ${client.contactName}` : null
  const lines = [attn, client?.address, client?.phone, client?.email].filter(Boolean)
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
}

export function generateEstimatePDF(estimate, client, settings, { notes } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const accent = hexToRgb(settings.accentColor)

  let y = drawHeader(doc, settings, 'ESTIMATE', [
    `#${estimate.id.slice(0, 8).toUpperCase()}`,
    `Date: ${estimate.createdAt}`,
  ])
  y = drawClientBlock(doc, y, client)

  const body = estimate.items.map(it => [
    it.description || '—',
    it.type === 'labor' ? 'Labor' : 'Material',
    String(it.qty),
    formatCurrency(Number(it.unitCost) || 0),
    formatCurrency(linePrice(it)),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Type', 'Qty', 'Unit cost', 'Price']],
    body,
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: [20, 24, 28], cellPadding: 6 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 245] },
    columnStyles: { 4: { halign: 'right' }, 3: { halign: 'right' }, 2: { halign: 'center' } },
    margin: { left: 40, right: 40 },
  })

  const totals = computeEstimateTotals(estimate.items, estimate)
  let afterTable = doc.lastAutoTable.finalY + 24
  const rows = [
    ['Subtotal', formatCurrency(totals.subtotal), false],
    ...(estimate.globalDiscount > 0 ? [[`Discount (${estimate.globalDiscount}%)`, `-${formatCurrency(totals.discountAmt)}`, false]] : []),
    [`Tax (${estimate.taxRate}%)`, formatCurrency(totals.taxAmt), false],
    ['Total', formatCurrency(totals.total), true],
  ]
  afterTable = drawTotalsBlock(doc, afterTable, rows, accent, pageWidth)

  drawFooter(doc, afterTable, notes ?? settings.estimateTerms, settings.footerNote, pageWidth, pageHeight)

  doc.save(`Estimate-${(estimate.title || 'quote').replace(/[^\w-]+/g, '_')}.pdf`)
}

export function generateInvoicePDF(invoice, estimate, client, settings, totalOverride, { notes } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const accent = hexToRgb(settings.accentColor)

  let y = drawHeader(doc, settings, 'INVOICE', [
    `#${invoice.id.slice(0, 8).toUpperCase()}`,
    `Issued: ${invoice.issuedAt}`,
    invoice.dueAt ? `Due: ${invoice.dueAt}` : null,
  ].filter(Boolean))
  y = drawClientBlock(doc, y, client)

  const items = estimate?.items || []
  const totals = estimate ? computeEstimateTotals(estimate.items, estimate) : null
  const total = totals ? totals.total : (totalOverride ?? invoice.amount ?? 0)

  if (items.length) {
    const body = items.map(it => [
      it.description || '—',
      it.type === 'labor' ? 'Labor' : 'Material',
      String(it.qty),
      formatCurrency(Number(it.unitCost) || 0),
      formatCurrency(linePrice(it)),
    ])
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Type', 'Qty', 'Unit cost', 'Price']],
      body,
      theme: 'plain',
      styles: { fontSize: 9.5, textColor: [20, 24, 28], cellPadding: 6 },
      headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 247, 245] },
      columnStyles: { 4: { halign: 'right' }, 3: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 40, right: 40 },
    })
    y = doc.lastAutoTable.finalY + 24
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(90, 96, 107)
    doc.text('Amount due for services rendered.', 40, y + 10)
    y += 30
  }

  const rows = totals
    ? [
        ['Subtotal', formatCurrency(totals.subtotal), false],
        ...(estimate.globalDiscount > 0 ? [[`Discount (${estimate.globalDiscount}%)`, `-${formatCurrency(totals.discountAmt)}`, false]] : []),
        [`Tax (${estimate.taxRate}%)`, formatCurrency(totals.taxAmt), false],
        ['Amount due', formatCurrency(total), true],
      ]
    : [['Amount due', formatCurrency(total), true]]

  y = drawTotalsBlock(doc, y, rows, accent, pageWidth)
  drawFooter(doc, y, notes ?? settings.invoiceTerms, settings.footerNote, pageWidth, pageHeight)

  doc.save(`Invoice-${invoice.id.slice(0, 8)}.pdf`)
}
