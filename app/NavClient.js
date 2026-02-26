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
      padding: '0 40px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <a href="/" style={{
        fontFamily: 'var(--display)', fontWeight: 900, fontSize: '22px',
        color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.5px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{
          width: '32px', height: '32px', background: 'var(--accent)',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '16px',
        }}>💎</span>
        Tesoro Track
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {[
          { href: '/browse', label: 'Browse' },
          { href: '/trending', label: 'Trending' },
          { href: '/portfolio', label: 'Portfolio' },
          { href: '/watchlist', label: 'Watchlist' },
          { href: '/about', label: 'About' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{
            fontSize: '14px', fontWeight: 600, color: 'var(--muted)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.target.style.color = 'var(--text)'}
            onMouseLeave={e => e.target.style.color = 'var(--muted)'}
          >{link.label}</a>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <a href="/search" style={{
          fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 600,
          padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>🔍 Search</a>
        {user ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href="/portfolio" style={{
              fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
              padding: '8px 18px', borderRadius: '8px',
              background: 'var(--accent)', color: 'white', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
              boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
            }}>My Portfolio</a>
            <button onClick={handleSignOut} style={{
              fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)',
            }}>Sign Out</button>
          </div>
        ) : (
          <a href="/login" style={{
            fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
            padding: '8px 18px', borderRadius: '8px',
            background: 'var(--accent)', color: 'white', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
            boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
          }}>Sign In</a>
        )}
      </div>
    </nav>
  )
}
