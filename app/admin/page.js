'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthProvider'

const BATCH_SIZE = 50
const STORAGE_KEY = 'tt_price_update_progress'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('submissions')
  const [submissions, setSubmissions] = useState([])
  const [listings, setListings] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [reviewNote, setReviewNote] = useState({})

  // Price update state
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(null)
  const [totalSaved, setTotalSaved] = useState(0)
  const [totalUpdated, setTotalUpdated] = useState(0)
  const [priceLog, setPriceLog] = useState([])
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [savedProgress, setSavedProgress] = useState(null) // resumed state
  const stopRef = useRef(false)
  const logEndRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { window.location.href = '/login'; return }
    checkAdmin()
  }, [user, authLoading])

  // Load saved progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only show resume if it's incomplete and less than 24hrs old
        const age = Date.now() - (parsed.savedAt || 0)
        if (!parsed.done && age < 24 * 60 * 60 * 1000) {
          setSavedProgress(parsed)
        } else if (parsed.done) {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [priceLog])

  useEffect(() => {
    if (!running || !startTime) return
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [running, startTime])

  function saveProgress(batch, totalBatches, saved, updated, done = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        batch,
        totalBatches,
        totalSaved: saved,
        totalUpdated: updated,
        done,
        savedAt: Date.now(),
      }))
    } catch (e) {}
  }

  function clearProgress() {
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
    setSavedProgress(null)
  }

  async function checkAdmin() {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!data?.is_admin) { window.location.href = '/'; return }
    setIsAdmin(true)
    loadAll()
  }

  async function loadAll() {
    const [subData, listingData, userData] = await Promise.all([
      supabase.from('set_submissions').select('*, profiles(username)').order('created_at', { ascending: false }),
      supabase.from('listings').select('*, sets(name), profiles(username)').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setSubmissions(subData.data || [])
    setListings(listingData.data || [])
    setUsers(userData.data || [])
    const pending = (subData.data || []).filter(s => s.status === 'pending').length
    const activeListings = (listingData.data || []).filter(l => l.status === 'active').length
    setStats({ pending, activeListings, totalUsers: (userData.data || []).length })
    setLoading(false)
  }

  async function reviewSubmission(id, status) {
    await supabase.from('set_submissions').update({
      status, review_notes: reviewNote[id] || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user.id
    }).eq('id', id)
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s))
  }

  async function removeListing(id) {
    await supabase.from('listings').update({ status: 'removed' }).eq('id', id)
    setListings(listings.map(l => l.id === id ? { ...l, status: 'removed' } : l))
  }

  function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString()
    setPriceLog(prev => [...prev, { time, msg, type }])
  }

  async function runAll(resumeFrom = 0, resumeTotals = { saved: 0, updated: 0 }) {
    stopRef.current = false
    setRunning(true)
    setDone(false)
    if (resumeFrom === 0) setPriceLog([])
    setTotalSaved(resumeTotals.saved)
    setTotalUpdated(resumeTotals.updated)
    setCurrentBatch(resumeFrom)
    setStartTime(Date.now())
    setElapsed(0)
    setSavedProgress(null)

    if (resumeFrom > 0) {
      addLog(`▶ Resuming from batch ${resumeFrom + 1}...`, 'info')
    } else {
      addLog(`Starting price update — batch size: ${BATCH_SIZE}`, 'info')
    }

    let batch = resumeFrom
    let grandTotalSaved = resumeTotals.saved
    let grandTotalUpdated = resumeTotals.updated
    let knownTotalBatches = savedProgress?.totalBatches || null
    if (knownTotalBatches) setTotalBatches(knownTotalBatches)

    while (true) {
      if (stopRef.current) {
        addLog('⏹ Stopped — progress saved. Come back and hit Resume to continue.', 'warn')
        saveProgress(batch, knownTotalBatches, grandTotalSaved, grandTotalUpdated, false)
        setSavedProgress({ batch, totalBatches: knownTotalBatches, totalSaved: grandTotalSaved, totalUpdated: grandTotalUpdated, done: false, savedAt: Date.now() })
        break
      }

      setCurrentBatch(batch)
      addLog(`Running batch ${batch + 1}${knownTotalBatches ? ` of ${knownTotalBatches}` : ''}...`, 'info')

      let data
      try {
        const res = await fetch(`/api/update-prices?batch=${batch}&size=${BATCH_SIZE}`)
        data = await res.json()
      } catch (e) {
        addLog(`❌ Batch ${batch + 1} failed: ${e.message}`, 'error')
        saveProgress(batch, knownTotalBatches, grandTotalSaved, grandTotalUpdated, false)
        setSavedProgress({ batch, totalBatches: knownTotalBatches, totalSaved: grandTotalSaved, totalUpdated: grandTotalUpdated, done: false, savedAt: Date.now() })
        break
      }

      if (data.error) {
        addLog(`❌ Error: ${data.error} — ${data.detail || ''}`, 'error')
        saveProgress(batch, knownTotalBatches, grandTotalSaved, grandTotalUpdated, false)
        break
      }

      if (data.done) {
        addLog('✅ All batches complete!', 'success')
        saveProgress(batch, knownTotalBatches, grandTotalSaved, grandTotalUpdated, true)
        clearProgress()
        break
      }

      grandTotalSaved += data.pricesSaved || 0
      grandTotalUpdated += data.setsUpdated || 0
      setTotalSaved(grandTotalSaved)
      setTotalUpdated(grandTotalUpdated)

      if (data.totalSetsWithNumbers && !knownTotalBatches) {
        knownTotalBatches = Math.ceil(data.totalSetsWithNumbers / BATCH_SIZE)
        setTotalBatches(knownTotalBatches)
      }

      // Save progress after every batch
      saveProgress(batch, knownTotalBatches, grandTotalSaved, grandTotalUpdated, false)

      for (const entry of data.log || []) {
        if (entry.error) {
          addLog(`  ⚠ ${entry.set} (#${entry.setNumber}): ${entry.error}`, 'warn')
        } else if (entry.matched > 0) {
          addLog(`  ✓ ${entry.set} (#${entry.setNumber}): ${entry.ebayTotal} on eBay → ${entry.matched} saved`, 'success')
        } else {
          addLog(`  — ${entry.set} (#${entry.setNumber}): no listings found`, 'muted')
        }
      }

      addLog(`Batch ${batch + 1} done — ${data.pricesSaved} prices saved, ${data.setsUpdated} sets updated`, 'info')

      if (data.isLastBatch) {
        addLog(`✅ All done! Total: ${grandTotalSaved} prices saved across ${grandTotalUpdated} sets`, 'success')
        clearProgress()
        break
      }

      batch++
      await new Promise(r => setTimeout(r, 500))
    }

    setRunning(false)
    setDone(true)
  }

  const fmtTime = (s) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleString() : '—'
  const progress = totalBatches ? Math.min(100, Math.round(((currentBatch + 1) / totalBatches) * 100)) : 0

  const tabStyle = (t) => ({ padding: '10px 20px', borderRadius: '8px', border: 'none', fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--muted)' })
  const statusBadge = (s, colors) => { const c = colors[s] || ['var(--surface)', 'var(--muted)']; return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: c[0], color: c[1], textTransform: 'uppercase' }}>{s}</span> }

  if (authLoading || loading) return (
    <div style={{ textAlign: 'center', padding: '120px', color: 'var(--muted)' }}>Loading admin panel...</div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Pending Submissions', value: stats.pending, color: 'var(--yellow)', urgent: stats.pending > 0 },
          { label: 'Active Listings', value: stats.activeListings, color: 'var(--green)' },
          { label: 'Total Users', value: stats.totalUsers, color: 'var(--accent)' },
          { label: 'Total Submissions', value: submissions.length, color: 'var(--muted)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '20px', borderRadius: '14px', background: 'var(--white)', border: `1.5px solid ${s.urgent ? 'var(--yellow)' : 'var(--border)'}` }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 500, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          ['submissions', `Submissions (${stats.pending} pending)`],
          ['listings', 'Listings'],
          ['users', 'Users'],
          ['prices', '⚡ Price Update'],
        ].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
        ))}
      </div>

      {tab === 'submissions' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {submissions.length === 0 && <div style={{ textAlign: 'center', padding: '60px', background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', color: 'var(--muted)' }}>No submissions yet</div>}
          {submissions.map(sub => (
            <div key={sub.id} style={{ background: 'var(--white)', borderRadius: '14px', border: `1.5px solid ${sub.status === 'pending' ? 'var(--yellow)' : 'var(--border)'}`, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{sub.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {sub.category} · {sub.theme}
                    {sub.set_number && ` · #${sub.set_number}`}
                    {sub.year_released && ` · ${sub.year_released}`}
                    {sub.retail_price && ` · $${sub.retail_price}`}
                    {sub.piece_count && ` · ${sub.piece_count} pcs`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>by @{sub.profiles?.username || 'anonymous'} · {new Date(sub.created_at).toLocaleDateString()}</div>
                  {sub.notes && <div style={{ fontSize: '13px', marginTop: '8px', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px' }}>{sub.notes}</div>}
                </div>
                {statusBadge(sub.status, { pending: ['var(--yellow-light)', 'var(--yellow)'], approved: ['var(--green-light)', 'var(--green)'], rejected: ['var(--red-light)', 'var(--red)'] })}
              </div>
              {sub.status === 'pending' && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="text" placeholder="Review note (optional)" value={reviewNote[sub.id] || ''}
                    onChange={e => setReviewNote({ ...reviewNote, [sub.id]: e.target.value })}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', fontFamily: 'var(--sans)', fontSize: '13px', outline: 'none', background: 'var(--bg)' }} />
                  <button onClick={() => reviewSubmission(sub.id, 'approved')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--green)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => reviewSubmission(sub.id, 'rejected')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'listings' && (
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Set', 'Seller', 'Price', 'Status', ''].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {listings.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No listings yet</div>}
          {listings.map((l, i) => (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '14px 20px', borderBottom: i < listings.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.sets?.name || '—'}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>@{l.profiles?.username || '—'}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>${parseFloat(l.price || 0).toFixed(2)}</div>
              <div>{statusBadge(l.status, { active: ['var(--green-light)', 'var(--green)'], sold: ['var(--yellow-light)', 'var(--yellow)'], removed: ['var(--surface)', 'var(--muted)'] })}</div>
              {l.status === 'active' && <button onClick={() => removeListing(l.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'none', color: 'var(--red)' }}>Remove</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['Username', 'Display Name', 'Joined', 'Admin'].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '12px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
              <a href={`/u/${u.username}`} style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>@{u.username}</a>
              <div style={{ fontSize: '13px' }}>{u.display_name || '—'}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: u.is_admin ? 'var(--green)' : 'var(--muted)' }}>{u.is_admin ? '✓ Admin' : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'prices' && (
        <div>
          {/* Resume banner */}
          {savedProgress && !running && (
            <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(200,82,42,0.08)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>⏸ Interrupted run detected</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Stopped at batch {savedProgress.batch + 1}{savedProgress.totalBatches ? ` of ${savedProgress.totalBatches}` : ''} · {savedProgress.totalSaved?.toLocaleString()} prices saved · {fmtDate(savedProgress.savedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => runAll(savedProgress.batch, { saved: savedProgress.totalSaved || 0, updated: savedProgress.totalUpdated || 0 })} style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                }}>▶ Resume</button>
                <button onClick={clearProgress} style={{
                  padding: '10px 16px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--muted)'
                }}>Discard</button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Status', value: running ? '🟡 Running' : done ? '✅ Done' : savedProgress ? '⏸ Paused' : '⚪ Ready' },
              { label: 'Batch', value: totalBatches ? `${currentBatch + 1} / ${totalBatches}` : '—' },
              { label: 'Prices Saved', value: totalSaved.toLocaleString() },
              { label: 'Elapsed', value: running || done ? fmtTime(elapsed) : '—' },
            ].map(s => (
              <div key={s.label} style={{ padding: '16px', borderRadius: '12px', background: 'var(--white)', border: '1.5px solid var(--border)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {(running || done) && totalBatches && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                <span>Progress</span><span>{progress}%</span>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {!savedProgress && (
              <button onClick={() => runAll(0, { saved: 0, updated: 0 })} disabled={running} style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: running ? 'var(--border)' : 'var(--accent)',
                color: running ? 'var(--muted)' : 'white',
                fontSize: '14px', fontWeight: 700, cursor: running ? 'default' : 'pointer',
                boxShadow: running ? 'none' : '0 4px 14px rgba(200,82,42,0.3)',
              }}>
                {running ? '⏳ Running...' : done ? '🔄 Run Again' : '▶ Run Price Update'}
              </button>
            )}
            {running && (
              <button onClick={() => { stopRef.current = true }} style={{ padding: '12px 20px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer', color: 'var(--muted)' }}>
                ⏹ Stop
              </button>
            )}
            {priceLog.length > 0 && !running && (
              <button onClick={() => setPriceLog([])} style={{ padding: '12px 20px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer', color: 'var(--muted)' }}>
                Clear Log
              </button>
            )}
          </div>

          {/* Log */}
          {priceLog.length > 0 && (
            <div style={{ background: '#0d1117', borderRadius: '14px', border: '1.5px solid #30363d', padding: '20px', maxHeight: '500px', overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.8' }}>
              {priceLog.map((entry, i) => (
                <div key={i} style={{ color: entry.type === 'error' ? '#f85149' : entry.type === 'success' ? '#3fb950' : entry.type === 'warn' ? '#d29922' : entry.type === 'muted' ? '#484f58' : '#c9d1d9' }}>
                  <span style={{ color: '#484f58', marginRight: '8px' }}>{entry.time}</span>
                  {entry.msg}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '12px', background: 'var(--surface)', border: '1.5px solid var(--border)', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>How it works:</strong> Searches eBay for each set by set number, saves matching listings, then recalculates avg_sale_price based on last 90 days. Processes {BATCH_SIZE} sets per batch. Progress is saved automatically — if you close the tab you can resume where you left off within 24 hours.
          </div>
        </div>
      )}
    </div>
  )
}