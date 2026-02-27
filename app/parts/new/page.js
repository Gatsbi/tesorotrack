'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function NewPartsPage() {
  const { user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    part_number: '', part_name: '', category: 'LEGO', color: '',
    quantity: '1', price_per_piece: '', condition: 'Used - Good',
    description: '', ships_from: '', shipping_cost: '0',
  })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  async function submit() {
    if (!form.part_number.trim() || !form.price_per_piece || parseInt(form.quantity) < 1) return
    setSubmitting(true)
    const { error } = await supabase.from('parts_listings').insert({
      seller_id: user.id,
      part_number: form.part_number.trim(),
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
    if (!error) setDone(true)
    setSubmitting(false)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', background: 'var(--bg)' }
  const labelStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }

  if (done) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🧩</div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, marginBottom: '10px' }}>Parts listed!</h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>Your parts are now visible in the Parts Exchange.</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <a href="/parts" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Browse Parts Exchange</a>
        <button onClick={() => { setDone(false); setForm({ part_number: '', part_name: '', category: 'LEGO', color: '', quantity: '1', price_per_piece: '', condition: 'Used - Good', description: '', ships_from: '', shipping_cost: '0' }) }} style={{ background: 'var(--white)', color: 'var(--text)', border: '1.5px solid var(--border)', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>List More Parts</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Parts Exchange</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>List Parts for Sale</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>Sell individual LEGO or Mega Construx pieces.</p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Part Details</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Part Number *</label>
                <input type="text" value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} style={inputStyle} placeholder="e.g. 3001 or GJX13" />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Find on the piece itself or BrickLink</div>
              </div>
              <div>
                <label style={labelStyle}>Category *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  <option>LEGO</option><option>Mega Construx</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Part Name</label>
              <input type="text" value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })} style={inputStyle} placeholder="e.g. 2x4 Brick, Minifigure Torso" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Color</label>
                <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={inputStyle} placeholder="e.g. Red, Dark Blue" />
              </div>
              <div>
                <label style={labelStyle}>Condition</label>
                <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
                  <option>New</option><option>Used - Like New</option><option>Used - Good</option><option>Used - Fair</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, height: '70px', resize: 'vertical' }} placeholder="Any additional details about the parts..." />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Pricing & Quantity</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Quantity Available *</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Price Per Piece *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                <input type="number" step="0.001" value={form.price_per_piece} onChange={e => setForm({ ...form, price_per_piece: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} placeholder="0.00" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Can use 3 decimal places, e.g. $0.025</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Shipping</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Ships From</label><input type="text" value={form.ships_from} onChange={e => setForm({ ...form, ships_from: e.target.value })} style={inputStyle} placeholder="e.g. Austin, TX" /></div>
            <div>
              <label style={labelStyle}>Shipping Cost</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                <input type="number" step="0.01" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={submit} disabled={submitting || !form.part_number || !form.price_per_piece} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: submitting ? 'var(--border)' : 'var(--accent)', color: submitting ? 'var(--muted)' : 'white', fontSize: '16px', fontWeight: 700, cursor: submitting ? 'default' : 'pointer', boxShadow: '0 4px 14px rgba(200,82,42,0.3)' }}>
          {submitting ? 'Publishing...' : 'List Parts'}
        </button>
      </div>
    </div>
  )
}
