'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function TrendingPage() {
  const [gainers, setGainers] = useState([])
  const [mostSold, setMostSold] = useState([])
  const [retired, setRetired] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Most sales activity
      const { data: soldData } = await supabase
        .from('sets')
        .select('id, name, set_number, category, theme, retail_price, avg_sale_price, new_avg_price, total_sales, is_retired, image_url')
        .not('avg_sale_price', 'is', null)
        .order('total_sales', { ascending: false })
        .limit(12)
      setMostSold(soldData || [])

      // Biggest premium over retail (gainers)
      const { data: allData } = await supabase
        .from('sets')
        .select('id, name, set_number, category, theme, retail_price, avg_sale_price, new_avg_price, total_sales, is_retired, image_url')
        .not('avg_sale_price', 'is', null)
        .not('retail_price', 'is', null)
      
      const withPremium = (allData || [])
        .map(s => ({ ...s, premium: ((s.avg_sale_price - s.retail_price) / s.retail_price) * 100 }))
        .filter(s => s.premium > 0)
        .sort((a, b) => b.premium - a.premium)
        .slice(0, 12)
      setGainers(withPremium)

      // Retired sets with high premiums
      const retiredSets = (allData || [])
        .filter(s => s.is_retired && s.retail_price)
        .map(s => ({ ...s, premium: ((s.avg_sale_price - s.retail_price) / s.retail_price) * 100 }))
        .sort((a, b) => b.premium - a.premium)
        .slice(0, 8)
      setRetired(retiredSets)

      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const SetCard = ({ set, showPremium }) => (
    <a href={`/sets/${set.id}`} style={{
      border: '1.5px solid var(--border)', borderRadius: '14px',
      overflow: 'hidden', textDecoration: 'none', color: 'inherit',
      background: 'var(--white)', display: 'block', transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{
        height: '90px', background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px', borderBottom: '1px solid var(--border)', position: 'relative',
        overflow: 'hidden',
      }}>
        {set.image_url
          ? <img src={set.image_url} alt={set.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
          : null}
        <span style={{ display: set.image_url ? 'none' : 'block' }}>{catIcon[set.category] || '📦'}</span>
        {set.is_retired && (
          <span style={{
            position: 'absolute', top: '6px', left: '6px',
            fontSize: '9px', fontWeight: 700, padding: '2px 6px',
            borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)',
          }}>Retired</span>
        )}
        {showPremium && set.premium !== undefined && (
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            fontSize: '10px', fontWeight: 700, padding: '2px 7px',
            borderRadius: '5px', background: 'var(--green-light)', color: 'var(--green)',
          }}>+{Math.round(set.premium)}%</span>
        )}
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '3px' }}>{set.category} · {set.theme}</div>
        <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>{set.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 500 }}>{fmt(set.new_avg_price || set.avg_sale_price)}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>MSRP {fmt(set.retail_price)}</div>
        </div>
        {set.total_sales && (
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '5px' }}>{set.total_sales} recent sales</div>
        )}
      </div>
    </a>
  )

  const Section = ({ title, subtitle, children }) => (
    <div style={{ marginBottom: '60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: '4px' }}>{title}</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Market Data</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '6px' }}>Trending Now</h1>
        <p style={{ fontSize: '15px', color: 'var(--muted)' }}>What the collector market is moving right now, based on real eBay sales.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>Loading market data...</div>
      ) : (
        <>
          <Section title="🔥 Biggest Premiums Over Retail" subtitle="Sets selling the furthest above their original MSRP — strong collector demand.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {gainers.map(set => <SetCard key={set.id} set={set} showPremium />)}
            </div>
          </Section>

          <Section title="📦 Most Active Right Now" subtitle="Sets with the most recent eBay sold listings tracked in our database.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {mostSold.map(set => <SetCard key={set.id} set={set} />)}
            </div>
          </Section>

          <Section title="💀 Retired Sets Worth Watching" subtitle="Discontinued sets with significant appreciation above original retail.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {retired.map(set => <SetCard key={set.id} set={set} showPremium />)}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}