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
      .select(`*, sets(name, category, theme), profiles(username, display_name)`)
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

  const filtered = search
    ? listings.filter(l => (l.sets?.name || l.manual_set_name || '').toLowerCase().includes(search.toLowerCase()))
    : listings

  const selectStyle = { fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', outline: 'none' }

  const conditionColor = { 'New Sealed': 'var(--green)', 'Open Box': 'var(--yellow)', 'Used - Like New': 'var(--accent2)', 'Used - Good': 'var(--muted)', 'Used - Fair': 'var(--muted)' }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Collector Marketplace</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Marketplace</h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>Buy and sell sets directly with other collectors.</p>
        </div>
        <a href="/marketplace/new" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(200,82,42,0.3)' }}>+ Sell a Set</a>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', padding: '16px', background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: '200px', padding: '8px 14px' }} />
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
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...selectStyle, marginLeft: 'auto' }}>
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading listings...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No listings yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Be the first to list a set for sale.</p>
          <a href="/marketplace/new" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Create a listing</a>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {filtered.map(listing => {
              const name = listing.sets?.name || listing.manual_set_name || 'Unknown Set'
              const cat = listing.sets?.category || listing.manual_category
              const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[cat] || '📦'
              return (
                <a key={listing.id} href={`/marketplace/${listing.id}`} style={{ border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden', textDecoration: 'none', color: 'inherit', background: 'var(--white)', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ height: '120px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', borderBottom: '1px solid var(--border)' }}>
                    {catIcon}
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '6px' }}>{name}</div>
                    <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                      <span style={{ color: conditionColor[listing.condition] || 'var(--muted)', fontWeight: 700 }}>{listing.condition}</span>
                      {listing.free_shipping && <span style={{ marginLeft: '8px', color: 'var(--green)', fontWeight: 700 }}>Free Shipping</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 600 }}>${parseFloat(listing.price).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        by <span style={{ fontWeight: 700, color: 'var(--text)' }}>@{listing.profiles?.username}</span>
                      </div>
                    </div>
                    {listing.ships_from && <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>Ships from {listing.ships_from}</div>}
                  </div>
                </a>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
