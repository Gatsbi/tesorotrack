'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function NewPartsListingPage() {
  const { user, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    part_number: '', part_name: '', category: 'LEGO',
    color: '', quantity: 1, price_per_piece: '',
    condition: 'Used - Good', description: '', ships_from: '', shipping_cost: '',
  })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  const submit = async () => {
    if (!form.part_number || !form.price_per_piece || !form.quantity) {
      alert('Please fill in part number, quantity, and price')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('parts_listings').insert({
      seller_id: user.id,
      part_number: form.part_number,
      part_name: form.part_name || null,
      category: form.category,
      color: form.color || null,
      quantity: parseInt(form.quantity),
      price_per_piece: parseFloat(form.price_per_piece),
      condition: form.condition,
      description: form.description || null,
      ships_from: form.ships_from || null,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
    })
    if (!error) window.location.href = '/parts'
    else { alert('Error: ' + error.message); setSaving(false) }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  if (authLoading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/parts" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textDecoration: 'none' }}>← Parts Exchange</a>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginTop: '12px' }}>List Parts for Sale</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>List individual LEGO or Mega Construx pieces.</p>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px', display: 'grid', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Category <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              <option value="LEGO">LEGO</option>
              <option value="Mega Construx">Mega Construx</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Part Number <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input type="text" placeholder="e.g. 3001" value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Part Name (optional)</label>
          <input type="text" placeholder="e.g. Brick 2x4" value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Color</label>
            <input type="text" placeholder="e.g. Red" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Quantity <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Price Per Piece <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)' }}>$</span>
              <input type="number" step="0.001" placeholder="0.05" value={form.price_per_piece} onChange={e => setForm({ ...form, price_per_piece: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Condition</label>
            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
              <option>New</option>
              <option>Used - Like New</option>
              <option>Used - Good</option>
              <option>Used - Fair</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Ships From</label>
            <input type="text" placeholder="e.g. New Jersey" value={form.ships_from} onChange={e => setForm({ ...form, ships_from: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Additional Notes</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
            placeholder="Minimum order, lot deals, any other details..."
          />
        </div>

        <div style={{ padding: '14px', background: 'var(--surface)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)' }}>
          💡 Total listing value: <strong style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>
            {form.quantity && form.price_per_piece ? `$${(parseFloat(form.quantity) * parseFloat(form.price_per_piece)).toFixed(2)}` : '—'}
          </strong>
        </div>

        <button onClick={submit} disabled={saving} style={{
          padding: '14px', borderRadius: '10px', border: 'none',
          background: saving ? 'var(--border)' : 'var(--accent)',
          color: saving ? 'var(--muted)' : 'white',
          fontSize: '15px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
          boxShadow: saving ? 'none' : '0 4px 14px rgba(200,82,42,0.3)',
        }}>{saving ? 'Publishing...' : 'Publish Parts Listing'}</button>
      </div>
    </div>
  )
}
