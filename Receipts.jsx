import { useRef, useState } from 'react'
import { PageHeader, EmptyState } from '../components/ui'
import { formatCurrency } from '../lib/calc'
import { scanReceipt } from '../lib/receiptOcr'
import { emptyTransaction } from '../lib/finance'

export default function Receipts({ transactions, addTransaction, updateTransaction, removeTransaction }) {
  const fileInputRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')

  const receipts = transactions
    .filter(t => t.receiptImage)
    .sort((a, b) => b.date.localeCompare(a.date))

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanning(true)
    setScanStatus('Reading receipt…')
    try {
      const result = await scanReceipt(file, setScanStatus)
      addTransaction({
        ...emptyTransaction('expense'),
        amount: result.amount,
        date: result.date,
        vendorOrSource: result.vendorOrSource,
        receiptImage: result.receiptImage,
        category: 'Uncategorized',
        notes: 'Auto-filled from photo — verify before it\'s counted in your books.',
        verified: false,
      })
    } catch (err) {
      console.error(err)
      setScanStatus('Could not read that image — add it manually below.')
      addTransaction({ ...emptyTransaction('expense'), category: 'Uncategorized', verified: false })
    } finally {
      setScanning(false)
      setTimeout(() => setScanStatus(''), 2500)
    }
  }

  function verify(id) {
    updateTransaction(id, { verified: true })
  }

  return (
    <>
      <PageHeader
        title="Receipt Ledger"
        subtitle="Snap a photo of a receipt — it's read automatically and added as an editable expense row."
        action={
          <>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
            <button className="btn btn-amber" disabled={scanning} onClick={() => fileInputRef.current?.click()}>
              {scanning ? 'Scanning…' : '📷 Scan a receipt'}
            </button>
          </>
        }
      />

      {scanStatus && <div className="scan-status">{scanStatus}</div>}

      {receipts.length === 0 ? (
        <EmptyState title="No receipts yet" subtitle="Scan a receipt photo to auto-fill an expense row — OCR runs right in your browser." />
      ) : (
        <div className="receipt-grid">
          {receipts.map(r => (
            <div key={r.id} className="card receipt-card">
              <img src={r.receiptImage} alt="Receipt" className="receipt-thumb" />
              <div className="receipt-fields">
                {!r.verified && <span className="badge badge-sent" style={{ marginBottom: 8 }}>Unverified — check details</span>}
                <div className="field">
                  <label>Vendor</label>
                  <input value={r.vendorOrSource} onChange={e => updateTransaction(r.id, { vendorOrSource: e.target.value })} />
                </div>
                <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
                  <div className="field">
                    <label>Amount</label>
                    <input type="number" step="0.01" className="figure" value={r.amount}
                      onChange={e => updateTransaction(r.id, { amount: Number(e.target.value) })} />
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input type="date" value={r.date} onChange={e => updateTransaction(r.id, { date: e.target.value })} />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>Category</label>
                  <input value={r.category} onChange={e => updateTransaction(r.id, { category: e.target.value })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span className="figure" style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!r.verified && <button className="btn btn-primary btn-sm" onClick={() => verify(r.id)}>Looks right</button>}
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => removeTransaction(r.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
