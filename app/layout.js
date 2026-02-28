import './globals.css'
import NavClient from './NavClient'
import { AuthProvider } from './AuthProvider'

export const metadata = {
  title: 'TesoroTrack — Know What Your Collection Is Worth',
  description: 'Track real eBay sale prices for Mega Construx, Funko Pop, LEGO and more. Free price tracking for serious collectors.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavClient />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}

function Footer() {
  const cols = [
    {
      title: 'Categories',
      links: [
        { label: 'Mega', href: '/browse?cat=Mega' },
        { label: 'Funko Pop', href: '/browse?cat=Funko+Pop' },
        { label: 'LEGO', href: '/browse?cat=LEGO' },
        { label: 'Browse All', href: '/browse' },
      ],
    },
    {
      title: 'Tools',
      links: [
        { label: 'Portfolio Tracker', href: '/portfolio' },
        { label: 'Watchlist', href: '/watchlist' },
        { label: 'Trending', href: '/trending' },
        { label: 'Leaderboard', href: '/leaderboard' },
        { label: 'Submit a Set', href: '/submit' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'How It Works', href: '/about#how-it-works' },
        { label: 'Data Sources', href: '/about#data-sources' },
        { label: 'Contact', href: 'mailto:hello@tesorotrack.com' },
      ],
    },
  ]

  return (
    <footer style={{
      background: 'var(--text)', color: 'rgba(255,255,255,0.5)',
      padding: '48px 24px', marginTop: '80px',
    }}>
      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr; gap: 20px; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
        .footer-link:hover { color: rgba(255,255,255,0.9) !important; }
      `}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="footer-grid">
          <div>
            <div style={{
              fontFamily: 'var(--display)', fontWeight: 900, fontSize: '20px',
              color: 'white', marginBottom: '12px',
            }}>💎 TesoroTrack</div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', fontWeight: 400 }}>
              Real eBay price data for serious collectors. Track your collection value, spot trends, and know when to buy or sell.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>{col.title}</div>
              {col.links.map(link => (
                <div key={link.label} style={{ fontSize: '13px', marginBottom: '8px' }}>
                  <a href={link.href} className="footer-link" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                    {link.label}
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom" style={{
          borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', fontSize: '12px',
        }}>
          <span>© 2026 TesoroTrack. Price data sourced from eBay sold listings.</span>
          <span>Not affiliated with eBay, LEGO, Mega Brands, or Funko.</span>
        </div>
      </div>
    </footer>
  )
}