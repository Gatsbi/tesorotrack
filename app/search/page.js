'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q') || ''
    setInput(q)
    if (q) {
      setQuery(q)
      doSearch(q)
    }
  }, [])

  async function doSearch(q) {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)

    const { data } = await supabase
      .from('sets')
      .select('id, name, set_number, category, theme, retail_price, avg_sale_price, total_sales, is_retired, image_url')
      .or(`name.ilike.%${q}%,theme.ilike.%${q}%,set_number.ilike.%${q}%,category.ilike.%${q}%`)
      .order('total_sales', { ascending: false, nullsFirst: false })
      .limit(60)

    setResults(data || [])
    setLoading(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setQuery(input)
    doSearch(input)
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(input)}`)
  }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const pct = (retail, avg) => {
    if (!retail || !avg) return null
    return Math.round(((avg - retail) / retail) * 100)
  }
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const SetCard = ({ set }) => {
    const change = pct(set.retail_price, set.avg_sale_price)
    return (
      <a href={`/sets/${set.id}`} style={{
        border: '1.5px solid var(--border)', borderRadius: '14px',
        overflow: 'hidden', textDecoration: 'none', color: 'inherit',
        background: 'var(--white)', display: 'block', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <div style={{
          height: '140px', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid var(--border)', position: 'relative',
          overflow: 'hidden',
        }}>
          {set.image_url ? (
            <img
              src={set.image_url}
              alt={set.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div style={{
            fontSize: '42px',
            display: set.image_url ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
          }}>
            {catIcon[set.category] || '📦'}
          </div>
          {set.is_retired && (
            <span style={{
              position: 'absolute', top: '6px', left: '6px',
              fontSize: '9px', fontWeight: 700, padding: '2px 6px',
              borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)',
            }}>Retired</span>
          )}
        </div>
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '3px' }}>{set.category} · {set.theme}</div>
          <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '10px' }}>{set.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 500 }}>{fmt(set.avg_sale_price)}</div>
              {set.retail_price && <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>MSRP {fmt(set.retail_price)}</div>}
            </div>
            {change !== null && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 7px', borderRadius: '5px',
                background: change >= 0 ? 'var(--green-light)' : 'var(--red-light)',
                color: change >= 0 ? 'var(--green)' : 'var(--red)',
              }}>{change >= 0 ? '+' : ''}{change}%</span>
            )}
          </div>
          {set.total_sales && (
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>{set.total_sales} recent sales</div>
          )}
        </div>
      </a>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Search</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '24px' }}>
          {searched ? `Results for "${query}"` : 'Search Sets'}
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Search by name, theme, or set number..."
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, padding: '14px 18px', borderRadius: '10px',
              border: '1.5px solid var(--border)', fontFamily: 'var(--sans)',
              fontSize: '15px', fontWeight: 500, outline: 'none', background: 'var(--white)',
            }}
          />
          <button type="submit" style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            padding: '14px 24px', borderRadius: '10px', fontFamily: 'var(--sans)',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
          }}>Search</button>
        </form>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)', fontSize: '15px' }}>Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No results for "{query}"</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>Try a shorter search term or browse by category.</p>
          <a href="/browse" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Browse all sets →</a>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {results.map(set => <SetCard key={set.id} set={set} />)}
          </div>
        </>
      )}

      {!searched && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Popular searches</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Halo Warthog', 'Pokémon Charizard', 'LEGO Millennium Falcon', 'Funko Grogu', 'Castle Grayskull', 'Bugatti Chiron', 'Hogwarts Castle', 'Darth Vader'].map(term => (
              <button key={term} onClick={() => { setInput(term); setQuery(term); doSearch(term); window.history.pushState({}, '', `/search?q=${encodeURIComponent(term)}`) }}
                style={{
                  background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '8px',
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)',
                }}>
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}