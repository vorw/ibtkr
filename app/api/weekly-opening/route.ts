import { database } from '@/lib/database';
import { currentChallenge } from '@/lib/weekly';
import { readWeeklyOpening,weeklyVisitor,cutWeeklyOpening } from '@/lib/weekly-opening';
export const dynamic='force-dynamic';
const cookieName='__Host-ibtkr-weekly-opening';
const token=(r:Request)=>r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)??null;
const reply=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie',...(cookie?{'Set-Cookie':`${cookieName}=${cookie}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`}:{})}});
export async function GET(request:Request){try{
  const week=currentChallenge();if(!week||new URL(request.url).searchParams.get('week')!==week.id)return reply({error:'تغيّر الأسبوع. حدّث الصفحة.'},409);
  const db=database();let visitor=await weeklyVisitor(db,week,token(request));let state=await readWeeklyOpening(db,week,visitor);
  if(!visitor&&!state.isOpen){visitor=await weeklyVisitor(db,week,null,true);state=await readWeeklyOpening(db,week,visitor);return reply(state,200,visitor!);}return reply(state);
}catch{return reply({error:'تعذّر تحميل شريط التحدّي. حاول مرة ثانية.'},503);}}
export async function POST(request:Request){try{
  const origin=request.headers.get('origin');if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return reply({error:'طلب غير مسموح.'},403);
  const week=currentChallenge();if(!week||new URL(request.url).searchParams.get('week')!==week.id)return reply({error:'تغيّر الأسبوع. حدّث الصفحة.'},409);
  const raw=await request.text();if(raw.length>1000)return reply({error:'طلب غير صالح.'},400);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'طلب غير صالح.'},400);}
  if(!body||Object.keys(body).length!==1||body.action!=='cut')return reply({error:'طلب غير صالح.'},400);
  const db=database(),visitor=await weeklyVisitor(db,week,token(request));if(!visitor)return reply({error:'حدّث الصفحة لتجهيز قصّتك، بدون تسجيل دخول.'},409);
  return reply(await cutWeeklyOpening(db,week,visitor));
}catch{return reply({error:'تعذّر حفظ القصّة. إعادة المحاولة لن تحسبها مرتين.'},503);}}
