'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function PartsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => { loadListings() }, [category])

  async function loadListings() {
    let query = supabase
      .from('parts_listings')
      .select('*, profiles(username, display_name, location)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (category !== 'All') query = query.eq('category', category)
    const { data } = await query.limit(80)
    setListings(data || [])
    setLoading(false)
  }

  const filtered = search
    ? listings.filter(l => l.part_number.includes(search) || (l.part_name || '').toLowerCase().includes(search.toLowerCase()) || (l.color || '').toLowerCase().includes(search.toLowerCase()))
    : listings

  const selectStyle = { fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', outline: 'none' }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Loose Pieces</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Parts Exchange</h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>Buy and sell individual LEGO and Mega Construx pieces.</p>
        </div>
        <a href="/parts/new" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(200,82,42,0.3)' }}>+ List Parts</a>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', padding: '16px', background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search by part number, name, or color..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...selectStyle, flex: 1, minWidth: '220px', padding: '8px 14px' }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
          <option value="All">All Categories</option>
          <option value="LEGO">LEGO</option>
          <option value="Mega Construx">Mega Construx</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading parts...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧩</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No parts listed yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Be the first to list loose pieces for sale.</p>
          <a href="/parts/new" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>List your parts</a>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
          <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px 100px 120px 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['Part #', 'Name / Description', 'Category', 'Color', 'Qty', 'Price/ea', 'Seller'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>
            {filtered.map((listing, i) => (
              <div key={listing.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px 100px 120px 80px', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{listing.part_number}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{listing.part_name || '—'}</div>
                  {listing.description && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{listing.description.substring(0, 60)}{listing.description.length > 60 ? '...' : ''}</div>}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{listing.category}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{listing.color || '—'}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{listing.quantity}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 600 }}>${parseFloat(listing.price_per_piece).toFixed(3)}</div>
                <a href={`/u/${listing.profiles?.username}`} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>@{listing.profiles?.username}</a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
