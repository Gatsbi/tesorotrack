'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function PortfolioPage() {
  const [items, setItems] = useState([])
  const [sets, setSets] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [form, setForm] = useState({ set_id: '', quantity: 1, price_paid: '', condition: 'New Sealed', notes: '' })
  const [selectedSet, setSelectedSet] = useState(null)

  // Load portfolio from localStorage (simple persistence without auth)
  useEffect(() => {
    const saved = localStorage.getItem('tesorotrack_portfolio')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  const saveItems = (newItems) => {
    setItems(newItems)
    localStorage.setItem('tesorotrack_portfolio', JSON.stringify(newItems))
  }

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('sets')
        .select('id, name, category, theme, avg_sale_price, retail_price')
        .ilike('name', `%${search}%`)
        .limit(8)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const addItem = () => {
    if (!selectedSet) return
    const newItem = {
      id: Date.now(),
      set_id: selectedSet.id,
      set_name: selectedSet.name,
      category: selectedSet.category,
      theme: selectedSet.theme,
      current_price: selectedSet.avg_sale_price,
      quantity: parseInt(form.quantity),
      price_paid: parseFloat(form.price_paid) || 0,
      condition: form.condition,
      notes: form.notes,
      date_added: new Date().toISOString().split('T')[0],
    }
    saveItems([...items, newItem])
    setShowAdd(false)
    setForm({ set_id: '', quantity: 1, price_paid: '', condition: 'New Sealed', notes: '' })
    setSelectedSet(null)
    setSearch('')
  }

  const removeItem = (id) => {
    saveItems(items.filter(i => i.id !== id))
  }

  const totalValue = items.reduce((s, i) => s + ((i.current_price || 0) * i.quantity), 0)
  const totalInvested = items.reduce((s, i) => s + (i.price_paid * i.quantity), 0)
  const totalGain = totalValue - totalInvested
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>My Collection</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Portfolio Tracker</h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '6px' }}>Track what you own and what it's worth today.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: 'var(--accent)', color: 'white', border: 'none',
          padding: '12px 24px', borderRadius: '10px', fontSize: '14px',
          fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>+ Add Item</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {[
          { label: 'Total Value', value: fmt(totalValue), sub: 'Current market value', highlight: true },
          { label: 'Total Invested', value: fmt(totalInvested), sub: 'What you paid' },
          { label: 'Total Gain/Loss', value: fmt(totalGain), sub: `${gainPct}% return`, positive: totalGain >= 0 },
          { label: 'Items Tracked', value: items.reduce((s, i) => s + i.quantity, 0), sub: `${items.length} unique sets` },
        ].map(card => (
          <div key={card.label} style={{
            padding: '20px', borderRadius: '14px',
            background: card.highlight ? 'var(--text)' : 'var(--white)',
            border: card.highlight ? 'none' : '1.5px solid var(--border)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: card.highlight ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>{card.label}</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: 500, marginBottom: '4px',
              color: card.highlight ? 'white' : card.positive === true ? 'var(--green)' : card.positive === false ? 'var(--red)' : 'var(--text)',
            }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: card.highlight ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Portfolio table */}
      {items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 40px',
          background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📦</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Your portfolio is empty</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>Add sets you own and we'll track their current market value.</p>
          <button onClick={() => setShowAdd(true)} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}>Add your first item</button>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Set', 'Condition', 'Qty', 'Paid', 'Current', 'Gain/Loss', ''].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {items.map((item, i) => {
            const currentVal = (item.current_price || 0) * item.quantity
            const investedVal = item.price_paid * item.quantity
            const gain = currentVal - investedVal
            const gainP = investedVal > 0 ? ((gain / investedVal) * 100).toFixed(1) : null
            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 80px',
                padding: '14px 20px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{item.set_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{item.category} · {item.theme}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{item.condition}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{item.quantity}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{fmt(investedVal)}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{item.current_price ? fmt(currentVal) : '—'}</div>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: gain >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)}
                  </div>
                  {gainP && <div style={{ fontSize: '10px', color: gain >= 0 ? 'var(--green)' : 'var(--red)' }}>{gain >= 0 ? '+' : ''}{gainP}%</div>}
                </div>
                <button onClick={() => removeItem(item.id)} style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '4px 10px', fontSize: '11px', cursor: 'pointer', color: 'var(--muted)',
                }}>Remove</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add item modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: '20px', padding: '32px',
            width: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', position: 'relative',
          }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '24px' }}>Add to Portfolio</h2>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Search Set</label>
              <input
                type="text"
                placeholder="Type a set name..."
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
                      style={{
                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        fontSize: '13px', fontWeight: 600,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>{s.category} · {s.theme} {s.avg_sale_price ? `· Avg $${parseFloat(s.avg_sale_price).toFixed(2)}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Price Paid (each)</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.price_paid} onChange={e => setForm({ ...form, price_paid: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Condition</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={{ ...inputStyle }}>
                <option>New Sealed</option>
                <option>Open Box</option>
                <option>Used</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
              <input type="text" placeholder="e.g. Got at Target clearance" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAdd(false); setSelectedSet(null); setSearch('') }} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)',
                background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addItem} disabled={!selectedSet} style={{
                flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                background: selectedSet ? 'var(--accent)' : 'var(--border)',
                color: selectedSet ? 'white' : 'var(--muted)',
                fontSize: '14px', fontWeight: 700, cursor: selectedSet ? 'pointer' : 'default',
              }}>Add to Portfolio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
