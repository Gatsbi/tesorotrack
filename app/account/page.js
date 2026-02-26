'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')
  const [listings, setListings] = useState([])
  const [partsListings, setPartsListings] = useState([])
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', location: '' })
  const [usernameError, setUsernameError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!user) { window.location.href = '/login'; return }
    loadProfile()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    if (data) setForm({ username: data.username || '', display_name: data.display_name || '', bio: data.bio || '', location: data.location || '' })
    
    const { data: listingsData } = await supabase
      .from('marketplace_listings')
      .select('*, sets(name)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
    setListings(listingsData || [])

    const { data: partsData } = await supabase
      .from('parts_listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
    setPartsListings(partsData || [])
    setLoading(false)
  }

  const checkUsername = async (val) => {
    if (!val.match(/^[a-z0-9_]{3,30}$/)) {
      setUsernameError('3-30 chars, lowercase letters, numbers, underscores only')
      return
    }
    if (val === profile?.username) { setUsernameError(''); return }
    const { data } = await supabase.from('profiles').select('id').eq('username', val).single()
    if (data) setUsernameError('Username already taken')
    else setUsernameError('')
  }

  const saveProfile = async () => {
    if (usernameError) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: form.username,
      display_name: form.display_name,
      bio: form.bio,
      location: form.location,
    })
    if (!error) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000) }
    setSaving(false)
  }

  const removeListing = async (id) => {
    await supabase.from('marketplace_listings').update({ status: 'removed' }).eq('id', id)
    setListings(listings.map(l => l.id === id ? { ...l, status: 'removed' } : l))
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)',
  }

  const tabStyle = (active) => ({
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
    background: active ? 'var(--text)' : 'transparent',
    color: active ? 'white' : 'var(--muted)',
  })

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

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
            <a href={`/u/${profile.username}`} style={{
              padding: '10px 18px', borderRadius: '8px', border: '1.5px solid var(--border)',
              fontSize: '13px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)',
            }}>View Profile →</a>
          )}
          <button onClick={async () => { await signOut(); window.location.href = '/' }} style={{
            padding: '10px 18px', borderRadius: '8px', border: '1.5px solid var(--border)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'none', color: 'var(--muted)',
          }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--surface)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[['profile', 'Profile'], ['listings', `Listings (${listings.length})`], ['parts', `Parts (${partsListings.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>{label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '32px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '24px' }}>Public Profile</h2>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                Username <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px' }}>tesorotrack.com/u/</span>
                <input
                  type="text" value={form.username}
                  onChange={e => { setForm({ ...form, username: e.target.value.toLowerCase() }); checkUsername(e.target.value.toLowerCase()) }}
                  style={{ ...inputStyle, paddingLeft: '172px' }}
                  placeholder="yourhandle"
                />
              </div>
              {usernameError && <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>{usernameError}</div>}
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Lowercase letters, numbers, underscores. 3-30 characters.</div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Display Name</label>
              <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} style={inputStyle} placeholder="How your name appears publicly" />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Location</label>
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="e.g. New Jersey, USA" />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Bio</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
                placeholder="Tell other collectors a bit about yourself..."
              />
            </div>
          </div>

          {saveSuccess && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '13px', fontWeight: 600, marginTop: '16px', border: '1px solid rgba(26,158,110,0.2)' }}>
              ✓ Profile saved successfully
            </div>
          )}

          <button onClick={saveProfile} disabled={saving || !!usernameError} style={{
            marginTop: '20px', padding: '12px 28px', borderRadius: '10px', border: 'none',
            background: saving || usernameError ? 'var(--border)' : 'var(--accent)',
            color: saving || usernameError ? 'var(--muted)' : 'white',
            fontSize: '14px', fontWeight: 700, cursor: saving || usernameError ? 'default' : 'pointer',
          }}>{saving ? 'Saving...' : 'Save Profile'}</button>
        </div>
      )}

      {tab === 'listings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900 }}>My Listings</h2>
            <a href="/marketplace/new" style={{
              background: 'var(--accent)', color: 'white', padding: '10px 20px',
              borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
            }}>+ New Listing</a>
          </div>
          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏷️</div>
              <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>No listings yet</p>
              <a href="/marketplace/new" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Create your first listing →</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {listings.map(l => (
                <div key={l.id} style={{
                  background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)',
                  padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{l.sets?.name || l.manual_set_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{l.condition} · Listed {new Date(l.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 600 }}>{fmt(l.price)}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px',
                      background: l.status === 'active' ? 'var(--green-light)' : l.status === 'sold' ? 'var(--yellow-light)' : 'var(--surface)',
                      color: l.status === 'active' ? 'var(--green)' : l.status === 'sold' ? 'var(--yellow)' : 'var(--muted)',
                    }}>{l.status}</span>
                    <a href={`/marketplace/${l.id}`} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>View</a>
                    {l.status === 'active' && (
                      <button onClick={() => removeListing(l.id)} style={{ fontSize: '12px', color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
                    )}
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
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900 }}>My Parts Listings</h2>
            <a href="/parts/new" style={{
              background: 'var(--accent)', color: 'white', padding: '10px 20px',
              borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
            }}>+ List Parts</a>
          </div>
          {partsListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔩</div>
              <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>No parts listed yet</p>
              <a href="/parts/new" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>List your first part →</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {partsListings.map(p => (
                <div key={p.id} style={{
                  background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)',
                  padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.part_name || `Part #${p.part_number}`}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{p.category} · #{p.part_number} · Qty: {p.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '14px' }}>{fmt(p.price_per_piece)}/ea</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: 'var(--green-light)', color: 'var(--green)' }}>{p.status}</span>
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
