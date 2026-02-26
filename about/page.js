export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '72px 40px' }}>
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>About</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '48px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '20px' }}>
          Built for collectors,<br/>by collectors
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.7, fontWeight: 400 }}>
          Tesoro Track exists because we got tired of manually searching eBay every time we wanted to know what a set was actually worth. So we built the tool we always wanted.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '32px' }}>
        {[
          {
            icon: '📊',
            title: 'Real eBay Sold Data',
            body: `Every price on Tesoro Track comes from actual completed eBay sold listings — not asking prices, not estimates. When you see an average sale price, that's the real money that changed hands for that exact item. We pull data daily so you're never looking at stale numbers.`,
          },
          {
            icon: '🧱',
            title: 'What We Track',
            body: `We currently track Mega Construx (Halo, Pokémon, Call of Duty, Masters of the Universe, Destiny and more), Funko Pop figures across all major licenses, and LEGO sets including Icons, Technic, Star Wars, Harry Potter, Ideas, and Architecture. More categories are coming soon.`,
          },
          {
            icon: '📈',
            title: 'How Prices Work',
            body: `Our average sale price reflects the median sold price from the last 90 days of eBay activity. We remove outliers (suspiciously high or low sales) to give you a realistic market price. Prices are broken down by condition — New Sealed, Open Box, and Used — because condition matters enormously in the collector market.`,
          },
          {
            icon: '💼',
            title: 'Portfolio & Watchlist',
            body: `Your portfolio and watchlist data is stored locally in your browser right now — no account required. We're working on cloud sync and user accounts so your data follows you across devices. For now, your data is private and never leaves your computer.`,
          },
          {
            icon: '🆓',
            title: 'Free Forever',
            body: `Core price tracking is free and will always be free. We're building premium features for power collectors — unlimited portfolio tracking, price history exports, email alerts, and advanced analytics. But the fundamentals? Always free.`,
          },
          {
            icon: '⚠️',
            title: 'Disclaimer',
            body: `Tesoro Track is not affiliated with eBay, LEGO Group, Mega Brands, Mattel, or Funko. All price data is sourced from publicly available eBay sold listings. Prices shown are historical averages and not a guarantee of what you'll get if you sell today. The collector market can change quickly — always do your own research before buying or selling.`,
          },
        ].map(section => (
          <div key={section.title} style={{
            padding: '28px 32px', background: 'var(--white)',
            borderRadius: '16px', border: '1.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '48px', height: '48px', background: 'var(--accent-light)',
                borderRadius: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px', flexShrink: 0,
              }}>{section.icon}</div>
              <div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900, marginBottom: '10px', letterSpacing: '-0.3px' }}>{section.title}</h2>
                <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7, fontWeight: 400 }}>{section.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '48px', padding: '40px', background: 'linear-gradient(135deg, #1c1a17, #2d2820)',
        borderRadius: '20px', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', marginBottom: '10px' }}>
          Start tracking your collection
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>Free forever. No account required.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/browse" style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: '10px', fontSize: '14px',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
          }}>Browse Sets</a>
          <a href="/portfolio" style={{
            background: 'rgba(255,255,255,0.1)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '12px 24px', borderRadius: '10px', fontSize: '14px',
            fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
          }}>My Portfolio</a>
        </div>
      </div>
    </div>
  )
}
