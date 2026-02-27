'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function ListingPage({ params }) {
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])

  useEffect(() => { loadListing() }, [])

  async function loadListing() {
    const { data } = await supabase
      .from('marketplace_listings')
      .select(`*, sets(id, name, category, theme, avg_sale_price, retail_price), profiles(id, username, display_name, location, total_sales, member_since)`)
      .eq('id', params.id)
      .single()
    setListing(data)

    // Increment views
    if (data) await supabase.from('marketplace_listings').update({ views: (data.views || 0) + 1 }).eq('id', params.id)

    // Load existing conversation if user is logged in
    if (user) {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('listing_id', params.id)
        .eq('buyer_id', user.id)
        .single()
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
      .select('*, profiles!sender_id(username, display_name)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!user) { window.location.href = '/login'; return }
    if (!message.trim()) return
    setSending(true)

    let convId = conversation?.id

    // Create conversation if doesn't exist
    if (!convId) {
      const { data: convData } = await supabase.from('conversations').insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        last_message_at: new Date().toISOString(),
      }).select().single()
      convId = convData.id
      setConversation(convData)
    }

    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      recipient_id: listing.seller_id,
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

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const isSeller = user?.id === listing?.seller_id
  const conditionColor = { 'New Sealed': 'var(--green)', 'Open Box': 'var(--yellow)', 'Used - Like New': 'var(--accent2)', 'Used - Good': 'var(--muted)', 'Used - Fair': 'var(--muted)' }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>
  if (!listing) return <div style={{ textAlign: 'center', padding: '120px' }}><h2>Listing not found</h2><a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700 }}>← Back to marketplace</a></div>

  const setName = listing.sets?.name || listing.manual_set_name
  const category = listing.sets?.category || listing.manual_category
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[category] || '📦'

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        <a href="/marketplace" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>Marketplace</a> › {setName}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left */}
        <div>
          {/* Image placeholder */}
          <div style={{ height: '320px', background: 'var(--surface)', borderRadius: '16px', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '96px', marginBottom: '24px' }}>
            {catIcon}
          </div>

          {/* Set info */}
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>{setName}</h1>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>{category}</div>

          {listing.description && (
            <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</div>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>{listing.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            {[
              ['Condition', <span style={{ color: conditionColor[listing.condition], fontWeight: 700 }}>{listing.condition}</span>],
              ['Ships From', listing.ships_from || '—'],
              ['Shipping', listing.free_shipping ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>Free</span> : fmt(listing.shipping_cost)],
              ['Payment', (listing.payment_methods || []).join(', ')],
              ['Listed', new Date(listing.created_at).toLocaleDateString()],
              ['Views', listing.views || 0],
            ].map(([label, value], i) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Market comparison */}
          {listing.sets?.avg_sale_price && (
            <div style={{ marginTop: '16px', padding: '16px 20px', background: 'var(--surface)', borderRadius: '12px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Price Comparison</div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div><div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600 }}>{fmt(listing.price)}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>This listing</div></div>
                <div><div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 600 }}>{fmt(listing.sets.avg_sale_price)}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>eBay avg</div></div>
              </div>
              <a href={`/sets/${listing.sets.id}`} style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>View full price history →</a>
            </div>
          )}
        </div>

        {/* Right: Price + Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Price card */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '36px', fontWeight: 500, marginBottom: '4px' }}>{fmt(listing.price)}</div>
            {!listing.free_shipping && listing.shipping_cost > 0 && (
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>+ {fmt(listing.shipping_cost)} shipping</div>
            )}
            {listing.free_shipping && <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 700, marginBottom: '16px' }}>Free shipping</div>}

            {listing.status === 'sold' && (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--yellow-light)', color: 'var(--yellow)', fontWeight: 700, fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>This item has been sold</div>
            )}

            {!isSeller && listing.status === 'active' && (
              <div>
                {messages.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Your conversation</div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {messages.map(msg => (
                        <div key={msg.id} style={{ padding: '10px 12px', borderRadius: '10px', background: msg.sender_id === user?.id ? 'var(--accent)' : 'var(--surface)', alignSelf: msg.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{ fontSize: '13px', color: msg.sender_id === user?.id ? 'white' : 'var(--text)' }}>{msg.body}</div>
                          <div style={{ fontSize: '10px', color: msg.sender_id === user?.id ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginTop: '4px' }}>{new Date(msg.created_at).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Message the seller to ask questions or arrange purchase.</div>
                )}
                <textarea
                  placeholder={sent ? 'Send another message...' : 'Hi, is this still available?'}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', resize: 'none', height: '80px', marginBottom: '10px', background: 'var(--bg)' }}
                />
                <button onClick={sendMessage} disabled={sending || !message.trim()} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: sending ? 'var(--border)' : 'var(--accent)', color: sending ? 'var(--muted)' : 'white', fontSize: '14px', fontWeight: 700, cursor: sending ? 'default' : 'pointer' }}>
                  {!user ? 'Sign in to Message' : sending ? 'Sending...' : sent ? 'Send Another Message' : 'Message Seller'}
                </button>
              </div>
            )}

            {isSeller && (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>This is your listing</div>
            )}
          </div>

          {/* Seller card */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Seller</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900, color: 'white' }}>
                {(listing.profiles?.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{listing.profiles?.display_name || listing.profiles?.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>@{listing.profiles?.username}</div>
              </div>
            </div>
            {listing.profiles?.location && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>📍 {listing.profiles.location}</div>}
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              {listing.profiles?.total_sales || 0} sales · Member since {listing.profiles?.member_since ? new Date(listing.profiles.member_since).getFullYear() : '2026'}
            </div>
            <a href={`/u/${listing.profiles?.username}`} style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '13px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>View Profile</a>
          </div>
        </div>
      </div>
    </div>
  )
}
