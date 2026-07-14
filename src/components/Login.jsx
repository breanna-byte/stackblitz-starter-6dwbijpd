import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="login-screen">
      <form className="login-card card" onSubmit={handleSubmit}>
        <div className="brand" style={{ color: 'var(--ink-900)', marginBottom: 4 }}>
          FieldLedger <small>ERP</small>
        </div>
        <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>Sign in to your shared workspace.</p>

        <div className="field">
          <label>Email</label>
          <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
