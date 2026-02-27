'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function SubmitSetPage() {
  const { user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', set_number: '', category: 'Mega Construx', theme: '', retail_price: '', year_released: '', piece_count: '', notes: '' })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  async function submit() {
    if (!form.name || !form.category || !form.theme) return
    setSubmitting(true)
    const { error } = await supabase.from('set_submissions').insert({
      submitted_by: user.id,
      name: form.name,
      set_number: form.set_number || null,
      category: form.category,
      theme: form.theme,
      retail_price: parseFloat(form.retail_price) || null,
      year_released: parseInt(form.year_released) || null,
      piece_count: parseInt(form.piece_count) || null,
      notes: form.notes || null,
    })
    if (!error) setDone(true)
    setSubmitting(false)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', background: 'var(--bg)' }
  const labelStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }

  if (done) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, marginBottom: '10px' }}>Submission received!</h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '8px' }}>Thanks for contributing to the catalog. We'll review your submission and add it if it checks out.</p>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>You'll be able to see the status in your account once we review it.</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <a href="/browse" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Browse Sets</a>
        <button onClick={() => { setDone(false); setForm({ name: '', set_number: '', category: 'Mega Construx', theme: '', retail_price: '', year_released: '', piece_count: '', notes: '' }) }} style={{ background: 'var(--white)', color: 'var(--text)', border: '1.5px solid var(--border)', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Submit Another</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Community</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Submit a Set</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>Don't see a set in our catalog? Submit it here and we'll review it. Approved sets will be added to the database and start tracking price data.</p>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Set Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Halo Infinite Master Chief" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                <option>Mega Construx</option><option>Funko Pop</option><option>LEGO</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Theme *</label>
              <input type="text" value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} style={inputStyle} placeholder="e.g. Halo, Pokémon, Star Wars" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Set Number</label>
              <input type="text" value={form.set_number} onChange={e => setForm({ ...form, set_number: e.target.value })} style={inputStyle} placeholder="e.g. GNB06" />
            </div>
            <div>
              <label style={labelStyle}>Year Released</label>
              <input type="number" value={form.year_released} onChange={e => setForm({ ...form, year_released: e.target.value })} style={inputStyle} placeholder="e.g. 2023" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Retail Price (MSRP)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                <input type="number" step="0.01" value={form.retail_price} onChange={e => setForm({ ...form, retail_price: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Piece Count</label>
              <input type="number" value={form.piece_count} onChange={e => setForm({ ...form, piece_count: e.target.value })} style={inputStyle} placeholder="e.g. 314" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Any additional info — variants, exclusives, links to the product page, etc." />
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', background: 'var(--yellow-light)', borderRadius: '12px', border: '1px solid rgba(196,138,0,0.2)', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--yellow)', marginBottom: '4px' }}>⏳ Review Process</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>Submissions are reviewed manually before being added to the catalog. This usually takes 1–3 days. We'll add the set if we can verify it exists and find eBay listing data for it.</div>
      </div>

      <button onClick={submit} disabled={submitting || !form.name || !form.theme} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: submitting ? 'var(--border)' : 'var(--accent)', color: submitting ? 'var(--muted)' : 'white', fontSize: '16px', fontWeight: 700, cursor: submitting ? 'default' : 'pointer', boxShadow: '0 4px 14px rgba(200,82,42,0.3)' }}>
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </div>
  )
}
