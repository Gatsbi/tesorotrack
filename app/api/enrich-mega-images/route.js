import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const WIKI_URL = 'https://wiki.halo.fr/Mega_Construx';

// Parse the wiki HTML to extract set_number → image_url mapping
// The wiki tables have rows like:
// <td><a href="..."><img src="/images/thumb/.../200px-96805.jpg" ...></a></td>
// <td>96805</td>
// <td>UNSC Warthog</td> ...
async function fetchWikiImages() {
  const res = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'TesoroTrack/1.0 (image enrichment bot; contact@tesorotrack.com)' },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Wiki fetch failed: ${res.status}`);
  const html = await res.text();

  const imageMap = {}; // set_number → image_url

  // Strategy: find all <img> tags inside wiki tables that have a set-number-like filename
  // MediaWiki thumb URLs look like:
  //   /images/thumb/a/ab/96805.jpg/200px-96805.jpg   (old numeric sets)
  //   /images/thumb/a/ab/CND01.jpg/200px-CND01.jpg   (Mega Construx alphanumeric)
  //
  // We'll extract the full-size image URL by stripping the thumb path component

  // Match all img src attributes inside table cells
  const imgRegex = /<img[^>]+src="(\/images\/thumb\/[^"]+)"[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const thumbPath = match[1]; // e.g. /images/thumb/a/ab/96805.jpg/200px-96805.jpg

    // Extract the filename from the thumb path
    // Pattern: /images/thumb/X/XX/FILENAME.ext/SIZEpx-FILENAME.ext
    const filenameMatch = thumbPath.match(/\/images\/thumb\/[^/]+\/[^/]+\/([^/]+)\//);
    if (!filenameMatch) continue;

    const filename = filenameMatch[1]; // e.g. "96805.jpg" or "CND01.jpg"
    const baseName = filename.replace(/\.[^.]+$/, ''); // strip extension → "96805" or "CND01"

    // Check if this looks like a set number (4-6 digits, or 2-3 letters + 2-3 digits)
    if (!/^(\d{4,6}|[A-Z]{2,3}\d{2,3})$/i.test(baseName)) continue;

    // Construct the full-size image URL
    const fullImageUrl = `https://wiki.halo.fr/images/${thumbPath.split('/images/thumb/')[1].split('/')[0]}/${thumbPath.split('/images/thumb/')[1].split('/')[1]}/${filename}`;

    // Use a medium-size thumb (400px wide) for reasonable quality without huge file size
    const mediumThumb = `https://wiki.halo.fr${thumbPath.replace(/\/\d+px-[^/]+$/, '/400px-' + filename)}`;

    imageMap[baseName.toUpperCase()] = mediumThumb;
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

  // 1. Fetch the wiki and extract set_number → image_url
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
      sample: Object.entries(imageMap).slice(0, 10).map(([k, v]) => ({ setNumber: k, imageUrl: v })),
    });
  }

  // 2. Fetch all Mega sets from DB that are missing images
  const { data: megaSets, error } = await supabase
    .from('sets')
    .select('id, set_number, name, image_url')
    .eq('category', 'Mega')
    .or('image_url.is.null,image_url.eq.');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 3. Match and update
  let updated = 0;
  let notFound = 0;
  const log = [];

  for (const set of megaSets || []) {
    const key = (set.set_number || '').toUpperCase();
    const imageUrl = imageMap[key];

    if (!imageUrl) {
      notFound++;
      log.push({ set: set.name, setNumber: set.set_number, status: 'no image on wiki' });
      continue;
    }

    const { error: updateError } = await supabase
      .from('sets')
      .update({ image_url: imageUrl })
      .eq('id', set.id);

    if (updateError) {
      log.push({ set: set.name, setNumber: set.set_number, status: 'update error', error: updateError.message });
    } else {
      updated++;
      log.push({ set: set.name, setNumber: set.set_number, status: 'updated', imageUrl });
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