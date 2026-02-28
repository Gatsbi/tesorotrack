'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function BrowsePage() {
  const [sets, setSets] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [theme, setTheme] = useState('All')
  const [sort, setSort] = useState('popular')
  const [retired, setRetired] = useState('All')
  const [themes, setThemes] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('cat')
    if (cat) setCategory(cat)
    loadSets(cat || 'All')
  }, [])

  async function loadSets(cat) {
    let query = supabase
      .from('sets')
      .select('id, name, set_number, category, theme, retail_price, avg_sale_price, new_avg_price, total_sales, is_retired, piece_count, image_url')
      .order('total_sales', { ascending: false, nullsFirst: false })

    if (cat && cat !== 'All') query = query.eq('category', cat)

    const { data } = await query
    setSets(data || [])
    setFiltered(data || [])

    const uniqueThemes = [...new Set((data || []).map(s => s.theme))].filter(Boolean).sort()
    setThemes(uniqueThemes)
    setLoading(false)
  }

  useEffect(() => {
    let result = [...sets]
    if (category !== 'All') result = result.filter(s => s.category === category)
    if (theme !== 'All') result = result.filter(s => s.theme === theme)
    if (retired === 'Retired') result = result.filter(s => s.is_retired)
    if (retired === 'Active') result = result.filter(s => !s.is_retired)

    if (sort === 'popular') result.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
    if (sort === 'price-high') result.sort((a, b) => (b.new_avg_price || b.avg_sale_price || 0) - (a.new_avg_price || a.avg_sale_price || 0))
    if (sort === 'price-low') result.sort((a, b) => (a.new_avg_price || a.avg_sale_price || 0) - (b.new_avg_price || b.avg_sale_price || 0))
    if (sort === 'premium') result.sort((a, b) => {
      const pa = a.retail_price ? (((a.new_avg_price || a.avg_sale_price) - a.retail_price) / a.retail_price) : -99
      const pb = b.retail_price ? (((b.new_avg_price || b.avg_sale_price) - b.retail_price) / b.retail_price) : -99
      return pb - pa
    })
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))

    setFiltered(result)
  }, [category, theme, sort, retired, sets])

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const pct = (retail, avg) => {
    if (!retail || !avg) return null
    return Math.round(((avg - retail) / retail) * 100)
  }
  const catIcon = { 'Mega': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const selectStyle = {
    fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)',
    background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Catalog</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '6px' }}>Browse All Sets</h1>
        <p style={{ fontSize: '15px', color: 'var(--muted)' }}>{filtered.length} sets — sorted by eBay activity</p>
      </div>

      <div style={{
        display: 'flex', gap: '10px', marginBottom: '32px',
        padding: '16px', background: 'var(--white)', borderRadius: '12px',
        border: '1.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter:</span>

        <select value={category} onChange={e => { setCategory(e.target.value); setTheme('All') }} style={selectStyle}>
          <option value="All">All Categories</option>
          <option value="Mega">Mega</option>
          <option value="Funko Pop">Funko Pop</option>
          <option value="LEGO">LEGO</option>
        </select>

        <select value={theme} onChange={e => setTheme(e.target.value)} style={selectStyle}>
          <option value="All">All Themes</option>
          {themes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={retired} onChange={e => setRetired(e.target.value)} style={selectStyle}>
          <option value="All">All Status</option>
          <option value="Retired">Retired Only</option>
          <option value="Active">Active Only</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort:</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
            <option value="popular">Most Popular</option>
            <option value="price-high">Price: High to Low</option>
            <option value="price-low">Price: Low to High</option>
            <option value="premium">Biggest Premium</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)', fontSize: '15px' }}>Loading sets...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {filtered.map(set => {
            const displayPrice = set.new_avg_price || set.avg_sale_price
            const change = pct(set.retail_price, displayPrice)
            // Show Mega Construx or Mega Bloks in subtitle based on theme
            const subtitle = set.category === 'Mega'
              ? `${set.theme || 'Mega'}`
              : `${set.category} · ${set.theme}`

            return (
              <a key={set.id} href={`/sets/${set.id}`} style={{
                border: '1.5px solid var(--border)', borderRadius: '14px',
                overflow: 'hidden', textDecoration: 'none', color: 'inherit',
                background: 'var(--white)', display: 'block', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  height: '140px', background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid var(--border)', position: 'relative',
                  overflow: 'hidden',
                }}>
                  {set.image_url ? (
                    <img src={set.image_url} alt={set.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                  ) : null}
                  <div style={{
                    fontSize: '42px',
                    display: set.image_url ? 'none' : 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%',
                  }}>
                    {catIcon[set.category] || '📦'}
                  </div>
                  {set.is_retired && (
                    <span style={{
                      position: 'absolute', top: '6px', left: '6px',
                      fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                      borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)',
                    }}>Retired</span>
                  )}
                </div>

                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 600, marginBottom: '2px' }}>
                    {set.set_number ? `#${set.set_number}` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '3px' }}>{subtitle}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '10px' }}>{set.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 500 }}>{fmt(displayPrice)}</div>
                      {set.retail_price && <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>MSRP {fmt(set.retail_price)}</div>}
                    </div>
                    {change !== null && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 7px', borderRadius: '5px',
                        background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)',
                        color: change >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>{change >= 0 ? '+' : ''}{change}%</span>
                    )}
                  </div>
                  {set.total_sales && (
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>{set.total_sales} recent sales</div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}