import { createClient } from '@supabase/supabase-js';
import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Rebrickable daily CSV downloads — no auth required
const DOWNLOADS = {
  parts:    'https://cdn.rebrickable.com/media/downloads/parts.csv.gz',
  minifigs: 'https://cdn.rebrickable.com/media/downloads/minifigs.csv.gz',
};

async function downloadAndParse(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Download failed: ${url} → ${res.status}`);
  const buffer = await res.arrayBuffer();
  const decompressed = await gunzip(Buffer.from(buffer));
  const text = decompressed.toString('utf8');

  // Parse CSV — first line is headers
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
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
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'both'; // parts | minifigs | both
  const dryRun = searchParams.get('dry') === 'true';

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'No service key' }, { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results = {};

  // Process parts
  if (type === 'parts' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.parts);
    
    // We only need part_num — filter to BrickLink-style alphanumeric IDs
    // that would actually appear in eBay titles (letters + digits combos)
    const partNums = rows
      .map(r => r.part_num || r.Part_Num || '')
      .filter(n => n && /^[a-z]{1,4}\d{2,6}$/i.test(n))
      .map(n => n.toLowerCase());

    results.parts = { total: rows.length, filtered: partNums.length };

    if (!dryRun && partNums.length > 0) {
      // Upsert in batches of 5000
      let inserted = 0;
      for (let i = 0; i < partNums.length; i += 5000) {
        const batch = partNums.slice(i, i + 5000).map(part_num => ({ part_num, type: 'part' }));
        const { error } = await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: true });
        if (!error) inserted += batch.length;
      }
      results.parts.inserted = inserted;
    }
  }

  // Process minifigs
  if (type === 'minifigs' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.minifigs);

    // Minifig IDs look like "sw1088", "hp0001", "col001", "fig-000001"
    // We want the fig_num field which is the BrickLink-style ID
    const figNums = rows
      .map(r => r.fig_num || r.Fig_Num || '')
      .filter(n => n && n.length > 2)
      .map(n => n.toLowerCase());

    results.minifigs = { total: rows.length, filtered: figNums.length };

    if (!dryRun && figNums.length > 0) {
      let inserted = 0;
      for (let i = 0; i < figNums.length; i += 5000) {
        const batch = figNums.slice(i, i + 5000).map(part_num => ({ part_num, type: 'minifig' }));
        const { error } = await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: true });
        if (!error) inserted += batch.length;
      }
      results.minifigs.inserted = inserted;
    }
  }

  return Response.json({
    success: true,
    dryRun,
    type,
    results,
    note: dryRun ? 'Run without ?dry=true to actually import' : 'Import complete',
  });
}