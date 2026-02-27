'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('submissions')
  const [submissions, setSubmissions] = useState([])
  const [listings, setListings] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [reviewNote, setReviewNote] = useState({})

  useEffect(() => {
    if (authLoading) return
    if (!user) { window.location.href = '/login'; return }
    checkAdmin()
  }, [user, authLoading])

  async function checkAdmin() {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!data?.is_admin) { window.location.href = '/'; return }
    setIsAdmin(true)
    loadAll()
  }

  async function loadAll() {
    const [subData, listingData, userData] = await Promise.all([
      supabase.from('set_submissions').select('*, profiles(username)').order('created_at', { ascending: false }),
      supabase.from('marketplace_listings').select('*, sets(name), profiles(username)').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setSubmissions(subData.data || [])
    setListings(listingData.data || [])
    setUsers(userData.data || [])
    const pending = (subData.data || []).filter(s => s.status === 'pending').length
    const activeListings = (listingData.data || []).filter(l => l.status === 'active').length
    setStats({ pending, activeListings, totalUsers: (userData.data || []).length })
    setLoading(false)
  }

  async function reviewSubmission(id, status) {
    await supabase.from('set_submissions').update({
      status, review_notes: reviewNote[id] || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user.id
    }).eq('id', id)
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s))
  }

  async function removeListing(id) {
    await supabase.from('marketplace_listings').update({ status: 'removed' }).eq('id', id)
    setListings(listings.map(l => l.id === id ? { ...l, status: 'removed' } : l))
  }

  const tabStyle = (t) => ({ padding: '10px 20px', borderRadius: '8px', border: 'none', fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--muted)' })
  const statusBadge = (s, colors) => { const c = colors[s] || ['var(--surface)', 'var(--muted)']; return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: c[0], color: c[1], textTransform: 'uppercase' }}>{s}</span> }

  if (authLoading || loading) return (
    <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading admin panel...</div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Pending Submissions', value: stats.pending, color: 'var(--yellow)', urgent: stats.pending > 0 },
          { label: 'Active Listings', value: stats.activeListings, color: 'var(--green)' },
          { label: 'Total Users', value: stats.totalUsers, color: 'var(--accent)' },
          { label: 'Total Submissions', value: submissions.length, color: 'var(--muted)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '20px', borderRadius: '14px', background: 'var(--white)', border: `1.5px solid ${s.urgent ? 'var(--yellow)' : 'var(--border)'}` }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 500, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[['submissions', `Submissions (${stats.pending} pending)`], ['listings', 'Listings'], ['users', 'Users']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
        ))}
      </div>

      {tab === 'submissions' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {submissions.length === 0 && <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', color: 'var(--muted)' }}>No submissions yet</div>}
          {submissions.map(sub => (
            <div key={sub.id} style={{ background: 'var(--white)', borderRadius: '14px', border: `1.5px solid ${sub.status === 'pending' ? 'var(--yellow)' : 'var(--border)'}`, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{sub.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {sub.category} · {sub.theme}
                    {sub.set_number && ` · #${sub.set_number}`}
                    {sub.year_released && ` · ${sub.year_released}`}
                    {sub.retail_price && ` · $${sub.retail_price}`}
                    {sub.piece_count && ` · ${sub.piece_count} pcs`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>by @{sub.profiles?.username} · {new Date(sub.created_at).toLocaleDateString()}</div>
                  {sub.notes && <div style={{ fontSize: '13px', marginTop: '8px', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px' }}>{sub.notes}</div>}
                </div>
                {statusBadge(sub.status, { pending: ['var(--yellow-light)', 'var(--yellow)'], approved: ['var(--green-light)', 'var(--green)'], rejected: ['var(--red-light)', 'var(--red)'] })}
              </div>
              {sub.status === 'pending' && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="text" placeholder="Review note (optional)" value={reviewNote[sub.id] || ''}
                    onChange={e => setReviewNote({ ...reviewNote, [sub.id]: e.target.value })}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '13px', outline: 'none', background: 'var(--bg)' }} />
                  <button onClick={() => reviewSubmission(sub.id, 'approved')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--green)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => reviewSubmission(sub.id, 'rejected')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'listings' && (
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Set', 'Seller', 'Price', 'Status', ''].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {listings.map((l, i) => (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '14px 20px', borderBottom: i < listings.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.sets?.name || l.manual_set_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>@{l.profiles?.username}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>${parseFloat(l.price).toFixed(2)}</div>
              <div>{statusBadge(l.status, { active: ['var(--green-light)', 'var(--green)'], sold: ['var(--yellow-light)', 'var(--yellow)'], removed: ['var(--surface)', 'var(--muted)'] })}</div>
              {l.status === 'active' && <button onClick={() => removeListing(l.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'none', color: 'var(--red)' }}>Remove</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Username', 'Display Name', 'Joined', 'Admin'].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
              <a href={`/u/${u.username}`} style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>@{u.username}</a>
              <div style={{ fontSize: '13px' }}>{u.display_name || '—'}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: u.is_admin ? 'var(--green)' : 'var(--muted)' }}>{u.is_admin ? '✓ Admin' : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}