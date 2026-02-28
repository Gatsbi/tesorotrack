'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function UserProfilePage({ params }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Make Offer modal
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerItem, setOfferItem] = useState(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [offerSent, setOfferSent] = useState(false)

  useEffect(() => { loadProfile() }, [params.username])

  async function loadProfile() {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', params.username)
      .single()

    if (!profileData) { setNotFound(true); setLoading(false); return }
    setProfile(profileData)

    if (!profileData.portfolio_public) { setLoading(false); return }

    const { data: portfolioData } = await supabase
      .from('portfolios')
      .select(`*, sets(id, name, set_number, category, theme, avg_sale_price, retail_price, image_url, is_retired)`)
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })

    setItems(portfolioData || [])
    setLoading(false)
  }

  async function sendOffer() {
    if (!user) { window.location.href = '/login'; return }
    if (!offerAmount || !offerItem) return
    setOfferSending(true)

    // Insert offer as a conversation + message
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert({
        buyer_id: user.id,
        seller_id: profile.id,
        last_message_at: new Date().toISOString(),
        offer_set_id: offerItem.sets?.id,
      })
      .select().single()

    if (!convError && convData) {
      await supabase.from('messages').insert({
        conversation_id: convData.id,
        sender_id: user.id,
        recipient_id: profile.id,
        body: `💰 Offer: $${offerAmount} for ${offerItem.sets?.name}${offerNote ? `\n\n"${offerNote}"` : ''}`,
      })
    }

    setOfferSending(false)
    setShowOfferModal(false)
    setOfferSent(true)
    setOfferAmount('')
    setOfferNote('')
    setTimeout(() => setOfferSent(false), 3000)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const totalValue = items.reduce((s, i) => s + ((i.sets?.avg_sale_price || 0) * i.quantity), 0)
  const isOwnProfile = user?.id === profile?.id

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
    fontSize: '14px', outline: 'none', background: 'var(--bg)', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  if (notFound) return (
    <div style={{ textAlign: 'center', padding: '120px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>User not found</h2>
      <a href="/leaderboard" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>← View leaderboard</a>
    </div>
  )

  if (!profile.portfolio_public && !isOwnProfile) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Private Portfolio</h2>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>@{profile.username} hasn't made their portfolio public yet.</p>
      <a href="/leaderboard" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>← View leaderboard</a>
    </div>
  )

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      {/* Offer sent toast */}
      {offerSent && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 300,
          background: 'var(--green)', color: 'white', padding: '14px 20px',
          borderRadius: '12px', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>✓ Offer sent!</div>
      )}

      {/* Profile header */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, color: 'white', flexShrink: 0 }}>
          {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '4px' }}>
            {profile.display_name || profile.username}
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>
            @{profile.username}
            {profile.location ? ` · 📍 ${profile.location}` : ''}
            {profile.member_since ? ` · Member since ${new Date(profile.member_since).getFullYear()}` : ''}
          </div>
          {profile.bio && <p style={{ fontSize: '14px', lineHeight: 1.6, maxWidth: '500px', margin: 0 }}>{profile.bio}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 500 }}>{fmt(totalValue)}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Portfolio value · {items.reduce((s, i) => s + i.quantity, 0)} items</div>
          {isOwnProfile && (
            <a href="/account" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Edit Profile →</a>
          )}
        </div>
      </div>

      {/* Portfolio grid */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 900 }}>No items in portfolio yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {items.map(item => {
            const set = item.sets
            if (!set) return null
            return (
              <div key={item.id} style={{
                background: 'var(--white)', border: '1.5px solid var(--border)',
                borderRadius: '14px', overflow: 'hidden',
              }}>
                {/* Image */}
                <a href={`/sets/${set.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ height: '140px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    {set.image_url ? (
                      <img src={set.image_url} alt={set.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}/>
                    ) : null}
                    <div style={{ fontSize: '42px', display: set.image_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {catIcon[set.category] || '📦'}
                    </div>
                    {set.is_retired && (
                      <span style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)' }}>Retired</span>
                    )}
                    {item.quantity > 1 && (
                      <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'rgba(0,0,0,0.6)', color: 'white' }}>×{item.quantity}</span>
                    )}
                  </div>
                </a>

                <div style={{ padding: '12px' }}>
                  {set.set_number && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>#{set.set_number}</div>
                  )}
                  <a href={`/sets/${set.id}`} style={{ fontWeight: 800, fontSize: '13px', lineHeight: 1.3, display: 'block', marginBottom: '4px', color: 'var(--text)', textDecoration: 'none' }}
                    onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text)'}
                  >{set.name}</a>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>{set.category} · {set.theme}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 600 }}>{fmt(set.avg_sale_price)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>market avg</div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                      background: item.condition === 'New Sealed' ? 'var(--green-light)' : item.condition === 'Open Box' ? 'var(--yellow-light)' : 'var(--surface)',
                      color: item.condition === 'New Sealed' ? 'var(--green)' : item.condition === 'Open Box' ? 'var(--yellow)' : 'var(--muted)',
                    }}>{item.condition}</span>
                  </div>

                  {/* Make Offer button — only show if not own profile and user is logged in or browsing */}
                  {!isOwnProfile && (
                    <button
                      onClick={() => { setOfferItem(item); setOfferAmount(set.avg_sale_price ? parseFloat(set.avg_sale_price).toFixed(2) : ''); setShowOfferModal(true) }}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
                        background: 'var(--accent)', color: 'white', fontSize: '12px',
                        fontWeight: 700, cursor: 'pointer',
                      }}>
                      💰 Make Offer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Make Offer Modal */}
      {showOfferModal && offerItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={e => e.target === e.currentTarget && setShowOfferModal(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: '20px', padding: '32px',
            width: '420px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>Make an Offer</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              {offerItem.sets?.name}{offerItem.sets?.set_number ? ` · #${offerItem.sets.set_number}` : ''}
            </p>

            {offerItem.sets?.avg_sale_price && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                💡 Market avg: <strong style={{ color: 'var(--text)' }}>{fmt(offerItem.sets.avg_sale_price)}</strong>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Your Offer ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)} style={inputStyle}/>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Message (optional)</label>
              <input type="text" placeholder="Add a note to your offer..."
                value={offerNote} onChange={e => setOfferNote(e.target.value)} style={inputStyle}/>
            </div>

            {!user && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--yellow-light)', fontSize: '13px', color: 'var(--yellow)', fontWeight: 600, marginBottom: '16px' }}>
                <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in</a> to send an offer.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowOfferModal(false)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)',
                background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={sendOffer} disabled={!offerAmount || offerSending || !user} style={{
                flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                background: offerAmount && user && !offerSending ? 'var(--accent)' : 'var(--border)',
                color: offerAmount && user && !offerSending ? 'white' : 'var(--muted)',
                fontSize: '14px', fontWeight: 700, cursor: offerAmount && user ? 'pointer' : 'default',
              }}>{offerSending ? 'Sending...' : 'Send Offer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}