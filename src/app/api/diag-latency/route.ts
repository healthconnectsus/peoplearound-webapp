import { Agent, fetch as ufetch } from "undici";

/**
 * TEMPORARY — compares three ways of talking to Supabase from inside Vercel:
 * Node's default fetch, a kept-alive connection pool, and one multiplexed
 * HTTP/2 connection. Bearer-gated with the cron secret; to be removed once
 * the numbers are in.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const TARGET = `${URL_}/rest/v1/neighborhoods?select=id&limit=1`;

// Module scope, so a warm instance keeps its sockets between calls — which
// is the whole point of the comparison.
const keepAlive = new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 300_000, connections: 32 });
const h2 = new Agent({ allowH2: true, keepAliveTimeout: 60_000, keepAliveMaxTimeout: 300_000 });

const modes = {
  default: () => fetch(TARGET, { headers: H, cache: "no-store" }).then((r) => r.text()),
  keepAlive: () => ufetch(TARGET, { headers: H, dispatcher: keepAlive }).then((r) => r.text()),
  h2: () => ufetch(TARGET, { headers: H, dispatcher: h2 }).then((r) => r.text()),
} as const;

async function ms(fn: () => Promise<unknown>) {
  const t = performance.now();
  await fn();
  return Math.round(performance.now() - t);
}

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const out: Record<string, unknown> = { region: process.env.VERCEL_REGION ?? null };
  for (const [name, fn] of Object.entries(modes)) {
    const seq: number[] = [];
    for (let i = 0; i < 8; i++) seq.push(await ms(fn));
    const bursts: { wall: number; max: number; median: number }[] = [];
    for (let b = 0; b < 4; b++) {
      const t = performance.now();
      const each = (await Promise.all(Array.from({ length: 24 }, () => ms(fn)))).sort((a, b2) => a - b2);
      bursts.push({ wall: Math.round(performance.now() - t), max: each[23], median: each[12] });
    }
    out[name] = { seq, bursts };
  }
  return Response.json(out);
}
