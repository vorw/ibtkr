// Anonymous launch-ribbon endpoint. Its secure cookie identifies one visitor
// in the launch event and does not grant access to an account.

import { database } from '@/lib/database';
import { readOpening,cutOpening,createOpeningVisitor,resolveOpeningVisitor } from '@/lib/opening';

export const dynamic = 'force-dynamic';
const cookieName='__Host-ibtkr-opening';
const cookieValue=(request:Request)=>request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1)??null;
const reply=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie',...(cookie?{'Set-Cookie':`${cookieName}=${cookie}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`}:{})}});
export async function GET(request:Request){
  try{
    const db=database();let visitor=await resolveOpeningVisitor(db,cookieValue(request));
    let state=await readOpening(db,visitor);
    if(!visitor&&!state.isOpen){
      visitor=await createOpeningVisitor(db);state=await readOpening(db,visitor);
      return reply(state,200,visitor);
    }
    return reply(state);
  }catch{ return reply({error:'ما قدرنا نحمّل الافتتاح. جرّب مرة ثانية.'},503); }
}
export async function POST(request:Request){
  try{
    const origin=request.headers.get('origin');
    if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return reply({error:'طلب غير مسموح.'},403);
    const raw=await request.text();
    if(raw.length>1000)return reply({error:'طلب غير صالح.'},400);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'طلب غير صالح.'},400);}
    if(!body||Object.keys(body).length!==1||body.action!=='cut')return reply({error:'طلب غير صالح.'},400);
    const db=database(),visitor=await resolveOpeningVisitor(db,cookieValue(request));
    if(!visitor)return reply({error:'حدّث الصفحة لتجهيز قصّتك. ما تحتاج تسجّل دخول.'},409);
    return reply(await cutOpening(db,visitor));
  }catch{ return reply({error:'تعذّر حفظ القصّة. حاول مرة ثانية؛ ما راح تنحسب مرتين.'},503); }
}

