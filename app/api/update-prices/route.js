import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EBAY_CLIENT_ID = process.env.EBAY_APP_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getEbayToken() {
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('scope', 'https://api.ebay.com/oauth/api_scope');
  const b64 = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  try {
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${b64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return { error: data.error_description || 'Token failed' };
    return { token: data.access_token };
  } catch (e) {
    return { error: e.message };
  }
}

function buildQuery(set) {
  const categoryKeyword = {
    'LEGO': 'LEGO',
    'Mega': set.theme || 'Mega',
    'Funko Pop': 'Funko Pop',
  }[set.category] || set.category;
  return `"${set.set_number}" ${categoryKeyword}`;
}

async function searchBySetNumber(set, token) {
  const query = buildQuery(set);
  const params = new URLSearchParams({
    q: query,
    filter: 'conditions:{NEW|USED},buyingOptions:{FIXED_PRICE|AUCTION}',
    limit: '100',
    sort: 'newlyListed',
  });
  try {
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { error: `${res.status}: ${errText.substring(0, 200)}` };
    }
    const data = await res.json();
    return { items: data.itemSummaries || [], total: data.total || 0 };
  } catch (e) {
    return { error: e.message };
  }
}

function parseSaleDate(item) {
  const endDate = item?.itemEndDate || item?.itemCreationDate;
  if (endDate) {
    try { return new Date(endDate).toISOString().split('T')[0]; } catch (e) {}
  }
  return new Date().toISOString().split('T')[0];
}

// Find all set-number-like tokens in a title
// Matches: 4-6 digit numbers OR 2-3 uppercase letters + 2-3 digits (Mega Construx)
function findSetNumbersInTitle(title) {
  if (!title) return [];
  const matches = title.match(/\b([A-Z]{2,3}\d{2,3}|\d{4,6})\b/gi) || [];
  return matches;
}

function parseItem(item, setId, setNumber, category) {
  const price = parseFloat(item?.price?.value || 0);
  if (price <= 0 || price > 5000) return null;

  const title = item?.title || '';
  const titleLower = title.toLowerCase();

  // Skip accessories, add-ons, and unrelated items
  const skipKeywords = [
    'lot of', 'bundle', 'parts only', 'instructions only', 'incomplete',
    'custom', 'minifig only', 'minifigure only', 'pieces only',
    'light kit', 'led kit', 'led light', 'lighting kit', 'lights kit',
    'led kit for', 'light set for',
    'sticker', 'stickers', 'decal', 'decals',
    'compatible with', 'fits set', 'for set', 'designed for',
    'display case', 'display stand', 'frame',
    'bag', 'polybag',
    'instruction book', 'manual only',
    'replacement parts', 'spare parts',
    'mystery bag', 'blind bag',
  ];
  if (skipKeywords.some(kw => titleLower.includes(kw))) return null;

  // Require set number in title at a word boundary (not inside larger number/word)
  if (setNumber) {
    const escaped = setNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundary = new RegExp(`(?<![\\d A-Za-z])${escaped}(?![\\d A-Za-z])`, 'i');
    if (!wordBoundary.test(title)) return null;
  }

  // Reject listings containing MORE THAN ONE distinct set number
  // Catches "LEGO 75192 + 76440" bundles or "LEGO 75273 & 75274" combos
  if (setNumber) {
    const foundNumbers = findSetNumbersInTitle(title);
    const otherSetNumbers = foundNumbers.filter(n => n.toUpperCase() !== setNumber.toUpperCase());
    if (otherSetNumbers.length > 0) return null;
  }

  const conditionId = item?.conditionId || '';
  const conditionText = (item?.condition || '').toLowerCase();
  let condition = 'Unknown';
  if (conditionId === '1000' || conditionText.includes('new')) condition = 'New Sealed';
  else if (conditionId === '1500' || conditionText.includes('open') || conditionText.includes('like new')) condition = 'Open Box';
  else if (['2000', '2500', '3000'].includes(conditionId) || conditionText.includes('used')) condition = 'Used';

  return {
    set_id: setId,
    sale_price: price,
    sale_date: parseSaleDate(item),
    condition,
    listing_title: title.substring(0, 255),
    ebay_item_id: (item?.itemId || '').replace(/\|/g, '_'),
    source: 'ebay',
  };
}

async function updateAverages(supabase, setIds) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  for (const setId of setIds) {
    const { data: prices } = await supabase
      .from('prices')
      .select('sale_price, condition')
      .eq('set_id', setId)
      .gte('sale_date', cutoffStr);

    if (!prices?.length) continue;

    const newPrices = prices.filter(p => p.condition === 'New Sealed').map(p => parseFloat(p.sale_price));
    const usedPrices = prices.filter(p => ['Used', 'Open Box'].includes(p.condition)).map(p => parseFloat(p.sale_price));
    const allPrices = prices.map(p => parseFloat(p.sale_price)).sort((a, b) => a - b);

    const trim = Math.floor(allPrices.length * 0.1);
    const trimmed = allPrices.slice(trim, allPrices.length - (trim || 1));
    const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

    const newAvg = newPrices.length ? newPrices.reduce((s, v) => s + v, 0) / newPrices.length : null;
    const usedAvg = usedPrices.length ? usedPrices.reduce((s, v) => s + v, 0) / usedPrices.length : null;

    await supabase.from('sets').update({
      avg_sale_price: Math.round(avg * 100) / 100,
      new_avg_price: newAvg ? Math.round(newAvg * 100) / 100 : null,
      used_avg_price: usedAvg ? Math.round(usedAvg * 100) / 100 : null,
      last_price_update: new Date().toISOString(),
      total_sales: prices.length,
      new_sales_count: newPrices.length,
      used_sales_count: usedPrices.length,
    }).eq('id', setId);
  }
}

async function backfillSetImage(supabase, set, items) {
  // If set is missing an image, try to grab eBay thumbnail from first relevant listing
  if (set.image_url) return;
  for (const item of items) {
    const imgUrl = item?.image?.imageUrl || item?.thumbnailImages?.[0]?.imageUrl;
    if (imgUrl && imgUrl.startsWith('http')) {
      await supabase.from('sets').update({ image_url: imgUrl }).eq('id', set.id);
      set.image_url = imgUrl; // mark as filled so we don't do it again this run
      return;
    }
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });

  if (searchParams.get('token') === 'true') {
    const result = await getEbayToken();
    return Response.json({ tokenReceived: !!result.token, error: result.error || null });
  }

  const tokenResult = await getEbayToken();
  if (tokenResult.error) {
    return Response.json({ error: 'eBay token failed', detail: tokenResult.error }, { status: 500 });
  }
  const token = tokenResult.token;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const purge = searchParams.get('purge') === 'true';

  const { data: allSets, error: setsError } = await supabase
    .from('sets')
    .select('id, name, category, theme, set_number, image_url')
    .not('set_number', 'is', null)
    .neq('set_number', '')
    .neq('set_number', '—')
    .order('last_price_update', { ascending: true, nullsFirst: true });

  if (setsError || !allSets?.length) {
    return Response.json({ error: 'No sets with set numbers found' }, { status: 500 });
  }

  const batchSize = parseInt(searchParams.get('size') || '50');
  const batch = parseInt(searchParams.get('batch') || '0');
  const setsToProcess = allSets.slice(batch * batchSize, (batch + 1) * batchSize);
  const isLastBatch = (batch + 1) * batchSize >= allSets.length;

  if (setsToProcess.length === 0) {
    return Response.json({ done: true, message: 'All sets processed' });
  }

  let totalSaved = 0;
  let totalPurged = 0;
  let totalSkippedMultiSet = 0;
  const updatedSetIds = [];
  const log = [];

  for (const set of setsToProcess) {
    if (purge) {
      const { count } = await supabase
        .from('prices')
        .delete()
        .eq('set_id', set.id)
        .select('*', { count: 'exact', head: true });
      totalPurged += count || 0;
    }

    const result = await searchBySetNumber(set, token);

    if (result.error) {
      log.push({ set: set.name, setNumber: set.set_number, error: result.error });
      await sleep(500);
      continue;
    }

    // Backfill missing images from eBay thumbnails
    await backfillSetImage(supabase, set, result.items);

    const prices = [];
    let skippedMultiSet = 0;
    let skippedKeyword = 0;
    for (const item of result.items) {
      const price = parseItem(item, set.id, set.set_number, set.category);
      if (!price) {
        // Count multi-set skips separately for logging
        const foundNumbers = findSetNumbersInTitle(item?.title || '');
        const otherNums = foundNumbers.filter(n => n.toUpperCase() !== (set.set_number || '').toUpperCase());
        if (otherNums.length > 0) skippedMultiSet++;
        else skippedKeyword++;
      } else {
        prices.push(price);
      }
    }
    totalSkippedMultiSet += skippedMultiSet;

    if (prices.length > 0) {
      const { error: upsertError } = await supabase
        .from('prices')
        .upsert(prices, { onConflict: 'ebay_item_id', ignoreDuplicates: true });

      if (!upsertError) {
        totalSaved += prices.length;
        updatedSetIds.push(set.id);
      }
    }

    log.push({
      set: set.name,
      setNumber: set.set_number,
      ebayTotal: result.total,
      matched: prices.length,
      skippedMultiSet,
      skippedKeyword,
    });

    await sleep(300);
  }

  if (updatedSetIds.length > 0) {
    await updateAverages(supabase, updatedSetIds);
  }

  return Response.json({
    success: true,
    batch,
    batchSize,
    purge,
    totalPurged: purge ? totalPurged : undefined,
    totalSetsWithNumbers: allSets.length,
    setsProcessed: setsToProcess.length,
    pricesSaved: totalSaved,
    skippedMultiSetListings: totalSkippedMultiSet,
    setsUpdated: updatedSetIds.length,
    isLastBatch,
    nextBatch: isLastBatch ? null : `${request.url.split('?')[0]}?batch=${batch + 1}&size=${batchSize}${purge ? '&purge=true' : ''}`,
    log,
    timestamp: new Date().toISOString(),
  });
}