import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EBAY_CLIENT_ID = process.env.EBAY_APP_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

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

async function getEbayToken() {
  // Use URLSearchParams for body — identical to how curl -d encodes it
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('scope', 'https://api.ebay.com/oauth/api_scope');

  // Use pre-encoded b64 env var if set, otherwise encode at runtime
  const b64 = process.env.EBAY_CREDENTIALS_B64 ||
    Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');

  let res, text;
  try {
    res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${b64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });
    text = await res.text();
  } catch (e) {
    return { error: `Fetch failed: ${e.message}` };
  }

  let data;
  try { data = JSON.parse(text); }
  catch (e) { return { error: `Non-JSON from eBay: ${text.substring(0, 300)}` }; }

  if (!res.ok || !data.access_token) {
    return {
      error: data.error_description || data.error || 'Unknown error',
      status: res.status,
      fullResponse: data,
    };
  }
  return { token: data.access_token, expiresIn: data.expires_in };
}

async function searchEbaySold(query, token) {
  const params = new URLSearchParams({
    q: query,
    filter: 'buyingOptions:{FIXED_PRICE}',
    limit: '100',
    sort: 'newlyListed',
  });

  let res;
  try {
    res = await fetch(
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
  } catch (e) {
    return { error: `Search fetch failed: ${e.message}` };
  }

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Browse API ${res.status}: ${errText.substring(0, 300)}` };
  }

  const data = await res.json();
  return { success: true, total: data.total || 0, items: data.itemSummaries || [] };
}

function matchToSet(title, sets, group) {
  const t = title.toLowerCase();
  const groupSets = sets.filter(s => s.category === group.category && s.theme === group.theme);

  for (const set of groupSets) {
    if (set.set_number && set.set_number !== '—' && t.includes(set.set_number.toLowerCase())) return set;
  }
  for (const set of groupSets) {
    const words = set.name.toLowerCase()
      .replace(/funko pop!?|mega construx|mega bloks|lego/gi, '').trim()
      .split(' ').filter(w => w.length > 3);
    if (words.filter(w => t.includes(w)).length >= 2) return set;
  }
  return null;
}

function parseBrowseItem(item, setId) {
  const price = parseFloat(item?.price?.value || 0);
  if (price <= 0 || price > 2000) return null;

  const title = (item?.title || '').toLowerCase();
  if (['lot of', 'bundle', 'parts only', 'instructions only', 'incomplete', 'custom'].some(kw => title.includes(kw))) return null;

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Token debug — runs first, before any validation
  if (searchParams.get('token') === 'true') {
    const b64 = process.env.EBAY_CREDENTIALS_B64 ||
      (EBAY_CLIENT_ID && EBAY_CLIENT_SECRET
        ? Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
        : null);

    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('scope', 'https://api.ebay.com/oauth/api_scope');

    let tokenAttempt = null;
    if (b64) {
      try {
        const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${b64}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: body.toString(),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { data = { raw: text.substring(0, 200) }; }
        tokenAttempt = { status: res.status, response: data, tokenReceived: !!data.access_token };
      } catch (e) {
        tokenAttempt = { error: e.message };
      }
    }

    return Response.json({
      envVars: {
        EBAY_APP_ID_set: !!EBAY_CLIENT_ID,
        EBAY_APP_ID_length: EBAY_CLIENT_ID?.length || 0,
        EBAY_CLIENT_SECRET_set: !!EBAY_CLIENT_SECRET,
        EBAY_CLIENT_SECRET_length: EBAY_CLIENT_SECRET?.length || 0,
        EBAY_CREDENTIALS_B64_set: !!process.env.EBAY_CREDENTIALS_B64,
        EBAY_CREDENTIALS_B64_length: process.env.EBAY_CREDENTIALS_B64?.length || 0,
        SUPABASE_SERVICE_KEY_set: !!SUPABASE_SERVICE_KEY,
        b64_used: b64 ? `${b64.substring(0, 20)}...` : null,
        b64_length: b64?.length || 0,
      },
      tokenAttempt,
    });
  }

  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });

  // Use hardcoded token if available (2hr expiry), otherwise get via OAuth
  let token;
  if (process.env.EBAY_ACCESS_TOKEN) {
    token = process.env.EBAY_ACCESS_TOKEN;
  } else {
    const tokenResult = await getEbayToken();
    if (tokenResult.error) {
      return Response.json({
        error: 'eBay token failed - set EBAY_ACCESS_TOKEN env var as fallback',
        detail: tokenResult.error,
      }, { status: 500 });
    }
    token = tokenResult.token;
  }

  if (searchParams.get('debug') === 'true') {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: sets } = await supabase.from('sets').select('id, name, category, theme, set_number');
    const testGroup = SEARCH_GROUPS[0];
    const searchResult = await searchEbaySold(testGroup.query, token);

    let matchResults = [];
    if (searchResult.items?.length > 0) {
      for (const item of searchResult.items.slice(0, 5)) {
        const matched = matchToSet(item.title, sets, testGroup);
        matchResults.push({ title: item.title, price: item?.price?.value, condition: item?.condition, matched: matched?.name || null });
      }
    }

    return Response.json({
      debug: true,
      tokenOk: true,
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

  // Normal batch run
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: sets } = await supabase.from('sets').select('id, name, category, theme, set_number');
  if (!sets?.length) return Response.json({ error: 'No sets in database' }, { status: 500 });

  const batch = parseInt(searchParams.get('batch') || '0');
  const batchSize = 8;
  const groupsToProcess = SEARCH_GROUPS.slice(batch * batchSize, (batch + 1) * batchSize);
  const isLastBatch = (batch + 1) * batchSize >= SEARCH_GROUPS.length;

  if (groupsToProcess.length === 0) return Response.json({ done: true });

  let totalSaved = 0;
  const updatedSetIds = new Set();
  const groupLog = [];

  for (const group of groupsToProcess) {
    const searchResult = await searchEbaySold(group.query, token);
    if (searchResult.error) { groupLog.push({ group: group.query, error: searchResult.error }); continue; }

    const prices = [];
    for (const item of searchResult.items) {
      const set = matchToSet(item.title, sets, group);
      if (!set) continue;
      const price = parseBrowseItem(item, set.id);
      if (price) { prices.push(price); updatedSetIds.add(set.id); }
    }

    if (prices.length > 0) {
      const { error } = await supabase.from('prices').upsert(prices, { onConflict: 'ebay_item_id', ignoreDuplicates: true });
      if (!error) totalSaved += prices.length;
    }

    groupLog.push({ group: group.query, ebayItems: searchResult.items.length, matched: prices.length });
    await sleep(300);
  }

  await updateAverages(supabase, [...updatedSetIds]);

  return Response.json({
    success: true, batch,
    groupsProcessed: groupsToProcess.length,
    pricesSaved: totalSaved,
    setsUpdated: updatedSetIds.size,
    groupLog,
    nextBatch: isLastBatch ? null : `${request.url.split('?')[0]}?batch=${batch + 1}`,
    isLastBatch,
    timestamp: new Date().toISOString(),
  });
}