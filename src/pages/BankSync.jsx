import { useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { PageHeader, EmptyState } from '../components/ui'
import { hasSupabase } from '../supabaseClient'
import { createLinkToken, exchangePublicToken, syncTransactions } from '../lib/bank'

export default function BankSync({ bankAccounts, onConnected, onSynced }) {
  const [linkToken, setLinkToken] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      setBusy(true)
      setError('')
      try {
        await exchangePublicToken(publicToken, metadata.institution?.name)
        await onConnected()
      } catch (e) {
        setError(e.message)
      } finally {
        setBusy(false)
        setLinkToken(null)
      }
    },
    onExit: () => setLinkToken(null),
  })

  async function startConnect() {
    setError('')
    setBusy(true)
    try {
      const token = await createLinkToken()
      setLinkToken(token)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  // usePlaidLink only becomes `ready` after the token prop above has
  // propagated, so opening happens in response to that, not the click
  // that requested the token.
  if (linkToken && ready && !busy) open()

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
              Last sync: {lastSync.added} new, {lastSync.modified} updated, {lastSync.removed} removed.
              New transactions land in Income/Expenses with a best-guess category — review and adjust as needed.
            </p>
          )}
        </div>
      )}
    </>
  )
}
