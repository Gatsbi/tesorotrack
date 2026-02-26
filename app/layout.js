import './globals.css'

export const metadata = {
  title: 'Tesoro Track — Know What Your Collection Is Worth',
  description: 'Track real eBay sale prices for Mega Construx, Funko Pop, LEGO and more. Free price tracking for serious collectors.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

function Nav() {
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

      <div style={{ display: 'flex', gap: '10px' }}>
        <a href="/search" style={{
          fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 600,
          padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>🔍 Search</a>
        <a href="/portfolio" style={{
          fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
          padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
          background: 'var(--accent)', color: 'white', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center',
          boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>My Portfolio</a>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{
      background: 'var(--text)', color: 'rgba(255,255,255,0.5)',
      padding: '48px 40px', marginTop: '80px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '40px', marginBottom: '40px',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--display)', fontWeight: 900, fontSize: '20px',
              color: 'white', marginBottom: '12px',
            }}>💎 Tesoro Track</div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', fontWeight: 400 }}>
              Real eBay price data for serious collectors. Track your collection value, spot trends, and know when to buy or sell.
            </p>
          </div>
          {[
            { title: 'Categories', links: ['Mega Construx', 'Funko Pop', 'LEGO', 'Browse All'] },
            { title: 'Tools', links: ['Portfolio Tracker', 'Watchlist', 'Trending', 'Price Alerts'] },
            { title: 'Company', links: ['About', 'How It Works', 'Data Sources', 'Contact'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>{col.title}</div>
              {col.links.map(link => (
                <div key={link} style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <a href="#" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{link}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px',
          fontSize: '12px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>© 2026 Tesoro Track. Price data sourced from eBay sold listings.</span>
          <span>Not affiliated with eBay, LEGO, Mega Brands, or Funko.</span>
        </div>
      </div>
    </footer>
  )
}
