// Authenticated image reads for saved contributions. Feed rows carry a revision
// hash, while image bytes are returned here with private/no-store headers.

import { getParticipant } from '@/lib/auth-server';
import { database } from '@/lib/database';
import { ensureDrawingSchema } from '@/lib/drawings';

export const dynamic='force-dynamic';
export async function GET(request:Request){
  const headers={'Cache-Control':'private, no-store',Vary:'Authorization','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
  try{
    if(!await getParticipant(request))return new Response(null,{status:401,headers});
    const id=new URL(request.url).searchParams.get('id')??'';
    if(!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:400,headers});
    const db=database();await ensureDrawingSchema(db);
    const row=await db.prepare('SELECT d.image_data FROM idea_drawings d JOIN ideas i ON i.id=d.idea_id WHERE d.idea_id=?').bind(id).first<{image_data:string}>();
    if(!row)return new Response(null,{status:404,headers});
    const raw=atob(row.image_data.slice(23));
    return new Response(Uint8Array.from(raw,c=>c.charCodeAt(0)),{headers:{...headers,'Content-Type':'image/jpeg'}});
  }catch{return new Response(null,{status:503,headers});}
}

