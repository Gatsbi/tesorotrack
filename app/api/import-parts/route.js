import { createClient } from '@supabase/supabase-js';
import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'both'; // parts | minifigs | both
  const dryRun = searchParams.get('dry') === 'true';

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'No service key' }, { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results = {};

  // Process parts — ALL parts, no filtering
  if (type === 'parts' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.parts);

    // Keep all valid part numbers and their names/categories
    const parts = rows
      .filter(r => (r.part_num || r.Part_Num || '').trim())
      .map(r => ({
        part_num: (r.part_num || r.Part_Num || '').trim().toLowerCase(),
        name: (r.name || r.Name || '').trim().substring(0, 255),
        part_cat_id: parseInt(r.part_cat_id || r.Part_Cat_Id || '0') || null,
        type: 'part',
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

  // Process minifigs — ALL minifigs
  if (type === 'minifigs' || type === 'both') {
    const rows = await downloadAndParse(DOWNLOADS.minifigs);

    const minifigs = rows
      .filter(r => (r.fig_num || r.Fig_Num || '').trim())
      .map(r => ({
        part_num: (r.fig_num || r.Fig_Num || '').trim().toLowerCase(),
        name: (r.name || r.Name || '').trim().substring(0, 255),
        part_cat_id: null,
        type: 'minifig',
      }));

    results.minifigs = { total: rows.length, toInsert: minifigs.length };

    if (!dryRun && minifigs.length > 0) {
      let inserted = 0;
      for (let i = 0; i < minifigs.length; i += 5000) {
        const batch = minifigs.slice(i, i + 5000);
        const { error } = await supabase
          .from('lego_parts')
          .upsert(batch, { onConflict: 'part_num', ignoreDuplicates: false });
        if (!error) inserted += batch.length;
        else results.minifigs.lastError = error.message;
      }
      results.minifigs.inserted = inserted;
    }
  }

  return Response.json({
    success: true,
    dryRun,
    type,
    results,
    note: dryRun ? 'Run without ?dry=true to import' : 'Import complete',
  });
}