import { useState } from 'react'
import { PageHeader, EmptyState, Stat, Badge } from '../components/ui'
import { formatCurrency } from '../lib/calc'
import { emptyTransaction } from '../lib/finance'

const CONFIG = {
  income: {
    title: 'Income Tracking', subtitle: 'Every payment coming in, by job or client.',
    verb: 'income', accent: 'var(--green)', categories: ['Job payment', 'Deposit', 'Change order', 'Other'],
  },
  expense: {
    title: 'Expense Tracking', subtitle: 'Materials, fuel, tools, and everything else going out.',
    verb: 'expense', accent: 'var(--red)', categories: ['Materials', 'Fuel', 'Tools & equipment', 'Subcontractor', 'Office', 'Other'],
  },
  bill: {
    title: 'Bill Tracking', subtitle: 'Recurring and one-off bills, with due dates so nothing slips.',
    verb: 'bill', accent: 'var(--amber-dark)', categories: ['Insurance', 'Equipment lease', 'Utilities', 'Loan payment', 'Subscription', 'Other'],
  },
}

export default function TransactionsPage({ type, transactions, addTransaction, updateTransaction, removeTransaction, clientById }) {
  const cfg = CONFIG[type]
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyTransaction(type))

  const rows = transactions
    .filter(t => t.type === type)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const total = rows.reduce((s, t) => s + Number(t.amount || 0), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthTotal = rows.filter(t => (t.date || '').startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount || 0), 0)
  const unpaidBills = type === 'bill' ? rows.filter(t => t.status === 'unpaid') : []
  const unpaidTotal = unpaidBills.reduce((s, t) => s + Number(t.amount || 0), 0)

  function submit() {
    if (!form.vendorOrSource.trim() || !form.amount) return
    addTransaction({ ...form, id: crypto.randomUUID(), type })
    setForm(emptyTransaction(type))
    setShowForm(false)
  }

  function toggleBillPaid(id, status) {
    updateTransaction(id, { status: status === 'paid' ? 'unpaid' : 'paid' })
  }

  return (
    <>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={<button className="btn btn-amber" onClick={() => setShowForm(true)}>+ Add {cfg.verb}</button>}
      />

      <div className="stat-grid" style={{ gridTemplateColumns: type === 'bill' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
        <Stat label={`Total ${cfg.verb}`} value={formatCurrency(total)} color={cfg.accent} />
        <Stat label="This month" value={formatCurrency(monthTotal)} color="var(--ink-700)" />
        {type === 'bill' && <Stat label="Unpaid" value={formatCurrency(unpaidTotal)} color="var(--red)" />}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`No ${cfg.verb} entries yet`} subtitle={`Add your first ${cfg.verb} entry to start tracking it.`} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{type === 'income' ? 'Source' : 'Vendor'}</th>
                  <th>Category</th>
                  <th>Date</th>
                  {type === 'bill' && <th>Due</th>}
                  {type === 'bill' && <th>Status</th>}
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id}>
                    <td>{t.vendorOrSource}{t.clientId && clientById(t.clientId) ? ` · ${clientById(t.clientId).name}` : ''}</td>
                    <td>{t.category}</td>
                    <td className="figure">{t.date}</td>
                    {type === 'bill' && <td className="figure">{t.dueDate || '—'}</td>}
                    {type === 'bill' && <td><Badge status={t.status} /></td>}
                    <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(t.amount)}</td>
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {type === 'bill' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBillPaid(t.id, t.status)}>
                          {t.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                        </button>
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
            <h2>Add {cfg.verb}</h2>
            <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="field">
                <label>{type === 'income' ? 'Source (client or payer)' : 'Vendor'}</label>
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
                    {cfg.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row" style={{ gridTemplateColumns: type === 'bill' ? '1fr 1fr' : '1fr' }}>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                {type === 'bill' && (
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
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Save {cfg.verb}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
