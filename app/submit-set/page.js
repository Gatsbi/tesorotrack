// SUBMIT SET PAGE
// Save as: app/submit-set/page.js

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export function SubmitSetPage() {
  const { user, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '', set_number: '', category: 'Mega Construx', theme: '',
    retail_price: '', year_released: '', piece_count: '', notes: '',
  })

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login'
  }, [user, authLoading])

  const submit = async () => {
    if (!form.name || !form.category || !form.theme) { alert('Please fill in name, category, and theme'); return }
    setSaving(true)
    const { error } = await supabase.from('set_submissions').insert({
      submitted_by: user.id,
      name: form.name,
      set_number: form.set_number || null,
      category: form.category,
      theme: form.theme,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      year_released: form.year_released ? parseInt(form.year_released) : null,
      piece_count: form.piece_count ? parseInt(form.piece_count) : null,
      notes: form.notes || null,
      status: 'pending',
    })
    if (!error) setSuccess(true)
    else { alert('Error: ' + error.message) }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  if (success) return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, marginBottom: '10px' }}>Submission received!</h2>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>We'll review your submission and add it to the catalog. Thanks for helping grow the database!</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <a href="/browse" style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--accent)', color: 'white', fontWeight: 700, textDecoration: 'none' }}>Browse Sets</a>
        <button onClick={() => { setSuccess(false); setForm({ name: '', set_number: '', category: 'Mega Construx', theme: '', retail_price: '', year_released: '', piece_count: '', notes: '' }) }}
          style={{ padding: '12px 24px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          Submit Another
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Community</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Submit a Missing Set</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>Don't see a set in our catalog? Submit it and we'll review it for addition.</p>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px', display: 'grid', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Set Name <span style={{ color: 'var(--accent)' }}>*</span></label>
          <input type="text" placeholder="e.g. Halo Warthog Rally" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Category <span style={{ color: 'var(--accent)' }}>*</span></label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              <option>Mega Construx</option>
              <option>Funko Pop</option>
              <option>LEGO</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Theme <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input type="text" placeholder="e.g. Halo, Star Wars, Marvel..." value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Set Number</label>
            <input type="text" placeholder="e.g. FDY26" value={form.set_number} onChange={e => setForm({ ...form, set_number: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Year Released</label>
            <input type="number" placeholder="e.g. 2021" value={form.year_released} onChange={e => setForm({ ...form, year_released: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Retail Price</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)' }}>$</span>
              <input type="number" step="0.01" placeholder="0.00" value={form.retail_price} onChange={e => setForm({ ...form, retail_price: e.target.value })} style={{ ...inputStyle, paddingLeft: '28px' }} />
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Piece Count</label>
          <input type="number" placeholder="Number of pieces" value={form.piece_count} onChange={e => setForm({ ...form, piece_count: e.target.value })} style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
            placeholder="Any other info that might help (link to product page, etc.)"
          />
        </div>

        <button onClick={submit} disabled={saving} style={{
          padding: '14px', borderRadius: '10px', border: 'none',
          background: saving ? 'var(--border)' : 'var(--accent)',
          color: saving ? 'var(--muted)' : 'white',
          fontSize: '15px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
        }}>{saving ? 'Submitting...' : 'Submit for Review'}</button>
      </div>
    </div>
  )
}

export default SubmitSetPage
