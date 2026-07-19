import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (!data.session) setNotice('Account created. Check your email to confirm, then sign in.')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card card" onSubmit={handleSubmit}>
        <div className="brand" style={{ color: 'var(--ink-900)', marginBottom: 4 }}>
          FieldLedger <small>ERP</small>
        </div>
        <p className="page-sub" style={{ marginTop: 0, marginBottom: 18 }}>
          {mode === 'signin' ? 'Sign in to your shared workspace.' : 'Create your account on the shared workspace.'}
        </p>

        <div className="field">
          <label>Email</label>
          <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Password</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && <p className="login-error">{error}</p>}
        {notice && <p className="page-sub" style={{ color: 'var(--ink-900)' }}>{notice}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
          {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>

        <button
          type="button"
          className="btn-link"
          style={{ marginTop: 12, width: '100%', textAlign: 'center' }}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
        >
          {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
