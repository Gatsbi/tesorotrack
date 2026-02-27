import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EBAY_CLIENT_ID = process.env.EBAY_APP_ID; // Same App ID you already have
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET; // Cert ID (Client Secret)

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SEARCH_GROUPS = [
  { query: 'Mega Construx Halo', category: 'Mega Construx', theme: 'Halo' },
  { query: 'Mega Construx Pokemon', category: 'Mega Construx', theme: 'Pokémon' },
  { query: 'Mega Construx Call of Duty', category: 'Mega Construx', theme: 'Call of Duty' },
  { query: 'Mega Construx Masters of the Universe', category: 'Mega Construx', theme: 'Masters of the Universe' },
  { query: 'Mega Construx Destiny', category: 'Mega Construx', theme: 'Destiny' },
  { query: 'Mega Bloks Dragons', category: 'Mega Construx', theme: 'Dragons' },
  { query: 'Mega Construx Probuilder', category: 'Mega Construx', theme: 'Probuilder' },
  { query: 'Mega Bloks Assassins Creed', category: 'Mega Construx', theme: 'Assassins Creed' },
  { query: 'Mega Bloks Skylanders', category: 'Mega Construx', theme: 'Skylanders' },
  { query: 'Mega Bloks Halo', category: 'Mega Construx', theme: 'Halo' },
  { query: 'Funko Pop Marvel', category: 'Funko Pop', theme: 'Marvel' },
  { query: 'Funko Pop Star Wars', category: 'Funko Pop', theme: 'Star Wars' },
  { query: 'Funko Pop Harry Potter', category: 'Funko Pop', theme: 'Harry Potter' },
  { query: 'Funko Pop Disney', category: 'Funko Pop', theme: 'Disney' },
  { query: 'Funko Pop DC Comics', category: 'Funko Pop', theme: 'DC' },
  { query: 'Funko Pop Stranger Things', category: 'Funko Pop', theme: 'Stranger Things' },
  { query: 'Funko Pop Dragon Ball Z', category: 'Funko Pop', theme: 'Dragon Ball Z' },
  { query: 'Funko Pop Naruto', category: 'Funko Pop', theme: 'Naruto' },
  { query: 'Funko Pop My Hero Academia', category: 'Funko Pop', theme: 'My Hero Academia' },
  { query: 'Funko Pop Demon Slayer', category: 'Funko Pop', theme: 'Demon Slayer' },
  { query: 'LEGO Icons', category: 'LEGO', theme: 'Icons' },
  { query: 'LEGO Technic', category: 'LEGO', theme: 'Technic' },
  { query: 'LEGO Star Wars', category: 'LEGO', theme: 'Star Wars' },
  { query: 'LEGO Harry Potter', category: 'LEGO', theme: 'Harry Potter' },
  { query: 'LEGO Ideas', category: 'LEGO', theme: 'Ideas' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// STEP 1: Get OAuth token using Client Credentials flow
// No user login needed — server-to-server auth
// ============================================================
async function getEbayToken() {
  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    
    if (!res.ok || !data.access_token) {
      return { error: `Token error: ${data.error_description || data.error || JSON.stringify(data)}` };
    }
    
    return { token: data.access_token, expiresIn: data.expires_in };
  } catch (e) {
    return { error: `Token fetch failed: ${e.message}` };
  }
}

// ============================================================
// STEP 2: Search eBay sold items using Browse API
// Uses the buy/browse endpoint with filter for sold items
// ============================================================
async function searchEbaySold(query, token) {
  const params = new URLSearchParams({
    q: query,
    filter: 'buyingOptions:{FIXED_PRICE},conditions:{USED|NEW},priceCurrency:USD',
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
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Browse API error ${res.status}: ${errText.substring(0, 300)}` };
    }

    const data = await res.json();
    return {
      success: true,
      total: data.total || 0,
      items: data.itemSummaries || [],
    };
  } catch (e) {
    return { error: `Search failed: ${e.message}` };
  }
}

// ============================================================
// MATCH item title to a set in our database
// ============================================================
function matchToSet(title, sets, group) {
  const t = title.toLowerCase();
  const groupSets = sets.filter(s => s.category === group.category && s.theme === group.theme);

  // Try set number match first
  for (const set of groupSets) {
    if (set.set_number && set.set_number !== '—' && t.includes(set.set_number.toLowerCase())) {
      return set;
    }
  }

  // Try name keyword match
  for (const set of groupSets) {
    const words = set.name.toLowerCase()
      .replace(/funko pop!?|mega construx|mega bloks|lego/gi, '').trim()
      .split(' ').filter(w => w.length > 3);
    const matchCount = words.filter(w => t.includes(w)).length;
    if (matchCount >= 2) return set;
  }

  return null;
}

// ============================================================
// PARSE Browse API item into a price record
// Browse API has different field names than Finding API
// ============================================================
function parseBrowseItem(item, setId) {
  const price = parseFloat(item?.price?.value || 0);
  if (price <= 0 || price > 2000) return null;

  const title = (item?.title || '').toLowerCase();
  const skip = ['lot of', 'bundle', 'parts only', 'instructions only', 'incomplete', 'custom', 'read desc'];
  if (skip.some(kw => title.includes(kw))) return null;

  // Condition from Browse API
  const conditionId = item?.conditionId || '';
  const conditionText = (item?.condition || '').toLowerCase();
  let condition = 'Unknown';
  if (conditionId === '1000' || conditionText.includes('new')) condition = 'New Sealed';
  else if (conditionId === '1500' || conditionText.includes('open')) condition = 'Open Box';
  else if (['2000', '2500', '3000'].includes(conditionId) || conditionText.includes('used')) condition = 'Used';
  else if (conditionText.includes('like new')) condition = 'Open Box';

  return {
    set_id: setId,
    sale_price: price,
    sale_date: new Date().toISOString().split('T')[0],
    condition,
    listing_title: (item?.title || '').substring(0, 255),
    ebay_item_id: item?.itemId?.replace(/\|/g, '_') || null,
    source: 'ebay',
  };
}

// ============================================================
// UPDATE avg_sale_price on sets table
// ============================================================
async function updateAverages(supabase, setIds) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  for (const setId of setIds) {
    const { data: prices } = await supabase
      .from('prices').select('sale_price, condition')
      .eq('set_id', setId).gte('sale_date', cutoffStr);

    if (!prices?.length) continue;

    const sorted = prices.map(p => p.sale_price).sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.1);
    const trimmed = sorted.slice(trim, sorted.length - (trim || 1));
    const avg = trimmed.reduce((s, p) => s + p, 0) / trimmed.length;

    const newPrices = prices.filter(p => p.condition === 'New Sealed').map(p => p.sale_price);
    const newAvg = newPrices.length ? newPrices.reduce((s, p) => s + p, 0) / newPrices.length : null;

    await supabase.from('sets').update({
      avg_sale_price: Math.round(avg * 100) / 100,
      new_avg_price: newAvg ? Math.round(newAvg * 100) / 100 : null,
      last_price_update: new Date().toISOString(),
      total_sales: prices.length,
    }).eq('id', setId);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function GET(request) {
  if (!EBAY_CLIENT_ID) return Response.json({ error: 'EBAY_APP_ID not set' }, { status: 500 });
  if (!EBAY_CLIENT_SECRET) return Response.json({ error: 'EBAY_CLIENT_SECRET not set' }, { status: 500 });
  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';

  // Step 1: Get OAuth token
  const tokenResult = await getEbayToken();
  if (tokenResult.error) {
    return Response.json({ 
      error: 'Failed to get eBay token', 
      detail: tokenResult.error,
      hint: 'Check EBAY_APP_ID and EBAY_CLIENT_SECRET env vars',
    }, { status: 500 });
  }

  const token = tokenResult.token;

  // Debug mode: test one search and return diagnostics
  if (debug) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: sets } = await supabase.from('sets').select('id, name, category, theme, set_number');
    
    const testGroup = SEARCH_GROUPS[0];
    const searchResult = await searchEbaySold(testGroup.query, token);

    let matchResults = [];
    if (searchResult.items?.length > 0) {
      for (const item of searchResult.items.slice(0, 5)) {
        const matched = matchToSet(item.title, sets, testGroup);
        matchResults.push({
          title: item.title,
          price: item?.price?.value,
          condition: item?.condition,
          matched: matched?.name || null,
        });
      }
    }

    return Response.json({
      debug: true,
      tokenOk: true,
      tokenExpiresIn: tokenResult.expiresIn,
      setsInDb: sets?.length || 0,
      testGroup: testGroup.query,
      ebayResult: searchResult.error ? searchResult : {
        total: searchResult.total,
        itemsReturned: searchResult.items?.length,
        sampleTitle: searchResult.items?.[0]?.title || 'no items',
      },
      matchResults,
    });
  }

  // Normal batch processing
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: sets } = await supabase.from('sets').select('id, name, category, theme, set_number');
  if (!sets?.length) return Response.json({ error: 'No sets in database' }, { status: 500 });

  const batch = parseInt(searchParams.get('batch') || '0');
  const batchSize = 8;
  const groupsToProcess = SEARCH_GROUPS.slice(batch * batchSize, (batch + 1) * batchSize);
  const isLastBatch = (batch + 1) * batchSize >= SEARCH_GROUPS.length;

  if (groupsToProcess.length === 0) {
    return Response.json({ done: true, message: 'All groups processed' });
  }

  let totalSaved = 0;
  const updatedSetIds = new Set();
  const groupLog = [];

  for (const group of groupsToProcess) {
    const searchResult = await searchEbaySold(group.query, token);

    if (searchResult.error) {
      groupLog.push({ group: group.query, error: searchResult.error });
      await sleep(500);
      continue;
    }

    const prices = [];
    for (const item of searchResult.items) {
      const set = matchToSet(item.title, sets, group);
      if (!set) continue;
      const price = parseBrowseItem(item, set.id);
      if (price) { prices.push(price); updatedSetIds.add(set.id); }
    }

    if (prices.length > 0) {
      const { error } = await supabase
        .from('prices')
        .upsert(prices, { onConflict: 'ebay_item_id', ignoreDuplicates: true });
      if (!error) totalSaved += prices.length;
    }

    groupLog.push({
      group: group.query,
      ebayItems: searchResult.items.length,
      matched: prices.length,
    });

    await sleep(300);
  }

  await updateAverages(supabase, [...updatedSetIds]);

  return Response.json({
    success: true,
    batch,
    groupsProcessed: groupsToProcess.length,
    pricesSaved: totalSaved,
    setsUpdated: updatedSetIds.size,
    groupLog,
    nextBatch: isLastBatch ? null : `${request.url.split('?')[0]}?batch=${batch + 1}`,
    isLastBatch,
    timestamp: new Date().toISOString(),
  });
}