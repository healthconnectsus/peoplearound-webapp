import 'server-only';
import { resolve4 } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
import { sourceUrl } from './normalize';

export async function safeGet(raw:string,redirects=0):Promise<{body:string;status:number;url:string}> {
  const clean=sourceUrl(raw); if(!clean)throw new Error('Only public HTTPS URLs are supported');
  const url=new URL(clean);
  const addresses=await resolve4(url.hostname);
  if(!addresses.length||addresses.some(a=>ipaddr.parse(a).range()!=='unicast'))throw new Error('Non-public destination blocked');
  const result=await new Promise<{body:string;status:number;location?:string}>((resolve,reject)=>{
    // Connect to the validated IP, preserving Host and TLS servername. This
    // pins DNS for this request and prevents a second lookup/rebinding.
    const req=request({hostname:addresses[0],servername:url.hostname,path:url.pathname+url.search,method:'GET',
      headers:{Host:url.hostname,'User-Agent':'PeoplearoundEvents/1.0 (+https://www.peoplearound.com)','Accept-Encoding':'identity'},
    },res=>{
      const chunks:Buffer[]=[];let size=0;
      res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>1024*1024){req.destroy(new Error('Calendar exceeds 1 MB'));return;}chunks.push(chunk);});
      res.on('end',()=>resolve({body:Buffer.concat(chunks).toString('utf8'),status:res.statusCode??500,location:res.headers.location}));
      res.on('error',reject);
    });
    req.setTimeout(10000,()=>req.destroy(new Error('Calendar request timed out')));
    const deadline=setTimeout(()=>req.destroy(new Error('Calendar request deadline reached')),15000);
    req.on('close',()=>clearTimeout(deadline));req.on('error',reject);req.end();
  });
  if([301,302,303,307,308].includes(result.status)&&result.location){
    const target=new URL(result.location,url);
    if(redirects>=3||target.origin!==url.origin)throw new Error('Set the final same-origin calendar URL in admin');
    return safeGet(target.toString(),redirects+1);
  }
  return {...result,url:clean};
}
