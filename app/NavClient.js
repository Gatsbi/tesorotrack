'use client'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'

export default function NavClient() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/parts', label: 'Parts Exchange' },
  { href: '/trending', label: 'Trending' },
  { href: '/leaderboard', label: '🏆 Leaderboard' },
  { href: '/about', label: 'About' },
]

  return (
    <>
      <style>{`
        .nav-links { display: flex; align-items: center; gap: 2px; }
        .nav-right { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
        .nav-hamburger { display: none; align-items: center; gap: 8px; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-right { display: none; }
          .nav-hamburger { display: flex; }
        }
      `}</style>

      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(248,247,244,0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <a href="/" style={{
          fontFamily: 'var(--display)', fontWeight: 900, fontSize: '18px',
          color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.5px',
          display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
        }}>
          <span style={{
            width: '28px', height: '28px', background: 'var(--accent)',
            borderRadius: '7px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '14px',
          }}>💎</span>
          TesoroTrack
        </a>

        {/* Desktop nav links */}
        <div className="nav-links">
          {navLinks.map(link => (
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

        {/* Desktop right */}
        <div className="nav-right">
          <a href="/search" style={{
            fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '7px',
            border: '1.5px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>🔍 Search</a>
          {user ? (
            <>
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
            </>
          ) : (
            <a href="/login" style={{
              fontSize: '13px', fontWeight: 700, padding: '7px 18px', borderRadius: '7px',
              background: 'var(--accent)', color: 'white', textDecoration: 'none',
              boxShadow: '0 3px 10px rgba(200,82,42,0.3)',
            }}>Sign In</a>
          )}
        </div>

        {/* Mobile: search + hamburger */}
        <div className="nav-hamburger">
          <a href="/search" style={{
            fontSize: '16px', padding: '7px 10px', borderRadius: '7px',
            border: '1.5px solid var(--border)', textDecoration: 'none',
          }}>🔍</a>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'transparent', border: '1.5px solid var(--border)',
            borderRadius: '7px', padding: '6px 8px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '4px',
            alignItems: 'center', justifyContent: 'center',
            width: '38px', height: '38px',
          }} aria-label="Toggle menu">
            <span style={{
              display: 'block', width: '16px', height: '2px',
              background: 'var(--text)', borderRadius: '2px', transition: 'all 0.2s',
              transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none',
            }}/>
            <span style={{
              display: 'block', width: '16px', height: '2px',
              background: 'var(--text)', borderRadius: '2px', transition: 'all 0.2s',
              opacity: menuOpen ? 0 : 1,
            }}/>
            <span style={{
              display: 'block', width: '16px', height: '2px',
              background: 'var(--text)', borderRadius: '2px', transition: 'all 0.2s',
              transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
            }}/>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
          background: 'rgba(248,247,244,0.98)', backdropFilter: 'blur(16px)',
          zIndex: 99, padding: '16px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {navLinks.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{
              fontSize: '17px', fontWeight: 700, color: 'var(--text)',
              textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              display: 'block',
            }}>{link.label}</a>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {user ? (
              <>
                <a href="/portfolio" onClick={() => setMenuOpen(false)} style={{
                  fontSize: '17px', fontWeight: 700, color: 'var(--text)',
                  textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'block',
                }}>📦 Portfolio</a>
                <a href="/messages" onClick={() => setMenuOpen(false)} style={{
                  fontSize: '17px', fontWeight: 700, color: 'var(--text)',
                  textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'block',
                }}>💬 Messages</a>
                <a href="/account" onClick={() => setMenuOpen(false)} style={{
                  fontSize: '17px', fontWeight: 700, color: 'white',
                  textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
                  background: 'var(--accent)', display: 'block', textAlign: 'center',
                }}>My Account</a>
                <button onClick={handleSignOut} style={{
                  fontSize: '17px', fontWeight: 600, color: 'var(--muted)',
                  padding: '14px 18px', borderRadius: '10px', cursor: 'pointer',
                  border: '1.5px solid var(--border)', background: 'transparent', width: '100%',
                }}>Sign Out</button>
              </>
            ) : (
              <a href="/login" style={{
                fontSize: '17px', fontWeight: 700, color: 'white',
                textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
                background: 'var(--accent)', display: 'block', textAlign: 'center',
                boxShadow: '0 3px 10px rgba(200,82,42,0.3)',
              }}>Sign In</a>
            )}
          </div>
        </div>
      )}
    </>
  )
}