'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

export default function SearchPage() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q') || ''
    if (q) { setInput(q); doSearch(q) }
  }, [])

  // Live search — debounced 300ms
  useEffect(() => {
    if (!input.trim()) { setResults([]); setSearched(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(input.trim())
      window.history.replaceState({}, '', `/search?q=${encodeURIComponent(input.trim())}`)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [input])

  async function doSearch(q) {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)

    // Split into words and require ALL words to match somewhere in the searchable fields
    const words = q.trim().split(/\s+/).filter(Boolean)

    const buildFilter = (words) =>
      words.map(w => `name.ilike.%${w}%,theme.ilike.%${w}%,set_number.ilike.%${w}%,category.ilike.%${w}%`).join(',')

    // For multi-word queries, chain .or() per word so ALL words must match
    let countQuery = supabase.from('sets').select('*', { count: 'exact', head: true })
    let dataQuery = supabase.from('sets')
      .select('id, name, set_number, category, theme, retail_price, avg_sale_price, new_avg_price, total_sales, is_retired, image_url')

    for (const word of words) {
      const filter = `name.ilike.%${word}%,theme.ilike.%${word}%,set_number.ilike.%${word}%,category.ilike.%${word}%`
      countQuery = countQuery.or(filter)
      dataQuery = dataQuery.or(filter)
    }

    const { count } = await countQuery

    const { data } = await dataQuery
      .order('total_sales', { ascending: false, nullsFirst: false })
      .limit(500)

    setTotal(count || 0)
    setResults(data || [])
    setLoading(false)
  }

  const handleSubmit = (e) => { e.preventDefault(); doSearch(input) }

  const fmt = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—'
  const pct = (retail, avg) => {
    if (!retail || !avg) return null
    return Math.round(((avg - retail) / retail) * 100)
  }
  const catIcon = { 'Mega Construx': '🧱', 'Funko Pop': '👾', 'LEGO': '🏗️' }

  const SetCard = ({ set }) => {
    const displayPrice = set.new_avg_price || set.avg_sale_price
    const change = pct(set.retail_price, displayPrice)
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
          borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
        }}>
          {set.image_url ? (
            <img src={set.image_url} alt={set.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}/>
          ) : null}
          <div style={{
            fontSize: '42px', display: set.image_url ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%',
          }}>{catIcon[set.category] || '📦'}</div>
          {set.is_retired && (
            <span style={{
              position: 'absolute', top: '6px', left: '6px',
              fontSize: '9px', fontWeight: 700, padding: '2px 6px',
              borderRadius: '4px', background: 'var(--red-light)', color: 'var(--red)',
            }}>Retired</span>
          )}
        </div>
        <div style={{ padding: '12px' }}>
          {set.set_number && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px', letterSpacing: '0.5px' }}>
              #{set.set_number}
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '3px' }}>{set.category} · {set.theme}</div>
          <div style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.3, marginBottom: '10px' }}>{set.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 500 }}>{fmt(displayPrice)}</div>
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
          {set.total_sales > 0 && (
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
          {searched && input ? `Results for "${input}"` : 'Search Sets'}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Search by name, theme, or set number..."
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
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

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)', fontSize: '15px' }}>Searching...</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>No results for "{input}"</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>Try a shorter search term or browse by category.</p>
          <a href="/browse" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Browse all sets →</a>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
            {total} result{total !== 1 ? 's' : ''} found{total > 500 ? ' — showing top 500' : ''}
          </p>
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
              <button key={term} onClick={() => setInput(term)}
                style={{
                  background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '8px',
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)',
                }}>{term}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}