import { createClient } from '@supabase/supabase-js';
import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REBRICKABLE_KEY = process.env.REBRICKABLE_API_KEY || 'b467861b30e43b0ae075907853a1aa73';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const DOWNLOADS = {
  parts:    'https://cdn.rebrickable.com/media/downloads/parts.csv.gz',
  minifigs: 'https://cdn.rebrickable.com/media/downloads/minifigs.csv.gz',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadAndParse(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Download failed: ${url} → ${res.status}`);
  const buffer = await res.arrayBuffer();
  const decompressed = await gunzip(Buffer.from(buffer));
  const text = decompressed.toString('utf8');

  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, ''); });
    return row;
  });
}

// Fetch BrickLink external IDs for minifigs via Rebrickable API
// API returns ext_ids.BrickLink array for each minifig
async function fetchBricklinkIds(figNums) {
  const bricklinkMap = {}; // fig_num → [bricklink_id, ...]
  
  // Process in pages of 100 (API max page size)
  for (let i = 0; i < figNums.length; i += 100) {
    const page = Math.floor(i / 100) + 1;
    const url = `https://rebrickable.com/api/v3/lego/minifigs/?key=${REBRICKABLE_KEY}&page=${page}&page_size=100`;
    
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      const data = await res.json();
      
      for (const fig of data.results || []) {
        const blIds = fig.ext_ids?.BrickLink || [];
        if (blIds.length > 0) {
          bricklinkMap[fig.set_num] = blIds.map(id => id.toString().toLowerCase());
        }
      }
      
      if (!data.next) break;
      await sleep(200); // ~5 req/sec to stay under rate limit
    } catch (e) {
      break;
    }
  }
  
  return bricklinkMap;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'both';
  const dryRun = searchParams.get('dry') === 'true';
  // bricklink_ids=true fetches BrickLink IDs via API (slower, ~30min for all minifigs)
  // bricklink_ids=false (default) just uses Rebrickable fig nums (fast)
  const fetchBLIds = searchParams.get('bricklink_ids') === 'true';

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'No service key' }, { status: 500 });

  // Debug: return raw API response for a single minifig to inspect field names
  if (searchParams.get('debug') === 'true') {
    const res = await fetch(
      `https://rebrickable.com/api/v3/lego/minifigs/fig-000003/?key=${REBRICKABLE_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    return Response.json({ rawApiResponse: data });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results = {};

  // ── PARTS ──────────────────────────────────────────────────────────────────
  if (type === 'parts' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.parts);

    const parts = rows
      .filter(r => (r.part_num || '').trim())
      .map(r => ({
        part_num: r.part_num.trim().toLowerCase(),
        name: (r.name || '').trim().substring(0, 255),
        part_cat_id: parseInt(r.part_cat_id) || null,
        type: 'part',
        bricklink_ids: null,
      }));

    results.parts = { total: rows.length, toInsert: parts.length };

    if (!dryRun && parts.length > 0) {
      let inserted = 0;
      for (let i = 0; i < parts.length; i += 5000) {
        const batch = parts.slice(i, i + 5000);
        const { error } = await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: false });
        if (!error) inserted += batch.length;
        else results.parts.lastError = error.message;
      }
      results.parts.inserted = inserted;
    }
  }

  // ── MINIFIGS ────────────────────────────────────────────────────────────────
  if (type === 'minifigs' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.minifigs);

    const figNums = rows
      .filter(r => (r.fig_num || '').trim())
      .map(r => r.fig_num.trim());

    // Optionally fetch BrickLink IDs via API
    let bricklinkMap = {};
    if (fetchBLIds) {
      bricklinkMap = await fetchBricklinkIds(figNums);
      results.minifigs_bricklink_mapped = Object.keys(bricklinkMap).length;
    }

    const minifigs = rows
      .filter(r => (r.fig_num || '').trim())
      .map(r => {
        const fig_num = r.fig_num.trim();
        const blIds = bricklinkMap[fig_num] || [];
        return {
          part_num: fig_num.toLowerCase(),
          name: (r.name || '').trim().substring(0, 255),
          part_cat_id: null,
          type: 'minifig',
          bricklink_ids: blIds.length > 0 ? blIds : null,
        };
      });

    // Also insert BrickLink IDs as separate rows so they're directly searchable
    // e.g. insert "sw1088" as its own row pointing to the same minifig name
    const bricklinkRows = [];
    if (fetchBLIds) {
      for (const [fig_num, blIds] of Object.entries(bricklinkMap)) {
        const figRow = minifigs.find(m => m.part_num === fig_num.toLowerCase());
        for (const blId of blIds) {
          bricklinkRows.push({
            part_num: blId.toLowerCase(),
            name: figRow?.name || '',
            part_cat_id: null,
            type: 'minifig_bricklink',
            bricklink_ids: null,
          });
        }
      }
    }

    results.minifigs = { total: rows.length, toInsert: minifigs.length, bricklinkRows: bricklinkRows.length };

    if (!dryRun) {
      let inserted = 0;
      for (let i = 0; i < minifigs.length; i += 5000) {
        const batch = minifigs.slice(i, i + 5000);
        const { error } = await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: false });
        if (!error) inserted += batch.length;
      }

      // Insert BrickLink alias rows
      for (let i = 0; i < bricklinkRows.length; i += 5000) {
        const batch = bricklinkRows.slice(i, i + 5000);
        await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: false });
      }

      results.minifigs.inserted = inserted;
      results.minifigs.bricklinkInserted = bricklinkRows.length;
    }
  }

  return Response.json({
    success: true,
    dryRun,
    type,
    fetchBLIds,
    results,
    note: dryRun
      ? 'Dry run — no changes made'
      : fetchBLIds
      ? 'Import complete with BrickLink IDs'
      : 'Import complete. Run with ?bricklink_ids=true to also fetch BrickLink IDs (takes ~30min)',
  });
}