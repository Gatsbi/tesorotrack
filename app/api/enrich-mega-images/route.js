import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const WIKI_URL = 'https://wiki.halo.fr/Mega_Construx';
const WIKI_BASE = 'https://wiki.halo.fr';

async function fetchWikiImages() {
  const res = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TesoroTrack/1.0)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Wiki fetch failed: ${res.status}`);
  const html = await res.text();

  const imageMap = {}; // set_number (uppercase) → image_url

  // Wiki filenames follow pattern: MB_96805_set.jpg, MB_96805.jpg, MB_CND01_set.jpg, MB_CND01.jpg
  // Thumb URL: /images/thumb/X/XX/MB_96805_set.jpg/250px-MB_96805_set.jpg
  // We prefer the "_set" variant (box art) over the plain one (render)

  const thumbRegex = /\/images\/thumb\/[^/]+\/[^/]+\/(MB_([A-Z0-9]+?)(?:bis)?(?:_set)?\.(?:jpg|jpeg|png))\/\d+px-/gi;
  let match;

  while ((match = thumbRegex.exec(html)) !== null) {
    const fullFilename = match[1];        // e.g. MB_96805_set.jpg
    const setNumber = match[2].toUpperCase(); // e.g. 96805 or CND01

    const isBoxArt = fullFilename.includes('_set.');

    // Build a good-sized thumb URL (400px)
    const thumbPath = match[0].replace(/\/\d+px-$/, ''); // strip trailing /NNNpx-
    const fullThumb = `${WIKI_BASE}${thumbPath}/400px-${fullFilename}`;

    // Prefer _set (box art) over plain render; don't overwrite box art with render
    if (!imageMap[setNumber] || isBoxArt) {
      imageMap[setNumber] = fullThumb;
    }
  }

  return imageMap;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry') === 'true';

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let imageMap;
  try {
    imageMap = await fetchWikiImages();
  } catch (e) {
    return Response.json({ error: 'Failed to fetch wiki', detail: e.message }, { status: 500 });
  }

  const wikiImageCount = Object.keys(imageMap).length;

  if (dryRun) {
    return Response.json({
      dryRun: true,
      wikiImagesFound: wikiImageCount,
      sample: Object.entries(imageMap).slice(0, 15).map(([k, v]) => ({ setNumber: k, imageUrl: v })),
    });
  }

  // Fetch all Mega sets missing images
  const { data: megaSets, error } = await supabase
    .from('sets')
    .select('id, set_number, name, image_url')
    .eq('category', 'Mega')
    .or('image_url.is.null,image_url.eq.');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let updated = 0;
  let notFound = 0;
  const log = [];

  for (const set of megaSets || []) {
    const key = (set.set_number || '').toUpperCase();
    const imageUrl = imageMap[key];

    if (!imageUrl) {
      notFound++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('sets')
      .update({ image_url: imageUrl })
      .eq('id', set.id);

    if (updateError) {
      log.push({ set: set.name, setNumber: set.set_number, error: updateError.message });
    } else {
      updated++;
      log.push({ set: set.name, setNumber: set.set_number, imageUrl });
    }
  }

  return Response.json({
    success: true,
    wikiImagesFound: wikiImageCount,
    megaSetsProcessed: megaSets?.length || 0,
    updated,
    notFound,
    log,
  });
}