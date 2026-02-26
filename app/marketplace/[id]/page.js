'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../AuthProvider'

export default function ListingDetailPage({ params }) {
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])

  useEffect(() => { loadListing() }, [])

  async function loadListing() {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*, sets(name, category, theme, avg_sale_price, retail_price), profiles!seller_id(id, username, display_name, total_sales, member_since, bio, location)')
      .eq('id', params.id)
      .single()
    setListing(data)

    // Increment views
    if (data) supabase.from('marketplace_listings').update({ views: (data.views || 0) + 1 }).eq('id', params.id)

    // Load existing conversation if user is logged in
    if (user && data) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('listing_id', params.id)
        .eq('buyer_id', user.id)
        .single()

      if (conv) {
        setConversation(conv)
        const { data: msgs } = await supabase
          .from('messages')
          .select('*, profiles!sender_id(username, display_name)')
          .eq('listing_id', params.id)
          .order('created_at', { ascending: true })
        setMessages(msgs || [])
      }
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!user) { window.location.href = '/login'; return }
    if (!message.trim()) return
    setSending(true)

    let convId = conversation?.id
    if (!convId) {
      // Create conversation
      const { data: newConv } = await supabase.from('conversations').insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.profiles.id,
        last_message_at: new Date().toISOString(),
      }).select().single()
      convId = newConv?.id
      setConversation(newConv)
    }

    // Send message
    const { data: newMsg } = await supabase.from('messages').insert({
      listing_id: listing.id,
      sender_id: user.id,
      recipient_id: listing.profiles.id,
      body: message,
    }).select('*, profiles!sender_id(username, display_name)').single()

    setMessages([...messages, newMsg])
    setMessage('')
    setMessageSent(true)
    setSending(false)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const conditionColor = { 'New Sealed': 'var(--green)', 'Open Box': 'var(--yellow)', 'Used - Like New': 'var(--accent2)', 'Used - Good': 'var(--muted)', 'Used - Fair': 'var(--muted)' }
  const conditionBg = { 'New Sealed': 'var(--green-light)', 'Open Box': 'var(--yellow-light)', 'Used - Like New': '#eef4fd', 'Used - Good': 'var(--surface)', 'Used - Fair': 'var(--surface)' }

  if (loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>
  if (!listing) return <div style={{ textAlign: 'center', padding: '120px' }}><h2>Listing not found</h2><a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>← Marketplace</a></div>

  const isSeller = user?.id === listing.profiles?.id
  const pct = listing.sets?.retail_price && listing.price ? Math.round(((listing.price - listing.sets.retail_price) / listing.sets.retail_price) * 100) : null

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '24px', fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '6px' }}>
        <a href="/marketplace" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>Marketplace</a>
        <span>›</span>
        <span>{listing.sets?.name || listing.manual_set_name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
        {/* Left */}
        <div>
          {/* Image placeholder */}
          <div style={{
            height: '320px', background: 'var(--surface)', borderRadius: '16px',
            border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '96px', marginBottom: '24px',
          }}>
            {{ 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }[listing.sets?.category || listing.manual_category] || '📦'}
          </div>

          <h1 style={{ fontFamily: 'var(--display)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            {listing.sets?.name || listing.manual_set_name}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
            {listing.sets?.category || listing.manual_category}
            {listing.sets?.theme ? ` · ${listing.sets.theme}` : ''}
            {listing.manual_set_number ? ` · #${listing.manual_set_number}` : ''}
          </p>

          {/* Condition + price */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '32px', fontWeight: 500 }}>{fmt(listing.price)}</div>
            <span style={{
              fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
              background: conditionBg[listing.condition] || 'var(--surface)',
              color: conditionColor[listing.condition] || 'var(--muted)',
            }}>{listing.condition}</span>
            {pct !== null && (
              <span style={{
                fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                background: pct >= 0 ? 'var(--red-light)' : 'var(--green-light)',
                color: pct >= 0 ? 'var(--red)' : 'var(--green)',
              }}>{pct >= 0 ? '+' : ''}{pct}% vs retail</span>
            )}
          </div>

          {/* Market comparison */}
          {listing.sets?.avg_sale_price && (
            <div style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Market avg for this set: </span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(listing.sets.avg_sale_price)}</span>
              <a href={`/sets/${listing.set_id}`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', marginLeft: '8px', fontSize: '12px' }}>See price history →</a>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '8px' }}>Description</div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)' }}>{listing.description}</p>
            </div>
          )}

          {/* Shipping + payment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--white)', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Shipping</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{listing.free_shipping ? '✓ Free shipping' : listing.shipping_cost ? `+${fmt(listing.shipping_cost)}` : 'Contact seller'}</div>
              {listing.ships_from && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>Ships from {listing.ships_from}</div>}
            </div>
            <div style={{ padding: '14px', background: 'var(--white)', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Payment</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{(listing.payment_methods || []).join(' · ')}</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '16px' }}>
            Listed {new Date(listing.created_at).toLocaleDateString()} · {listing.views || 0} views
          </div>
        </div>

        {/* Right: Seller + Contact */}
        <div>
          {/* Seller card */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Seller</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: 'white', fontFamily: 'var(--display)', fontWeight: 900,
              }}>
                {(listing.profiles?.display_name || listing.profiles?.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{listing.profiles?.display_name || listing.profiles?.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>@{listing.profiles?.username}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              💰 {listing.profiles?.total_sales} sales · 📅 Member since {new Date(listing.profiles?.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            {listing.profiles?.location && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>📍 {listing.profiles.location}</div>}
            <a href={`/u/${listing.profiles?.username}`} style={{
              display: 'block', textAlign: 'center', padding: '9px', borderRadius: '8px',
              border: '1.5px solid var(--border)', fontSize: '13px', fontWeight: 700,
              textDecoration: 'none', color: 'var(--text)',
            }}>View full profile →</a>
          </div>

          {/* Message / Contact */}
          {!isSeller && (
            <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '14px' }}>
                {messages.length > 0 ? 'Your conversation' : 'Contact Seller'}
              </div>

              {/* Message history */}
              {messages.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', display: 'grid', gap: '8px' }}>
                  {messages.map(m => (
                    <div key={m.id} style={{
                      padding: '10px 12px', borderRadius: '10px', fontSize: '13px',
                      background: m.sender_id === user?.id ? 'var(--accent)' : 'var(--surface)',
                      color: m.sender_id === user?.id ? 'white' : 'var(--text)',
                      alignSelf: m.sender_id === user?.id ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', justifySelf: m.sender_id === user?.id ? 'end' : 'start',
                    }}>
                      <div>{m.body}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '3px' }}>{new Date(m.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {messageSent && messages.length === 1 && (
                <div style={{ padding: '10px', background: 'var(--green-light)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: 600, marginBottom: '10px' }}>
                  ✓ Message sent! The seller will reply to your inbox.
                </div>
              )}

              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder={messages.length > 0 ? "Send another message..." : "Hi, is this still available? I'm interested in..."}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
                  fontSize: '13px', outline: 'none', background: 'var(--bg)',
                  height: '90px', resize: 'none', marginBottom: '10px',
                }}
              />
              <button onClick={sendMessage} disabled={sending || !message.trim()} style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: !message.trim() || sending ? 'var(--border)' : 'var(--accent)',
                color: !message.trim() || sending ? 'var(--muted)' : 'white',
                fontSize: '14px', fontWeight: 700, cursor: message.trim() && !sending ? 'pointer' : 'default',
              }}>
                {!user ? 'Sign in to message' : sending ? 'Sending...' : messages.length > 0 ? 'Send Message' : 'Send Message to Seller'}
              </button>

              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px', textAlign: 'center' }}>
                Arrange payment via {(listing.payment_methods || []).join(', ')}
              </div>
            </div>
          )}

          {isSeller && (
            <div style={{ background: 'var(--yellow-light)', borderRadius: '12px', border: '1.5px solid rgba(196,138,0,0.2)', padding: '16px', fontSize: '13px', color: 'var(--yellow)', fontWeight: 600 }}>
              This is your listing. <a href="/account" style={{ color: 'var(--yellow)' }}>Manage it in your account →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
