'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')
  const [listings, setListings] = useState([])
  const [partsListings, setPartsListings] = useState([])
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', location: '' })
  const [portfolioPublic, setPortfolioPublic] = useState(false)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { window.location.href = '/login'; return }
    loadProfile()
  }, [user, authLoading])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setPortfolioPublic(data?.portfolio_public || false)
    setForm({
      username: data?.username || '',
      display_name: data?.display_name || '',
      bio: data?.bio || '',
      location: data?.location || '',
    })
    const { data: listingData } = await supabase
      .from('listings')
      .select('*, sets(name, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setListings(listingData || [])
    const { data: partsData } = await supabase
      .from('parts_listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false })
    setPartsListings(partsData || [])
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase.from('profiles').update({
      username: form.username.toLowerCase().trim(),
      display_name: form.display_name,
      bio: form.bio,
      location: form.location,
    }).eq('id', user.id)
    if (error) setError(error.message.includes('username') ? 'That username is already taken.' : error.message)
    else { setSuccess('Profile updated!'); loadProfile() }
    setSaving(false)
  }

  async function togglePortfolioPublic() {
    setTogglingPublic(true)
    const newVal = !portfolioPublic
    const { error } = await supabase.from('profiles')
      .update({ portfolio_public: newVal })
      .eq('id', user.id)
    if (!error) setPortfolioPublic(newVal)
    setTogglingPublic(false)
  }

  const handleSignOut = async () => { await signOut(); window.location.href = '/' }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }
  const tabStyle = (t) => ({
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'white' : 'var(--muted)',
  })
  const statusBadge = (s) => {
    const c = { active: ['var(--green-light)', 'var(--green)'], sold: ['var(--yellow-light)', 'var(--yellow)'], removed: ['var(--surface)', 'var(--muted)'] }[s] || ['var(--surface)', 'var(--muted)']
    return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: c[0], color: c[1], textTransform: 'uppercase' }}>{s}</span>
  }

  if (authLoading || (loading && user)) return (
    <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Settings</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>My Account</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {profile?.username && (
            <a href={`/u/${profile.username}`} style={{ padding: '10px 18px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '13px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>
              View Public Profile →
            </a>
          )}
          <button onClick={handleSignOut} style={{ padding: '10px 18px', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'none', color: 'var(--muted)' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[['profile', 'Profile'], ['listings', `Listings (${listings.filter(l => l.status === 'active').length})`], ['parts', `Parts (${partsListings.filter(l => l.status === 'active').length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Profile form */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '32px' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>Public Profile</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Set your handle and how other collectors see you.</p>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Username (your handle) *</label>
                <div style={{ display: 'flex' }}>
                  <span style={{ padding: '10px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '14px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    tesorotrack.com/u/
                  </span>
                  <input type="text" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    style={{ ...inputStyle, borderRadius: '0 8px 8px 0', flex: 1 }}
                    placeholder="yourhandle"
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>3–30 chars, lowercase letters, numbers, underscores only</div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Display Name</label>
                <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} style={inputStyle} placeholder="How your name appears to others" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                  placeholder="Tell other collectors about yourself..." />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Location</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="e.g. New York, NY" />
              </div>
            </div>
            {error && <div style={{ padding: '12px 16px', borderRadius: '10px', marginTop: '16px', background: 'var(--red-light)', color: 'var(--red)', fontSize: '13px', fontWeight: 600 }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', borderRadius: '10px', marginTop: '16px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '13px', fontWeight: 600 }}>{success}</div>}
            <button onClick={saveProfile} disabled={saving} style={{ marginTop: '24px', padding: '12px 28px', borderRadius: '10px', border: 'none', background: saving ? 'var(--border)' : 'var(--accent)', color: saving ? 'var(--muted)' : 'white', fontSize: '14px', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {/* Portfolio visibility toggle */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>Public Portfolio</h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  {portfolioPublic
                    ? 'Your portfolio is public. Other collectors can view it and send offers on your sets.'
                    : 'Your portfolio is private. Only you can see it.'}
                </p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={togglePortfolioPublic}
                disabled={togglingPublic}
                style={{
                  width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                  background: portfolioPublic ? 'var(--accent)' : 'var(--border)',
                  cursor: togglingPublic ? 'default' : 'pointer',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  marginLeft: '24px',
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px',
                  left: portfolioPublic ? '27px' : '3px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            {portfolioPublic && profile?.username && (
              <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'var(--green-light)', border: '1px solid rgba(26,158,110,0.2)', fontSize: '13px', color: 'var(--green)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🌐 Public at tesorotrack.com/u/{profile.username}</span>
                <a href={`/u/${profile.username}`} style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none', fontSize: '12px' }}>View →</a>
              </div>
            )}

            {portfolioPublic && !profile?.username && (
              <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'var(--yellow-light)', border: '1px solid rgba(200,160,0,0.2)', fontSize: '13px', color: 'var(--yellow)', fontWeight: 600 }}>
                ⚠️ Set a username above so others can find your portfolio.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900 }}>My Marketplace Listings</h2>
            <a href="/portfolio" style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New Listing</a>
          </div>
          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>No listings yet</div>
              <a href="/portfolio" style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>List from your portfolio</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {listings.map(l => (
                <div key={l.id} style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>{l.sets?.name || 'Unknown Set'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{l.condition} · {l.sets?.category}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {statusBadge(l.status)}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 600 }}>${parseFloat(l.price).toFixed(2)}</span>
                    <a href={`/marketplace/${l.id}`} style={{ padding: '6px 12px', borderRadius: '7px', border: '1.5px solid var(--border)', fontSize: '12px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>View</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'parts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900 }}>My Parts Exchange Listings</h2>
            <a href="/parts/new" style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ List Parts</a>
          </div>
          {partsListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧩</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900, marginBottom: '16px' }}>No parts listed yet</div>
              <a href="/parts/new" style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>List your first parts</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {partsListings.map(l => (
                <div key={l.id} style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>{l.part_name || `Part #${l.part_number}`} <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>#{l.part_number}</span></div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{l.category} · {l.color} · Qty {l.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {statusBadge(l.status)}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 600 }}>${parseFloat(l.price_per_piece).toFixed(2)}/ea</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}