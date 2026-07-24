// Rolls transactions (income / expense / bill) into P&L numbers.
// A "transaction" row covers all three: type tells us which bucket it's in.
// Bills are money you owe (unpaid = liability, paid = counts as an expense).

const DEFAULT_CATEGORY = { income: 'Job payment', expense: 'Materials', bill: 'Insurance' }

export function emptyTransaction(type = 'expense') {
  return {
    id: crypto.randomUUID(),
    type, // 'income' | 'expense' | 'bill'
    category: DEFAULT_CATEGORY[type] || 'Other',
    vendorOrSource: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    status: type === 'bill' ? 'unpaid' : 'recorded', // bill: unpaid/paid
    receiptImage: null, // data URL of photographed receipt
    notes: '',
    clientId: null,
  }
}

export function monthKey(dateStr) {
  return (dateStr || '').slice(0, 7) // 'YYYY-MM'
}

export function computePL(transactions, { month } = {}) {
  const inRange = month
    ? transactions.filter(t => monthKey(t.date) === month)
    : transactions

  const income = inRange
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const expenses = inRange
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const billsPaid = inRange
    .filter(t => t.type === 'bill' && t.status === 'paid')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const billsUnpaid = inRange
    .filter(t => t.type === 'bill' && t.status === 'unpaid')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const totalExpenses = expenses + billsPaid
  const netProfit = income - totalExpenses

  return { income, expenses, billsPaid, billsUnpaid, totalExpenses, netProfit }
}

// Groups every transaction by month for a simple trend view, most recent first.
export function plByMonth(transactions) {
  const months = [...new Set(transactions.map(t => monthKey(t.date)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
  return months.map(m => ({ month: m, ...computePL(transactions, { month: m }) }))
}

export function categoryBreakdown(transactions, type) {
  const map = {}
  transactions.filter(t => t.type === type).forEach(t => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount || 0)
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}
