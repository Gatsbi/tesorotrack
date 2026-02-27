'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { window.location.href = '/login'; return }
    loadConversations()
  }, [user, authLoading])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select(`*, marketplace_listings(id, price, set_id, manual_set_name, sets(name))`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Fetch all profiles for buyers and sellers
    const userIds = [...new Set([
      ...data.map(c => c.buyer_id),
      ...data.map(c => c.seller_id),
    ])]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds)
    const profileMap = {}
    if (profilesData) profilesData.forEach(p => { profileMap[p.id] = p })

    const enriched = data.map(c => ({
      ...c,
      buyerProfile: profileMap[c.buyer_id] || null,
      sellerProfile: profileMap[c.seller_id] || null,
    }))

    setConversations(enriched)
    setLoading(false)
  }

  async function openConversation(conv) {
    setActive(conv)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    const field = user.id === conv.buyer_id ? 'buyer_unread' : 'seller_unread'
    await supabase.from('conversations').update({ [field]: 0 }).eq('id', conv.id)
    loadConversations()
  }

  async function sendReply() {
    if (!reply.trim() || !active) return
    setSending(true)
    const recipientId = user.id === active.buyer_id ? active.seller_id : active.buyer_id
    await supabase.from('messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      recipient_id: recipientId,
      body: reply.trim(),
    })
    const otherField = user.id === active.buyer_id ? 'seller_unread' : 'buyer_unread'
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      [otherField]: (active[otherField] || 0) + 1,
    }).eq('id', active.id)
    setReply('')
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', active.id).order('created_at', { ascending: true })
    setMessages(data || [])
    loadConversations()
    setSending(false)
  }

  const getOtherProfile = (conv) => user.id === conv.buyer_id ? conv.sellerProfile : conv.buyerProfile
  const getUnread = (conv) => user.id === conv.buyer_id ? conv.buyer_unread : conv.seller_unread
  const getSetName = (conv) => conv.marketplace_listings?.sets?.name || conv.marketplace_listings?.manual_set_name || 'Listing'

  if (authLoading || loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Inbox</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Messages</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', height: '600px' }}>
        {/* Conversation list */}
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '14px' }}>
            Conversations ({conversations.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: '14px' }}>No messages yet</div>
            ) : (
              conversations.map(conv => {
                const other = getOtherProfile(conv)
                const unread = getUnread(conv)
                const isActive = active?.id === conv.id
                return (
                  <div key={conv.id} onClick={() => openConversation(conv)} style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>@{other?.username || 'user'}</div>
                      {unread > 0 && <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '2px 7px' }}>{unread}</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginTop: '2px' }}>{getSetName(conv)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{new Date(conv.last_message_at).toLocaleDateString()}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Message thread */}
        <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Select a conversation</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>@{getOtherProfile(active)?.username || 'user'}</div>
                  <a href={`/marketplace/${active.listing_id}`} style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{getSetName(active)} →</a>
                </div>
                {getOtherProfile(active)?.username && (
                  <a href={`/u/${getOtherProfile(active).username}`} style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '12px', fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>View Profile</a>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '14px', background: msg.sender_id === user.id ? 'var(--accent)' : 'var(--surface)', color: msg.sender_id === user.id ? 'white' : 'var(--text)' }}>
                      <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{msg.body}</div>
                      <div style={{ fontSize: '10px', marginTop: '4px', color: msg.sender_id === user.id ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Type a message..." value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '14px', outline: 'none', background: 'var(--bg)' }} />
                <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: sending ? 'var(--border)' : 'var(--accent)', color: 'white', fontWeight: 700, fontSize: '14px', cursor: sending ? 'default' : 'pointer' }}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
