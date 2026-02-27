// app/api/import-lego/route.js
import { createClient } from '@supabase/supabase-js';

const REBRICKABLE_KEY = 'b467861b30e43b0ae075907853a1aa73';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function rbFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/${path}${sep}key=${REBRICKABLE_KEY}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`Rebrickable ${res.status}: ${path}`);
  return res.json();
}

async function fetchAllThemes() {
  const themes = [];
  let url = `themes/?page_size=1000`;
  while (url) {
    const data = await rbFetch(url);
    themes.push(...(data.results || []));
    if (data.next) {
      // Extract just the path+query from the next URL
      url = data.next.replace('https://rebrickable.com/api/v3/lego/', '').replace(`&key=${REBRICKABLE_KEY}`, '').replace(`?key=${REBRICKABLE_KEY}&`, '?');
      await sleep(1100);
    } else {
      url = null;
    }
  }
  return themes;
}

async function fetchSetsForThemeId(themeId, maxSets = 2000) {
  const sets = [];
  let url = `sets/?theme_id=${themeId}&page_size=500&ordering=year`;
  while (url && sets.length < maxSets) {
    const data = await rbFetch(url);
    sets.push(...(data.results || []));
    if (data.next) {
      url = data.next.replace('https://rebrickable.com/api/v3/lego/', '').replace(`&key=${REBRICKABLE_KEY}`, '').replace(`?key=${REBRICKABLE_KEY}&`, '?');
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
    else console.error('Save error:', error.message);
  }
  return saved;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const themeParam = searchParams.get('theme'); // e.g. ?theme=Star+Wars
  const showThemes = searchParams.get('themes') === 'true'; // show all themes with IDs
  const themeId = searchParams.get('id'); // import by exact theme ID

  // Fetch all themes for lookup
  let allThemes;
  try {
    allThemes = await fetchAllThemes();
  } catch (e) {
    return Response.json({ error: `Failed to fetch themes: ${e.message}` }, { status: 500 });
  }

  // Build parent map
  const themeById = {};
  allThemes.forEach(t => { themeById[t.id] = t; });

  const getParentName = (t) => {
    if (t.parent_id && themeById[t.parent_id]) {
      return themeById[t.parent_id].name;
    }
    return null;
  };

  // Show all themes with IDs
  if (showThemes) {
    const grouped = {};
    allThemes.forEach(t => {
      const parent = getParentName(t) || 'Root';
      if (!grouped[parent]) grouped[parent] = [];
      grouped[parent].push({ id: t.id, name: t.name });
    });
    return Response.json({ totalThemes: allThemes.length, grouped });
  }

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Import by exact theme ID
  if (themeId) {
    const theme = themeById[parseInt(themeId)];
    if (!theme) return Response.json({ error: `Theme ID ${themeId} not found` }, { status: 400 });

    const sets = await fetchSetsForThemeId(parseInt(themeId));
    const mapped = sets.map(s => mapSet(s, theme.name)).filter(s => s.name && s.set_number);
    const saved = await saveSets(supabase, mapped);

    return Response.json({ success: true, themeId, themeName: theme.name, sets: mapped.length, saved });
  }

  // Import by theme name — finds ALL matching themes (including sub-themes)
  if (themeParam) {
    const search = themeParam.toLowerCase();

    // Find all themes whose name or parent name matches
    const matchingThemes = allThemes.filter(t => {
      const parentName = getParentName(t);
      return t.name.toLowerCase().includes(search) ||
        (parentName && parentName.toLowerCase().includes(search));
    });

    if (matchingThemes.length === 0) {
      return Response.json({
        error: `No themes found matching "${themeParam}"`,
        hint: 'Try /api/import-lego?themes=true to see all themes',
      }, { status: 400 });
    }

    let totalSets = 0;
    let totalSaved = 0;
    const log = [];

    for (const theme of matchingThemes) {
      const parentName = getParentName(theme);
      // Use parent name as the theme label if available, otherwise use theme name
      const themeName = parentName || theme.name;

      let sets;
      try {
        sets = await fetchSetsForThemeId(theme.id);
      } catch (e) {
        log.push({ id: theme.id, name: theme.name, error: e.message });
        continue;
      }

      const mapped = sets
        .map(s => mapSet(s, themeName))
        .filter(s => s.name && s.set_number);

      if (mapped.length === 0) {
        log.push({ id: theme.id, name: theme.name, sets: 0 });
        continue;
      }

      const saved = await saveSets(supabase, mapped);
      totalSets += mapped.length;
      totalSaved += saved;
      log.push({ id: theme.id, name: theme.name, parent: parentName, sets: mapped.length, saved });
      await sleep(500);
    }

    // Get updated count
    const { count } = await supabase
      .from('sets')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'LEGO');

    return Response.json({
      success: true,
      query: themeParam,
      themesFound: matchingThemes.length,
      totalSets,
      totalSaved,
      legoSetsInDb: count,
      log,
    });
  }

  // No params — show usage
  return Response.json({
    usage: [
      'See all themes: /api/import-lego?themes=true',
      'Import by name: /api/import-lego?theme=Star+Wars',
      'Import by ID: /api/import-lego?id=171',
    ],
  });
}