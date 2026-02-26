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

  useEffect(() => {
    if (!authLoading) {
      if (!user) { window.location.href = '/login'; return }
      checkAdmin()
    }
  }, [user, authLoading])

  async function checkAdmin() {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!data?.is_admin) { window.location.href = '/'; return }
    setIsAdmin(true)
    loadAll()
  }

  async function loadAll() {
    const [subData, listData, userCount, setCount] = await Promise.all([
      supabase.from('set_submissions').select('*, profiles!submitted_by(username)').order('created_at', { ascending: false }),
      supabase.from('marketplace_listings').select('*, sets(name), profiles!seller_id(username)').order('created_at', { ascending: false }).limit(30),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('sets').select('id', { count: 'exact', head: true }),
    ])
    setSubmissions(subData.data || [])
    setListings(listData.data || [])
    setStats({
      users: userCount.count || 0,
      sets: setCount.count || 0,
      listings: listData.data?.length || 0,
      pending: (subData.data || []).filter(s => s.status === 'pending').length,
    })
    setLoading(false)
  }

  const approveSubmission = async (sub) => {
    // Add to sets table
    const { error } = await supabase.from('sets').insert({
      name: sub.name,
      set_number: sub.set_number,
      category: sub.category,
      theme: sub.theme,
      retail_price: sub.retail_price,
      year_released: sub.year_released,
      piece_count: sub.piece_count,
    })
    if (error) { alert('Error adding set: ' + error.message); return }

    // Mark submission as approved
    await supabase.from('set_submissions').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', sub.id)

    setSubmissions(submissions.map(s => s.id === sub.id ? { ...s, status: 'approved' } : s))
    alert(`✓ "${sub.name}" added to catalog!`)
  }

  const rejectSubmission = async (id) => {
    await supabase.from('set_submissions').update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status: 'rejected' } : s))
  }

  const removeListing = async (id) => {
    await supabase.from('marketplace_listings').update({ status: 'removed' }).eq('id', id)
    setListings(listings.map(l => l.id === id ? { ...l, status: 'removed' } : l))
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'

  const tabStyle = (active) => ({
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', background: active ? 'var(--text)' : 'transparent',
    color: active ? 'white' : 'var(--muted)',
  })

  const statusBadge = (status) => {
    const colors = { pending: ['var(--yellow-light)', 'var(--yellow)'], approved: ['var(--green-light)', 'var(--green)'], rejected: ['var(--red-light)', 'var(--red)'], active: ['var(--green-light)', 'var(--green)'], removed: ['var(--surface)', 'var(--muted)'] }
    const [bg, color] = colors[status] || ['var(--surface)', 'var(--muted)']
    return <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: bg, color }}>{status}</span>
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading admin panel...</div>

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin Only</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Users', value: stats.users, icon: '👤' },
          { label: 'Sets in Catalog', value: stats.sets, icon: '📦' },
          { label: 'Active Listings', value: stats.listings, icon: '🏷️' },
          { label: 'Pending Submissions', value: stats.pending, icon: '⏳', alert: stats.pending > 0 },
        ].map(s => (
          <div key={s.label} style={{
            padding: '20px', borderRadius: '14px',
            background: s.alert ? 'var(--yellow-light)' : 'var(--white)',
            border: `1.5px solid ${s.alert ? 'rgba(196,138,0,0.3)' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 500, marginBottom: '4px', color: s.alert ? 'var(--yellow)' : 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[['submissions', `Submissions (${submissions.filter(s => s.status === 'pending').length} pending)`], ['listings', 'Listings'], ['pipeline', 'Run Pipeline']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>{label}</button>
        ))}
      </div>

      {tab === 'submissions' && (
        <div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {submissions.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No submissions yet</div>}
            {submissions.map(sub => (
              <div key={sub.id} style={{
                background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{sub.name}</div>
                      {statusBadge(sub.status)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                      {sub.category} · {sub.theme}
                      {sub.set_number ? ` · #${sub.set_number}` : ''}
                      {sub.year_released ? ` · ${sub.year_released}` : ''}
                      {sub.retail_price ? ` · MSRP ${fmt(sub.retail_price)}` : ''}
                      {sub.piece_count ? ` · ${sub.piece_count} pieces` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Submitted by @{sub.profiles?.username} · {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                    {sub.notes && <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '6px', fontStyle: 'italic' }}>"{sub.notes}"</div>}
                  </div>
                  {sub.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button onClick={() => approveSubmission(sub)} style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: 'var(--green)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      }}>✓ Approve</button>
                      <button onClick={() => rejectSubmission(sub.id)} style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--border)',
                        background: 'none', color: 'var(--muted)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      }}>✕ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div>
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['Set', 'Seller', 'Price', 'Status', ''].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>
            {listings.map((l, i) => (
              <div key={l.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                padding: '12px 20px', borderBottom: i < listings.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)', alignItems: 'center',
              }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.sets?.name || l.manual_set_name}</div>
                <div style={{ fontSize: '12px' }}>@{l.profiles?.username}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{fmt(l.price)}</div>
                <div>{statusBadge(l.status)}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={`/marketplace/${l.id}`} style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>View</a>
                  {l.status === 'active' && (
                    <button onClick={() => removeListing(l.id)} style={{ fontSize: '11px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '32px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '12px' }}>eBay Price Pipeline</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Run the eBay scraper manually from Replit. The pipeline fetches sold listings and updates average prices in the database.
            Run after midnight Pacific time when the daily rate limit resets.
          </p>
          <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '10px', fontFamily: 'var(--mono)', fontSize: '13px', marginBottom: '16px' }}>
            node pipeline_v4.js
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Last updated: Check Supabase → sets table → last_price_update column for the most recent run.
          </div>
        </div>
      )}
    </div>
  )
}
