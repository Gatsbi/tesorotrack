// app/api/import-lego/route.js
import { createClient } from '@supabase/supabase-js';

const REBRICKABLE_KEY = 'b467861b30e43b0ae075907853a1aa73';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const THEME_GROUPS = [
  { name: 'Star Wars',                ids: [158, 171] },
  { name: 'Harry Potter',             ids: [246, 667] },
  { name: 'Technic',                  ids: [1] },
  { name: 'Icons',                    ids: [721, 673] },
  { name: 'Ideas',                    ids: [576] },
  { name: 'Architecture',             ids: [252, 253] },
  { name: 'Ninjago',                  ids: [435, 616] },
  { name: 'City',                     ids: [52] },
  { name: 'Friends',                  ids: [494] },
  { name: 'Marvel',                   ids: [696, 702, 704, 705, 706, 707, 715, 750] },
  { name: 'DC',                       ids: [695, 697, 700, 701, 698, 708] },
  { name: 'Disney',                   ids: [608, 579, 640, 641] },
  { name: 'Speed Champions',          ids: [601] },
  { name: 'Minecraft',                ids: [577] },
  { name: 'Jurassic World',           ids: [602] },
  { name: 'Botanicals',               ids: [769] },
  { name: 'Art',                      ids: [709] },
  { name: 'Modular Buildings',        ids: [155] },
  { name: 'Indiana Jones',            ids: [264] },
  { name: 'Lord of the Rings',        ids: [566] },
  { name: 'The Hobbit',               ids: [562] },
  { name: 'Pirates of the Caribbean', ids: [263] },
  { name: 'Super Mario',              ids: [690] },
  { name: 'Sonic the Hedgehog',       ids: [747] },
  { name: 'Overwatch',                ids: [669] },
  { name: 'Dimensions',               ids: [604] },
  { name: 'Ghostbusters',             ids: [607] },
  { name: 'Stranger Things',          ids: [680] },
  { name: 'Monkie Kid',               ids: [693] },
  { name: 'Avatar',                   ids: [724, 317] },
  { name: 'Fortnite',                 ids: [766] },
  { name: 'Classic',                  ids: [621] },
  { name: 'Castle',                   ids: [186] },
  { name: 'Pirates',                  ids: [147] },
  { name: 'Space',                    ids: [126] },
  { name: 'Collectible Minifigures',  ids: [535] },
  { name: 'Brickheadz',               ids: [610] },
  { name: 'Seasonal',                 ids: [206] },
  { name: 'Bionicle',                 ids: [324] },
  { name: 'Animal Crossing',          ids: [752] },
  { name: 'Zelda',                    ids: [764] },
  { name: 'Dreamzzz',                 ids: [749] },
  { name: 'One Piece',                ids: [775] },
  { name: 'Pokemon',                  ids: [776] },
];

async function fetchSetsForThemeId(themeId) {
  const sets = [];
  let url = `https://rebrickable.com/api/v3/lego/sets/?theme_id=${themeId}&page_size=500&ordering=year&key=${REBRICKABLE_KEY}`;
  while (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) break;
    const data = await res.json();
    sets.push(...(data.results || []));
    if (data.next) {
      url = data.next.includes('key=') ? data.next : data.next + '&key=' + REBRICKABLE_KEY;
      await sleep(1100);
    } else {
      url = null;
    }
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

async function saveSets(supabase, sets) {
  let saved = 0;
  for (let i = 0; i < sets.length; i += 50) {
    const batch = sets.slice(i, i + 50);
    const { error } = await supabase
      .from('sets')
      .upsert(batch, { onConflict: 'set_number,category', ignoreDuplicates: false });
    if (!error) saved += batch.length;
  }
  return saved;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const themeParam = searchParams.get('theme');
  const listOnly = searchParams.get('list') === 'true';

  if (listOnly) {
    return Response.json({
      availableThemes: THEME_GROUPS.map(g => g.name),
      total: THEME_GROUPS.length,
      usage: [
        'Import one: /api/import-lego?theme=Star+Wars',
        'Import all: /api/import-lego?theme=all',
        'List: /api/import-lego?list=true',
      ],
    });
  }

  if (!themeParam) {
    return Response.json({
      usage: [
        'Import one: /api/import-lego?theme=Star+Wars',
        'Import all: /api/import-lego?theme=all',
        'List themes: /api/import-lego?list=true',
      ],
    });
  }

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const groupsToRun = themeParam.toLowerCase() === 'all'
    ? THEME_GROUPS
    : THEME_GROUPS.filter(g => g.name.toLowerCase() === themeParam.toLowerCase());

  if (groupsToRun.length === 0) {
    return Response.json({
      error: 'Theme not found',
      available: THEME_GROUPS.map(g => g.name),
    }, { status: 400 });
  }

  let totalSaved = 0;
  let totalSets = 0;
  const log = [];

  for (const group of groupsToRun) {
    let groupSets = [];

    for (const id of group.ids) {
      try {
        const sets = await fetchSetsForThemeId(id);
        groupSets.push(...sets);
        await sleep(500);
      } catch (e) {
        log.push({ theme: group.name, id, error: e.message });
      }
    }

    // Deduplicate by set_num
    const seen = new Set();
    groupSets = groupSets.filter(s => {
      if (seen.has(s.set_num)) return false;
      seen.add(s.set_num);
      return true;
    });

    const mapped = groupSets
      .map(s => mapSet(s, group.name))
      .filter(s => s.name && s.set_number);

    if (mapped.length === 0) {
      log.push({ theme: group.name, sets: 0, saved: 0 });
      continue;
    }

    const saved = await saveSets(supabase, mapped);
    totalSets += mapped.length;
    totalSaved += saved;
    log.push({ theme: group.name, sets: mapped.length, saved });
  }

  const { count } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'LEGO');

  return Response.json({
    success: true,
    totalSets,
    totalSaved,
    legoSetsInDb: count,
    log,
  });
}