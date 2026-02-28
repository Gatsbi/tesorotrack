'use client'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function SubmitPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    category: 'LEGO',
    name: '',
    set_number: '',
    theme: '',
    year_released: '',
    piece_count: '',
    retail_price: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Set name is required.'); return }
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('set_submissions').insert({
      user_id: user?.id || null,
      category: form.category,
      name: form.name.trim(),
      set_number: form.set_number.trim() || null,
      theme: form.theme.trim() || null,
      year_released: form.year_released ? parseInt(form.year_released) : null,
      piece_count: form.piece_count ? parseInt(form.piece_count) : null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      notes: form.notes.trim() || null,
    })

    setSubmitting(false)
    if (err) { setError('Something went wrong: ' + err.message); return }
    setSubmitted(true)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)', boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: '12px', fontWeight: 700, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    display: 'block', marginBottom: '6px',
  }

  if (submitted) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '12px' }}>Thanks for the submission!</h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', lineHeight: 1.6 }}>
        We'll review your suggestion and add it to the catalog if it's a good fit. This usually takes a few days.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={() => { setSubmitted(false); setForm({ category: 'LEGO', name: '', set_number: '', theme: '', year_released: '', piece_count: '', retail_price: '', notes: '' }) }}
          style={{ padding: '12px 24px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          Submit Another
        </button>
        <a href="/browse" style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
          Browse Sets
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '36px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Catalog</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Submit a Set</h1>
        <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6 }}>
          Don't see a set in our catalog? Submit it here and we'll add it. Fill in as much as you know.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '17px', fontWeight: 900, margin: 0 }}>Set Details</h2>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
              <option value="LEGO">LEGO</option>
              <option value="Mega Construx">Mega Construx</option>
              <option value="Funko Pop">Funko Pop</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Set Name *</label>
            <input type="text" placeholder="e.g. Millennium Falcon"
              value={form.name} onChange={e => set('name', e.target.value)}
              style={inputStyle}/>
          </div>

          {/* Set number + Theme */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Set Number</label>
              <input type="text" placeholder="e.g. 75192"
                value={form.set_number} onChange={e => set('set_number', e.target.value)}
                style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Theme / Series</label>
              <input type="text" placeholder="e.g. Star Wars"
                value={form.theme} onChange={e => set('theme', e.target.value)}
                style={inputStyle}/>
            </div>
          </div>

          {/* Year + Pieces */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Year Released</label>
              <input type="number" placeholder="e.g. 2023" min="1970" max="2030"
                value={form.year_released} onChange={e => set('year_released', e.target.value)}
                style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Piece Count</label>
              <input type="number" placeholder="e.g. 7541" min="1"
                value={form.piece_count} onChange={e => set('piece_count', e.target.value)}
                style={inputStyle}/>
            </div>
          </div>

          {/* Retail price */}
          <div>
            <label style={labelStyle}>Original Retail Price (MSRP)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>$</span>
              <input type="number" step="0.01" placeholder="0.00" min="0"
                value={form.retail_price} onChange={e => set('retail_price', e.target.value)}
                style={{ ...inputStyle, paddingLeft: '28px' }}/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Additional Notes</label>
            <textarea placeholder="Any other info that might help — e.g. exclusive, limited edition, variant..."
              value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ ...inputStyle, height: '80px', resize: 'vertical' }}/>
          </div>
        </div>

        {/* Source tip */}
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--surface)', border: '1.5px solid var(--border)', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> For LEGO sets, you can find set numbers on the box or at{' '}
          <a href="https://brickset.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>brickset.com</a>.
          For Mega Construx, try{' '}
          <a href="https://www.mattel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>mattel.com</a>.
        </div>

        {!user && (
          <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--yellow-light)', border: '1px solid rgba(200,160,0,0.2)', fontSize: '13px', color: 'var(--yellow)', fontWeight: 600 }}>
            <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in</a> to track your submissions. You can still submit anonymously.
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '13px', fontWeight: 600 }}>{error}</div>
        )}

        <button type="submit" disabled={submitting || !form.name.trim()} style={{
          padding: '14px', borderRadius: '10px', border: 'none',
          background: submitting || !form.name.trim() ? 'var(--border)' : 'var(--accent)',
          color: submitting || !form.name.trim() ? 'var(--muted)' : 'white',
          fontSize: '15px', fontWeight: 700,
          cursor: submitting || !form.name.trim() ? 'default' : 'pointer',
          boxShadow: form.name.trim() ? '0 4px 14px rgba(200,82,42,0.3)' : 'none',
        }}>
          {submitting ? 'Submitting...' : 'Submit Set'}
        </button>
      </form>
    </div>
  )
}