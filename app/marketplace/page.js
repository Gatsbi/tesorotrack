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
    setLoading(true)
    let query = supabase
      .from('listings')
      .select(`*, sets(id, name, category, theme, set_number, image_url, avg_sale_price)`)
      .eq('status', 'active')

    if (condition !== 'All') query = query.eq('condition', condition)
    if (sort === 'newest') query = query.order('created_at', { ascending: false })
    if (sort === 'price-low') query = query.order('price', { ascending: true })
    if (sort === 'price-high') query = query.order('price', { ascending: false })

    const { data, error } = await query.limit(60)
    if (error) { console.error(error); setLoading(false); return }

    // Fetch seller profiles
    const sellerIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))]
    let profileMap = {}
    if (sellerIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', sellerIds)
      if (profilesData) profilesData.forEach(p => { profileMap[p.id] = p })
    }

    let enriched = (data || []).map(l => ({ ...l, profile: profileMap[l.user_id] || null }))

    if (category !== 'All') {
      enriched = enriched.filter(l => l.sets?.category === category)
    }

    setListings(enriched)
    setLoading(false)
  }

  const filtered = search
    ? listings.filter(l =>
        (l.sets?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.sets?.set_number || '').toLowerCase().includes(search.toLowerCase())
      )
    : listings

  const selectStyle = {
    fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600,
    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)',
    background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
  }

  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const conditionBadgeStyle = (cond) => ({
    fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
    background: cond === 'New Sealed' ? 'var(--green-light)' : cond === 'Open Box' ? 'var(--yellow-light)' : 'var(--surface)',
    color: cond === 'New Sealed' ? 'var(--green)' : cond === 'Open Box' ? 'var(--yellow)' : 'var(--muted)',
  })

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Collector Marketplace</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Marketplace</h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>Buy and sell sets directly with other collectors.</p>
        </div>
        <a href="/portfolio" style={{
          background: 'var(--accent)', color: 'white', padding: '12px 24px',
          borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>+ Sell a Set</a>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '32px', padding: '16px',
        background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input type="text" placeholder="Search by name or set number..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: '200px', padding: '8px 14px' }}/>
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
          <option>Used</option>
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
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>List sets from your portfolio to sell them here.</p>
          <a href="/portfolio" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Go to Portfolio</a>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {filtered.map(listing => {
              const set = listing.sets
              const name = set?.name || 'Unknown Set'
              const icon = catIcon[set?.category] || '📦'
              return (
                <a key={listing.id} href={`/marketplace/${listing.id}`} style={{
                  border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden',
                  textDecoration: 'none', color: 'inherit', background: 'var(--white)',
                  display: 'block', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {/* Image */}
                  <div style={{ height: '140px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    {set?.image_url ? (
                      <img src={set.image_url} alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}/>
                    ) : null}
                    <div style={{ fontSize: '48px', display: set?.image_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {icon}
                    </div>
                  </div>

                  <div style={{ padding: '14px' }}>
                    {/* Set number */}
                    {set?.set_number && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>#{set.set_number}</div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>{set?.category} · {set?.theme}</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={conditionBadgeStyle(listing.condition)}>{listing.condition}</span>
                      {listing.quantity > 1 && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Qty: {listing.quantity}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600 }}>
                        ${parseFloat(listing.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        by <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                          @{listing.profile?.username || 'seller'}
                        </span>
                      </div>
                    </div>

                    {/* Compare to market avg */}
                    {set?.avg_sale_price && (
                      <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>
                        Market avg: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 600 }}>${parseFloat(set.avg_sale_price).toFixed(2)}</span>
                      </div>
                    )}
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