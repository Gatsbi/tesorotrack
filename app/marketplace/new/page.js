'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function NewListingPage() {
  const { user, loading: authLoading } = useAuth()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedSet, setSelectedSet] = useState(null)
  const [useManual, setUseManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    price: '', condition: 'New Sealed', description: '',
    ships_from: '', shipping_cost: '', free_shipping: false,
    payment_methods: ['PayPal', 'Venmo'],
    manual_set_name: '', manual_set_number: '', manual_category: 'Mega Construx',
  })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  useEffect(() => {
    if (search.length < 2 || useManual) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('sets')
        .select('id, name, category, theme, avg_sale_price, retail_price')
        .ilike('name', `%${search}%`)
        .limit(8)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search, useManual])

  const togglePayment = (method) => {
    const current = form.payment_methods
    setForm({ ...form, payment_methods: current.includes(method) ? current.filter(m => m !== method) : [...current, method] })
  }

  const submit = async () => {
    if (!user) return
    if (!selectedSet && !useManual) { alert('Please select a set or enter set details manually'); return }
    if (!form.price) { alert('Please enter a price'); return }
    setSaving(true)

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
    if (!profile) { alert('Please complete your profile first'); window.location.href = '/account'; return }

    const { data, error } = await supabase.from('marketplace_listings').insert({
      seller_id: user.id,
      set_id: selectedSet?.id || null,
      manual_set_name: useManual ? form.manual_set_name : null,
      manual_set_number: useManual ? form.manual_set_number : null,
      manual_category: useManual ? form.manual_category : null,
      price: parseFloat(form.price),
      condition: form.condition,
      description: form.description,
      ships_from: form.ships_from,
      shipping_cost: form.free_shipping ? 0 : parseFloat(form.shipping_cost) || 0,
      free_shipping: form.free_shipping,
      payment_methods: form.payment_methods,
      status: 'active',
    }).select().single()

    if (error) { alert('Error creating listing: ' + error.message); setSaving(false); return }
    window.location.href = `/marketplace/${data.id}`
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  if (authLoading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/marketplace" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textDecoration: 'none' }}>← Marketplace</a>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginTop: '12px' }}>List a Set for Sale</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>Your listing will be visible to all Tesoro Track collectors.</p>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px', display: 'grid', gap: '20px' }}>

        {/* Set selection */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
            What are you selling? <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setUseManual(false)} style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid',
              borderColor: !useManual ? 'var(--accent)' : 'var(--border)',
              background: !useManual ? 'var(--accent-light)' : 'transparent',
              color: !useManual ? 'var(--accent)' : 'var(--muted)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}>Search catalog</button>
            <button onClick={() => { setUseManual(true); setSelectedSet(null) }} style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid',
              borderColor: useManual ? 'var(--accent)' : 'var(--border)',
              background: useManual ? 'var(--accent-light)' : 'transparent',
              color: useManual ? 'var(--accent)' : 'var(--muted)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}>Enter manually</button>
          </div>

          {!useManual ? (
            <div style={{ position: 'relative' }}>
              <input
                type="text" placeholder="Search for a set..."
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
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.category} · Avg {s.avg_sale_price ? `$${parseFloat(s.avg_sale_price).toFixed(2)}` : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSet && (
                <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--green-light)', borderRadius: '8px', fontSize: '13px', color: 'var(--green)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  ✓ {selectedSet.name}
                  <button onClick={() => { setSelectedSet(null); setSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontWeight: 700 }}>✕</button>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                Set not in our catalog? <button onClick={() => setUseManual(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '12px', padding: 0 }}>Enter it manually</button> or <a href="/submit-set" style={{ color: 'var(--accent)', fontWeight: 700 }}>submit it for review</a>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              <input type="text" placeholder="Set name" value={form.manual_set_name} onChange={e => setForm({ ...form, manual_set_name: e.target.value })} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="text" placeholder="Set number (optional)" value={form.manual_set_number} onChange={e => setForm({ ...form, manual_set_number: e.target.value })} style={inputStyle} />
                <select value={form.manual_category} onChange={e => setForm({ ...form, manual_category: e.target.value })} style={inputStyle}>
                  <option>Mega Construx</option>
                  <option>Funko Pop</option>
                  <option>LEGO</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Asking Price <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)' }}>$</span>
              <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} />
            </div>
            {selectedSet?.avg_sale_price && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Market avg: ${parseFloat(selectedSet.avg_sale_price).toFixed(2)}</div>
            )}
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Condition</label>
            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
              <option>New Sealed</option>
              <option>Open Box</option>
              <option>Used - Like New</option>
              <option>Used - Good</option>
              <option>Used - Fair</option>
            </select>
          </div>
        </div>

        {/* Shipping */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>Shipping</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <input type="text" placeholder="Ships from (e.g. New Jersey)" value={form.ships_from} onChange={e => setForm({ ...form, ships_from: e.target.value })} style={inputStyle} />
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)' }}>$</span>
              <input type="number" step="0.01" placeholder="Shipping cost" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} disabled={form.free_shipping} style={{ ...inputStyle, paddingLeft: '28px', opacity: form.free_shipping ? 0.5 : 1 }} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <input type="checkbox" checked={form.free_shipping} onChange={e => setForm({ ...form, free_shipping: e.target.checked })} />
            Offer free shipping
          </label>
        </div>

        {/* Payment methods */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>Accepted Payment Methods</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['PayPal', 'Venmo', 'Zelle', 'Cash App', 'Check'].map(method => (
              <button key={method} onClick={() => togglePayment(method)} style={{
                padding: '6px 14px', borderRadius: '8px', border: '1.5px solid',
                borderColor: form.payment_methods.includes(method) ? 'var(--accent)' : 'var(--border)',
                background: form.payment_methods.includes(method) ? 'var(--accent-light)' : 'transparent',
                color: form.payment_methods.includes(method) ? 'var(--accent)' : 'var(--muted)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}>{method}</button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
            placeholder="Describe the item's condition, what's included, any flaws, etc."
          />
        </div>

        <button onClick={submit} disabled={saving} style={{
          padding: '14px', borderRadius: '10px', border: 'none',
          background: saving ? 'var(--border)' : 'var(--accent)',
          color: saving ? 'var(--muted)' : 'white',
          fontSize: '15px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
          boxShadow: saving ? 'none' : '0 4px 14px rgba(200,82,42,0.3)',
        }}>{saving ? 'Creating listing...' : 'Publish Listing'}</button>
      </div>
    </div>
  )
}
