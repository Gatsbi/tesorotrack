'use client'
import { useState } from 'react'
import { useAuth } from '../AuthProvider'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/portfolio'
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email for a confirmation link, then come back to sign in.')
      }
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '15px', outline: 'none', background: 'var(--bg)',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--white)', borderRadius: '20px',
        border: '1.5px solid var(--border)', padding: '40px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '40px', height: '40px', background: 'var(--accent)',
              borderRadius: '10px', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px',
            }}>💎</span>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: '22px', color: 'var(--text)' }}>
              Tesoro Track
            </span>
          </a>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: '10px',
          padding: '4px', marginBottom: '28px',
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
              fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              background: mode === m ? 'var(--white)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--muted)',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <h1 style={{
          fontFamily: 'var(--display)', fontSize: '26px', fontWeight: 900,
          letterSpacing: '-0.5px', marginBottom: '6px',
        }}>
          {mode === 'login' ? 'Welcome back' : 'Join Tesoro Track'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          {mode === 'login'
            ? 'Sign in to access your portfolio and watchlist.'
            : 'Create a free account to track your collection.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email" required placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {mode === 'signup' && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Minimum 6 characters</div>
            )}
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
              background: 'var(--red-light)', color: 'var(--red)',
              fontSize: '13px', fontWeight: 600,
              border: '1px solid rgba(214,59,59,0.2)',
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
              background: 'var(--green-light)', color: 'var(--green)',
              fontSize: '13px', fontWeight: 600,
              border: '1px solid rgba(26,158,110,0.2)',
            }}>{success}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
            background: loading ? 'var(--border)' : 'var(--accent)',
            color: loading ? 'var(--muted)' : 'white',
            fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(200,82,42,0.3)',
            transition: 'all 0.2s',
          }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
