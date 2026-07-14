// Core pricing engine — this is the "automatic calculator" behind every
// estimate. Each line item is either a material/product line (qty × unit
// cost) or a labor line (hours × hourly rate). A per-line markup turns raw
// cost into the price the customer sees. Totals then roll up cost, price,
// margin, and tax so a contractor can see profitability while building the
// quote, not after.

export function emptyLineItem(type = 'material') {
  return {
    id: crypto.randomUUID(),
    type, // 'material' | 'labor'
    description: '',
    qty: 1,
    unitCost: 0,   // material: cost per unit | labor: cost per hour (what it costs you)
    markup: type === 'labor' ? 40 : 25, // % markup applied to cost to get customer price
    taxable: type === 'material',
  }
}

export function lineCost(item) {
  const qty = Number(item.qty) || 0
  const unitCost = Number(item.unitCost) || 0
  return qty * unitCost
}

export function linePrice(item) {
  const cost = lineCost(item)
  const markup = Number(item.markup) || 0
  return cost * (1 + markup / 100)
}

export function lineMargin(item) {
  const price = linePrice(item)
  const cost = lineCost(item)
  if (price <= 0) return 0
  return ((price - cost) / price) * 100
}

export function computeEstimateTotals(items, { taxRate = 0, globalDiscount = 0 } = {}) {
  const totalCost = items.reduce((sum, it) => sum + lineCost(it), 0)
  const subtotal = items.reduce((sum, it) => sum + linePrice(it), 0)
  const discountAmt = subtotal * (Number(globalDiscount) / 100)
  const taxableBase = items
    .filter(it => it.taxable)
    .reduce((sum, it) => sum + linePrice(it), 0) * (1 - Number(globalDiscount) / 100)
  const taxAmt = taxableBase * (Number(taxRate) / 100)
  const total = subtotal - discountAmt + taxAmt
  const profit = subtotal - discountAmt - totalCost
  const marginPct = subtotal - discountAmt > 0 ? (profit / (subtotal - discountAmt)) * 100 : 0

  return {
    totalCost,
    subtotal,
    discountAmt,
    taxAmt,
    total,
    profit,
    marginPct,
  }
}

export function formatCurrency(n) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
