'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('value') // value | items | gain

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    setLoading(true)

    // Get all public portfolios with set data
    const { data: portfolioData, error } = await supabase
      .from('portfolios')
      .select(`
        user_id, quantity, price_paid,
        sets(avg_sale_price)
      `)

    if (error) { console.error(error); setLoading(false); return }

    // Get all public profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, display_name, location, portfolio_public, member_since')
      .eq('portfolio_public', true)

    if (!profileData) { setLoading(false); return }

    // Build a map of public user IDs
    const publicUserIds = new Set(profileData.map(p => p.id))

    // Aggregate portfolio stats per user (only public users)
    const userStats = {}
    for (const item of portfolioData || []) {
      if (!publicUserIds.has(item.user_id)) continue
      if (!userStats[item.user_id]) {
        userStats[item.user_id] = { totalValue: 0, totalInvested: 0, totalItems: 0 }
      }
      const val = (item.sets?.avg_sale_price || 0) * item.quantity
      const paid = (item.price_paid || 0) * item.quantity
      userStats[item.user_id].totalValue += val
      userStats[item.user_id].totalInvested += paid
      userStats[item.user_id].totalItems += item.quantity
    }

    // Merge with profiles
    const merged = profileData
      .filter(p => userStats[p.id])
      .map(p => ({
        ...p,
        ...userStats[p.id],
        totalGain: (userStats[p.id]?.totalValue || 0) - (userStats[p.id]?.totalInvested || 0),
        gainPct: userStats[p.id]?.totalInvested > 0
          ? (((userStats[p.id].totalValue - userStats[p.id].totalInvested) / userStats[p.id].totalInvested) * 100).toFixed(1)
          : 0,
      }))
      .filter(u => u.totalValue > 0)

    setLeaders(merged)
    setLoading(false)
  }

  const sorted = [...leaders].sort((a, b) => {
    if (tab === 'value') return b.totalValue - a.totalValue
    if (tab === 'items') return b.totalItems - a.totalItems
    if (tab === 'gain') return b.totalGain - a.totalGain
    return 0
  })

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const medals = ['🥇', '🥈', '🥉']

  const tabStyle = (t) => ({
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer',
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'white' : 'var(--muted)',
  })

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Community</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '8px' }}>Leaderboard</h1>
        <p style={{ fontSize: '15px', color: 'var(--muted)' }}>Top collectors ranked by portfolio value. Only public portfolios appear here.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        <button onClick={() => setTab('value')} style={tabStyle('value')}>Portfolio Value</button>
        <button onClick={() => setTab('items')} style={tabStyle('items')}>Most Items</button>
        <button onClick={() => setTab('gain')} style={tabStyle('gain')}>Biggest Gains</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading leaderboard...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No public portfolios yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Be the first! Make your portfolio public in Account Settings.</p>
          <a href="/account" style={{ background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Go to Settings</a>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {sorted.length >= 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
              {[sorted[1], sorted[0], sorted[2]].map((user, podiumIndex) => {
                if (!user) return <div key={podiumIndex} />
                const rank = podiumIndex === 1 ? 0 : podiumIndex === 0 ? 1 : 2
                const heights = ['160px', '200px', '140px']
                return (
                  <a key={user.id} href={`/u/${user.username}`} style={{
                    textDecoration: 'none', color: 'inherit',
                    background: rank === 0 ? 'var(--accent)' : 'var(--white)',
                    border: `1.5px solid ${rank === 0 ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '16px', padding: '24px 20px', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'flex-end', minHeight: heights[podiumIndex],
                    transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{medals[rank]}</div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: rank === 0 ? 'rgba(255,255,255,0.2)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '10px' }}>
                      {(user.display_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: rank === 0 ? 'white' : 'var(--text)', marginBottom: '2px' }}>
                      {user.display_name || user.username}
                    </div>
                    {user.username && (
                      <div style={{ fontSize: '11px', color: rank === 0 ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginBottom: '10px' }}>@{user.username}</div>
                    )}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 600, color: rank === 0 ? 'white' : 'var(--text)' }}>
                      {tab === 'value' ? fmt(user.totalValue) : tab === 'items' ? `${user.totalItems} items` : fmt(user.totalGain)}
                    </div>
                    {tab !== 'items' && (
                      <div style={{ fontSize: '11px', color: rank === 0 ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginTop: '2px' }}>
                        {tab === 'value' ? `${user.totalItems} items` : `${user.gainPct}% return`}
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          )}

          {/* Full ranked list */}
          <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px 120px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['#', 'Collector', 'Portfolio Value', 'Items', 'Total Gain'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>
            {sorted.map((user, i) => (
              <a key={user.id} href={user.username ? `/u/${user.username}` : '#'} style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px 120px',
                padding: '14px 20px', borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)',
                textDecoration: 'none', color: 'inherit', alignItems: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--white)' : 'var(--bg)'}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--muted)' }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 900, color: 'white', flexShrink: 0 }}>
                    {(user.display_name || user.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{user.display_name || user.username || 'Anonymous'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {user.username ? `@${user.username}` : ''}
                      {user.location ? ` · ${user.location}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 600 }}>{fmt(user.totalValue)}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', color: 'var(--muted)' }}>{user.totalItems}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', color: user.totalGain >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                  {user.totalGain >= 0 ? '+' : ''}{fmt(user.totalGain)}
                </div>
              </a>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '20px' }}>
            Only collectors with public portfolios appear here. Make yours public in{' '}
            <a href="/account" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Account Settings</a>.
          </p>
        </>
      )}
    </div>
  )
}