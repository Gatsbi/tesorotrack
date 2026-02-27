import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EBAY_APP_ID = process.env.EBAY_APP_ID;

// Set max duration for this route (Vercel Pro: 300s, Hobby: 60s)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SEARCH_GROUPS = [
  { query: 'Mega Construx Halo', category: 'Mega Construx', theme: 'Halo' },
  { query: 'Mega Construx Pokemon', category: 'Mega Construx', theme: 'Pokémon' },
  { query: 'Mega Construx Call of Duty', category: 'Mega Construx', theme: 'Call of Duty' },
  { query: 'Mega Construx Masters Universe', category: 'Mega Construx', theme: 'Masters of the Universe' },
  { query: 'Mega Construx Destiny', category: 'Mega Construx', theme: 'Destiny' },
  { query: 'Mega Bloks Dragons', category: 'Mega Construx', theme: 'Dragons' },
  { query: 'Mega Construx Probuilder', category: 'Mega Construx', theme: 'Probuilder' },
  { query: 'Mega Bloks Assassins Creed', category: 'Mega Construx', theme: 'Assassins Creed' },
  { query: 'Mega Bloks Skylanders', category: 'Mega Construx', theme: 'Skylanders' },
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
  { query: 'LEGO Icons Creator Expert', category: 'LEGO', theme: 'Icons' },
  { query: 'LEGO Technic', category: 'LEGO', theme: 'Technic' },
  { query: 'LEGO Star Wars', category: 'LEGO', theme: 'Star Wars' },
  { query: 'LEGO Harry Potter', category: 'LEGO', theme: 'Harry Potter' },
  { query: 'LEGO Ideas', category: 'LEGO', theme: 'Ideas' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchEbay(group) {
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': EBAY_APP_ID,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': group.query,
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'itemFilter(1).name': 'ListingType',
    'itemFilter(1).value': 'FixedPrice',
    'itemFilter(2).name': 'Currency',
    'itemFilter(2).value': 'USD',
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': '100',
  });

  try {
    const res = await fetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
      { signal: AbortSignal.timeout(8000) } // 8s timeout per eBay call
    );
    const data = await res.json();
    const result = data?.findCompletedItemsResponse?.[0];
    if (result?.ack?.[0] !== 'Success' && result?.ack?.[0] !== 'Warning') return [];
    return result?.searchResult?.[0]?.item || [];
  } catch (e) {
    console.error(`eBay error for ${group.query}:`, e.message);
    return [];
  }
}

function matchToSet(item, sets, group) {
  const title = (item?.title?.[0] || '').toLowerCase();
  const groupSets = sets.filter(s => s.category === group.category && s.theme === group.theme);

  for (const set of groupSets) {
    if (set.set_number && set.set_number !== '—' && title.includes(set.set_number.toLowerCase())) {
      return set;
    }
  }
  for (const set of groupSets) {
    const words = set.name.toLowerCase()
      .replace(/funko pop|mega construx|mega bloks|lego/gi, '').trim()
      .split(' ').filter(w => w.length > 3);
    if (words.filter(w => title.includes(w)).length >= 2) return set;
  }
  return null;
}

function parseListing(item, setId) {
  const price = parseFloat(item?.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0);
  if (price <= 0 || price > 2000) return null;

  const title = (item?.title?.[0] || '').toLowerCase();
  if (['lot of', 'bundle', 'parts only', 'instructions only', 'incomplete', 'custom'].some(kw => title.includes(kw))) return null;

  const condName = (item?.condition?.[0]?.conditionDisplayName?.[0] || '').toLowerCase();
  let condition = 'Unknown';
  if (condName.includes('new')) condition = 'New Sealed';
  else if (condName.includes('open') || condName.includes('like new')) condition = 'Open Box';
  else if (condName.includes('used')) condition = 'Used';

  const endDate = item?.listingInfo?.[0]?.endTime?.[0];
  const saleDate = endDate ? new Date(endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    set_id: setId,
    sale_price: price,
    sale_date: saleDate,
    condition,
    listing_title: (item?.title?.[0] || '').substring(0, 255),
    ebay_item_id: item?.itemId?.[0],
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
      .eq('set_id', setId).gte('sale_date', cutoffStr).eq('source', 'ebay');

    if (!prices?.length) continue;

    const sorted = prices.map(p => p.sale_price).sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.1);
    const trimmed = sorted.slice(trim, sorted.length - trim);
    const avg = trimmed.reduce((s, p) => s + p, 0) / trimmed.length;

    const newPrices = prices.filter(p => p.condition === 'New Sealed').map(p => p.sale_price);
    const newAvg = newPrices.length > 0 ? newPrices.reduce((s, p) => s + p, 0) / newPrices.length : null;

    await supabase.from('sets').update({
      avg_sale_price: Math.round(avg * 100) / 100,
      new_avg_price: newAvg ? Math.round(newAvg * 100) / 100 : null,
      last_price_update: new Date().toISOString(),
      total_sales: prices.length,
    }).eq('id', setId);
  }
}

export async function GET(request) {
  if (!EBAY_APP_ID) return Response.json({ error: 'EBAY_APP_ID not configured' }, { status: 500 });
  if (!SUPABASE_SERVICE_KEY) return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Check which group to process (supports pagination via ?batch=0, ?batch=1 etc)
  const { searchParams } = new URL(request.url);
  const batch = parseInt(searchParams.get('batch') || '0');
  const batchSize = 8; // Process 8 groups per call to stay under timeout
  const groupsToProcess = SEARCH_GROUPS.slice(batch * batchSize, (batch + 1) * batchSize);
  const isLastBatch = (batch + 1) * batchSize >= SEARCH_GROUPS.length;

  if (groupsToProcess.length === 0) {
    return Response.json({ done: true, message: 'All groups processed' });
  }

  const { data: sets } = await supabase.from('sets').select('id, name, category, theme, set_number');
  if (!sets?.length) return Response.json({ error: 'No sets in database' }, { status: 500 });

  let totalSaved = 0;
  const updatedSetIds = new Set();

  for (const group of groupsToProcess) {
    const items = await searchEbay(group);
    const prices = [];

    for (const item of items) {
      const set = matchToSet(item, sets, group);
      if (!set) continue;
      const price = parseListing(item, set.id);
      if (price) { prices.push(price); updatedSetIds.add(set.id); }
    }

    if (prices.length > 0) {
      const { error } = await supabase
        .from('prices')
        .upsert(prices, { onConflict: 'ebay_item_id', ignoreDuplicates: true });
      if (!error) totalSaved += prices.length;
    }

    await sleep(500); // Reduced to 500ms between calls
  }

  await updateAverages(supabase, [...updatedSetIds]);

  return Response.json({
    success: true,
    batch,
    groupsProcessed: groupsToProcess.length,
    pricesSaved: totalSaved,
    setsUpdated: updatedSetIds.size,
    nextBatch: isLastBatch ? null : `${request.url.split('?')[0]}?batch=${batch + 1}`,
    isLastBatch,
    timestamp: new Date().toISOString(),
  });
}