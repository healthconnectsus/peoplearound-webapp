import { populateCity } from '@/lib/city-events/importer';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await populateCity();
  return Response.json(result, { status: result.status === 'error' ? 503 : 200 });
}
