import { useState } from 'react'
import { PageHeader, EmptyState, Stat, Badge } from '../components/ui'
import { formatCurrency } from '../lib/calc'
import { emptyTransaction, computePL } from '../lib/finance'
import { emptyRecurrence } from '../lib/recurrence'
import { clientLabel } from '../lib/db'
import RecurrenceFields from '../components/RecurrenceFields'

const CONFIG = {
  income: { verb: 'income', accent: 'var(--green)', categories: ['Job payment', 'Deposit', 'Change order', 'Other'] },
  expense: { verb: 'expense', accent: 'var(--red)', categories: ['Materials', 'Fuel', 'Tools & equipment', 'Subcontractor', 'Office', 'Other'] },
  bill: { verb: 'bill', accent: 'var(--amber-dark)', categories: ['Insurance', 'Equipment lease', 'Utilities', 'Loan payment', 'Subscription', 'Other'] },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
  { key: 'bill', label: 'Bills' },
]

export default function Transactions({ transactions, addTransaction, addBillSeries, updateTransaction, removeTransaction, onDeleteSeries, clientById }) {
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyTransaction('expense'))
  const [recurrence, setRecurrence] = useState(emptyRecurrence())

  const showingBills = filter === 'all' || filter === 'bill'
  const rows = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const pl = computePL(transactions)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const cfg = filter === 'all' ? null : CONFIG[filter]
  const typeTotal = cfg ? rows.reduce((s, t) => s + Number(t.amount || 0), 0) : 0
  const typeMonthTotal = cfg ? rows.filter(t => (t.date || '').startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount || 0), 0) : 0
  const typeUnpaid = filter === 'bill' ? rows.filter(t => t.status === 'unpaid').reduce((s, t) => s + Number(t.amount || 0), 0) : 0

  function openForm() {
    setForm(emptyTransaction(filter === 'all' ? 'expense' : filter))
    setRecurrence(emptyRecurrence())
    setShowForm(true)
  }

  function submit() {
    if (!form.vendorOrSource.trim() || !form.amount) return
    if (form.type === 'bill' && recurrence.enabled) {
      addBillSeries({ ...form, recurrence })
    } else {
      addTransaction({ ...form, id: crypto.randomUUID() })
    }
    setShowForm(false)
  }

  function toggleBillPaid(id, status) {
    updateTransaction(id, { status: status === 'paid' ? 'unpaid' : 'paid' })
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Income, expenses, and bills in one ledger."
        action={<button className="btn btn-amber" onClick={openForm}>+ Add transaction</button>}
      />

      <div style={{ marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f.key} className={`pill-toggle ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'all' ? (
        <div className="stat-grid">
          <Stat label="Income" value={formatCurrency(pl.income)} color="var(--green)" />
          <Stat label="Expenses" value={formatCurrency(pl.totalExpenses)} color="var(--red)" />
          <Stat label="Unpaid bills" value={formatCurrency(pl.billsUnpaid)} color="var(--amber-dark)" />
          <Stat label="Net profit" value={formatCurrency(pl.netProfit)} color={pl.netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        </div>
      ) : (
        <div className="stat-grid" style={{ gridTemplateColumns: filter === 'bill' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
          <Stat label={`Total ${cfg.verb}`} value={formatCurrency(typeTotal)} color={cfg.accent} />
          <Stat label="This month" value={formatCurrency(typeMonthTotal)} color="var(--ink-700)" />
          {filter === 'bill' && <Stat label="Unpaid" value={formatCurrency(typeUnpaid)} color="var(--red)" />}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No entries yet" subtitle="Add a transaction to start tracking it." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {filter === 'all' && <th>Type</th>}
                  <th>Source / Vendor</th>
                  <th>Category</th>
                  <th>Date</th>
                  {showingBills && <th>Due</th>}
                  {showingBills && <th>Status</th>}
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id}>
                    {filter === 'all' && <td><Badge status={t.type} /></td>}
                    <td>{t.vendorOrSource}{t.clientId && clientById(t.clientId) ? ` · ${clientLabel(clientById(t.clientId))}` : ''}
                      {t.seriesId && <span className="series-badge">↻ recurring</span>}</td>
                    <td>{t.category}</td>
                    <td className="figure">{t.date}</td>
                    {showingBills && <td className="figure">{t.type === 'bill' ? (t.dueDate || '—') : '—'}</td>}
                    {showingBills && <td>{t.type === 'bill' ? <Badge status={t.status} /> : '—'}</td>}
                    <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(t.amount)}</td>
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {t.type === 'bill' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBillPaid(t.id, t.status)}>
                          {t.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                        </button>
                      )}
                      {t.seriesId && (
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteSeries(t.seriesId, t.vendorOrSource)}>Delete series</button>
                      )}
                      <button className="icon-btn" onClick={() => removeTransaction(t.id)} title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add transaction</h2>
            <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...emptyTransaction(e.target.value), vendorOrSource: form.vendorOrSource, amount: form.amount, notes: form.notes })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="bill">Bill</option>
                </select>
              </div>
              <div className="field">
                <label>{form.type === 'income' ? 'Source (client or payer)' : 'Vendor'}</label>
                <input value={form.vendorOrSource} onChange={e => setForm({ ...form, vendorOrSource: e.target.value })} />
              </div>
              <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Amount</label>
                  <input type="number" step="0.01" className="figure" value={form.amount}
                    onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CONFIG[form.type].categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row" style={{ gridTemplateColumns: form.type === 'bill' ? '1fr 1fr' : '1fr' }}>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                {form.type === 'bill' && (
                  <div className="field">
                    <label>Due date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="field">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              {form.type === 'bill' && (
                <RecurrenceFields recurrence={recurrence} onChange={setRecurrence} disabled={!form.date} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Save transaction</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
