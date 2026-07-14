import { useMemo } from 'react'
import { PageHeader, Stat, EmptyState } from '../components/ui'
import { formatCurrency } from '../lib/calc'
import { computePL, plByMonth, categoryBreakdown } from '../lib/finance'

export default function Reports({ transactions }) {
  const pl = useMemo(() => computePL(transactions), [transactions])
  const byMonth = useMemo(() => plByMonth(transactions), [transactions])
  const expenseCats = useMemo(() => categoryBreakdown(transactions, 'expense'), [transactions])
  const maxCat = expenseCats.length ? expenseCats[0][1] : 1

  return (
    <>
      <PageHeader title="Profit & Loss" subtitle="Income minus expenses and paid bills, calculated automatically from your tracked transactions." />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Stat label="Total income" value={formatCurrency(pl.income)} color="var(--green)" />
        <Stat label="Total expenses" value={formatCurrency(pl.totalExpenses)} color="var(--red)" />
        <Stat label="Unpaid bills" value={formatCurrency(pl.billsUnpaid)} color="var(--amber-dark)" />
        <Stat
          label="Net profit"
          value={formatCurrency(pl.netProfit)}
          color={pl.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      <div className="builder-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>By month</strong>
          {byMonth.length === 0 ? (
            <EmptyState title="No data yet" subtitle="Add income, expenses, or bills to see monthly trends." />
          ) : (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Income</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Net</th></tr></thead>
                <tbody>
                  {byMonth.map(m => (
                    <tr key={m.month}>
                      <td className="figure">{m.month}</td>
                      <td className="figure" style={{ textAlign: 'right', color: 'var(--green)' }}>{formatCurrency(m.income)}</td>
                      <td className="figure" style={{ textAlign: 'right', color: 'var(--red)' }}>{formatCurrency(m.totalExpenses)}</td>
                      <td className="figure" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(m.netProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Expenses by category</strong>
          {expenseCats.length === 0 ? (
            <EmptyState title="No expenses yet" subtitle="Track an expense to see the breakdown." />
          ) : (
            <div style={{ marginTop: 14 }}>
              {expenseCats.map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{cat}</span>
                    <span className="figure">{formatCurrency(amt)}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(amt / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
