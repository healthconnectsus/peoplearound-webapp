/**
 * TEMPORARY — measures how long this function's own reads to Supabase take,
 * from inside Vercel, where it cannot be measured from outside. Bearer-gated
 * with the cron secret; to be removed once the numbers are in.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function ms(fn: () => Promise<unknown>) {
  const t = performance.now();
  await fn();
  return Math.round(performance.now() - t);
}

const get = () =>
  fetch(`${URL_}/rest/v1/neighborhoods?select=id&limit=1`, { headers: H, cache: "no-store" }).then((r) => r.text());
const head = () =>
  fetch(`${URL_}/rest/v1/neighborhoods?select=id`, {
    method: "HEAD",
    headers: { ...H, Prefer: "count=exact" },
    cache: "no-store",
  }).then((r) => r.headers.get("content-range"));
const getCount = () =>
  fetch(`${URL_}/rest/v1/neighborhoods?select=id&limit=1`, {
    headers: { ...H, Prefer: "count=exact" },
    cache: "no-store",
  }).then((r) => r.text());
const jwks = () =>
  fetch(`${URL_}/auth/v1/.well-known/jwks.json`, { cache: "no-store" }).then((r) => r.text());

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const seq = async (fn: () => Promise<unknown>, n = 6) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(await ms(fn));
    return out;
  };
  const result: Record<string, unknown> = {
    region: process.env.VERCEL_REGION ?? null,
    get: await seq(get),
    head: await seq(head),
    getCount: await seq(getCount),
    jwks: await seq(jwks, 3),
  };
  for (const label of ["burst12get", "burst6head", "burst12get_again"]) {
    const fn = label.includes("head") ? head : get;
    const n = label.includes("head") ? 6 : 12;
    const t = performance.now();
    const each = await Promise.all(Array.from({ length: n }, () => ms(fn)));
    result[label] = { wall: Math.round(performance.now() - t), each: each.sort((a, b) => a - b) };
  }
  return Response.json(result);
}
