'use client'
import { useAuth } from './AuthProvider'

export default function NavClient() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(248,247,244,0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 32px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <a href="/" style={{
        fontFamily: 'var(--display)', fontWeight: 900, fontSize: '20px',
        color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.5px',
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
      }}>
        <span style={{
          width: '30px', height: '30px', background: 'var(--accent)',
          borderRadius: '7px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '15px',
        }}>💎</span>
        Tesoro Track
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[
          { href: '/browse', label: 'Browse' },
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/parts', label: 'Parts Exchange' },
          { href: '/trending', label: 'Trending' },
          { href: '/about', label: 'About' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--muted)',
            textDecoration: 'none', padding: '6px 10px', borderRadius: '6px',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.target.style.color = 'var(--text)'; e.target.style.background = 'var(--surface)' }}
            onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.background = 'transparent' }}
          >{link.label}</a>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        <a href="/search" style={{
          fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '7px',
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>🔍 Search</a>

        {user ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href="/messages" style={{
              fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '7px',
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', textDecoration: 'none',
            }}>💬</a>
            <a href="/portfolio" style={{
              fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '7px',
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', textDecoration: 'none',
            }}>📦 Portfolio</a>
            <a href="/account" style={{
              fontSize: '13px', fontWeight: 700, padding: '7px 16px', borderRadius: '7px',
              background: 'var(--accent)', color: 'white', textDecoration: 'none',
              boxShadow: '0 3px 10px rgba(200,82,42,0.3)',
            }}>My Account</a>
            <button onClick={handleSignOut} style={{
              fontSize: '13px', fontWeight: 600, padding: '7px 10px', borderRadius: '7px',
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', cursor: 'pointer',
            }}>Sign Out</button>
          </div>
        ) : (
          <a href="/login" style={{
            fontSize: '13px', fontWeight: 700, padding: '7px 18px', borderRadius: '7px',
            background: 'var(--accent)', color: 'white', textDecoration: 'none',
            boxShadow: '0 3px 10px rgba(200,82,42,0.3)',
          }}>Sign In</a>
        )}
      </div>
    </nav>
  )
}