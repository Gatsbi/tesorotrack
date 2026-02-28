'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function ListingPage({ params }) {
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [sellerProfile, setSellerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sent, setSent] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])

  useEffect(() => { loadListing() }, [])

  async function loadListing() {
    const { data, error } = await supabase
      .from('listings')
      .select(`*, sets(id, name, category, theme, set_number, avg_sale_price, retail_price, image_url)`)
      .eq('id', params.id)
      .single()

    if (error || !data) { setLoading(false); return }
    setListing(data)

    // Fetch seller profile
    if (data.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, location, total_sales, member_since')
        .eq('id', data.user_id)
        .single()
      setSellerProfile(profileData)
    }

    // Load existing conversation if user logged in
    if (user) {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('listing_id', params.id)
        .eq('buyer_id', user.id)
        .maybeSingle()
      if (convData) {
        setConversation(convData)
        loadMessages(convData.id)
      }
    }

    setLoading(false)
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!user) { window.location.href = '/login'; return }
    if (!message.trim() || !listing) return
    setSending(true)

    let convId = conversation?.id
    if (!convId) {
      const { data: convData } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select().single()
      convId = convData.id
      setConversation(convData)
    }

    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      recipient_id: listing.user_id,
      body: message.trim(),
    })

    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      seller_unread: (conversation?.seller_unread || 0) + 1,
    }).eq('id', convId)

    setMessage('')
    setSent(true)
    loadMessages(convId)
    setSending(false)
  }

  async function deleteListing() {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('listings').delete().eq('id', listing.id)
    window.location.href = '/marketplace'
  }

  async function markSold() {
    if (!confirm('Mark this listing as sold?')) return
    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id)
    setListing({ ...listing, status: 'sold' })
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const isSeller = user?.id === listing?.user_id

  const conditionBadgeStyle = (cond) => ({
    fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
    background: cond === 'New Sealed' ? 'var(--green-light)' : cond === 'Open Box' ? 'var(--yellow-light)' : 'var(--surface)',
    color: cond === 'New Sealed' ? 'var(--green)' : cond === 'Open Box' ? 'var(--yellow)' : 'var(--muted)',
  })

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>
  if (!listing) return (
    <div style={{ textAlign: 'center', padding: '120px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', marginBottom: '12px' }}>Listing not found</h2>
      <a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700 }}>← Back to marketplace</a>
    </div>
  )

  const set = listing.sets
  const name = set?.name || 'Unknown Set'
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[set?.category] || '📦'

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        <a href="/marketplace" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>Marketplace</a>
        <span style={{ margin: '0 6px' }}>›</span>
        {set && <a href={`/sets/${set.id}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>{name}</a>}
        {!set && <span>{name}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left */}
        <div>
          {/* Image */}
          <div style={{
            height: '320px', background: 'var(--surface)', borderRadius: '16px',
            border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '24px', overflow: 'hidden',
          }}>
            {set?.image_url ? (
              <img src={set.image_url} alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}/>
            ) : null}
            <div style={{ fontSize: '96px', display: set?.image_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {catIcon}
            </div>
          </div>

          {set?.set_number && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>#{set.set_number}</div>
          )}
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '4px' }}>{name}</h1>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>{set?.category} · {set?.theme}</div>

          {listing.description && (
            <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</div>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{listing.description}</p>
            </div>
          )}

          <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            {[
              ['Condition', <span style={conditionBadgeStyle(listing.condition)}>{listing.condition}</span>],
              ['Quantity', listing.quantity || 1],
              ['Listed', new Date(listing.created_at).toLocaleDateString()],
              ...(set?.avg_sale_price ? [['Market Avg (eBay)', fmt(set.avg_sale_price)]] : []),
              ...(set?.retail_price ? [['Original MSRP', fmt(set.retail_price)]] : []),
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {set && (
            <a href={`/sets/${set.id}`} style={{ display: 'inline-block', marginTop: '16px', fontSize: '13px', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
              View full price history for this set →
            </a>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '40px', fontWeight: 500, marginBottom: '16px' }}>
              {fmt(listing.price)}
            </div>

            {listing.status === 'sold' && (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--yellow-light)', color: 'var(--yellow)', fontWeight: 700, fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>
                This item has been sold
              </div>
            )}

            {isSeller ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--surface)', color: 'var(--muted)', fontWeight: 700, fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Your Listing
                </div>
                {listing.status !== 'sold' && (
                  <button onClick={markSold} style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--green)',
                    background: 'var(--green-light)', color: 'var(--green)',
                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  }}>✓ Mark as Sold</button>
                )}
                <button onClick={deleteListing} disabled={deleting} style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--red)',
                  background: 'var(--red-light)', color: 'var(--red)',
                  fontSize: '14px', fontWeight: 700, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}>{deleting ? 'Deleting...' : '🗑 Delete Listing'}</button>
              </div>
            ) : listing.status === 'active' && (
              <div>
                {messages.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Your conversation</div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {messages.map(msg => (
                        <div key={msg.id} style={{
                          padding: '10px 12px', borderRadius: '10px',
                          background: msg.sender_id === user?.id ? 'var(--accent)' : 'var(--surface)',
                          alignSelf: msg.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '85%',
                        }}>
                          <div style={{ fontSize: '13px', color: msg.sender_id === user?.id ? 'white' : 'var(--text)' }}>{msg.body}</div>
                          <div style={{ fontSize: '10px', color: msg.sender_id === user?.id ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginTop: '4px' }}>{new Date(msg.created_at).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!user ? (
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    <a href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in</a> to message the seller.
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder={sent ? 'Send another message...' : 'Hi, is this still available?'}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', resize: 'none', height: '80px', marginBottom: '10px', background: 'var(--bg)', boxSizing: 'border-box' }}
                    />
                    <button onClick={sendMessage} disabled={sending || !message.trim()} style={{
                      width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                      background: sending ? 'var(--border)' : 'var(--accent)',
                      color: sending ? 'var(--muted)' : 'white',
                      fontSize: '14px', fontWeight: 700, cursor: sending ? 'default' : 'pointer',
                    }}>{sending ? 'Sending...' : sent ? 'Send Another Message' : 'Message Seller'}</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Seller card */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Seller</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                {(sellerProfile?.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{sellerProfile?.display_name || sellerProfile?.username || 'Seller'}</div>
                {sellerProfile?.username && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>@{sellerProfile.username}</div>}
              </div>
            </div>
            {sellerProfile?.location && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>📍 {sellerProfile.location}</div>}
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              {sellerProfile?.total_sales || 0} sales · Member since {sellerProfile?.member_since ? new Date(sellerProfile.member_since).getFullYear() : '2026'}
            </div>
            {sellerProfile?.username && (
              <a href={`/u/${sellerProfile.username}`} style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '13px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>View Profile</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}