// app/api/enrich-lego/route.js
import { createClient } from '@supabase/supabase-js';

const BRICKSET_KEY = '3-zAMp-E9Gv-vet3W';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchBricksetSets(theme, pageNumber = 1) {
  const params = new URLSearchParams({
    apiKey: BRICKSET_KEY,
    userHash: '',
    params: JSON.stringify({
      theme,
      pageSize: 500,
      pageNumber,
      extendedData: true,
    }),
  });

  const res = await fetch(
    `https://brickset.com/api/v3.asmx/getSets?${params}`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Brickset HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`Brickset error: ${data.message}`);
  return data.sets || [];
}

async function fetchBricksetByNumber(setNumber) {
  const params = new URLSearchParams({
    apiKey: BRICKSET_KEY,
    userHash: '',
    params: JSON.stringify({
      setNumber,
      extendedData: true,
    }),
  });

  const res = await fetch(
    `https://brickset.com/api/v3.asmx/getSets?${params}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.sets?.[0] || null;
}

function parseRetirementYear(set) {
  // Brickset provides dateLastAvailable or year + availability
  if (set.availability === 'Retired') {
    const lastAvail = set.lastUpdated || set.dateLastAvailable;
    if (lastAvail) {
      const year = new Date(lastAvail).getFullYear();
      if (year > 2000 && year <= new Date().getFullYear()) return year;
    }
    // Estimate: sets typically retire 2-3 years after release
    if (set.year) return set.year + 2;
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get('theme');
  const offset = parseInt(searchParams.get('offset') || '0');
  const batchSize = parseInt(searchParams.get('batch') || '50');
  const testMode = searchParams.get('test') === 'true';

  if (!theme) {
    return Response.json({
      usage: [
        'Enrich one theme: /api/enrich-lego?theme=Star+Wars',
        'With offset: /api/enrich-lego?theme=Star+Wars&offset=100',
        'Test mode: /api/enrich-lego?theme=Star+Wars&test=true',
      ],
    });
  }

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get our sets for this theme that need enrichment
  const { data: ourSets, error } = await supabase
    .from('sets')
    .select('id, name, set_number, retail_price, is_retired, year_retired')
    .eq('category', 'LEGO')
    .eq('theme', theme)
    .is('retail_price', null)
    .range(offset, offset + batchSize - 1);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!ourSets?.length) {
    return Response.json({
      done: true,
      message: `No sets needing enrichment for theme: ${theme}`,
      theme,
    });
  }

  if (testMode) {
    return Response.json({
      test: true,
      theme,
      setsToEnrich: ourSets.length,
      sample: ourSets.slice(0, 5).map(s => ({ name: s.name, set_number: s.set_number })),
    });
  }

  // Fetch all Brickset data for this theme at once
  let bricksetSets = [];
  try {
    bricksetSets = await fetchBricksetSets(theme);
    await sleep(500);
    // If there are more pages, fetch them
    if (bricksetSets.length === 500) {
      const page2 = await fetchBricksetSets(theme, 2);
      bricksetSets.push(...page2);
    }
  } catch (e) {
    return Response.json({ error: `Brickset fetch failed: ${e.message}` }, { status: 500 });
  }

  // Build lookup map by set number (Brickset uses format like "75192-1")
  const bricksetMap = {};
  bricksetSets.forEach(bs => {
    // Store by base set number (without -1 suffix)
    const base = bs.number || '';
    bricksetMap[base] = bs;
    // Also store with full number
    if (bs.numberVariant) {
      bricksetMap[`${base}-${bs.numberVariant}`] = bs;
    }
  });

  let updated = 0;
  let notFound = 0;
  const log = [];

  for (const set of ourSets) {
    // Try to find matching Brickset entry
    const setNum = set.set_number || '';
    const bsSet = bricksetMap[setNum] ||
      bricksetMap[setNum.replace(/-\d+$/, '')] ||
      bricksetSets.find(bs =>
        bs.name?.toLowerCase() === set.name?.toLowerCase()
      );

    if (!bsSet) {
      notFound++;
      continue;
    }

    const updates = {};

    // Retail price
    const price = bsSet.LEGOCom?.US?.retailPrice || bsSet.USRetailPrice;
    if (price && price > 0) updates.retail_price = price;

    // Retirement status
    const isRetired = bsSet.availability === 'Retired' ||
      (bsSet.LEGOCom?.US?.dateLastAvailable && new Date(bsSet.LEGOCom.US.dateLastAvailable) < new Date());
    if (isRetired) {
      updates.is_retired = true;
      // Try to get retirement year
      const retireDate = bsSet.LEGOCom?.US?.dateLastAvailable;
      if (retireDate) {
        updates.year_retired = new Date(retireDate).getFullYear();
      }
    } else if (bsSet.availability === 'Available' || bsSet.availability === '{Not specified}') {
      updates.is_retired = false;
    }

    // Piece count if missing
    if (!set.piece_count && bsSet.pieces) {
      updates.piece_count = bsSet.pieces;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('sets')
        .update(updates)
        .eq('id', set.id);

      if (!updateError) {
        updated++;
        if (log.length < 10) {
          log.push({
            name: set.name,
            set_number: setNum,
            updates,
          });
        }
      }
    } else {
      notFound++;
    }
  }

  // Check how many still need enrichment
  const { count: remaining } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'LEGO')
    .eq('theme', theme)
    .is('retail_price', null);

  const nextOffset = offset + batchSize;
  const hasMore = ourSets.length === batchSize;

  return Response.json({
    success: true,
    theme,
    offset,
    processed: ourSets.length,
    updated,
    notFound,
    remaining,
    nextBatch: hasMore
      ? `${request.url.split('?')[0]}?theme=${encodeURIComponent(theme)}&offset=${nextOffset}`
      : null,
    sampleUpdates: log,
  });
}