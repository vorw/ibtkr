'use client';

import OpeningGate, { SitePreviewContext } from './opening-gate';
import { weeklyRibbonFor } from '@/lib/weekly-ribbon-policy';

import { useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowUpLeft, Check, ChevronLeft, ChevronRight, Heart, Lightbulb, MessageCircle, Pencil, Plus, RotateCcw, Shuffle, Sparkles, Users, Trophy, Search, Clock3, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { readResume, signInHref, readIdeaDraft, clearLegacyDrafts, type IdeaDraft, type Page, type Resume } from '@/lib/participation';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { getAuth, sessionHeaders, signOut } from '@/lib/auth-client';
import { ThemeToggle } from './theme-toggle';
import { toast } from 'sonner';
import { type AppData, type Idea } from '@/lib/challenges';
import { currentChallenge, findWeek, angleLabel, weeklyChallenges, type WeeklyChallenge as Challenge } from '@/lib/weekly';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';

const initial: AppData = { signedIn: false, ideas: [], progress: { xp: 0, ideas: 0, reviews: 0 }, profile: null, weekly:{current:null,selected:null,weeks:[],status:'waiting',serverNow:'',ownEntries:0,ownLikes:0,leaders:[],leaderTotal:0,leaderPage:1,finalized:false},pagination:{page:1,pageSize:12,total:0,pages:1} };
type Draft = IdeaDraft;
class SignInRequired extends Error {}
const icons = { shuffle: Shuffle, flip: RotateCcw, people: Users };
const palette = ['violet', 'acid', 'signal'] as const;
function WeeklyChallengeGate({week,isOpen,onOpen,children}:{week:Challenge|null;isOpen:boolean|undefined;onOpen:()=>void;children:ReactNode}){
  // Remember only a ceremony this mounted page actually waited for. That lets
  // its final cut animate, while refreshes and later visits skip it entirely.
  const [closedWeek,setClosedWeek]=useState<string|null>(null);
  useEffect(()=>{if(week&&isOpen===false)setClosedWeek(week.id);},[week?.id,isOpen]);
  if(!weeklyRibbonFor(week))return children;
  if(isOpen===undefined)return <section className="section-block" aria-label="تحميل تحدّي الأسبوع" aria-busy="true"><Skeleton className="feed-skeleton"/></section>;
  if(isOpen&&closedWeek!==week!.id)return children;
  return <OpeningGate key={week!.id} weekId={week!.id} onOpen={onOpen}>{children}</OpeningGate>;
}
const nav = [{ id: 'home', label: 'تحدّي الأسبوع' }, { id: 'ideas', label: 'المجتمع' }, { id: 'leaderboard', label: 'المتصدرون' }, { id: 'profile', label: 'رحلتك' }] as const;
const date = (value: string) => new Intl.DateTimeFormat('ar-SA', { timeZone:'Asia/Riyadh',day: 'numeric', month: 'short', calendar: 'gregory' }).format(new Date(value));
const storage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch {} },
  remove(key: string) { try { localStorage.removeItem(key); } catch {} },
};
const rank = (xp: number) => xp >= 100 ? { name: 'صانع أفكار', base: 100, next: null } : xp >= 20 ? { name: 'مساهم', base: 20, next: 100 } : { name: 'مستكشف', base: 0, next: 20 };

function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.dataset.reveal = 'visible'; observer.disconnect(); }
    }, { threshold: 0.06 });
    observer.observe(element);
    return () => { observer.disconnect(); element.removeAttribute('data-reveal'); };
  }, []);
  return <section ref={ref} className={className}>{children}</section>;
}

function IdeaCard({ idea, busy, onOpen, onReact }: { idea: Idea; busy: boolean; onOpen: (idea: Idea, focusComment?: boolean) => void; onReact: (idea: Idea) => void }) {
  const week=findWeek(idea.challenge_id);
  const index = Math.max(0, week?.angles.findIndex(angle=>angle.id===idea.angle_id)??0);
  const open= currentChallenge()?.id===idea.challenge_id;
  return <article className={`idea-card tone-${palette[index]}`}>
    <div className="idea-meta"><span className="avatar" aria-hidden="true">{idea.name.charAt(0)}</span><div><strong>{idea.name}</strong><time dateTime={idea.created_at}>{date(idea.created_at)}</time></div>{idea.isOwn && <small>فكرتك</small>}</div>
    <button className="idea-main" onClick={() => onOpen(idea)}><span className="angle-tag">{angleLabel(idea.angle_id)}</span><small className="idea-week">{week ? `الأسبوع ${week.number}` : 'الأرشيف'}</small><h3>{idea.title}</h3><p>{idea.body}</p></button>
    <div className="idea-actions"><button aria-label={idea.liked ? 'إلغاء التشجيع' : 'شجّع الفكرة'} aria-pressed={idea.liked} className={idea.liked ? 'liked' : ''} disabled={busy || idea.isOwn || !open} title={idea.isOwn ? 'هذه فكرتك؛ شجّع أفكار المشاركين الآخرين.' : undefined} onClick={() => onReact(idea)}><Heart size={18} fill={idea.liked ? 'currentColor' : 'none'} /> <span>{idea.likes}</span></button><button aria-label={`${idea.commentCount} تعليقات، افتح النقاش`} onClick={() => onOpen(idea, true)}><MessageCircle size={18} /> {idea.commentCount}</button><button className="idea-open" onClick={() => onOpen(idea, true)}>ناقش الفكرة</button></div>
  </article>;
}

function EmptyState({ mine, onStart }: { mine?: boolean; onStart: () => void }) {
  return <div className="empty-state"><span className="empty-symbol" aria-hidden="true"><Lightbulb size={32} strokeWidth={1.4} /></span><div><strong>{mine ? 'أول فكرة لك تبدأ من هنا.' : 'المساحة لك. كن أول من يبدأ.'}</strong><p>ما فيه مشاركات هنا حتى الآن. جرّب زاوية من تحدّي الأسبوع، أو غيّر التصفية.</p></div><Button className="outline-button" onClick={onStart}>تحدّي الأسبوع</Button></div>;
}

function PageControls({page,pages,onPage}:{page:number;pages:number;onPage:(page:number)=>void}) {
  if(pages<=1)return null;
  return <Pagination className="page-controls" aria-label="التنقل بين الصفحات"><PaginationContent><PaginationItem><Button className="outline-button" disabled={page<=1} onClick={()=>onPage(page-1)}>السابق</Button></PaginationItem><PaginationItem><span aria-live="polite">{page} / {pages}</span></PaginationItem><PaginationItem><Button className="outline-button" disabled={page>=pages} onClick={()=>onPage(page+1)}>التالي</Button></PaginationItem></PaginationContent></Pagination>;
}

function SignInNotice({ href, compact = false }: { href: string; compact?: boolean }) {
  return <div className={'signin-panel' + (compact ? ' compact' : '')}>
    <span className="rank-glyph" aria-hidden="true"><Users size={22} /></span>
    <div><strong>{compact ? 'خلّها بداية رحلتك.' : 'انضم لمساحة الأفكار.'}</strong><p>سجّل دخولك ببريدك الإلكتروني لمشاهدة المشاركات، وحفظ أفكارك وتقدّمك.</p></div>
    <a className="outline-button signin-link" href={href} target="_top">دخول للمجتمع <ArrowUpLeft size={18} /></a>
  </div>;
}

async function requestCommunity(body?: unknown, params = new URLSearchParams(), openingPreview=false) {
  if(openingPreview&&body!==undefined)throw new Error('هذه معاينة قبل الافتتاح. المشاركة والتصويت تفتح بعد اكتمال قصّ الشريط.');
  const requestParams=new URLSearchParams(params);
  if(openingPreview)requestParams.set('openingPreview','1');
  const authorization = await sessionHeaders();
  let response: Response;
  try {
    response = await fetch('/api/community?' + requestParams, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
      headers: { ...authorization, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('تعذّر الاتصال. تأكد من اتصالك ثم أعد المحاولة؛ مسودتك باقية.');
  }
  if (response.status === 401 || response.redirected) throw new SignInRequired('سجّل دخولك للمتابعة من نفس المكان. مسودتك باقية.');
  let result;
  try { result = await response.json(); } catch { throw new Error('تعذّر قراءة الرد. أعد المحاولة؛ مسودتك باقية.'); }
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : 'تعذّر الحفظ. جرّب مرة ثانية.';
    throw new Error(message);
  }
  return result;
}

function PlayerPanel({ progress, compact = false, onProfile }: { progress: AppData['progress']; compact?: boolean; onProfile?: () => void }) {
  const level = rank(progress.xp);
  const percentage = level.next ? Math.min(100, ((progress.xp - level.base) / (level.next - level.base)) * 100) : 100;
  return <section className={`player-panel ${compact ? 'compact' : ''}`} aria-label="تقدمك">
    <div className="player-heading"><span className="rank-glyph"><Sparkles size={21} strokeWidth={1.5} /></span><div><small>مستواك الحالي</small><strong>{level.name}</strong></div><div className="xp-total"><strong>{progress.xp}</strong><span lang="en">XP</span></div></div>
    <Progress value={percentage} aria-label="تقدم نقاط المشاركة" />
    <p className="xp-next">{level.next ? <><b>{level.next - progress.xp}</b> نقطة للمستوى التالي</> : 'وصلت إلى أعلى مستوى. واصل التجربة.'}</p>
    {!compact && <div className="player-stats"><div><strong>{progress.ideas}</strong><span>أفكار منشورة</span></div><div><strong>{progress.reviews}</strong><span>أفكار ساهمت فيها</span></div></div>}
    {onProfile && <button className="panel-link" onClick={onProfile}>شاهد رحلتك <ArrowLeft size={17} /></button>}
  </section>;
}

export default function InnovationApp() {
  const openingPreview=useContext(SitePreviewContext);
  const [tab, setTab] = useState<Page>('home');
  const [data, setData] = useState<AppData>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [compose, setCompose] = useState<Challenge | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ id: '', title: '', body: '' });
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');
  const [missionIndex, setMissionIndex] = useState<number | null>(null);
  const [choosingAngle, setChoosingAngle] = useState(false);
  const [weekFilter,setWeekFilter]=useState('current');
  const [angleFilter,setAngleFilter]=useState('all');
  const [sort,setSort]=useState('newest');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [leaderPage,setLeaderPage]=useState(1);
  const [commentPage,setCommentPage]=useState(1);
  const [openedIdea,setOpenedIdea]=useState<Idea|null>(null);
  const [tick,setTick]=useState(Date.now());
  const [closedWeek,setClosedWeek]=useState<Challenge|null>(null);
  const observedWeek=useRef<Challenge|null>(null);
  const serverOffset=useRef(0);
  const queryRef=useRef(new URLSearchParams());
  const commentId = useRef('');
  const origin = useRef<HTMLElement | null>(null);
  const transition = useRef<{ skipTransition: () => void } | null>(null);
  const mutationLock = useRef(false);
  const refreshVersion = useRef(0);
  const pendingResume = useRef<Resume | null>(null);
  const active = data.focusedIdea?.id===selected ? data.focusedIdea : openedIdea?.id===selected?openedIdea: data.ideas.find((idea) => idea.id === selected);
  const mission = data.weekly.current ?? (loading ? currentChallenge() : null);
  const angle=missionIndex === null ? undefined : mission?.angles[missionIndex];
  const headline=mission?.title.match(/^(.*?[؟…])\s*(.*)$/);
  const feed=data.ideas;
  const remaining=mission?Math.max(0,new Date(mission.endsAt).getTime()-tick):0;
  const timeLeft=remaining>0 ? `${Math.floor(remaining/86400000)} يوم · ${Math.floor(remaining/3600000)%24} ساعة · ${Math.floor(remaining/60000)%60} دقيقة` : 'أُغلق التحدّي';
  queryRef.current=new URLSearchParams({week:weekFilter,scope:filter,angle:angleFilter,sort,q:search,page:String(page),leaderPage:String(leaderPage),commentPage:String(commentPage)});
  if(selected)queryRef.current.set('idea',selected);
  const queryKey=queryRef.current.toString();

  const refresh = useCallback(async (): Promise<AppData | null> => {
    if (mutationLock.current) return null;
    const version = ++refreshVersion.current;
    try {
      const result = await requestCommunity(undefined,queryRef.current,openingPreview) as AppData;
      if (version !== refreshVersion.current) return null;
      if (result.activityVersion) { try { clearLegacyDrafts(localStorage); } catch {} }
      const serverTime=Date.parse(result.weekly.serverNow);
      if(Number.isFinite(serverTime)){serverOffset.current=serverTime-Date.now();setTick(serverTime);}
      setData(result); setError(''); return result;
    } catch (caught) {
      if (version === refreshVersion.current) {
        if (caught instanceof SignInRequired) setData(current => ({ ...current, signedIn: false }));
        setError(caught instanceof Error ? caught.message : 'تعذّر تحميل المساحة.');
      }
      return null;
    } finally { if (version === refreshVersion.current) setLoading(false); }
  }, [openingPreview]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void getAuth().then(({ client }) => {
      if (disposed) return;
      const { data: subscription } = client.auth.onAuthStateChange(event => {
        // Leave the auth callback before asking the SDK for its session.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => {
          if (disposed) return;
          if (event === 'SIGNED_OUT') { setData(initial); setSelected(null); setCompose(null); }
          void refresh();
        }, 0);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    }).catch(() => {});
    return () => { disposed = true; unsubscribe?.(); };
  }, [refresh]);

  useEffect(() => {
    const resume = readResume(window.location.search);
    pendingResume.current = resume;
    if(resume.week && findWeek(resume.week)){setWeekFilter(resume.week);queryRef.current.set('week',resume.week);}
    setTab(resume.view);if(resume.idea||resume.edit){setSelected(resume.idea??resume.edit??null);queryRef.current.set('idea',resume.idea??resume.edit!);}
    void refresh();
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onBack = () => {
      const destination = readResume(window.location.search);
      setWeekFilter(destination.week && findWeek(destination.week) ? destination.week : 'current');
      setTab(destination.view); setCompose(null); setSelected(null);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('popstate', onBack);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('popstate', onBack); };
  }, [refresh]);

  useEffect(() => {
    const resume = pendingResume.current;
    if (!resume || loading || error || (data.signedIn && !data.profile)) return;
    pendingResume.current = null;
    const challenge = weeklyChallenges.find(item => item.id === resume.compose);
    const idea = data.focusedIdea??data.ideas.find(item => item.id === (resume.edit ?? resume.idea));
    if (challenge) start(challenge,undefined,resume.angle);
    else if (idea && resume.edit && idea.isOwn && findWeek(idea.challenge_id)) start(findWeek(idea.challenge_id)!, idea);
    else if (idea) openIdea(idea);
    else if (data.signedIn && (resume.idea || resume.edit)) toast.error('هذه الفكرة غير متاحة في القائمة الحالية.');
    if (data.signedIn) {
      const destination = challenge && !challenge.angles.some(item => item.id === resume.angle) ? 'home' : resume.view;
      const params = new URLSearchParams({view:destination});
      if(resume.week && findWeek(resume.week))params.set('week',resume.week);
      window.history.replaceState(null, '', '/?' + params);
    }
  }, [data, error, loading]);

  useEffect(() => {
    if (compose && draft.id) storage.set(editing ? 'ftc-edit-' + draft.id : 'ftc-draft-' + compose.id + '-' + draft.angleId, JSON.stringify(draft));
  }, [compose, editing, draft]);
  useEffect(() => {
    if (!selected) return;
    if (comment) {
      commentId.current ||= newId();
      storage.set('ftc-comment-' + selected, JSON.stringify({ id: commentId.current, body: comment }));
    } else storage.remove('ftc-comment-' + selected);
  }, [selected, comment]);
  useEffect(() => {
    setProfileName(data.profile?.displayName ?? '');
    if (data.profile) setProfileError('');
  }, [data.profile?.displayName]);

  useEffect(()=>{const timer=setTimeout(()=>{if(!selected)setLoading(true);void refresh();},search?250:0);return()=>clearTimeout(timer);},[queryKey,refresh]);
  useEffect(()=>{const timer=setInterval(()=>{
    const now=Date.now()+serverOffset.current;setTick(now);
    if(document.visibilityState==='visible'&&(tab==='leaderboard'||tab==='ideas'||(mission&&Date.parse(mission.endsAt)<=now)))void refresh();
  },30000);return()=>clearInterval(timer);},[tab,refresh,mission?.endsAt]);
  useEffect(()=>{
    if(!mission)return;
    const delay=Date.parse(mission.endsAt)-(Date.now()+serverOffset.current);
    if(delay<=0){void refresh();return;}
    const timer=setTimeout(()=>{setTick(Date.parse(mission.endsAt));void refresh();},Math.min(delay+100,2147483647));
    return()=>clearTimeout(timer);
  },[mission?.id,mission?.endsAt,data.weekly.serverNow,refresh]);
  useEffect(()=>{
    if(loading||error)return;
    const previous=observedWeek.current;
    const current=data.weekly.current;
    if(previous&&previous.id!==current?.id&&previous.endsAt<=data.weekly.serverNow){
      setClosedWeek(previous);
      if(compose?.id===previous.id){
        setCompose(null);setFormError('');
        toast.info('انتهى وقت التحدّي. مسودتك محفوظة لهذا الأسبوع، والتحدّي الجديد له مشاركة جديدة.');
      }
    }
    observedWeek.current=current;
  },[data.weekly.current?.id,data.weekly.serverNow,loading,error]);

  useEffect(() => { setMissionIndex(null); }, [mission?.id]);
  useEffect(() => {
    if (!choosingAngle || tab !== 'home' || !mission) return;
    const frame = requestAnimationFrame(() => {
      const first = document.querySelector<HTMLButtonElement>('.mission-options button');
      first?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      first?.focus({ preventScroll: true });
      setChoosingAngle(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [choosingAngle, tab, mission?.id]);

  function chooseAngle() {
    setChoosingAngle(true);
    if (tab !== 'home') changeTab('home');
  }

  function changeTab(value: string, weekId?:string) {
    if (!nav.some(item => item.id === value)) return;
    if (value === tab&&!weekId) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    transition.current?.skipTransition();
    const update = () => {
      flushSync(() => setTab(value as Page));
      const params=new URLSearchParams({view:value});
      const archive=weekId??weekFilter;
      if((value==='leaderboard'||value==='ideas')&&findWeek(archive))params.set('week',archive);
      window.history.pushState(null, '', '/?' + params);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { skipTransition: () => void; ready: Promise<void>; finished: Promise<void> } };
    if (doc.startViewTransition && document.visibilityState === 'visible' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const scene = doc.startViewTransition(update);
      transition.current = scene;
      void scene.ready.catch(() => {});
      void scene.finished.catch(() => {}).then(() => { if (transition.current === scene) transition.current = null; });
    } else update();
    if(value==='home'){setWeekFilter('current');setFilter('all');setAngleFilter('all');setSearch('');setSort('newest');setPage(1);setLeaderPage(1);}
    if(weekId){setWeekFilter(weekId);setLeaderPage(1);}
    else if(value==='leaderboard' && (weekFilter==='legacy'||weekFilter==='all')){setWeekFilter('current');setLeaderPage(1);}
    void refresh();
  }
  function showClosedResults(week:Challenge){
    setWeekFilter(week.id);setLeaderPage(1);setSelected(null);setCompose(null);
    changeTab('leaderboard',week.id);
  }
  function rememberOrigin() {
    const element = document.activeElement as HTMLElement;
    if (element && !element.closest('[role="dialog"]')) origin.current = element;
  }
  function restoreFocus(event: Event) {
    event.preventDefault();
    requestAnimationFrame(() => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (origin.current?.isConnected) origin.current.focus({ preventScroll: true });
      else (document.querySelector('.main-nav [data-state="active"]') as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }
  function start(challenge: Challenge, idea?: Idea, angleId=angle?.id) {
    if(currentChallenge()?.id!==challenge.id){toast.error('أُغلق هذا التحدّي. انتظر تحدّي الأسبوع القادم.');return;}
    if(mission?.id===challenge.id&&!mission.angles.length){changeTab('home');toast('نفتح سؤال الأسبوع معًا بعد اكتمال قصّ الشريط.');return;}
    const chosen = challenge.angles.find(item => item.id === (idea?.angle_id ?? angleId));
    if (!chosen) { chooseAngle(); return; }
    angleId = chosen.id;
    setMissionIndex(challenge.angles.findIndex(item => item.id === chosen.id));
    rememberOrigin(); setSelected(null); setEditing(Boolean(idea)); setFormError('');
    const saved = readIdeaDraft(storage.get(idea ? 'ftc-edit-' + idea.id : 'ftc-draft-' + challenge.id + '-' + angleId));
    const value: Draft = saved && (!idea || saved.id === idea.id) ? saved : idea
      ? { id: idea.id, title: idea.title, body: idea.body,angleId:idea.angle_id??angleId }
      : { id: newId(), title: '', body: '',angleId };
    setDraft({...value,angleId:value.angleId??angleId}); setCompose(challenge);
  }
  function openIdea(idea: Idea, focusComment = false) {
    rememberOrigin(); setOpenedIdea(idea); setSelected(idea.id);setCommentPage(1); setComment(''); commentId.current = ''; setFormError('');
    try {
      const saved = JSON.parse(storage.get('ftc-comment-' + idea.id) ?? 'null');
      const validated = saved && readIdeaDraft(JSON.stringify({ id: saved.id, title: '', body: saved.body }));
      if (validated && validated.body.length <= 1000) { setComment(validated.body); commentId.current = validated.id; }
    } catch {}
    if (focusComment) requestAnimationFrame(() => {
      const input = document.getElementById('comment-body');
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  function handleFailure(caught: unknown) {
    if (caught instanceof SignInRequired) setData(current => ({ ...current, signedIn: false }));
    return caught instanceof Error ? caught.message : 'تعذّر الحفظ. مسودتك باقية.';
  }
  async function mutate(body: unknown) {
    ++refreshVersion.current;
    const result = await requestCommunity(body,queryRef.current,openingPreview) as { community?: AppData; ideaId?: string };
    if (!result.community?.signedIn) throw new Error('ما تأكدنا من الحفظ. أعد المحاولة؛ مسودتك باقية.');
    ++refreshVersion.current;
    setData(result.community); setError(''); setLoading(false);
    return result.community;
  }
  async function saveIdea(event: FormEvent) {
    event.preventDefault(); if (!compose || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setFormError('');
    try {
      const beforeXp=data.progress.xp;
      const result = await mutate({ ...draft, action: editing ? 'edit' : 'idea', challengeId: compose.id });
      const saved = result.focusedIdea??result.ideas.find(idea => idea.id === draft.id)!;
      storage.remove(editing ? 'ftc-edit-' + draft.id : 'ftc-draft-' + compose.id + '-' + draft.angleId);
      setCompose(null); openIdea(saved);
      toast.success(editing ? 'تم حفظ تطوير فكرتك.' : 'فكرتك صارت جزءًا من المساحة.', { description: !editing && result.progress.xp-beforeXp>=20 ? '+20 نقطة. بداية تستحق الاحتفاء.' : undefined });
    } catch (caught) { setFormError(handleFailure(caught)); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  async function react(idea: Idea) {
    if (mutationLock.current || idea.isOwn) return;
    if (!data.signedIn) { openIdea(idea); return; }
    mutationLock.current = true; setBusy(true);
    try { await mutate({ action: 'react', ideaId: idea.id, liked: !idea.liked }); }
    catch (caught) {
      const message = handleFailure(caught);
      if (caught instanceof SignInRequired && !selected) openIdea(idea);
      toast.error(message);
    } finally { mutationLock.current = false; setBusy(false); }
  }
  async function saveComment(event: FormEvent) {
    event.preventDefault(); if (!active || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setFormError(''); commentId.current ||= newId();
    try {
      const updated=await mutate({ action: 'comment', id: commentId.current, ideaId: active.id, body: comment });
      setCommentPage(Math.max(1,Math.ceil((updated.focusedIdea?.commentCount??0)/20)));
      storage.remove('ftc-comment-' + active.id);
      setComment(''); commentId.current = '';
      toast.success('وصل تعليقك للفكرة.');
    } catch (caught) { setFormError(handleFailure(caught)); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (mutationLock.current) return;
    const wasMissing = !data.profile;
    mutationLock.current = true; setBusy(true); setProfileError('');
    try {
      const result = await mutate({ action: 'profile', displayName: profileName });
      setProfileName(result.profile?.displayName ?? '');
      toast.success(wasMissing ? 'تم حفظ اسمك. حيّاك في ابتكر.' : 'تم تحديث اسمك في كل مشاركاتك.');
    } catch (caught) {
      setProfileError(handleFailure(caught));
    } finally {
      mutationLock.current = false; setBusy(false);
    }
  }

  async function logout() {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try {
      await signOut();
      ++refreshVersion.current;
      setData(initial); setSelected(null); setCompose(null); setError('');
      toast.success('تم تسجيل الخروج.');
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'تعذّر تسجيل الخروج.'); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  function moveSpotlight(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rectangle.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rectangle.top}px`);
  }

  useEffect(() => {
    type ModelContext={registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown};
    const context=(document as Document & {modelContext?:ModelContext}).modelContext;if(!context)return;
    const controller=new AbortController();
    try{context.registerTool({name:'read_weekly_challenge',description:'Read the currently revealed weekly challenge. Does not submit, vote, or bypass the ribbon.',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true},execute:()=>({challenge:data.weekly.current})},{signal:controller.signal});}catch{}
    return()=>controller.abort();
  },[data.weekly.current]);

  const ideaCards = (items: Idea[]) => items.map((idea) => <IdeaCard key={idea.id} idea={idea} busy={busy} onOpen={openIdea} onReact={(item) => void react(item)} />);

  return <>
    <Toaster dir="rtl" position="bottom-center" richColors />
    <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
    <div className="scroll-meter" aria-hidden="true"><span /></div>
    <Tabs dir="rtl" value={tab} onValueChange={changeTab} className="app-shell">
      <header className="site-header"><div className="header-inner">
        <button className="brand" onClick={() => changeTab('home')} aria-label="ابتكر، الرئيسية"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل" width="90" height="48" /><span className="brand-cut" /><span className="brand-product"><strong>ابتكر<span>▪</span></strong><small>لجنة الابتكار</small></span></button>
        <TabsList className="main-nav" aria-label="التنقل الرئيسي" data-page={tab}><span className="nav-active" aria-hidden="true" />{nav.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
        <div className="header-end"><span className="beta-label">نسخة تجريبية</span><ThemeToggle />{data.signedIn && <button className="header-login" disabled={busy} onClick={() => void logout()}>خروج</button>}{!loading && !data.signedIn ? <a className="header-login" href={signInHref({ view: tab, ...(findWeek(weekFilter)?{week:weekFilter}:{}) })} target="_top">دخول <ArrowUpLeft size={17} /></a> : <button className="header-xp" onClick={() => changeTab('profile')} aria-label={`رحلتك، ${data.progress.xp} نقطة`}><Sparkles size={15} /><b>{data.progress.xp}</b><span lang="en">XP</span></button>}</div>
      </div></header>

      <main className="workspace" id="main-content" data-activity-version={data.activityVersion} tabIndex={-1}>
        {error && <div className="system-banner error" role="alert"><span>{error}</span><button onClick={() => void refresh()}>إعادة المحاولة</button></div>}
        {closedWeek&&<div className="week-change-notice" role="status"><Trophy size={22}/><div><strong>انتهى تحدّي الأسبوع {closedWeek.number}.</strong><p>{data.weekly.current?'النتائج محفوظة، والتحدّي الجديد جاهز.':'النتائج محفوظة. ننتظرك في التحدّي القادم.'}</p></div><Button className="outline-button" onClick={()=>showClosedResults(closedWeek)}>شاهد النتائج</Button><button className="week-notice-close" aria-label="إغلاق إشعار نهاية الأسبوع" onClick={()=>setClosedWeek(null)}><X size={18}/></button></div>}
        <TabsContent value="home" className="page-stage">
          <WeeklyChallengeGate week={mission} isOpen={data.weekly.current?.id===mission?.id?data.weekly.ribbonOpen:undefined} onOpen={()=>{void refresh();}}>
          <div className="workspace-label"><span>مشكلة واحدة · ثلاث زوايا</span><span lang="en" dir="ltr">FTC / IBTKR</span></div>
          {mission ? <section className="mission-layout weekly-layout" aria-label="تحدّي الأسبوع">
            <article key={mission.id} className="mission-hero tone-violet" onPointerMove={moveSpotlight}>
              <div className="hero-grid" aria-hidden="true"/>
              <div className="mission-topline"><span className="week-marker"><span>الأسبوع</span><b className="week-number" dir="ltr">{mission.number}</b></span><span className="week-status"><Clock3 size={15}/> ينتهي الجمعة، ١١:٥٩ م</span></div>
              <div className="mission-copy"><span className="mission-type">{mission.category}</span><h1>{headline ? <><span>{headline[1]}</span><span>{headline[2]}</span></> : mission.title}</h1><p>{mission.description}</p></div>
              <div aria-live="polite">{angle ? <div className="selected-angle" key={angle.id}><span className={`angle-tag tone-${palette[mission.angles.indexOf(angle)]}`}>{angle.label}</span><p>{angle.prompt}</p></div> : <p className="angle-invitation">اختر زاوية من القائمة، وبيظهر سؤالها هنا.</p>}</div>
              <div className="mission-controls"><Button className="launch-button" onClick={()=>start(mission)}>{angle ? 'شارك حلّك' : 'اختر زاويتك'}</Button></div>
              <div className="mission-footer"><span>تحدّي جديد السبت، ١٢:٠٠ ص بتوقيت الرياض.</span><span className="weekly-countdown" aria-label="الوقت المتبقي">{timeLeft}</span></div>
            </article>
            <aside className="command-stack">
              <section className="mission-selector"><div className="panel-top"><h2>من أي زاوية تبدأ؟</h2><span dir="ltr">01—03</span></div><div className="mission-options">{mission.angles.map((item,index)=>{const Icon=icons[item.icon];return <button key={item.id} className={`mission-option tone-${palette[index]}`} aria-pressed={missionIndex===index} onClick={()=>setMissionIndex(index)}><span className="option-number">0{index+1}</span><span className="option-copy"><strong>{item.label}</strong><small>{index===missionIndex?'زاويتك المختارة':angle?'نفس المشكلة، منظور مختلف':'اختر هالزاوية'}</small></span><Icon size={20} strokeWidth={1.5}/></button>})}</div><div className="angle-hint" key={angle?.id}><Lightbulb size={18}/><p>{angle?.hint ?? 'كل زاوية تفتح لك طريقة مختلفة للحل.'}</p></div></section>
              <section className="weekly-score-panel"><Trophy size={23}/><div><small>{data.signedIn?'مشاركتك هذا الأسبوع':'مبتكر الأسبوع'}</small><strong>{data.signedIn?`${data.weekly.ownEntries} مشاركة · ${data.weekly.ownLikes} إعجاب`:'باختيار المجتمع'}</strong></div><button className="panel-link" onClick={()=>changeTab('leaderboard')}>شاهد المتصدرين</button></section>
            </aside>
          </section> : <section className="waiting-week"><Trophy size={36}/><span className="eyebrow">موعدنا مع تحدّي جديد</span><h1>الأسبوع القادم… زاوية جديدة.</h1><p>أُغلقت المشاركة والتصويت. نتائج الأسبوع محفوظة، والتحدّي القادم يظهر عند موعد نشره.</p><Button className="launch-button" onClick={()=>changeTab('leaderboard')}>نتائج الأسبوع</Button></section>}
          <Reveal className="community-preview section-block"><div className="section-heading"><div><span className="eyebrow">من المجتمع</span><h2>فكرة منك.<br/><span>وزاوية من غيرك.</span></h2></div><div className="section-aside"><p>اقرأ الحلول، ناقشها، وصوّت للفكرة اللي تلفتك.</p><button className="text-link" onClick={()=>{setWeekFilter('current');setAngleFilter('all');setSearch('');setPage(1);setFilter('all');changeTab('ideas')}}>شاهد المشاركات</button></div></div>{loading?<Skeleton className="feed-skeleton"/>:!data.signedIn?!error&&<SignInNotice href={signInHref({view:'ideas',...(findWeek(weekFilter)?{week:weekFilter}:{})})}/>:data.ideas.length?<div className="idea-grid">{ideaCards(data.ideas.slice(0,3))}</div>:<EmptyState onStart={()=>changeTab('home')}/>}</Reveal>
          </WeeklyChallengeGate>
        </TabsContent>

        <TabsContent value="ideas" className="page-stage"><header className="page-header"><div><span className="eyebrow">حلول المجتمع</span><h1>نفس المشكلة.<br/>أفكار ما تتشابه.</h1></div>{mission&&<Button className="launch-button" onClick={()=>start(mission)}>شارك حلّك <Plus size={20}/></Button>}</header>
          <div className="community-controls"><div className="search-field"><Search size={18}/><Input aria-label="ابحث بالعنوان أو المشارك" placeholder="ابحث عن فكرة أو مشارك…" value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}}/></div><div className="filter-selects"><label>الأسبوع<NativeSelect value={weekFilter} onChange={event=>{setWeekFilter(event.target.value);setAngleFilter('all');setPage(1);setLeaderPage(1)}}><NativeSelectOption value="current">الأسبوع الحالي</NativeSelectOption>{data.weekly.weeks.map(week=><NativeSelectOption key={week.id} value={week.id}>الأسبوع {week.number} · {week.title}</NativeSelectOption>)}<NativeSelectOption value="all">كل الأسابيع</NativeSelectOption></NativeSelect></label><label>الزاوية<NativeSelect value={angleFilter} onChange={event=>{setAngleFilter(event.target.value);setPage(1)}}><NativeSelectOption value="all">كل الزوايا</NativeSelectOption>{weeklyChallenges[0].angles.map(item=><NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelect></label><label>الترتيب<NativeSelect value={sort} onChange={event=>{setSort(event.target.value);setPage(1)}}><NativeSelectOption value="newest">الأحدث</NativeSelectOption><NativeSelectOption value="popular">الأكثر إعجابًا</NativeSelectOption></NativeSelect></label></div></div>
          <Tabs dir="rtl" value={filter} onValueChange={value=>{setFilter(value);setPage(1)}} className="feed-tabs"><div className="feed-toolbar"><TabsList aria-label="تصفية المشاركات"><TabsTrigger value="all">كل المشاركات</TabsTrigger><TabsTrigger value="mine">مشاركاتي</TabsTrigger></TabsList><span aria-live="polite">{loading?'جارٍ التحميل…':`${data.pagination.total} مشاركة`}</span></div><TabsContent value={filter} key={filter+'-'+page} className="feed-content">{loading?<Skeleton className="feed-skeleton"/>:!data.signedIn?!error&&<SignInNotice href={signInHref({view:'ideas',...(findWeek(weekFilter)?{week:weekFilter}:{})})}/>:feed.length?<><div className="idea-grid">{ideaCards(feed)}</div><PageControls page={data.pagination.page} pages={data.pagination.pages} onPage={setPage}/></>:<div className="empty-state"><Lightbulb size={28}/><div><strong>ما فيه مشاركات تطابق اختيارك.</strong><p>جرّب تغيير البحث أو الزاوية، أو ابدأ بحلّك.</p></div><Button className="outline-button" onClick={()=>{setSearch('');setAngleFilter('all');setFilter('all');setPage(1)}}>عرض كل المشاركات</Button></div>}</TabsContent></Tabs>
        </TabsContent>

        <TabsContent value="leaderboard" className="page-stage"><header className="page-header"><div><span className="eyebrow">باختيار المجتمع</span><h1>{data.weekly.finalized?'مبتكر الأسبوع.':'من يتصدّر الأسبوع؟'}</h1></div><label className="leader-week-select">الأسبوع<NativeSelect value={weekFilter} onChange={event=>{setWeekFilter(event.target.value);setLeaderPage(1)}}><NativeSelectOption value="current">الأسبوع الحالي</NativeSelectOption>{data.weekly.weeks.map(week=><NativeSelectOption key={week.id} value={week.id}>الأسبوع {week.number}</NativeSelectOption>)}</NativeSelect></label></header>
          <section className="leader-summary"><span className="rank-glyph"><Trophy size={27}/></span><div><strong>{data.weekly.selected?.title??'بانتظار التحدّي القادم'}</strong><p>{data.weekly.finalized?'نتيجة نهائية، محفوظة بعد إغلاق التصويت.':'ترتيب مباشر حتى الجمعة، ١١:٥٩ م بتوقيت الرياض.'}</p></div><span className="result-state">{data.weekly.finalized?'النتيجة النهائية':'التصويت مفتوح'}</span></section>
          <p className="ranking-rule">الترتيب حسب مجموع الإعجابات على كل حلول المشارك لهذا التحدّي، في جميع الزوايا. إعجاب واحد لكل حساب على كل حل، بدون التصويت لنفسك. عند التعادل يشترك المشاركون في المركز.</p>
          {loading?<Skeleton className="feed-skeleton"/>:data.weekly.leaders.length?<><div className="leader-list" role="list">{data.weekly.leaders.map((entry,index)=><article className={'leader-row'+(entry.rank===1&&entry.likes>0?' leading':'')} role="listitem" key={entry.name}><span className="leader-rank">{entry.rank===1&&entry.likes>0?<Trophy size={24}/>:entry.rank}</span><span className="avatar">{entry.name.charAt(0)}</span><div className="leader-name"><strong>{entry.name}{entry.isOwn&&<small>أنت</small>}</strong><span>{entry.entries} مشاركة{data.weekly.finalized&&entry.rank===1&&entry.likes>0?' · مبتكر الأسبوع':''}</span></div><span className="leader-likes"><Heart size={18}/><strong>{entry.likes}</strong><span>إعجاب</span></span></article>)}</div><PageControls page={data.weekly.leaderPage} pages={Math.max(1,Math.ceil(data.weekly.leaderTotal/20))} onPage={setLeaderPage}/>{data.weekly.finalized&&!data.weekly.leaders.some(entry=>entry.likes>0)&&data.weekly.leaderPage===1&&<p className="ranking-rule">ما وصل أي إعجاب لهذا الأسبوع، لذلك ما تم اختيار فائز.</p>}</>:<div className="empty-state"><Trophy size={30}/><div><strong>{data.weekly.finalized?'انتهى الأسبوع بدون مشاركات.':'المركز الأول ينتظر أول فكرة.'}</strong><p>النتائج هنا من مشاركات المجتمع الفعلية.</p></div></div>}
        </TabsContent>

        <TabsContent value="profile" className="page-stage"><header className="page-header"><div><span className="eyebrow">رحلتك في ابتكر</span><h1>كل فكرة تترك أثرًا.</h1></div><p>{data.profile ? `أهلًا ${data.profile.displayName}. ` : ''}هنا تقدّمك ونقاط مشاركتك.<br />ترتيب الأسبوع يعتمد على إعجابات المجتمع.</p></header>{!loading && !data.signedIn ? !error && <SignInNotice href={signInHref({ view: 'profile' })} /> : <div className="profile-layout">{loading ? <Skeleton className="panel-skeleton" /> : <PlayerPanel progress={data.progress} />}<section className="achievement-panel"><div className="panel-top"><h2>محطاتك</h2><span dir="ltr">{[data.progress.ideas > 0, data.progress.reviews >= 3, data.progress.xp >= 100].filter(Boolean).length} / 3</span></div><div className="achievement-grid">{[{ icon: Lightbulb, name: 'أول شرارة', copy: 'شارك فكرتك الأولى', done: data.progress.ideas > 0 }, { icon: MessageCircle, name: 'عين مساعدة', copy: 'ساهم في 3 أفكار لغيرك', done: data.progress.reviews >= 3 }, { icon: Sparkles, name: 'صانع أفكار', copy: 'اجمع 100 نقطة', done: data.progress.xp >= 100 }].map((badge, index) => <article key={badge.name} className={badge.done ? 'unlocked' : ''}><span className="badge-number" aria-hidden="true">0{index + 1}</span><span className="badge-icon"><badge.icon size={28} strokeWidth={1.4} /></span><strong>{badge.name}</strong><p>{badge.copy}</p><small>{badge.done ? <><Check size={14} /> حقّقتها</> : 'بانتظارك'}</small></article>)}</div></section></div>}{data.signedIn && data.profile && <section className="profile-name-panel"><div><span className="eyebrow">اسمك في المجتمع</span><h2>{data.profile.displayName}</h2><p>هذا الاسم يظهر مع أفكارك ومساهماتك، وما يقدر شخص ثاني يستخدمه.</p></div><form onSubmit={saveProfile}><label htmlFor="profile-name">تغيير الاسم</label><div className="profile-name-edit"><Input id="profile-name" autoComplete="nickname" required minLength={2} maxLength={30} disabled={busy} value={profileName} onChange={(event) => { setProfileName(event.target.value); setProfileError(''); }} /><Button className="outline-button" type="submit" disabled={busy || profileName.trim() === data.profile.displayName}>{busy ? 'جارٍ الحفظ…' : 'حفظ الاسم'}</Button></div>{profileError && <p className="form-error" role="alert">{profileError}</p>}</form></section>}<Reveal className="xp-rule"><span><Sparkles size={20} /> كيف تجمع النقاط؟</span><p><b dir="ltr">20 XP</b> لأول حل في كل تحدّي أسبوعي. <b dir="ltr">5 XP</b> لأول مساهمة في فكرة شخص آخر. نقاط المشاركة منفصلة عن ترتيب الإعجابات.</p></Reveal>{data.signedIn&&<section className="profile-ideas section-block"><div className="section-heading"><h2>كل مشاركاتك.</h2><Button className="outline-button" onClick={()=>{setFilter('mine');setWeekFilter('all');setPage(1);changeTab('ideas')}}>شاهد مشاركاتي</Button></div><p>هذا الأسبوع: {data.weekly.ownEntries} مشاركة · {data.weekly.ownLikes} إعجاب</p></section>}</TabsContent>
      </main>

      <footer className="site-footer"><div><img src="/assets/ftc-logo.svg" alt="" width="72" height="40" /><span>ابتكر · لجنة الابتكار</span></div><span>الفكرة القادمة قد تبدأ منك.</span><a href="https://ftcksu.com/" target="_blank" rel="noreferrer">نادي تقنية المستقبل <ArrowUpLeft size={16} /></a></footer>
    </Tabs>

    <Dialog open={Boolean(data.signedIn && !loading && !data.profile)}>
      <DialogContent className="ftc-dialog profile-setup" dir="rtl" showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <div className="dialog-sequence"><span>خطوة واحدة</span></div>
        <DialogTitle className="dialog-title">كيف تحب نناديك هنا؟</DialogTitle>
        <DialogDescription className="dialog-description">هذا الاسم بيظهر مع أفكارك ومساهماتك، وما يقدر شخص ثاني يستخدمه.</DialogDescription>
        <form className="idea-form" onSubmit={saveProfile}>
          <div className="form-field"><label htmlFor="first-profile-name">الاسم الظاهر</label><Input id="first-profile-name" autoComplete="nickname" autoFocus required minLength={2} maxLength={30} disabled={busy} value={profileName} placeholder="اسمك في المجتمع" onChange={(event) => { setProfileName(event.target.value); setProfileError(''); }} /></div>
          <p className="auth-hint">من حرفين إلى 30 حرفًا. تقدر تغيّره لاحقًا من صفحة رحلتك.</p>
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          <div className="form-footer"><Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'ثبّت اسمي'} <ArrowUpLeft size={20} /></Button></div>
        </form>
      </DialogContent>
    </Dialog>


    <Dialog open={Boolean(compose)} onOpenChange={(open) => { if (!open && !busy) setCompose(null); }}><DialogContent className="ftc-dialog composer" dir="rtl" showCloseButton={false} onCloseAutoFocus={restoreFocus}><DialogClose disabled={busy} className="dialog-close" aria-label="إغلاق"><X size={20} /></DialogClose><div className="dialog-sequence"><span>{editing ? 'تطوير الفكرة' : 'بدايتك الجديدة'}</span><span>الأسبوع {compose?.number}</span></div><DialogTitle className="dialog-title">{editing ? 'خطوة أخرى لفكرتك.' : 'اكتبها كما هي الآن.'}</DialogTitle><DialogDescription className="dialog-description">{compose?.short}</DialogDescription><form className="idea-form" onSubmit={saveIdea}><div className="form-field"><label htmlFor="compose-angle">زاوية الحل</label><NativeSelect id="compose-angle" disabled={busy} value={draft.angleId ?? ''} onChange={event=>{if(editing)setDraft({...draft,angleId:event.target.value});else if(compose)start(compose,undefined,event.target.value)}}>{compose?.angles.map(item=><NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelect><p className="compose-prompt">{compose?.angles.find(item=>item.id===draft.angleId)?.prompt}</p></div><div className="form-field"><label htmlFor="idea-title">عنوان الفكرة</label><Input id="idea-title" disabled={busy} required minLength={2} maxLength={100} value={draft.title} placeholder="اسم قصير وواضح" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div><div className="form-field"><label htmlFor="idea-body">فكرتك <small>لا تحتاج إلى حل مكتمل</small></label><Textarea id="idea-body" disabled={busy} required minLength={10} maxLength={2000} rows={4} value={draft.body} placeholder="ما الذي ستغيّره؟ وكيف تعمل فكرتك؟" aria-describedby="draft-helper" onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></div><div className="form-helper" id="draft-helper"><span>{editing ? 'تقدر تعدّل حتى إغلاق التحدّي.' : 'مسودتك تُحفظ على هذا الجهاز.'}</span><span dir="ltr">{draft.body.length} / 2000</span></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="form-footer"><span><Lightbulb size={17} /> البداية أهم من الكمال</span>{data.signedIn ? <Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : editing ? 'احفظ التطوير' : 'شارك الفكرة'} <ArrowUpLeft size={20} /></Button> : <a className="launch-button signin-button" href={signInHref({ view: tab, ...(editing ? { edit: draft.id } : { compose: compose?.id, angle:draft.angleId }) })} target="_top">دخول للمشاركة <ArrowUpLeft size={20} /></a>}</div></form></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !busy) setSelected(null); }}><DialogContent className="ftc-dialog idea-dialog" dir="rtl" showCloseButton={false} onCloseAutoFocus={restoreFocus}><DialogClose disabled={busy} className="dialog-close" aria-label="إغلاق"><X size={20} /></DialogClose>{active && <><div className="dialog-sequence"><span>من المجتمع</span><span>{angleLabel(active.angle_id)}</span></div><DialogTitle className="dialog-title">{active.title}</DialogTitle><DialogDescription className="idea-author">فكرة {active.name} · {date(active.created_at)}</DialogDescription><p className="full-idea">{active.body}</p><div className="idea-detail-actions">{!data.signedIn && <a className="text-link" href={signInHref({ view: tab, idea: active.id })} target="_top">دخول للتشجيع والمشاركة <ArrowUpLeft size={18} /></a>}<button className={active.liked ? 'liked' : ''} aria-pressed={active.liked} disabled={busy || active.isOwn || !data.signedIn || currentChallenge()?.id!==active.challenge_id} title={active.isOwn ? 'هذه فكرتك؛ شجّع أفكار المشاركين الآخرين.' : undefined} onClick={() => void react(active)}><Heart size={18} fill={active.liked ? 'currentColor' : 'none'} />{active.likes} تشجيع</button>{active.isOwn && currentChallenge()?.id===active.challenge_id && <button onClick={() => start(findWeek(active.challenge_id)!, active)}><Pencil size={17} /> طوّر الفكرة</button>}</div><div className="comments-section"><h3>النقاش <span>{active.commentCount}</span></h3>{active.comments.length ? active.comments.map((entry) => <div className="comment" key={entry.id}><div><strong>{entry.name}</strong><time dateTime={entry.created_at}>{date(entry.created_at)}</time></div><p>{entry.body}</p></div>) : <p className="muted">سؤال صغير أو اقتراح منك قد يغيّر الفكرة.</p>}<PageControls page={data.discussion?.page??1} pages={data.discussion?.pages??1} onPage={setCommentPage}/><form onSubmit={saveComment} className="comment-form"><label htmlFor="comment-body">تعليقك</label><Textarea id="comment-body" disabled={busy} required minLength={5} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="سؤال أو اقتراح يحرّك الفكرة…" />{formError && <p className="form-error" role="alert">{formError}</p>}{data.signedIn ? <Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'أضف التعليق'} <MessageCircle size={18} /></Button> : <a className="launch-button signin-link" href={signInHref({ view: tab, idea: active.id })} target="_top">دخول للتعليق <ArrowUpLeft size={18} /></a>}</form></div></>}</DialogContent></Dialog>
  </>;
}
