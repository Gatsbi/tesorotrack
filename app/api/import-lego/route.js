// app/api/import-lego/route.js
// Hit /api/import-lego?theme=Star+Wars to import one theme at a time
// Hit /api/import-lego?list=true to see all available themes

const REBRICKABLE_KEY = 'b467861b30e43b0ae075907853a1aa73';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// All LEGO themes we want to import, mapped to clean names
const THEME_GROUPS = [
  { search: 'Star Wars', mapped: 'Star Wars' },
  { search: 'Harry Potter', mapped: 'Harry Potter' },
  { search: 'Technic', mapped: 'Technic' },
  { search: 'Creator Expert', mapped: 'Icons' },
  { search: 'Icons', mapped: 'Icons' },
  { search: 'Ideas', mapped: 'Ideas' },
  { search: 'Architecture', mapped: 'Architecture' },
  { search: 'Ninjago', mapped: 'Ninjago' },
  { search: 'City', mapped: 'City' },
  { search: 'Friends', mapped: 'Friends' },
  { search: 'Marvel', mapped: 'Marvel' },
  { search: 'DC', mapped: 'DC' },
  { search: 'Disney', mapped: 'Disney' },
  { search: 'Speed Champions', mapped: 'Speed Champions' },
  { search: 'Minecraft', mapped: 'Minecraft' },
  { search: 'Jurassic World', mapped: 'Jurassic World' },
  { search: 'Botanical Collection', mapped: 'Botanical Collection' },
  { search: 'Art', mapped: 'Art' },
  { search: 'Modular Buildings', mapped: 'Modular Buildings' },
  { search: 'Winter Village', mapped: 'Winter Village' },
  { search: 'Indiana Jones', mapped: 'Indiana Jones' },
  { search: 'Lord of the Rings', mapped: 'Lord of the Rings' },
  { search: 'The Hobbit', mapped: 'The Hobbit' },
  { search: 'Pirates of the Caribbean', mapped: 'Pirates of the Caribbean' },
  { search: 'Super Mario', mapped: 'Super Mario' },
  { search: 'Sonic the Hedgehog', mapped: 'Sonic the Hedgehog' },
  { search: 'Overwatch', mapped: 'Overwatch' },
  { search: 'Dimensions', mapped: 'Dimensions' },
  { search: 'Ghostbusters', mapped: 'Ghostbusters' },
  { search: 'Back to the Future', mapped: 'Back to the Future' },
  { search: 'Stranger Things', mapped: 'Stranger Things' },
  { search: 'The Office', mapped: 'The Office' },
  { search: 'Seinfeld', mapped: 'Seinfeld' },
  { search: 'Home Alone', mapped: 'Home Alone' },
  { search: 'Monkie Kid', mapped: 'Monkie Kid' },
  { search: 'Avatar', mapped: 'Avatar' },
  { search: 'Fortnite', mapped: 'Fortnite' },
  { search: 'Mindstorms', mapped: 'Mindstorms' },
  { search: 'Classic', mapped: 'Classic' },
  { search: 'Castle', mapped: 'Castle' },
  { search: 'Pirates', mapped: 'Pirates' },
  { search: 'Space', mapped: 'Space' },
  { search: 'Trains', mapped: 'Trains' },
];

async function fetchThemes() {
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/themes/?page_size=1000&key=${REBRICKABLE_KEY}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();
  return data.results || [];
}

async function fetchSetsForThemeId(themeId) {
  const sets = [];
  let url = `https://rebrickable.com/api/v3/lego/sets/?theme_id=${themeId}&page_size=500&ordering=year&key=${REBRICKABLE_KEY}`;

  while (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) break;
    const data = await res.json();
    sets.push(...(data.results || []));
    // Only fetch first 2 pages per theme to stay under 60s timeout
    if (!data.next || sets.length >= 1000) break;
    url = `${data.next}&key=${REBRICKABLE_KEY}`;
    await sleep(1100);
  }

  return sets;
}

function mapSet(s, themeName) {
  const setNum = (s.set_num || '').replace(/-\d+$/, '');
  const year = s.year || null;
  return {
    name: s.name,
    set_number: setNum,
    category: 'LEGO',
    theme: themeName,
    year_released: year,
    piece_count: s.num_parts || null,
    image_url: s.set_img_url || null,
    is_retired: year ? year < 2023 : false,
    retail_price: null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const themeSearch = searchParams.get('theme');
  const listOnly = searchParams.get('list') === 'true';
  const all = searchParams.get('all') === 'true';

  // List available themes
  if (listOnly) {
    return Response.json({
      availableThemes: THEME_GROUPS.map(t => t.search),
      usage: [
        'Import one theme: /api/import-lego?theme=Star+Wars',
        'Import all (slow): /api/import-lego?all=true',
        'List themes: /api/import-lego?list=true',
      ],
      total: THEME_GROUPS.length,
    });
  }

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch all themes from Rebrickable
  let themes;
  try {
    themes = await fetchThemes();
  } catch (e) {
    return Response.json({ error: `Failed to fetch themes: ${e.message}` }, { status: 500 });
  }

  // Build theme name -> id map
  const themeMap = {};
  themes.forEach(t => { themeMap[t.name] = t.id; });

  // Determine which theme groups to process
  const groupsToProcess = all
    ? THEME_GROUPS
    : THEME_GROUPS.filter(g =>
        themeSearch && g.search.toLowerCase() === themeSearch.toLowerCase()
      );

  if (groupsToProcess.length === 0) {
    return Response.json({
      error: `Theme "${themeSearch}" not found`,
      available: THEME_GROUPS.map(t => t.search),
    }, { status: 400 });
  }

  let totalSaved = 0;
  let totalSkipped = 0;
  const log = [];

  for (const group of groupsToProcess) {
    const themeId = themeMap[group.search];
    if (!themeId) {
      log.push({ theme: group.search, error: 'Not found in Rebrickable' });
      continue;
    }

    let sets;
    try {
      sets = await fetchSetsForThemeId(themeId);
    } catch (e) {
      log.push({ theme: group.search, error: e.message });
      continue;
    }

    const mapped = sets
      .map(s => mapSet(s, group.mapped))
      .filter(s => s.name && s.set_number && s.set_number.length > 0);

    if (mapped.length === 0) {
      log.push({ theme: group.search, sets: 0, saved: 0 });
      continue;
    }

    // Save in batches of 50
    let saved = 0;
    for (let i = 0; i < mapped.length; i += 50) {
      const batch = mapped.slice(i, i + 50);
      const { error } = await supabase
        .from('sets')
        .upsert(batch, { onConflict: 'set_number,category', ignoreDuplicates: false });
      if (!error) saved += batch.length;
      else totalSkipped += batch.length;
    }

    totalSaved += saved;
    log.push({ theme: group.search, mappedTo: group.mapped, sets: mapped.length, saved });
    await sleep(500);
  }

  // Get updated count
  const { count } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'LEGO');

  return Response.json({
    success: true,
    totalSaved,
    totalSkipped,
    legoSetsInDb: count,
    log,
    nextSteps: all ? null : `Hit /api/import-lego?list=true to see all themes`,
  });
}