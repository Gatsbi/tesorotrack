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
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    manual_set_name: '', manual_set_number: '', manual_category: 'Mega Construx',
    price: '', condition: 'New Sealed', description: '',
    ships_from: '', shipping_cost: '0', free_shipping: false,
    payment_methods: ['PayPal', 'Venmo'],
  })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('sets').select('id, name, category, theme, avg_sale_price').ilike('name', `%${search}%`).limit(8)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const togglePayment = (method) => {
    const methods = form.payment_methods.includes(method)
      ? form.payment_methods.filter(m => m !== method)
      : [...form.payment_methods, method]
    setForm({ ...form, payment_methods: methods })
  }

  async function submit() {
    if (!user) return
    if (!selectedSet && !useManual) return
    if (!form.price || parseFloat(form.price) <= 0) return
    setSubmitting(true)

    const { error } = await supabase.from('marketplace_listings').insert({
      seller_id: user.id,
      set_id: selectedSet?.id || null,
      manual_set_name: useManual ? form.manual_set_name : null,
      manual_set_number: useManual ? form.manual_set_number : null,
      manual_category: useManual ? form.manual_category : null,
      price: parseFloat(form.price),
      condition: form.condition,
      description: form.description,
      ships_from: form.ships_from,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      free_shipping: form.free_shipping,
      payment_methods: form.payment_methods,
      status: 'active',
    })

    if (!error) setDone(true)
    setSubmitting(false)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', background: 'var(--bg)' }
  const labelStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }

  if (done) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, marginBottom: '10px' }}>Listing is live!</h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>Your item is now visible in the marketplace.</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <a href="/marketplace" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Browse Marketplace</a>
        <a href="/account" style={{ background: 'var(--white)', color: 'var(--text)', border: '1.5px solid var(--border)', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>My Listings</a>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Marketplace</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>List a Set for Sale</h1>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Set selection */}
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Which set are you selling?</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => { setUseManual(false); setSelectedSet(null) }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid', borderColor: !useManual ? 'var(--accent)' : 'var(--border)', background: !useManual ? 'var(--accent-light)' : 'transparent', color: !useManual ? 'var(--accent)' : 'var(--muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Search our catalog</button>
            <button onClick={() => { setUseManual(true); setSelectedSet(null) }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid', borderColor: useManual ? 'var(--accent)' : 'var(--border)', background: useManual ? 'var(--accent-light)' : 'transparent', color: useManual ? 'var(--accent)' : 'var(--muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Enter manually</button>
          </div>

          {!useManual ? (
            <div style={{ position: 'relative' }}>
              <input type="text" placeholder="Search set name..." value={selectedSet ? selectedSet.name : search} onChange={e => { setSearch(e.target.value); setSelectedSet(null) }} style={inputStyle} />
              {searchResults.length > 0 && !selectedSet && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '10px', marginTop: '4px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  {searchResults.map(s => (
                    <div key={s.id} onClick={() => { setSelectedSet(s); setSearch(s.name); setSearchResults([]) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.category} · Avg ${s.avg_sale_price ? parseFloat(s.avg_sale_price).toFixed(2) : '—'}</div>
                    </div>
                  ))}
                </div>
              )}
              {!selectedSet && search.length > 2 && searchResults.length === 0 && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--muted)' }}>
                  Not finding it? <button onClick={() => setUseManual(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Enter manually</button> or <a href="/submit-set" style={{ color: 'var(--accent)', fontWeight: 700 }}>submit it to our catalog</a>.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div><label style={labelStyle}>Set Name *</label><input type="text" value={form.manual_set_name} onChange={e => setForm({ ...form, manual_set_name: e.target.value })} style={inputStyle} placeholder="e.g. Halo Warthog Run" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Set Number</label><input type="text" value={form.manual_set_number} onChange={e => setForm({ ...form, manual_set_number: e.target.value })} style={inputStyle} placeholder="e.g. GNB06" /></div>
                <div><label style={labelStyle}>Category</label>
                  <select value={form.manual_category} onChange={e => setForm({ ...form, manual_category: e.target.value })} style={inputStyle}>
                    <option>Mega Construx</option><option>Funko Pop</option><option>LEGO</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Listing details */}
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Listing Details</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Asking Price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} placeholder="0.00" />
                </div>
                {selectedSet?.avg_sale_price && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Market avg: ${parseFloat(selectedSet.avg_sale_price).toFixed(2)}</div>}
              </div>
              <div>
                <label style={labelStyle}>Condition *</label>
                <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
                  <option>New Sealed</option><option>Open Box</option><option>Used - Like New</option><option>Used - Good</option><option>Used - Fair</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, height: '90px', resize: 'vertical' }} placeholder="Describe the item's condition, any missing pieces, accessories included, etc." />
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>Shipping</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={labelStyle}>Ships From</label><input type="text" value={form.ships_from} onChange={e => setForm({ ...form, ships_from: e.target.value })} style={inputStyle} placeholder="e.g. Chicago, IL" /></div>
            <div>
              <label style={labelStyle}>Shipping Cost</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                <input type="number" step="0.01" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} disabled={form.free_shipping} />
              </div>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <input type="checkbox" checked={form.free_shipping} onChange={e => setForm({ ...form, free_shipping: e.target.checked, shipping_cost: e.target.checked ? '0' : form.shipping_cost })} />
            Offer free shipping
          </label>
        </div>

        {/* Payment */}
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>Payment Methods</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Buyers will contact you to arrange payment.</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['PayPal', 'Venmo', 'Cash App', 'Zelle', 'Check', 'Cash'].map(method => (
              <button key={method} onClick={() => togglePayment(method)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid', borderColor: form.payment_methods.includes(method) ? 'var(--accent)' : 'var(--border)', background: form.payment_methods.includes(method) ? 'var(--accent-light)' : 'transparent', color: form.payment_methods.includes(method) ? 'var(--accent)' : 'var(--muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>{method}</button>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={submitting || (!selectedSet && !useManual) || !form.price} style={{
          padding: '16px', borderRadius: '12px', border: 'none',
          background: submitting ? 'var(--border)' : 'var(--accent)',
          color: submitting ? 'var(--muted)' : 'white',
          fontSize: '16px', fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
          boxShadow: '0 4px 14px rgba(200,82,42,0.3)',
        }}>{submitting ? 'Publishing...' : 'Publish Listing'}</button>
      </div>
    </div>
  )
}
