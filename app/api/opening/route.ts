import { database } from '@/lib/database';
import { getParticipant } from '@/lib/auth-server';
import { readOpening, cutOpening } from '@/lib/opening';

export const dynamic = 'force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization'}});
export async function GET(request:Request){
  try{
    const user=await getParticipant(request);
    return reply(await readOpening(database(),user?.userId??null));
  }catch{ return reply({error:'ما قدرنا نحمّل الافتتاح. جرّب مرة ثانية.'},503); }
}
export async function POST(request:Request){
  try{
    const origin=request.headers.get('origin');
    if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return reply({error:'طلب غير مسموح.'},403);
    const user=await getParticipant(request);
    if(!user)return reply({error:'سجّل دخولك عشان تكون قصّتك جزءًا من الافتتاح.'},401);
    const raw=await request.text();
    if(raw.length>1000)return reply({error:'طلب غير صالح.'},400);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'طلب غير صالح.'},400);}
    if(!body||Object.keys(body).length!==1||body.action!=='cut')return reply({error:'طلب غير صالح.'},400);
    return reply(await cutOpening(database(),user.userId));
  }catch{ return reply({error:'تعذّر حفظ القصّة. حاول مرة ثانية؛ ما راح تنحسب مرتين.'},503); }
}
