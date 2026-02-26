'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function UserProfilePage({ params }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', params.username)
      .single()

    if (!profileData) { setLoading(false); return }
    setProfile(profileData)

    const { data: listingsData } = await supabase
      .from('marketplace_listings')
      .select('*, sets(name, category, theme)')
      .eq('seller_id', profileData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setListings(listingsData || [])

    const { data: reviewsData } = await supabase
      .from('seller_reviews')
      .select('*, profiles!reviewer_id(username, display_name)')
      .eq('seller_id', profileData.id)
      .order('created_at', { ascending: false })
    setReviews(reviewsData || [])

    setLoading(false)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null
  const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '120px 40px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', marginBottom: '10px' }}>User not found</h2>
      <a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>← Back to marketplace</a>
    </div>
  )

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      {/* Profile header */}
      <div style={{
        background: 'var(--white)', borderRadius: '20px', border: '1.5px solid var(--border)',
        padding: '32px', marginBottom: '32px', display: 'flex', gap: '24px', alignItems: 'flex-start',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', color: 'white', fontFamily: 'var(--display)', fontWeight: 900, flexShrink: 0,
        }}>
          {(profile.display_name || profile.username || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {profile.display_name || profile.username}
            </h1>
            {profile.is_admin && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: 'var(--accent)', color: 'white' }}>ADMIN</span>
            )}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>@{profile.username} {profile.location && `· 📍 ${profile.location}`}</div>
          {profile.bio && <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '12px' }}>{profile.bio}</p>}
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--muted)' }}>
            <span>🏷️ <strong style={{ color: 'var(--text)' }}>{listings.length}</strong> active listings</span>
            {avgRating && <span>⭐ <strong style={{ color: 'var(--text)' }}>{avgRating}</strong> ({reviews.length} reviews)</span>}
            <span>📅 Member since {new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <span>💰 <strong style={{ color: 'var(--text)' }}>{profile.total_sales}</strong> sales</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Listings */}
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '16px' }}>
            Active Listings ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', color: 'var(--muted)' }}>
              No active listings right now
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {listings.map(l => (
                <a key={l.id} href={`/marketplace/${l.id}`} style={{
                  background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)',
                  padding: '16px', textDecoration: 'none', color: 'inherit', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{l.sets?.name || l.manual_set_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {l.sets?.category || l.manual_category} · {l.condition}
                      {l.free_shipping ? ' · Free shipping' : l.shipping_cost ? ` · +${fmt(l.shipping_cost)} shipping` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 600, color: 'var(--accent)' }}>{fmt(l.price)}</div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '16px' }}>
            Reviews ({reviews.length})
          </h2>
          {avgRating && (
            <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '40px', fontWeight: 500, color: 'var(--yellow)' }}>{avgRating}</div>
              <div style={{ fontSize: '20px', color: 'var(--yellow)', marginBottom: '4px' }}>{stars(avgRating)}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', color: 'var(--muted)', fontSize: '13px' }}>
              No reviews yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>@{r.profiles?.username}</span>
                    <span style={{ fontSize: '14px', color: 'var(--yellow)' }}>{stars(r.rating)}</span>
                  </div>
                  {r.body && <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{r.body}</p>}
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
