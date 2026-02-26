'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function MarketplacePage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [condition, setCondition] = useState('All')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  useEffect(() => { loadListings() }, [category, condition, sort])

  async function loadListings() {
    let query = supabase
      .from('marketplace_listings')
      .select('*, sets(name, category, theme), profiles!seller_id(username, display_name, total_sales)')
      .eq('status', 'active')

    if (category !== 'All') query = query.eq('sets.category', category)
    if (condition !== 'All') query = query.eq('condition', condition)
    if (sort === 'newest') query = query.order('created_at', { ascending: false })
    if (sort === 'price-low') query = query.order('price', { ascending: true })
    if (sort === 'price-high') query = query.order('price', { ascending: false })

    const { data } = await query.limit(60)
    setListings(data || [])
    setLoading(false)
  }

  const filtered = listings.filter(l => {
    if (!search) return true
    const name = (l.sets?.name || l.manual_set_name || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const conditionColor = { 'New Sealed': 'var(--green)', 'Open Box': 'var(--yellow)', 'Used - Like New': 'var(--accent2)', 'Used - Good': 'var(--muted)', 'Used - Fair': 'var(--muted)' }
  const conditionBg = { 'New Sealed': 'var(--green-light)', 'Open Box': 'var(--yellow-light)', 'Used - Like New': '#eef4fd', 'Used - Good': 'var(--surface)', 'Used - Fair': 'var(--surface)' }

  const selectStyle = {
    fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)',
    background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Collector Marketplace</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '6px' }}>Marketplace</h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)' }}>Buy and sell sets directly with other collectors.</p>
        </div>
        <a href="/marketplace/new" style={{
          background: 'var(--accent)', color: 'white', padding: '12px 24px',
          borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>+ List a Set</a>
      </div>

      {/* Search + filters */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap',
        padding: '16px', background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)',
        alignItems: 'center',
      }}>
        <input
          type="text" placeholder="Search listings..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: '200px', fontWeight: 400 }}
        />
        <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
          <option value="All">All Categories</option>
          <option value="Mega Construx">Mega Construx</option>
          <option value="Funko Pop">Funko Pop</option>
          <option value="LEGO">LEGO</option>
        </select>
        <select value={condition} onChange={e => setCondition(e.target.value)} style={selectStyle}>
          <option value="All">All Conditions</option>
          <option>New Sealed</option>
          <option>Open Box</option>
          <option>Used - Like New</option>
          <option>Used - Good</option>
          <option>Used - Fair</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
        <a href="/parts" style={{
          padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--border)',
          fontSize: '13px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>🔩 Parts Exchange</a>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading listings...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No listings yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>Be the first to list something for sale!</p>
          <a href="/marketplace/new" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Create a listing →</a>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {filtered.map(l => (
              <a key={l.id} href={`/marketplace/${l.id}`} style={{
                background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)',
                textDecoration: 'none', color: 'inherit', display: 'block', transition: 'all 0.2s', overflow: 'hidden',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  height: '140px', background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '52px', borderBottom: '1px solid var(--border)',
                }}>
                  {{ 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[l.sets?.category || l.manual_category] || '📦'}
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>
                    {l.sets?.category || l.manual_category} · {l.sets?.theme}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.3, marginBottom: '10px' }}>{l.sets?.name || l.manual_set_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600 }}>{fmt(l.price)}</div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px',
                      background: conditionBg[l.condition] || 'var(--surface)',
                      color: conditionColor[l.condition] || 'var(--muted)',
                    }}>{l.condition}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>@{l.profiles?.username} · {l.profiles?.total_sales} sales</span>
                    <span>{l.free_shipping ? '✓ Free ship' : l.shipping_cost ? `+${fmt(l.shipping_cost)}` : ''}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
