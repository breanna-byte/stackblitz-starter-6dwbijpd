import { useEffect, useState } from 'react'
import { PageHeader, EmptyState } from '../components/ui'
import { hasSupabase } from '../supabaseClient'
import { storeEnrollment, syncTransactions } from '../lib/bank'

const TELLER_APPLICATION_ID = import.meta.env.VITE_TELLER_APPLICATION_ID
const TELLER_ENVIRONMENT = import.meta.env.VITE_TELLER_ENVIRONMENT || 'sandbox'
const CONNECT_SCRIPT_SRC = 'https://cdn.teller.io/connect/connect.js'

// Teller Connect ships as a vanilla script (there's no first-party React
// package this was built against with a verified API), so this loads it
// once and calls window.TellerConnect directly rather than depending on
// an npm wrapper whose exact API couldn't be confirmed from this
// environment (no network access to check).
function loadConnectScript() {
  return new Promise((resolve, reject) => {
    if (window.TellerConnect) return resolve()
    const existing = document.querySelector(`script[src="${CONNECT_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = CONNECT_SCRIPT_SRC
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function BankSync({ bankAccounts, onConnected, onSynced }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    if (hasSupabase && TELLER_APPLICATION_ID) loadConnectScript().catch(() => {})
  }, [])

  async function startConnect() {
    setError('')
    if (!TELLER_APPLICATION_ID) {
      setError('VITE_TELLER_APPLICATION_ID is not set — add it to .env (see README).')
      return
    }
    setBusy(true)
    try {
      await loadConnectScript()
      window.TellerConnect.setup({
        applicationId: TELLER_APPLICATION_ID,
        environment: TELLER_ENVIRONMENT,
        onSuccess: async (enrollment) => {
          // VERIFY: the callback payload shape below is a best guess —
          // console.log(enrollment) on first real test and adjust these
          // three lines if the fields don't match.
          try {
            await storeEnrollment({
              accessToken: enrollment.accessToken,
              enrollmentId: enrollment.enrollment?.id,
              institutionName: enrollment.enrollment?.institution?.name,
            })
            await onConnected()
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        },
        onExit: () => setBusy(false),
      }).open()
    } catch (e) {
      setError('Could not load Teller Connect — check your network connection.')
      setBusy(false)
    }
  }

  async function runSync() {
    setBusy(true)
    setError('')
    try {
      const result = await syncTransactions()
      setLastSync(result)
      await onSynced()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!hasSupabase) {
    return (
      <>
        <PageHeader title="Bank Sync" subtitle="Connect a bank account to auto-import and categorize transactions." />
        <EmptyState title="Needs a live Supabase project" subtitle="Bank sync requires the Supabase backend (for secure token storage) — connect it in .env to use this page." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Bank Sync"
        subtitle="Connect a bank account to auto-import and categorize income and expenses."
        action={<button className="btn btn-amber" disabled={busy} onClick={startConnect}>+ Connect a bank account</button>}
      />

      {error && <p className="login-error" style={{ marginBottom: 14 }}>{error}</p>}

      {bankAccounts.length === 0 ? (
        <EmptyState title="No accounts connected" subtitle="Connect a bank account to start auto-importing transactions." />
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Connected accounts</strong>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={runSync}>
              {busy ? 'Syncing…' : 'Sync transactions now'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Account</th><th>Type</th><th>Mask</th></tr></thead>
              <tbody>
                {bankAccounts.map(a => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.subtype || a.type}</td>
                    <td className="figure">•••• {a.mask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lastSync && (
            <p style={{ fontSize: 11.5, color: 'var(--text-400)', marginTop: 12 }}>
              Last sync: {lastSync.added} transactions imported or updated.
              New transactions land in Income/Expenses with a best-guess category — review and adjust as needed.
            </p>
          )}
        </div>
      )}
    </>
  )
}
