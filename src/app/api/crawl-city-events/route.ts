import { crawlNextCalendar } from '@/lib/city-events/crawler';
export const runtime='nodejs'; export const maxDuration=180;
export async function GET(request:Request){
  if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
  const result=await crawlNextCalendar();return Response.json(result,{status:result.status==='queue_unavailable'?503:200});
}
