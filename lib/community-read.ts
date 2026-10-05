import type { AppData, Comment, Idea, Leader } from './challenges';
import { currentChallenge, challengeStatus, findWeek, weeklyChallenges, legacyChallengeIds } from './weekly';
import { finalizeClosedWeeks, scoresSQL } from './weekly-db';

const pageSize=12;
const numberPage=(value:string|null)=>Math.min(100000,Math.max(1,Number.parseInt(value??'1',10)||1));
type IdeaRow=Omit<Idea,'isOwn'|'liked'|'comments'> & {user_id:string;liked:number};
type CommentRow=Omit<Comment,'isOwn'> & {user_id:string};

export async function readCommunity(db:D1Database,userId:string|null,params=new URLSearchParams(), focusId?:string):Promise<AppData> {
  const now=new Date();const current=currentChallenge(now);
  const available=weeklyChallenges.filter(week=>week.startsAt<=now.toISOString()).sort((a,b)=>b.startsAt.localeCompare(a.startsAt));
  const requested=params.get('week');
  const selected=(requested==='legacy'||requested==='all')?(current??available[0]??null):(requested && requested!=='current'?available.find(week=>week.id===requested):current??available[0])??null;
  const legacy=requested==='legacy';const all=requested==='all';const status=legacy?'legacy':selected?challengeStatus(selected,now):'waiting';
  await finalizeClosedWeeks(db,now);
  const where:string[]=[];const bindings:(string|number)[]=[];
  if(all){where.push('1=1');}
  else if(legacy){where.push(`i.challenge_id IN (${legacyChallengeIds.map(()=>'?').join(',')})`);bindings.push(...legacyChallengeIds);}
  else {where.push('i.challenge_id=?');bindings.push(selected?.id??'no-active-week');}
  if(params.get('scope')==='mine'){where.push('i.user_id=?');bindings.push(userId??'guest');}
  const angle=params.get('angle');if(angle && weeklyChallenges[0].angles.some(item=>item.id===angle)){where.push('i.angle_id=?');bindings.push(angle);}
  const query=(params.get('q')??'').trim().slice(0,80);
  if(query){where.push("(i.title LIKE ? ESCAPE '\\' OR i.body LIKE ? ESCAPE '\\' OR COALESCE(p.display_name,i.name) LIKE ? ESCAPE '\\')");const pattern='%'+query.replace(/[\\%_]/g,'\\$&')+'%';bindings.push(pattern,pattern,pattern);}
  const clause=where.join(' AND ');
  const total=(await db.prepare(`SELECT COUNT(*) n FROM ideas i LEFT JOIN profiles p ON p.user_id=i.user_id WHERE ${clause}`).bind(...bindings).first<{n:number}>())?.n??0;
  const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.min(pages,numberPage(params.get('page')));
  const select=`SELECT i.id,i.user_id,i.challenge_id,i.angle_id,COALESCE(p.display_name,i.name) name,i.title,i.body,i.created_at,
    (SELECT COUNT(*) FROM reactions r WHERE r.idea_id=i.id AND r.liked=1 AND r.user_id<>i.user_id) likes,
    (SELECT COUNT(*) FROM reactions r WHERE r.idea_id=i.id AND r.user_id=? AND r.liked=1) liked,
    (SELECT COUNT(*) FROM comments c WHERE c.idea_id=i.id) commentCount
    FROM ideas i LEFT JOIN profiles p ON p.user_id=i.user_id`;
  const sort=params.get('sort')==='popular'?'likes DESC,i.created_at DESC,i.id DESC':'i.created_at DESC,i.id DESC';
  const [rows,own,reviews,profile]=await Promise.all([
    userId?db.prepare(`${select} WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(userId,...bindings,pageSize,(page-1)*pageSize).all<IdeaRow>():Promise.resolve({results:[] as IdeaRow[]}),
    userId?db.prepare('SELECT COUNT(*) total,COUNT(DISTINCT challenge_id) rewarded FROM ideas WHERE user_id=?').bind(userId).first<{total:number;rewarded:number}>():null,
    userId?db.prepare('SELECT COUNT(DISTINCT c.idea_id) total FROM comments c JOIN ideas i ON c.idea_id=i.id WHERE c.user_id=? AND i.user_id<>?').bind(userId,userId).first<{total:number}>():null,
    userId?db.prepare('SELECT display_name FROM profiles WHERE user_id=?').bind(userId).first<{display_name:string}>():null,
  ]);
  const map=(row:IdeaRow):Idea=>{const {user_id,liked,...idea}=row;return {...idea,isOwn:user_id===userId,liked:Boolean(liked),comments:[]};};
  let focusedIdea:Idea|undefined;let discussion:AppData['discussion'];
  const ideaId=focusId??params.get('idea');
  if(userId && ideaId && /^[0-9a-f-]{36}$/i.test(ideaId)){
    const row=await db.prepare(`${select} WHERE i.id=?`).bind(userId,ideaId).first<IdeaRow>();
    if(row){
      focusedIdea=map(row);const commentPage=Math.min(Math.max(1,Math.ceil(row.commentCount/20)),numberPage(params.get('commentPage')));
      const comments=await db.prepare(`SELECT c.id,c.user_id,COALESCE(p.display_name,c.name) name,c.body,c.created_at FROM comments c LEFT JOIN profiles p ON p.user_id=c.user_id WHERE c.idea_id=? ORDER BY c.created_at ASC,c.id ASC LIMIT 20 OFFSET ?`).bind(ideaId,(commentPage-1)*20).all<CommentRow>();
      focusedIdea.comments=comments.results.map(({user_id,...comment})=>({...comment,isOwn:user_id===userId}));
      discussion={ideaId,page:commentPage,pages:Math.max(1,Math.ceil(row.commentCount/20)),total:row.commentCount};
    }
  }
  let leaders:Leader[]=[];let leaderTotal=0;let leaderPage=1;let ownEntries=0;let ownLikes=0;let finalized=false;
  if(selected){
    finalized=Boolean(await db.prepare('SELECT challenge_id FROM finalized_weeks WHERE challenge_id=?').bind(selected.id).first());
    const source=finalized?`SELECT r.user_id,COALESCE(p.display_name,r.name) name,r.likes,r.entries,r.rank FROM weekly_results r LEFT JOIN profiles p ON p.user_id=r.user_id WHERE r.challenge_id=?`:`SELECT *,RANK() OVER (ORDER BY likes DESC) rank FROM (${scoresSQL})`;
    leaderTotal=(await db.prepare(`SELECT COUNT(*) n FROM (${source})`).bind(selected.id).first<{n:number}>())?.n??0;
    leaderPage=Math.min(Math.max(1,Math.ceil(leaderTotal/20)),numberPage(params.get('leaderPage')));
    const [ranking,mine]=await Promise.all([
      db.prepare(`SELECT * FROM (${source}) ORDER BY rank ASC,name ASC,user_id ASC LIMIT 20 OFFSET ?`).bind(selected.id,(leaderPage-1)*20).all<{user_id:string;name:string;likes:number;entries:number;rank:number}>(),
      userId && current?db.prepare(`SELECT entries,likes FROM (${scoresSQL}) WHERE user_id=?`).bind(current.id,userId).first<{entries:number;likes:number}>():null,
    ]);
    leaders=ranking.results.map(({user_id,...entry})=>({...entry,isOwn:user_id===userId}));ownEntries=mine?.entries??0;ownLikes=mine?.likes??0;
  }
  const reset = await db.prepare('SELECT name FROM d1_migrations WHERE name=?').bind('0003_clear_legacy_activity.sql').first();
  return {activityVersion:reset?'weekly-clean-start-2026-10-06':undefined,signedIn:Boolean(userId),ideas:rows.results.map(map),focusedIdea,discussion,
    profile:profile?{displayName:profile.display_name}:null,
    progress:{ideas:own?.total??0,reviews:reviews?.total??0,xp:(own?.rewarded??0)*20+(reviews?.total??0)*5},
    weekly:{current,selected,weeks:available,status,serverNow:now.toISOString(),leaders,leaderTotal,leaderPage,ownEntries,ownLikes,finalized},
    pagination:{page,pageSize,total:userId?total:0,pages:userId?pages:1},
  };
}
