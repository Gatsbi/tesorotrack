'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function SetDetailPage({ params }) {
  const { user } = useAuth()
  const [set, setSet] = useState(null)
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [conditionFilter, setConditionFilter] = useState('All')

  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({ quantity: 1, price_paid: '', condition: 'New Sealed', notes: '' })
  const [saving, setSaving] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => { loadSet() }, [])

  async function loadSet() {
    const { data: setData } = await supabase
      .from('sets').select('*').eq('id', params.id).single()
    setSet(setData)
    const { data: priceData } = await supabase
      .from('prices').select('*').eq('set_id', params.id)
      .order('sale_date', { ascending: true }).limit(500)
    setPrices(priceData || [])
    setLoading(false)
  }

  async function addToPortfolio() {
    if (!user) { window.location.href = '/login'; return }
    setSaving(true)
    const { error } = await supabase.from('portfolios').insert({
      user_id: user.id,
      set_id: set.id,
      quantity: parseInt(portfolioForm.quantity),
      price_paid: parseFloat(portfolioForm.price_paid) || 0,
      condition: portfolioForm.condition,
      notes: portfolioForm.notes,
      date_added: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setAdded(true)
    setShowPortfolioModal(false)
    setTimeout(() => setAdded(false), 3000)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const pct = (retail, avg) => {
    if (!retail || !avg) return null
    return Math.round(((avg - retail) / retail) * 100)
  }

  const filteredPrices = conditionFilter === 'All' ? prices : prices.filter(p => p.condition === conditionFilter)
  const conditions = [...new Set(prices.map(p => p.condition).filter(Boolean))]

  // Build chart points — group by month if dates are spread, otherwise show price distribution
  const buildChartPoints = (priceList) => {
    if (!priceList.length) return []

    // Check if all prices have the same date (old data imported with today's date)
    const uniqueDates = [...new Set(priceList.map(p => p.sale_date).filter(Boolean))]
    const allSameDate = uniqueDates.length <= 2

    if (!allSameDate) {
      // Real dates — group by month
      const monthlyData = {}
      priceList.forEach(p => {
        const month = p.sale_date?.substring(0, 7)
        if (!month) return
        if (!monthlyData[month]) monthlyData[month] = []
        monthlyData[month].push(parseFloat(p.sale_price))
      })
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, vals]) => ({
          label: month.substring(5), // "MM"
          avg: vals.reduce((s, v) => s + v, 0) / vals.length,
          count: vals.length,
        }))
    } else {
      // All same date — show price distribution as percentile buckets
      // Sort prices and split into 8 buckets to simulate a trend line
      const sorted = [...priceList].sort((a, b) => parseFloat(a.sale_price) - parseFloat(b.sale_price))
      const bucketSize = Math.max(1, Math.floor(sorted.length / 8))
      const buckets = []
      for (let i = 0; i < sorted.length; i += bucketSize) {
        const chunk = sorted.slice(i, i + bucketSize)
        const avg = chunk.reduce((s, p) => s + parseFloat(p.sale_price), 0) / chunk.length
        buckets.push({ label: `${i + 1}`, avg, count: chunk.length })
      }
      return buckets
    }
  }

  const chartPoints = buildChartPoints(filteredPrices)
  const allSameDate = [...new Set(filteredPrices.map(p => p.sale_date).filter(Boolean))].length <= 2

  const SparkLine = ({ points }) => {
    if (points.length < 2) return null
    const vals = points.map(p => p.avg)
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
    const w = 600, h = 120, pad = 20
    const coords = points.map((p, i) => ({
      x: pad + (i / (points.length - 1)) * (w - pad * 2),
      y: h - pad - ((p.avg - min) / range) * (h - pad * 2),
    }))
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
    const area = `${path} L${coords[coords.length-1].x},${h} L${coords[0].x},${h} Z`
    const rising = vals[vals.length - 1] >= vals[0]
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '160px' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rising ? '#1a9e6e' : '#d63b3b'} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={rising ? '#1a9e6e' : '#d63b3b'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartGrad)"/>
        <path d={path} fill="none" stroke={rising ? '#1a9e6e' : '#d63b3b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill={rising ? '#1a9e6e' : '#d63b3b'} opacity="0.6"/>
        ))}
      </svg>
    )
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px 40px', color: 'var(--muted)', fontSize: '16px' }}>Loading...</div>
  if (!set) return (
    <div style={{ textAlign: 'center', padding: '120px 40px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', marginBottom: '10px' }}>Set not found</h2>
      <a href="/browse" style={{ color: 'var(--accent)', fontWeight: 700 }}>← Back to browse</a>
    </div>
  )

  const change = pct(set.retail_price, set.avg_sale_price)
  const allTimeLow = prices.length ? Math.min(...prices.map(p => parseFloat(p.sale_price))) : null
  const allTimeHigh = prices.length ? Math.max(...prices.map(p => parseFloat(p.sale_price))) : null

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      {added && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 300,
          background: 'var(--green)', color: 'white', padding: '14px 20px',
          borderRadius: '12px', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>✓ Added to portfolio!</div>
      )}

      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <a href="/browse" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>Browse</a>
        <span>›</span>
        <a href={`/browse?cat=${encodeURIComponent(set.category)}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>{set.category}</a>
        <span>›</span>
        <a href={`/browse?cat=${encodeURIComponent(set.category)}&theme=${encodeURIComponent(set.theme)}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>{set.theme}</a>
        <span>›</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{set.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', marginBottom: '40px' }}>
        {/* Left */}
        <div>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px',
            border: '1.5px solid var(--border)', padding: '40px 30px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', marginBottom: '16px', gap: '12px',
          }}>
            {set.image_url ? (
              <img src={set.image_url} alt={set.name} style={{ width: '100%', maxWidth: '220px', height: '180px', objectFit: 'contain', borderRadius: '8px' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}/>
            ) : null}
            <div style={{ fontSize: '80px', display: set.image_url ? 'none' : 'block' }}>
              {{ 'Mega': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[set.category] || '📦'}
            </div>
            {set.is_retired && (
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: 'var(--red-light)', color: 'var(--red)', border: '1px solid rgba(214,59,59,0.2)' }}>Retired Set</span>
            )}
          </div>

          <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            {[
              { label: 'Category', value: set.category },
              { label: 'Theme', value: set.theme },
              { label: 'Set Number', value: set.set_number || '—' },
              { label: 'Year Released', value: set.year_released || '—' },
              { label: 'Year Retired', value: set.year_retired || 'Still Available' },
              { label: 'MSRP', value: fmt(set.retail_price) },
              { label: 'Piece Count', value: set.piece_count ? set.piece_count.toLocaleString() : '—' },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => setShowPortfolioModal(true)} style={{
              flex: 1, background: 'var(--accent)', color: 'white', border: 'none',
              padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer',
            }}>+ Portfolio</button>
            <a href="/watchlist" style={{
              flex: 1, background: 'var(--white)', color: 'var(--text)',
              border: '1.5px solid var(--border)', padding: '12px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center',
            }}>👁 Watchlist</a>
          </div>
        </div>

        {/* Right */}
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px', lineHeight: 1.2 }}>{set.name}</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>{set.category} · {set.theme} {set.set_number ? `· #${set.set_number}` : ''}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Avg Sale Price', value: fmt(set.avg_sale_price), sub: 'Last 90 days', highlight: true },
              { label: 'MSRP', value: fmt(set.retail_price), sub: 'Original retail' },
              { label: 'All-Time High', value: allTimeHigh ? `$${allTimeHigh.toFixed(2)}` : '—', sub: 'Highest recorded' },
              { label: 'All-Time Low', value: allTimeLow ? `$${allTimeLow.toFixed(2)}` : '—', sub: 'Lowest recorded' },
            ].map(card => (
              <div key={card.label} style={{
                padding: '16px', borderRadius: '12px',
                background: card.highlight ? 'var(--accent)' : 'var(--white)',
                border: card.highlight ? 'none' : '1.5px solid var(--border)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: card.highlight ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{card.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 500, color: card.highlight ? 'white' : 'var(--text)', marginBottom: '4px' }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: card.highlight ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {change !== null && (
            <div style={{
              padding: '16px 20px', borderRadius: '12px', marginBottom: '28px',
              background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)',
              border: `1.5px solid ${change >= 0 ? 'rgba(26,158,110,0.2)' : 'rgba(214,59,59,0.2)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: change >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {change >= 0 ? '📈 Premium Over Retail' : '📉 Below Retail'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                  Selling {change >= 0 ? 'above' : 'below'} original MSRP of {fmt(set.retail_price)}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 500, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {change >= 0 ? '+' : ''}{change}%
              </div>
            </div>
          )}

          <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Price History</div>
                {allSameDate && chartPoints.length >= 2 && (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Showing price distribution — run price update to get timeline data</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All', ...conditions].map(c => (
                  <button key={c} onClick={() => setConditionFilter(c)} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: conditionFilter === c ? 'var(--accent)' : 'var(--border)',
                    background: conditionFilter === c ? 'var(--accent)' : 'transparent',
                    color: conditionFilter === c ? 'white' : 'var(--muted)',
                  }}>{c}</button>
                ))}
              </div>
            </div>
            {chartPoints.length >= 2 ? (
              <>
                <SparkLine points={chartPoints} />
                {!allSameDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    {chartPoints.map(p => (
                      <div key={p.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{p.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '13px' }}>
                {filteredPrices.length === 0 ? 'No sales data yet' : 'Not enough price history to chart yet'}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Recent eBay Sales</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>{filteredPrices.length} total</span>
            </div>
            {filteredPrices.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No sales data yet</div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {filteredPrices.slice(-50).reverse().map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 20px', borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.listing_title?.substring(0, 60)}...</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{p.sale_date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                        background: p.condition === 'New Sealed' ? 'var(--green-light)' : p.condition === 'Open Box' ? 'var(--yellow-light)' : 'var(--surface)',
                        color: p.condition === 'New Sealed' ? 'var(--green)' : p.condition === 'Open Box' ? 'var(--yellow)' : 'var(--muted)',
                      }}>{p.condition}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 600 }}>${parseFloat(p.sale_price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPortfolioModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={e => e.target === e.currentTarget && setShowPortfolioModal(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: '20px', padding: '32px',
            width: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>Add to Portfolio</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>{set.name} {set.set_number ? `· #${set.set_number}` : ''}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Quantity</label>
                <input type="number" min="1" value={portfolioForm.quantity}
                  onChange={e => setPortfolioForm({ ...portfolioForm, quantity: e.target.value })}
                  style={inputStyle}/>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Price Paid (each)</label>
                <input type="number" step="0.01" placeholder={set.retail_price ? set.retail_price : '0.00'}
                  value={portfolioForm.price_paid}
                  onChange={e => setPortfolioForm({ ...portfolioForm, price_paid: e.target.value })}
                  style={inputStyle}/>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Condition</label>
              <select value={portfolioForm.condition}
                onChange={e => setPortfolioForm({ ...portfolioForm, condition: e.target.value })}
                style={inputStyle}>
                <option>New Sealed</option>
                <option>Open Box</option>
                <option>Used</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
              <input type="text" placeholder="e.g. Got at Target clearance"
                value={portfolioForm.notes}
                onChange={e => setPortfolioForm({ ...portfolioForm, notes: e.target.value })}
                style={inputStyle}/>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPortfolioModal(false)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)',
                background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addToPortfolio} disabled={saving} style={{
                flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                background: saving ? 'var(--border)' : 'var(--accent)',
                color: saving ? 'var(--muted)' : 'white',
                fontSize: '14px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              }}>{saving ? 'Adding...' : 'Add to Portfolio'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}