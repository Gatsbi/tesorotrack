import './globals.css'
import NavClient from './NavClient'

export const metadata = {
  title: 'Tesoro Track — Know What Your Collection Is Worth',
  description: 'Track real eBay sale prices for Mega Construx, Funko Pop, LEGO and more. Free price tracking for serious collectors.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavClient />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
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