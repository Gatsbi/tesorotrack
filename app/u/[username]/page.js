'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function ProfilePage({ params }) {
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [partsListings, setPartsListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('listings')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('username', params.username).single()
    if (!profileData) { setLoading(false); return }
    setProfile(profileData)

    const { data: listingData } = await supabase
      .from('marketplace_listings')
      .select('*, sets(name, category)')
      .eq('seller_id', profileData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setListings(listingData || [])

    const { data: partsData } = await supabase
      .from('parts_listings')
      .select('*')
      .eq('seller_id', profileData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setPartsListings(partsData || [])

    const { data: reviewData } = await supabase
      .from('seller_reviews')
      .select('*, profiles!reviewer_id(username, display_name)')
      .eq('seller_id', profileData.id)
      .order('created_at', { ascending: false })
    setReviews(reviewData || [])
    setLoading(false)
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null
  const tabStyle = (t) => ({ padding: '10px 20px', borderRadius: '8px', border: 'none', fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--muted)' })
  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>
  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '120px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, marginBottom: '10px' }}>User not found</h2>
      <a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700 }}>Browse marketplace →</a>
    </div>
  )

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 40px' }}>
      {/* Profile header */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '40px', padding: '32px', background: 'var(--white)', borderRadius: '20px', border: '1.5px solid var(--border)' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, color: 'white', flexShrink: 0 }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '2px' }}>
            {profile.display_name || profile.username}
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>@{profile.username}</div>
          {profile.bio && <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '12px', maxWidth: '500px' }}>{profile.bio}</p>}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {profile.location && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>📍 {profile.location}</span>}
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>📅 Member since {new Date(profile.member_since).getFullYear()}</span>
            {avgRating && <span style={{ fontSize: '13px', color: 'var(--yellow)', fontWeight: 700 }}>⭐ {avgRating} ({reviews.length} reviews)</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flexShrink: 0 }}>
          {[
            { label: 'Active Listings', value: listings.length },
            { label: 'Parts Listed', value: partsListings.length },
            { label: 'Total Sales', value: profile.total_sales || 0 },
            { label: 'Reviews', value: reviews.length },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--surface)', borderRadius: '10px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 500 }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[['listings', `For Sale (${listings.length})`], ['parts', `Parts (${partsListings.length})`], ['reviews', `Reviews (${reviews.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
        ))}
      </div>

      {tab === 'listings' && (
        listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900 }}>No active listings</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {listings.map(listing => (
              <a key={listing.id} href={`/marketplace/${listing.id}`} style={{ border: '1.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden', textDecoration: 'none', color: 'inherit', background: 'var(--white)', display: 'block', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ height: '100px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', borderBottom: '1px solid var(--border)' }}>
                  {catIcon[listing.sets?.category] || '📦'}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>{listing.sets?.name || listing.manual_set_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 600 }}>{fmt(listing.price)}</div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>{listing.condition}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {tab === 'parts' && (
        partsListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧩</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900 }}>No parts listed</div>
          </div>
        ) : (
          <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            {partsListings.map((l, i) => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 100px', padding: '14px 20px', borderBottom: i < partsListings.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{l.part_number}</div>
                <div><div style={{ fontWeight: 700, fontSize: '13px' }}>{l.part_name || '—'}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>{l.category} · {l.color}</div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>×{l.quantity}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600 }}>${parseFloat(l.price_per_piece).toFixed(3)}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{l.condition}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'reviews' && (
        reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⭐</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900 }}>No reviews yet</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {reviews.map(review => (
              <div key={review.id} style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>@{review.profiles?.username}</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '10px' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ color: 'var(--yellow)', fontSize: '16px' }}>{'⭐'.repeat(review.rating)}</div>
                </div>
                {review.body && <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{review.body}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
