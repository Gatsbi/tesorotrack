'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function HomePage() {
  const [trending, setTrending] = useState([])
  const [stats, setStats] = useState({ sets: 0, sales: 0 })
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: trendingData } = await supabase
        .from('sets')
        .select('id, name, set_number, category, theme, retail_price, avg_sale_price, new_avg_price, total_sales, is_retired, image_url')
        .not('avg_sale_price', 'is', null)
        .order('total_sales', { ascending: false })
        .limit(8)
      setTrending(trendingData || [])

      const { count: setCount } = await supabase
        .from('sets')
        .select('*', { count: 'exact', head: true })
      const { data: salesData } = await supabase
        .from('sets')
        .select('total_sales')
        .not('total_sales', 'is', null)
      const totalSales = salesData?.reduce((s, r) => s + (r.total_sales || 0), 0) || 0
      setStats({ sets: setCount || 0, sales: totalSales })
    }
    load()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) window.location.href = `/search?q=${encodeURIComponent(search)}`
  }

  const pct = (retail, avg) => {
    if (!retail || !avg) return null
    return Math.round(((avg - retail) / retail) * 100)
  }

  const catIcon = { 'Mega': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }
  const fmt = (n) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${parseFloat(n).toFixed(2)}`

  return (
    <div>
      {/* HERO */}
      <section style={{
        background: 'linear-gradient(135deg, #1c1a17 0%, #2d2820 100%)',
        padding: '100px 40px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,82,42,0.15), transparent 70%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute', bottom: '-80px', left: '10%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,82,42,0.08), transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(200,82,42,0.2)', color: '#f0a080',
            fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
            padding: '6px 16px', borderRadius: '100px', marginBottom: '24px',
            textTransform: 'uppercase', border: '1px solid rgba(200,82,42,0.3)',
          }}>
            <span style={{ width: '6px', height: '6px', background: '#f0a080', borderRadius: '50%', animation: 'pulse 2s infinite' }}/>
            Live eBay price data
          </div>

          <h1 style={{
            fontFamily: 'var(--display)', fontSize: '64px', fontWeight: 900,
            color: 'white', lineHeight: 1.05, letterSpacing: '-2px',
            marginBottom: '20px',
          }}>
            Know exactly what your<br/>
            <span style={{ color: 'var(--accent)' }}>collection</span> is worth
          </h1>

          <p style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
            fontWeight: 400, marginBottom: '40px', maxWidth: '560px', margin: '0 auto 40px',
          }}>
            Real sold prices from eBay for Mega Construx, Funko Pop, LEGO and more.
            Track your portfolio, spot trends, buy and sell smarter.
          </p>

          <form onSubmit={handleSearch} style={{
            display: 'flex', background: 'white', borderRadius: '14px',
            overflow: 'hidden', maxWidth: '620px', margin: '0 auto 32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <input
              type="text"
              placeholder="Search sets, figures, themes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', padding: '18px 20px',
                fontFamily: 'var(--sans)', fontSize: '15px', fontWeight: 500,
                color: 'var(--text)', background: 'transparent',
              }}
            />
            <button type="submit" style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              padding: '0 28px', fontFamily: 'var(--sans)', fontSize: '15px',
              fontWeight: 700, cursor: 'pointer',
            }}>Search</button>
          </form>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Halo Warthog', 'Pokémon Charizard', 'LEGO Millennium Falcon', 'Funko Grogu', 'Masters of the Universe'].map(term => (
              <button key={term} onClick={() => window.location.href = `/search?q=${encodeURIComponent(term)}`}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px',
                  fontSize: '12px', fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
                }}>
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: 'var(--accent)', padding: '20px 40px' }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'center', gap: '60px',
        }}>
          {[
            { label: 'Sets Tracked', value: `${stats.sets.toLocaleString()}+` },
            { label: 'eBay Sales Analyzed', value: `${stats.sales.toLocaleString()}+` },
            { label: 'Categories', value: '3' },
            { label: 'Always', value: 'Free' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 500, color: 'white' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '72px 40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Browse by Category</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>What do you collect?</h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', fontWeight: 400 }}>Pick a category to browse sets, track prices, and build your portfolio.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { name: 'Mega', icon: '🧱', desc: 'Halo, Pokémon, Call of Duty, Masters of the Universe and more. Track retired sets climbing fast.', href: '/browse?cat=Mega', badge: 'Popular' },
            { name: 'Funko Pop', icon: '👾', desc: 'Exclusives, chase variants, and vaulted figures. See what\'s actually selling and for how much.', href: '/browse?cat=Funko+Pop', badge: 'Hot' },
            { name: 'LEGO', icon: '🏗️', desc: 'Icons, Technic, Star Wars, and more. Compare new sealed vs used and track retirement value.', href: '/browse?cat=LEGO', badge: 'New' },
          ].map(cat => (
            <a key={cat.name} href={cat.href} style={{
              background: 'var(--white)', borderRadius: '16px', padding: '28px',
              border: '1.5px solid var(--border)', textDecoration: 'none', color: 'inherit',
              display: 'block', position: 'relative', overflow: 'hidden',
              transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(200,82,42,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <span style={{
                position: 'absolute', top: '16px', right: '16px',
                fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                borderRadius: '6px', background: 'var(--accent-light)', color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>{cat.badge}</span>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>{cat.icon}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{cat.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>{cat.desc}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>Browse sets →</div>
            </a>
          ))}
        </div>
      </section>

      {/* TRENDING */}
      <section style={{ background: 'var(--white)', padding: '72px 40px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Market Data</div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Most tracked this week</h2>
              <p style={{ fontSize: '15px', color: 'var(--muted)' }}>Sets with the most recent eBay activity.</p>
            </div>
            <a href="/trending" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>View all trends →</a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {trending.map(set => {
              const displayPrice = set.new_avg_price || set.avg_sale_price
              const change = pct(set.retail_price, displayPrice)
              return (
                <a key={set.id} href={`/sets/${set.id}`} style={{
                  border: '1.5px solid var(--border)', borderRadius: '14px',
                  overflow: 'hidden', textDecoration: 'none', color: 'inherit',
                  background: 'var(--bg)', display: 'block', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {/* Image area — same pattern as browse page */}
                  <div style={{
                    height: '140px', background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid var(--border)', position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {set.image_url ? (
                      <img
                        src={set.image_url}
                        alt={set.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div style={{
                      fontSize: '48px',
                      display: set.image_url ? 'none' : 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%',
                    }}>
                      {catIcon[set.category] || '📦'}
                    </div>
                    {set.is_retired && (
                      <span style={{
                        position: 'absolute', top: '8px', left: '8px',
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                        borderRadius: '5px', background: 'var(--red-light)', color: 'var(--red)',
                        border: '1px solid rgba(214,59,59,0.2)',
                      }}>Retired</span>
                    )}
                  </div>

                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '2px', lineHeight: 1.3 }}>{set.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '10px' }}>{set.category} · {set.theme}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 500 }}>
                        {displayPrice ? fmt(displayPrice) : '—'}
                      </div>
                      {change !== null && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                          background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)',
                          color: change >= 0 ? 'var(--green)' : 'var(--red)',
                        }}>{change >= 0 ? '+' : ''}{change}%</span>
                      )}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '72px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>How it works</div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Simple as it gets</h2>
        <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '48px' }}>No spreadsheets. No manual eBay searching. Real prices in seconds.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {[
            { num: '1', title: 'Search your item', desc: 'Type in a set name or number and instantly see real sold prices pulled directly from eBay.' },
            { num: '2', title: 'Track your collection', desc: 'Add items to your portfolio and we\'ll keep your total collection value updated automatically.' },
            { num: '3', title: 'Set price alerts', desc: 'Get notified when a set on your watchlist hits your target price — buy or sell at the right time.' },
          ].map(step => (
            <div key={step.num} style={{ padding: '32px 24px' }}>
              <div style={{
                width: '52px', height: '52px', background: 'var(--accent-light)',
                color: 'var(--accent)', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900,
                margin: '0 auto 16px',
              }}>{step.num}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{step.title}</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ margin: '0 40px 80px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1c1a17, #2d2820)',
          borderRadius: '24px', padding: '60px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,82,42,0.15), transparent 70%)',
          }}/>
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '-0.8px', marginBottom: '10px' }}>
              Ready to know what your collection is worth?
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)' }}>Free forever. Real eBay data. Start tracking in seconds.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
            <a href="/browse" style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              padding: '14px 28px', borderRadius: '12px', fontSize: '16px',
              fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(200,82,42,0.4)',
            }}>Browse Sets →</a>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}