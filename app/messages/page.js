'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) { window.location.href = '/login'; return }
      loadConversations()
    }
  }, [user, authLoading])

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        marketplace_listings(id, price, sets(name), manual_set_name),
        buyer:profiles!buyer_id(username, display_name),
        seller:profiles!seller_id(username, display_name)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'

  if (authLoading || loading) return <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Inbox</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>No messages yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>When you contact a seller or someone messages you, it'll appear here.</p>
          <a href="/marketplace" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Browse marketplace →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {conversations.map(conv => {
            const isBuyer = conv.buyer_id === user.id
            const otherUser = isBuyer ? conv.seller : conv.buyer
            const unread = isBuyer ? conv.buyer_unread : conv.seller_unread
            const setName = conv.marketplace_listings?.sets?.name || conv.marketplace_listings?.manual_set_name || 'Unknown listing'

            return (
              <a key={conv.id} href={`/messages/${conv.id}`} style={{
                background: 'var(--white)', borderRadius: '12px', border: `1.5px solid ${unread > 0 ? 'var(--accent)' : 'var(--border)'}`,
                padding: '16px 20px', textDecoration: 'none', color: 'inherit', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                background: unread > 0 ? 'var(--accent-light)' : 'var(--white)',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', color: 'white', fontWeight: 900, flexShrink: 0,
                  }}>
                    {(otherUser?.display_name || otherUser?.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>
                      @{otherUser?.username}
                      {unread > 0 && <span style={{ marginLeft: '8px', background: 'var(--accent)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>{unread} new</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Re: {setName} · {fmt(conv.marketplace_listings?.price)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {new Date(conv.last_message_at).toLocaleDateString()}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
