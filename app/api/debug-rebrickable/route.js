const REBRICKABLE_KEY = process.env.REBRICKABLE_API_KEY || 'b467861b30e43b0ae075907853a1aa73';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Fetch a single page of minifigs and return the raw response
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/minifigs/?key=${REBRICKABLE_KEY}&page=1&page_size=3`,
    { signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();
  return Response.json(data);
}