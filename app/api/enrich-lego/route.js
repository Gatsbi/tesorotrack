// app/api/enrich-lego/route.js
import { createClient } from '@supabase/supabase-js';

const BRICKSET_KEY = '3-zAMp-E9Gv-vet3W';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchBricksetTheme(theme, pageNumber = 1) {
  const params = new URLSearchParams({
    apiKey: BRICKSET_KEY,
    userHash: '',
    params: JSON.stringify({ theme, pageSize: 500, pageNumber, extendedData: true }),
  });
  const res = await fetch(
    `https://brickset.com/api/v3.asmx/getSets?${params}`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`Brickset HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`Brickset: ${data.message}`);
  return { sets: data.sets || [], total: data.matches || 0 };
}

async function enrichTheme(supabase, currentTheme) {
  // Get all our sets for this theme that need enrichment
  const { data: ourSets } = await supabase
    .from('sets')
    .select('id, name, set_number, retail_price, is_retired, year_retired, piece_count')
    .eq('category', 'LEGO')
    .eq('theme', currentTheme)
    .is('retail_price', null);

  if (!ourSets?.length) {
    return { theme: currentTheme, skipped: true, reason: 'All sets already enriched' };
  }

  // Fetch all Brickset data for this theme
  let bricksetSets = [];
  try {
    const page1 = await fetchBricksetTheme(currentTheme);
    bricksetSets = page1.sets;
    if (page1.total > 500) {
      const pages = Math.ceil(page1.total / 500);
      for (let p = 2; p <= Math.min(pages, 4); p++) {
        await sleep(600);
        const pageN = await fetchBricksetTheme(currentTheme, p);
        bricksetSets.push(...pageN.sets);
      }
    }
  } catch (e) {
    return { theme: currentTheme, error: e.message };
  }

  // Build lookup map by set number
  const bricksetMap = {};
  bricksetSets.forEach(bs => {
    if (bs.number) bricksetMap[bs.number] = bs;
    if (bs.number && bs.numberVariant) {
      bricksetMap[`${bs.number}-${bs.numberVariant}`] = bs;
    }
  });

  // Build updates
  const updates = [];
  let notFound = 0;

  for (const set of ourSets) {
    const setNum = set.set_number || '';
    const bsSet = bricksetMap[setNum] ||
      bricksetMap[setNum.replace(/-\d+$/, '')] ||
      bricksetSets.find(bs => bs.name?.toLowerCase() === set.name?.toLowerCase());

    if (!bsSet) { notFound++; continue; }

    const update = {};
    const price = bsSet.LEGOCom?.US?.retailPrice || bsSet.USRetailPrice;
    if (price && price > 0) update.retail_price = price;

    const retireDate = bsSet.LEGOCom?.US?.dateLastAvailable;
    const isRetired = bsSet.availability === 'Retired' ||
      (retireDate && new Date(retireDate) < new Date());

    if (isRetired) {
      update.is_retired = true;
      if (retireDate) update.year_retired = new Date(retireDate).getFullYear();
    } else if (bsSet.availability === 'Available') {
      update.is_retired = false;
    }

    if (!set.piece_count && bsSet.pieces) update.piece_count = bsSet.pieces;

    if (Object.keys(update).length > 0) updates.push({ id: set.id, ...update });
    else notFound++;
  }

  // Apply updates
  for (const u of updates) {
    const { id, ...fields } = u;
    await supabase.from('sets').update(fields).eq('id', id);
    await sleep(50); // small delay to avoid supabase rate limits
  }

  return {
    theme: currentTheme,
    processed: ourSets.length,
    updated: updates.length,
    notFound,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get('theme');
  const allThemes = searchParams.get('all') === 'true';

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  if (!theme && !allThemes) {
    return Response.json({
      usage: [
        'Enrich one theme: /api/enrich-lego?theme=Star+Wars',
        'Enrich all at once: /api/enrich-lego?all=true (may timeout - use per-theme instead)',
      ],
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (allThemes) {
    // Get all distinct themes that still need enrichment
    const { data } = await supabase
      .from('sets')
      .select('theme')
      .eq('category', 'LEGO')
      .is('retail_price', null);

    const themes = [...new Set(data?.map(s => s.theme).filter(Boolean))].sort();

    // Only process first 3 themes per call to avoid timeout
    const batch = themes.slice(0, 3);
    const remaining = themes.slice(3);

    const results = [];
    for (const t of batch) {
      const result = await enrichTheme(supabase, t);
      results.push(result);
      await sleep(500);
    }

    const { count: stillMissing } = await supabase
      .from('sets')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'LEGO')
      .is('retail_price', null);

    return Response.json({
      success: true,
      processedThemes: batch,
      remainingThemes: remaining,
      results,
      stillMissing,
      nextCall: remaining.length > 0
        ? `${request.url.split('?')[0]}?all=true`
        : null,
      done: remaining.length === 0,
    });
  }

  // Single theme
  const result = await enrichTheme(supabase, theme);

  const { count: remaining } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'LEGO')
    .eq('theme', theme)
    .is('retail_price', null);

  return Response.json({
    success: true,
    ...result,
    remainingInTheme: remaining,
  });
}