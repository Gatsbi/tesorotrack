import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const WIKI_URL = 'https://wiki.halo.fr/Mega_Construx';

async function fetchWikiImages() {
  const res = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TesoroTrack/1.0)' },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Wiki fetch failed: ${res.status}`);
  const html = await res.text();

  const imageMap = {};

  // Try multiple patterns for MediaWiki image URLs
  // Pattern 1: /images/thumb/...
  const thumbRegex = /src="((?:https?:\/\/wiki\.halo\.fr)?\/images\/(?:thumb\/)?[^"]+\.(?:jpg|jpeg|png|gif|webp))"/gi;
  let match;
  const allImages = [];

  while ((match = thumbRegex.exec(html)) !== null) {
    allImages.push(match[1]);
  }

  // Also try data-src (lazy loading)
  const dataSrcRegex = /data-src="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    allImages.push(match[1]);
  }

  // Return debug info
  return { imageMap, allImages: allImages.slice(0, 30), htmlSnippet: html.substring(5000, 8000) };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  try {
    const { imageMap, allImages, htmlSnippet } = await fetchWikiImages();
    return Response.json({
      debug: true,
      imagesFound: allImages.length,
      sampleImages: allImages,
      htmlSnippet,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}