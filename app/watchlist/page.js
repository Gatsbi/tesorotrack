'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedSet, setSelectedSet] = useState(null)
  const [targetPrice, setTargetPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        window.location.href = '/login'
      } else {
        loadWatchlist()
      }
    }
  }, [user, authLoading])

  async function loadWatchlist() {
    const { data } = await supabase
      .from('watchlists')
      .select(`*, sets(id, name, category, theme, avg_sale_price, retail_price, is_retired)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('sets')
        .select('id, name, category, theme, avg_sale_price, retail_price, is_retired')
        .ilike('name', `%${search}%`)
        .limit(8)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const addItem = async () => {
    if (!selectedSet || !user) return
    setSaving(true)
    const { error } = await supabase.from('watchlists').insert({
      user_id: user.id,
      set_id: selectedSet.id,
      target_price: parseFloat(targetPrice) || null,
    })
    if (!error) {
      await loadWatchlist()
      setShowAdd(false)
      setSelectedSet(null)
      setSearch('')
      setTargetPrice('')
    }
    setSaving(false)
  }

  const removeItem = async (id) => {
    await supabase.from('watchlists').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const pct = (retail, current) => {
    if (!retail || !current) return null
    return Math.round(((current - retail) / retail) * 100)
  }
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  if (authLoading || loading) return (
    <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)', fontSize: '16px' }}>Loading...</div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Tracking</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Watchlist</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>Sets you're watching — buy when the price is right.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: 'var(--accent)', color: 'white', border: 'none',
          padding: '12px 24px', borderRadius: '10px', fontSize: '14px',
          fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>+ Watch a Set</button>
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 40px',
          background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>👁</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Nothing on your watchlist yet</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>Add sets you want to buy and set a target price so you know when to strike.</p>
          <button onClick={() => setShowAdd(true)} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}>Watch your first set</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {items.map(item => {
            const set = item.sets
            const change = pct(set?.retail_price, set?.avg_sale_price)
            const atTarget = item.target_price && set?.avg_sale_price && set.avg_sale_price <= item.target_price
            return (
              <div key={item.id} style={{
                background: 'var(--white)', borderRadius: '14px',
                border: `1.5px solid ${atTarget ? '#1a9e6e' : 'var(--border)'}`,
                padding: '20px 24px',
                display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 1fr 100px',
                alignItems: 'center', gap: '16px',
                boxShadow: atTarget ? '0 4px 16px rgba(26,158,110,0.1)' : 'none',
              }}>
                <div style={{ fontSize: '36px', textAlign: 'center' }}>{catIcon[set?.category] || '📦'}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>{set?.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{set?.category} · {set?.theme}</div>
                  {set?.is_retired && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)', marginTop: '4px', display: 'inline-block' }}>Retired</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Current Price</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 500 }}>{fmt(set?.avg_sale_price)}</div>
                  {change !== null && (
                    <div style={{ fontSize: '11px', marginTop: '2px', fontWeight: 700, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {change >= 0 ? '+' : ''}{change}% vs retail
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Target Price</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 500, color: atTarget ? 'var(--green)' : 'var(--text)' }}>
                    {item.target_price ? fmt(item.target_price) : 'Not set'}
                  </div>
                  {atTarget && <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, marginTop: '2px' }}>✓ Target reached!</div>}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>MSRP</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '15px' }}>{fmt(set?.retail_price)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <a href={`/sets/${set?.id}`} style={{
                    padding: '7px 12px', borderRadius: '8px', border: '1.5px solid var(--border)',
                    fontSize: '12px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)',
                  }}>View</a>
                  <button onClick={() => removeItem(item.id)} style={{
                    padding: '7px 12px', borderRadius: '8px', border: '1.5px solid var(--border)',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: 'none', color: 'var(--muted)',
                  }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: '20px', padding: '32px',
            width: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '24px' }}>Watch a Set</h2>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Search Set</label>
              <input
                type="text" placeholder="Type a set name..."
                value={selectedSet ? selectedSet.name : search}
                onChange={e => { setSearch(e.target.value); setSelectedSet(null) }}
                style={inputStyle}
              />
              {searchResults.length > 0 && !selectedSet && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'var(--white)', border: '1.5px solid var(--border)',
                  borderRadius: '10px', marginTop: '4px', overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                }}>
                  {searchResults.map(s => (
                    <div key={s.id} onClick={() => { setSelectedSet(s); setSearch(s.name); setSearchResults([]) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.category} · Avg {fmt(s.avg_sale_price)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Target Price (optional)</label>
              <input
                type="number" step="0.01" placeholder="Alert me when price drops to..."
                value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                {selectedSet?.avg_sale_price ? `Current avg: ${fmt(selectedSet.avg_sale_price)}` : 'Select a set to see current price'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAdd(false); setSelectedSet(null); setSearch('') }} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)',
                background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addItem} disabled={!selectedSet || saving} style={{
                flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                background: selectedSet && !saving ? 'var(--accent)' : 'var(--border)',
                color: selectedSet && !saving ? 'white' : 'var(--muted)',
                fontSize: '14px', fontWeight: 700, cursor: selectedSet ? 'pointer' : 'default',
              }}>{saving ? 'Saving...' : 'Add to Watchlist'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
