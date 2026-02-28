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

// Search eBay sold listings for a specific set number
async function searchBySetNumber(setNumber, categoryName, token) {
  // Build a tight query: set number + category keyword
  const categoryKeyword = {
    'LEGO': 'LEGO',
    'Mega Construx': 'Mega Construx',
    'Funko Pop': 'Funko Pop',
  }[categoryName] || categoryName;

  const query = `${setNumber} ${categoryKeyword}`;

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

function parseItem(item, setId, setNumber) {
  const price = parseFloat(item?.price?.value || 0);
  if (price <= 0 || price > 5000) return null;

  const title = (item?.title || '').toLowerCase();

  // Skip junk listings
  const skipKeywords = ['lot of', 'bundle', 'parts only', 'instructions only', 'incomplete', 'custom', 'minifig only', 'minifigure only', 'pieces only'];
  if (skipKeywords.some(kw => title.includes(kw))) return null;

  // Make sure the set number actually appears in the title for confidence
  if (setNumber && !title.includes(setNumber.toLowerCase())) return null;

  // Parse condition
  const conditionId = item?.conditionId || '';
  const conditionText = (item?.condition || '').toLowerCase();
  let condition = 'Unknown';
  if (conditionId === '1000' || conditionText.includes('new')) condition = 'New Sealed';
  else if (conditionId === '1500' || conditionText.includes('open') || conditionText.includes('like new')) condition = 'Open Box';
  else if (['2000', '2500', '3000'].includes(conditionId) || conditionText.includes('used')) condition = 'Used';

  return {
    set_id: setId,
    sale_price: price,
    sale_date: new Date().toISOString().split('T')[0],
    condition,
    listing_title: (item?.title || '').substring(0, 255),
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

    const vals = prices.map(p => parseFloat(p.sale_price)).sort((a, b) => a - b);
    const trim = Math.floor(vals.length * 0.1);
    const trimmed = vals.slice(trim, vals.length - (trim || 1));
    const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

    const newPrices = prices.filter(p => p.condition === 'New Sealed').map(p => parseFloat(p.sale_price));
    const newAvg = newPrices.length ? newPrices.reduce((s, v) => s + v, 0) / newPrices.length : null;

    await supabase.from('sets').update({
      avg_sale_price: Math.round(avg * 100) / 100,
      new_avg_price: newAvg ? Math.round(newAvg * 100) / 100 : null,
      last_price_update: new Date().toISOString(),
      total_sales: prices.length,
    }).eq('id', setId);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });

  // Token debug
  if (searchParams.get('token') === 'true') {
    const result = await getEbayToken();
    return Response.json({ tokenReceived: !!result.token, error: result.error || null });
  }

  // Get fresh token every run — tokens last 2hrs, no need to cache
  const tokenResult = await getEbayToken();
  if (tokenResult.error) {
    return Response.json({ error: 'eBay token failed', detail: tokenResult.error }, { status: 500 });
  }
  const token = tokenResult.token;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch sets that have a set number — only these can be searched accurately
  const { data: allSets, error: setsError } = await supabase
    .from('sets')
    .select('id, name, category, theme, set_number')
    .not('set_number', 'is', null)
    .neq('set_number', '')
    .neq('set_number', '—')
    .order('last_price_update', { ascending: true, nullsFirst: true }) // prioritize stale sets

  if (setsError || !allSets?.length) {
    return Response.json({ error: 'No sets with set numbers found' }, { status: 500 });
  }

  // Batch: process N sets per run
  const batchSize = parseInt(searchParams.get('size') || '20')
  const batch = parseInt(searchParams.get('batch') || '0');
  const setsToProcess = allSets.slice(batch * batchSize, (batch + 1) * batchSize);
  const isLastBatch = (batch + 1) * batchSize >= allSets.length;

  if (setsToProcess.length === 0) {
    return Response.json({ done: true, message: 'All sets processed' });
  }

  let totalSaved = 0;
  const updatedSetIds = [];
  const log = [];

  for (const set of setsToProcess) {
    const result = await searchBySetNumber(set.set_number, set.category, token);

    if (result.error) {
      log.push({ set: set.name, setNumber: set.set_number, error: result.error });
      await sleep(500);
      continue;
    }

    const prices = [];
    for (const item of result.items) {
      const price = parseItem(item, set.id, set.set_number);
      if (price) prices.push(price);
    }

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
    });

    await sleep(300); // be nice to eBay API
  }

  // Update avg prices for all sets we got data for
  if (updatedSetIds.length > 0) {
    await updateAverages(supabase, updatedSetIds);
  }

  return Response.json({
    success: true,
    batch,
    batchSize,
    totalSetsWithNumbers: allSets.length,
    setsProcessed: setsToProcess.length,
    pricesSaved: totalSaved,
    setsUpdated: updatedSetIds.length,
    isLastBatch,
    nextBatch: isLastBatch ? null : `${request.url.split('?')[0]}?batch=${batch + 1}&size=${batchSize}`,
    log,
    timestamp: new Date().toISOString(),
  });
}