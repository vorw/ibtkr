'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowUpLeft, Check, ChevronLeft, ChevronRight, Heart, Lightbulb, MessageCircle, Pencil, Plus, RotateCcw, Shuffle, Sparkles, Users, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { readResume, signInHref, readIdeaDraft, type IdeaDraft, type Page, type Resume } from '@/lib/participation';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { getAuth, sessionHeaders, signOut } from '@/lib/auth-client';
import { ThemeToggle } from './theme-toggle';
import { toast } from 'sonner';
import { challenges, type AppData, type Challenge, type Idea } from '@/lib/challenges';

const initial: AppData = { signedIn: false, ideas: [], progress: { xp: 0, ideas: 0, reviews: 0 }, profile: null };
type Draft = IdeaDraft;
class SignInRequired extends Error {}
const icons = { shuffle: Shuffle, flip: RotateCcw, people: Users };
const palette = ['violet', 'acid', 'signal'] as const;
const nav = [{ id: 'home', label: 'البداية' }, { id: 'challenges', label: 'المهمات' }, { id: 'ideas', label: 'المجتمع' }, { id: 'profile', label: 'رحلتك' }] as const;
const date = (value: string) => new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', calendar: 'gregory' }).format(new Date(value));
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

function ChallengeCard({ challenge, index, completed, onOpen }: { challenge: Challenge; index: number; completed: boolean; onOpen: (challenge: Challenge) => void }) {
  const Icon = icons[challenge.icon];
  return <button className={`mission-tile tone-${palette[index]}`} onClick={() => onOpen(challenge)}>
    <span className="tile-art"><span className="tile-number" aria-hidden="true">{challenge.number}</span><Icon size={32} strokeWidth={1.4} /><span className="tile-category">{challenge.category}</span></span>
    <span className="tile-content"><span className="tile-type">{challenge.type}{completed && <span className="participated"><Check size={14} /> شاركت</span>}</span><strong>{challenge.title}</strong><span className="tile-copy">{challenge.short}</span><span className="tile-action">استكشف المهمة <ArrowUpLeft size={20} /></span></span>
  </button>;
}

function IdeaCard({ idea, busy, onOpen, onReact }: { idea: Idea; busy: boolean; onOpen: (idea: Idea, focusComment?: boolean) => void; onReact: (idea: Idea) => void }) {
  const index = Math.max(0, challenges.findIndex((challenge) => challenge.id === idea.challenge_id));
  return <article className={`idea-card tone-${palette[index]}`}>
    <div className="idea-meta"><span className="avatar" aria-hidden="true">{idea.name.charAt(0)}</span><div><strong>{idea.name}</strong><time dateTime={idea.created_at}>{date(idea.created_at)}</time></div>{idea.isOwn && <small>فكرتك</small>}</div>
    <button className="idea-main" onClick={() => onOpen(idea)}><span>{challenges[index].type}</span><h3>{idea.title}</h3><p>{idea.body}</p></button>
    <div className="idea-actions"><button aria-label={idea.liked ? 'إلغاء التشجيع' : 'شجّع الفكرة'} aria-pressed={idea.liked} className={idea.liked ? 'liked' : ''} disabled={busy || idea.isOwn} title={idea.isOwn ? 'هذه فكرتك؛ شجّع أفكار المشاركين الآخرين.' : undefined} onClick={() => onReact(idea)}><Heart size={18} fill={idea.liked ? 'currentColor' : 'none'} /> <span>{idea.likes}</span></button><button aria-label={`${idea.comments.length} تعليقات، افتح النقاش`} onClick={() => onOpen(idea, true)}><MessageCircle size={18} /> {idea.comments.length}</button><button className="idea-open" onClick={() => onOpen(idea, true)}>أضف زاويتك <ArrowLeft size={17} /></button></div>
  </article>;
}

function EmptyState({ mine, onStart }: { mine?: boolean; onStart: () => void }) {
  return <div className="empty-state"><span className="empty-symbol" aria-hidden="true"><Lightbulb size={32} strokeWidth={1.4} /></span><div><strong>{mine ? 'أول فكرة لك تبدأ من هنا.' : 'المساحة لك. كن أول من يبدأ.'}</strong><p>اختر مهمة، واكتب بداية بسيطة. تقدر تطوّرها لاحقًا.</p></div><Button className="outline-button" onClick={onStart}>استكشف المهمات <ArrowLeft size={18} /></Button></div>;
}

function SignInNotice({ href, compact = false }: { href: string; compact?: boolean }) {
  return <div className={'signin-panel' + (compact ? ' compact' : '')}>
    <span className="rank-glyph" aria-hidden="true"><Users size={22} /></span>
    <div><strong>{compact ? 'خلّها بداية رحلتك.' : 'انضم لمساحة الأفكار.'}</strong><p>سجّل دخولك ببريدك الإلكتروني لمشاهدة المشاركات، وحفظ أفكارك وتقدّمك.</p></div>
    <a className="outline-button signin-link" href={href} target="_top">دخول للمجتمع <ArrowUpLeft size={18} /></a>
  </div>;
}

async function requestCommunity(body?: unknown) {
  const authorization = await sessionHeaders();
  let response: Response;
  try {
    response = await fetch('/api/community', {
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
  const [tab, setTab] = useState<Page>('home');
  const [data, setData] = useState<AppData>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Challenge | null>(null);
  const [twist, setTwist] = useState(false);
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
  const [missionIndex, setMissionIndex] = useState(0);
  const commentId = useRef('');
  const origin = useRef<HTMLElement | null>(null);
  const transition = useRef<{ skipTransition: () => void } | null>(null);
  const mutationLock = useRef(false);
  const refreshVersion = useRef(0);
  const pendingResume = useRef<Resume | null>(null);
  const active = data.ideas.find((idea) => idea.id === selected);
  const mission = challenges[missionIndex];
  const headline = mission.title.match(/^(.*?[؟…])\s*(.*)$/);
  const feed = filter === 'mine' ? data.ideas.filter((idea) => idea.isOwn) : data.ideas;
  const own = data.ideas.filter((idea) => idea.isOwn);

  const refresh = useCallback(async (): Promise<AppData | null> => {
    if (mutationLock.current) return null;
    const version = ++refreshVersion.current;
    try {
      const result = await requestCommunity() as AppData;
      if (version !== refreshVersion.current) return null;
      setData(result); setError(''); return result;
    } catch (caught) {
      if (version === refreshVersion.current) {
        if (caught instanceof SignInRequired) setData(current => ({ ...current, signedIn: false }));
        setError(caught instanceof Error ? caught.message : 'تعذّر تحميل المساحة.');
      }
      return null;
    } finally { if (version === refreshVersion.current) setLoading(false); }
  }, []);

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
    setTab(resume.view);
    void refresh();
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onBack = () => {
      const destination = readResume(window.location.search);
      setTab(destination.view); setCompose(null); setDetail(null); setSelected(null);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('popstate', onBack);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('popstate', onBack); };
  }, [refresh]);

  useEffect(() => {
    const resume = pendingResume.current;
    if (!resume || loading || error || (data.signedIn && !data.profile)) return;
    pendingResume.current = null;
    const challenge = challenges.find(item => item.id === resume.compose);
    const idea = data.ideas.find(item => item.id === (resume.edit ?? resume.idea));
    if (challenge) start(challenge);
    else if (idea && resume.edit && idea.isOwn) start(challenges.find(item => item.id === idea.challenge_id)!, idea);
    else if (idea) openIdea(idea);
    else if (data.signedIn && (resume.idea || resume.edit)) toast.error('هذه الفكرة غير متاحة في القائمة الحالية.');
    if (data.signedIn) window.history.replaceState(null, '', '/?view=' + resume.view);
  }, [data, error, loading]);

  useEffect(() => {
    if (compose && draft.id) storage.set(editing ? 'ftc-edit-' + draft.id : 'ftc-draft-' + compose.id, JSON.stringify(draft));
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

  function changeTab(value: string) {
    if (!nav.some(item => item.id === value)) return;
    if (value === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    transition.current?.skipTransition();
    const update = () => {
      flushSync(() => setTab(value as Page));
      window.history.pushState(null, '', '/?view=' + value);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { skipTransition: () => void; ready: Promise<void>; finished: Promise<void> } };
    if (doc.startViewTransition && document.visibilityState === 'visible' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const scene = doc.startViewTransition(update);
      transition.current = scene;
      void scene.ready.catch(() => {});
      void scene.finished.catch(() => {}).then(() => { if (transition.current === scene) transition.current = null; });
    } else update();
    if (value === 'ideas' || value === 'profile') void refresh();
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
  function start(challenge: Challenge, idea?: Idea) {
    rememberOrigin(); setDetail(null); setSelected(null); setEditing(Boolean(idea)); setFormError('');
    const saved = readIdeaDraft(storage.get(idea ? 'ftc-edit-' + idea.id : 'ftc-draft-' + challenge.id));
    const value: Draft = saved && (!idea || saved.id === idea.id) ? saved : idea
      ? { id: idea.id, title: idea.title, body: idea.body }
      : { id: newId(), title: '', body: '' };
    setDraft(value); setCompose(challenge);
  }
  function openChallenge(challenge: Challenge) { rememberOrigin(); setTwist(false); setDetail(challenge); }
  function openIdea(idea: Idea, focusComment = false) {
    rememberOrigin(); setSelected(idea.id); setComment(''); commentId.current = ''; setFormError('');
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
    const result = await requestCommunity(body) as { community?: AppData; ideaId?: string };
    if (!result.community?.signedIn) throw new Error('ما تأكدنا من الحفظ. أعد المحاولة؛ مسودتك باقية.');
    ++refreshVersion.current;
    setData(result.community); setError(''); setLoading(false);
    return result.community;
  }
  async function saveIdea(event: FormEvent) {
    event.preventDefault(); if (!compose || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setFormError('');
    try {
      const isNewChallenge = !own.some(idea => idea.challenge_id === compose.id);
      const result = await mutate({ ...draft, action: editing ? 'edit' : 'idea', challengeId: compose.id });
      const saved = result.ideas.find(idea => idea.id === draft.id)!;
      storage.remove(editing ? 'ftc-edit-' + draft.id : 'ftc-draft-' + compose.id);
      setCompose(null); openIdea(saved);
      toast.success(editing ? 'تم حفظ تطوير فكرتك.' : 'فكرتك صارت جزءًا من المساحة.', { description: !editing && isNewChallenge ? '+20 نقطة. بداية تستحق الاحتفاء.' : undefined });
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
      await mutate({ action: 'comment', id: commentId.current, ideaId: active.id, body: comment });
      storage.remove('ftc-comment-' + active.id);
      setComment(''); commentId.current = '';
      toast.success('وصلت زاويتك الجديدة للفكرة.');
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
      setData(initial); setSelected(null); setCompose(null); setDetail(null); setError('');
      toast.success('تم تسجيل الخروج.');
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'تعذّر تسجيل الخروج.'); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  function moveMission(direction: number) { setMissionIndex((current) => (current + direction + challenges.length) % challenges.length); }
  function moveMissionByArrow(side: 'right' | 'left') {
    const mobileLayout = window.matchMedia('(max-width: 760px)').matches;
    const direction = side === 'right'
      ? (mobileLayout ? -1 : 1)
      : (mobileLayout ? 1 : -1);
    moveMission(direction);
  }
  function moveSpotlight(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rectangle.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rectangle.top}px`);
  }

  useEffect(() => {
    type ModelContext = { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => unknown };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext; if (!context) return; const lifecycle = new AbortController();
    try {
      Promise.resolve(context.registerTool({ name: 'list_innovation_challenges', description: 'Read available FTC innovation challenges.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ challenges: challenges.map(({ id, title, description }) => ({ id, title, description })) }) }, { signal: lifecycle.signal })).catch(() => {});
      Promise.resolve(context.registerTool({ name: 'open_innovation_challenge', description: 'Open a challenge brief in the interface. Does not submit an idea.', inputSchema: { type: 'object', properties: { challengeId: { type: 'string', enum: challenges.map((challenge) => challenge.id) } }, required: ['challengeId'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: unknown) => { const challenge = challenges.find((item) => item.id === (input as { challengeId?: string })?.challengeId); if (!challenge) throw new Error('Unknown challenge'); flushSync(() => { setTwist(false); setDetail(challenge); }); return { opened: challenge.id }; } }, { signal: lifecycle.signal })).catch(() => {});
    } catch {} return () => lifecycle.abort();
  }, []);

  const ideaCards = (items: Idea[]) => items.map((idea) => <IdeaCard key={idea.id} idea={idea} busy={busy} onOpen={openIdea} onReact={(item) => void react(item)} />);

  return <>
    <Toaster dir="rtl" position="bottom-center" richColors />
    <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
    <div className="scroll-meter" aria-hidden="true"><span /></div>
    <Tabs dir="rtl" value={tab} onValueChange={changeTab} className="app-shell">
      <header className="site-header"><div className="header-inner">
        <button className="brand" onClick={() => changeTab('home')} aria-label="ابتكر، الرئيسية"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل" width="90" height="48" /><span className="brand-cut" /><span className="brand-product"><strong>ابتكر<span>▪</span></strong><small>لجنة الابتكار</small></span></button>
        <TabsList className="main-nav" aria-label="التنقل الرئيسي" data-page={tab}><span className="nav-active" aria-hidden="true" />{nav.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
        <div className="header-end"><span className="beta-label">نسخة تجريبية</span><ThemeToggle />{data.signedIn && <button className="header-login" disabled={busy} onClick={() => void logout()}>خروج</button>}{!loading && !data.signedIn ? <a className="header-login" href={signInHref({ view: tab })} target="_top">دخول <ArrowUpLeft size={17} /></a> : <button className="header-xp" onClick={() => changeTab('profile')} aria-label={`رحلتك، ${data.progress.xp} نقطة`}><Sparkles size={15} /><b>{data.progress.xp}</b><span lang="en">XP</span></button>}</div>
      </div></header>

      <main className="workspace" id="main-content" tabIndex={-1}>
        {error && <div className="system-banner error" role="alert"><span>{error}</span><button onClick={() => void refresh()}>إعادة المحاولة</button></div>}
        <TabsContent value="home" className="page-stage">
          <div className="workspace-label"><span>مساحة لجنة الابتكار</span><span lang="en" dir="ltr">FTC / IBTAKIR</span></div>
          <section className="mission-layout" aria-label="اختر مهمة وابدأ">
            <article className={`mission-hero tone-${palette[missionIndex]}`} onPointerMove={moveSpotlight}>
              <div className="hero-grid" aria-hidden="true" /><span className="hero-number" key={`number-${mission.id}`} aria-hidden="true">{mission.number}</span>
              <div className="mission-topline"><span><span className="label-square" /> مساحة صغيرة لفكرة كبيرة</span><span className="mission-reward" dir="ltr">+20 XP</span></div>
              <div className="mission-copy" key={mission.id} aria-live="polite" aria-atomic="true"><span className="mission-type">{mission.type} <i /> {mission.category}</span><h1>{headline ? <><span>{headline[1]}</span><span>{headline[2]}</span></> : mission.title}</h1><p>{mission.description}</p></div>
              <div className="mission-controls"><Button className="launch-button" onClick={() => start(mission)}>ابدأ بفكرة <ArrowUpLeft size={21} /></Button><button className="brief-button" onClick={() => openChallenge(mission)}>تفاصيل المهمة <ArrowLeft size={18} /></button></div>
              <div className="mission-footer"><span>على راحتك. بلا مؤقّت، وبلا فكرة مثالية.</span><div className="mission-pager"><button aria-label="تنقّل بالمهمات إلى اليمين" onClick={() => moveMissionByArrow('right')}><ChevronRight size={19} /></button><span dir="ltr"><b>{mission.number}</b><i> / 03</i></span><button aria-label="تنقّل بالمهمات إلى اليسار" onClick={() => moveMissionByArrow('left')}><ChevronLeft size={19} /></button></div></div>
            </article>
            <aside className="command-stack">
              <section className="mission-selector"><div className="panel-top"><h2>أي سؤال يلفتك؟</h2><span dir="ltr">01—03</span></div><div className="mission-options">{challenges.map((challenge, index) => { const Icon = icons[challenge.icon]; return <button key={challenge.id} className={`mission-option tone-${palette[index]}`} aria-pressed={missionIndex === index} onClick={() => setMissionIndex(index)}><span className="option-number">{challenge.number}</span><span className="option-copy"><strong>{challenge.type}</strong><small>{challenge.category}</small></span><Icon size={20} strokeWidth={1.5} /></button>; })}</div><p>ثلاث طرق للتفكير. اختر أي بداية.</p></section>
              {loading ? <Skeleton className="panel-skeleton" /> : data.signedIn ? <PlayerPanel compact progress={data.progress} onProfile={() => changeTab('profile')} /> : !error && <SignInNotice compact href={signInHref({ view: 'profile' })} />}
            </aside>
          </section>
          <Reveal className="community-preview section-block"><div id="community-preview" className="section-heading"><div><span className="eyebrow">من المجتمع</span><h2>فكرة منك.<br /><span>وزاوية من غيرك.</span></h2></div><div className="section-aside"><p>شارك ما تفكّر فيه، وساعد فكرة أخرى تكبر.</p><button className="text-link" onClick={() => changeTab('ideas')}>كل الأفكار <ArrowLeft size={18} /></button></div></div>{loading ? <Skeleton className="feed-skeleton" /> : !data.signedIn ? !error && <SignInNotice href={signInHref({ view: 'ideas' })} /> : data.ideas.length ? <div className="idea-grid">{ideaCards(data.ideas.slice(0, 3))}</div> : <EmptyState onStart={() => changeTab('challenges')} />}</Reveal>
        </TabsContent>

        <TabsContent value="challenges" className="page-stage"><header className="page-header"><div><span className="eyebrow">ثلاث مهمات. بلا ترتيب إجباري.</span><h1>غيّر زاوية النظر.</h1></div><p>مواقف بسيطة. احتمالات كثيرة.<br />اختر السؤال الذي يثير فضولك.</p></header><div className="mission-board">{challenges.map((challenge, index) => <ChallengeCard key={challenge.id} challenge={challenge} index={index} completed={own.some((idea) => idea.challenge_id === challenge.id)} onOpen={openChallenge} />)}</div><Reveal className="design-rule"><span><Shuffle size={24} strokeWidth={1.5} /></span><div><strong>تبغى تغيّر المعادلة؟</strong><p>داخل كل مهمة زاوية إضافية. جرّبها إذا حبيت، مو شرط للمشاركة.</p></div><span className="rule-index" aria-hidden="true">+</span></Reveal></TabsContent>

        <TabsContent value="ideas" className="page-stage"><header className="page-header"><div><span className="eyebrow">المجتمع</span><h1>الأفكار تكبر معًا.</h1></div><Button className="launch-button" onClick={() => start(mission)}>شارك فكرة <Plus size={20} /></Button></header><Tabs dir="rtl" value={filter} onValueChange={setFilter} className="feed-tabs"><div className="feed-toolbar"><TabsList aria-label="تصفية الأفكار"><TabsTrigger value="all">كل الأفكار</TabsTrigger><TabsTrigger value="mine">أفكاري</TabsTrigger></TabsList><span>{loading ? 'جارٍ التحميل…' : !data.signedIn ? 'الدخول مطلوب للمشاركة' : `${feed.length} فكرة`}</span></div><TabsContent value={filter} key={filter} className="feed-content">{loading ? <Skeleton className="feed-skeleton" /> : !data.signedIn ? !error && <SignInNotice href={signInHref({ view: 'ideas' })} /> : feed.length ? <div className="idea-grid">{ideaCards(feed)}</div> : <EmptyState mine={filter === 'mine'} onStart={() => changeTab('challenges')} />}</TabsContent></Tabs></TabsContent>

        <TabsContent value="profile" className="page-stage"><header className="page-header"><div><span className="eyebrow">رحلتك في ابتكر</span><h1>كل فكرة تترك أثرًا.</h1></div><p>{data.profile ? `أهلًا ${data.profile.displayName}. ` : ''}هذا تقدّمك، على وتيرتك.<br />لا ترتيب، ولا سباق مع أحد.</p></header>{!loading && !data.signedIn ? !error && <SignInNotice href={signInHref({ view: 'profile' })} /> : <div className="profile-layout">{loading ? <Skeleton className="panel-skeleton" /> : <PlayerPanel progress={data.progress} />}<section className="achievement-panel"><div className="panel-top"><h2>محطاتك</h2><span dir="ltr">{[data.progress.ideas > 0, data.progress.reviews >= 3, data.progress.xp >= 100].filter(Boolean).length} / 3</span></div><div className="achievement-grid">{[{ icon: Lightbulb, name: 'أول شرارة', copy: 'شارك فكرتك الأولى', done: data.progress.ideas > 0 }, { icon: MessageCircle, name: 'عين مساعدة', copy: 'ساهم في 3 أفكار لغيرك', done: data.progress.reviews >= 3 }, { icon: Sparkles, name: 'صانع أفكار', copy: 'اجمع 100 نقطة', done: data.progress.xp >= 100 }].map((badge, index) => <article key={badge.name} className={badge.done ? 'unlocked' : ''}><span className="badge-number" aria-hidden="true">0{index + 1}</span><span className="badge-icon"><badge.icon size={28} strokeWidth={1.4} /></span><strong>{badge.name}</strong><p>{badge.copy}</p><small>{badge.done ? <><Check size={14} /> حقّقتها</> : 'بانتظارك'}</small></article>)}</div></section></div>}{data.signedIn && data.profile && <section className="profile-name-panel"><div><span className="eyebrow">اسمك في المجتمع</span><h2>{data.profile.displayName}</h2><p>هذا الاسم يظهر مع أفكارك ومساهماتك، وما يقدر شخص ثاني يستخدمه.</p></div><form onSubmit={saveProfile}><label htmlFor="profile-name">تغيير الاسم</label><div className="profile-name-edit"><Input id="profile-name" autoComplete="nickname" required minLength={2} maxLength={30} disabled={busy} value={profileName} onChange={(event) => { setProfileName(event.target.value); setProfileError(''); }} /><Button className="outline-button" type="submit" disabled={busy || profileName.trim() === data.profile.displayName}>{busy ? 'جارٍ الحفظ…' : 'حفظ الاسم'}</Button></div>{profileError && <p className="form-error" role="alert">{profileError}</p>}</form></section>}<Reveal className="xp-rule"><span><Sparkles size={20} /> كيف تجمع النقاط؟</span><p><b dir="ltr">20 XP</b> لأول فكرة في كل مهمة. <b dir="ltr">5 XP</b> لأول مساهمة في فكرة شخص آخر. بلا خصم أو عقوبة غياب.</p></Reveal>{data.signedIn && <Reveal className="profile-ideas section-block"><div className="section-heading"><h2>أفكارك، حتى الآن.</h2><span className="section-count" dir="ltr">{own.length.toString().padStart(2, '0')}</span></div>{own.length ? <div className="idea-grid">{ideaCards(own)}</div> : <EmptyState mine onStart={() => changeTab('challenges')} />}</Reveal>}</TabsContent>
      </main>

      <footer className="site-footer"><div><img src="/assets/ftc-logo.svg" alt="" width="72" height="40" /><span>ابتكر · لجنة الابتكار</span></div><span>الفكرة القادمة قد تبدأ منك.</span><a href="https://ftcksu.com/" target="_blank" rel="noreferrer">نادي تقنية المستقبل <ArrowUpLeft size={16} /></a></footer>
    </Tabs>

    <Dialog open={Boolean(data.signedIn && !loading && !data.profile)}>
      <DialogContent className="ftc-dialog profile-setup" dir="rtl" showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <div className="dialog-sequence"><span>خطوة واحدة</span><span>حسابك في ابتكر</span></div>
        <DialogTitle className="dialog-title">وش تحب يكون اسمك هنا؟</DialogTitle>
        <DialogDescription className="dialog-description">هذا الاسم بيظهر مع أفكارك ومساهماتك، وما يقدر شخص ثاني يستخدمه.</DialogDescription>
        <form className="idea-form" onSubmit={saveProfile}>
          <div className="form-field"><label htmlFor="first-profile-name">الاسم الظاهر</label><Input id="first-profile-name" autoComplete="nickname" autoFocus required minLength={2} maxLength={30} disabled={busy} value={profileName} placeholder="مثال: Louis أو سعود" onChange={(event) => { setProfileName(event.target.value); setProfileError(''); }} /></div>
          <p className="auth-hint">من حرفين إلى 30 حرفًا. تقدر تغيّره لاحقًا من صفحة رحلتك.</p>
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          <div className="form-footer"><span><Users size={17} /> اسم واحد لكل عضو</span><Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'ثبّت اسمي'} <ArrowUpLeft size={20} /></Button></div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}><DialogContent className={`ftc-dialog tone-${palette[Math.max(0, challenges.findIndex((item) => item.id === detail?.id))]}`} dir="rtl" showCloseButton={false} onCloseAutoFocus={restoreFocus}><DialogClose className="dialog-close" aria-label="إغلاق"><X size={20} /></DialogClose>{detail && <><div className="dialog-sequence"><span>المهمة <b>{detail.number}</b></span><span>{detail.category}</span></div><span className="dialog-kicker">{detail.type}</span><DialogTitle className="dialog-title">{detail.title}</DialogTitle><DialogDescription className="dialog-description">{detail.description}</DialogDescription><div className="hint-box"><Lightbulb size={21} /><p>{detail.hint}</p></div><button className="twist-button" aria-expanded={twist} aria-controls="twist-content" onClick={() => setTwist(!twist)}><Shuffle size={19} /><span>زاوية إضافية <small>اختياري</small></span><Plus size={19} /></button><div className="twist-content" id="twist-content" data-open={twist} aria-hidden={!twist} inert={!twist}><div><p>{detail.twist}</p></div></div><div className="dialog-bottom"><span>موقف افتراضي · المشاركة مفتوحة</span><Button className="launch-button" onClick={() => start(detail)}>ابدأ بفكرة <ArrowUpLeft size={20} /></Button></div></>}</DialogContent></Dialog>

    <Dialog open={Boolean(compose)} onOpenChange={(open) => { if (!open && !busy) setCompose(null); }}><DialogContent className="ftc-dialog composer" dir="rtl" showCloseButton={false} onCloseAutoFocus={restoreFocus}><DialogClose disabled={busy} className="dialog-close" aria-label="إغلاق"><X size={20} /></DialogClose><div className="dialog-sequence"><span>{editing ? 'تطوير الفكرة' : 'بدايتك الجديدة'}</span><span>المهمة {compose?.number}</span></div><DialogTitle className="dialog-title">{editing ? 'خطوة أخرى لفكرتك.' : 'اكتبها كما هي الآن.'}</DialogTitle><DialogDescription className="dialog-description">{compose?.short}</DialogDescription><form className="idea-form" onSubmit={saveIdea}>{!editing && <div className="form-field"><label htmlFor="compose-challenge">المهمة</label><NativeSelect id="compose-challenge" disabled={busy} value={compose?.id ?? challenges[0].id} onChange={event => start(challenges.find(item => item.id === event.target.value)!)}>{challenges.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.number} · {item.type} — {item.short}</NativeSelectOption>)}</NativeSelect></div>}<div className="form-field"><label htmlFor="idea-title">عنوان الفكرة</label><Input id="idea-title" disabled={busy} required minLength={2} maxLength={100} value={draft.title} placeholder="اسم قصير وواضح" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div><div className="form-field"><label htmlFor="idea-body">فكرتك <small>لا تحتاج إلى حل مكتمل</small></label><Textarea id="idea-body" disabled={busy} required minLength={10} maxLength={2000} rows={4} value={draft.body} placeholder="ما الذي ستغيّره؟ وكيف تعمل فكرتك؟" aria-describedby="draft-helper" onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></div><div className="form-helper" id="draft-helper"><span>{editing ? 'تقدر ترجع وتعدّل متى حبيت.' : 'مسودتك تُحفظ على هذا الجهاز.'}</span><span dir="ltr">{draft.body.length} / 2000</span></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="form-footer"><span><Lightbulb size={17} /> البداية أهم من الكمال</span>{data.signedIn ? <Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : editing ? 'احفظ التطوير' : 'شارك الفكرة'} <ArrowUpLeft size={20} /></Button> : <a className="launch-button signin-button" href={signInHref({ view: tab, ...(editing ? { edit: draft.id } : { compose: compose?.id }) })} target="_top">دخول للمشاركة <ArrowUpLeft size={20} /></a>}</div></form></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !busy) setSelected(null); }}><DialogContent className="ftc-dialog idea-dialog" dir="rtl" showCloseButton={false} onCloseAutoFocus={restoreFocus}><DialogClose disabled={busy} className="dialog-close" aria-label="إغلاق"><X size={20} /></DialogClose>{active && <><div className="dialog-sequence"><span>من المجتمع</span><span>{challenges.find((challenge) => challenge.id === active.challenge_id)?.type}</span></div><DialogTitle className="dialog-title">{active.title}</DialogTitle><DialogDescription className="idea-author">فكرة {active.name} · {date(active.created_at)}</DialogDescription><p className="full-idea">{active.body}</p><div className="idea-detail-actions">{!data.signedIn && <a className="text-link" href={signInHref({ view: tab, idea: active.id })} target="_top">دخول للتشجيع والمشاركة <ArrowUpLeft size={18} /></a>}<button className={active.liked ? 'liked' : ''} aria-pressed={active.liked} disabled={busy || active.isOwn || !data.signedIn} title={active.isOwn ? 'هذه فكرتك؛ شجّع أفكار المشاركين الآخرين.' : undefined} onClick={() => void react(active)}><Heart size={18} fill={active.liked ? 'currentColor' : 'none'} />{active.likes} تشجيع</button>{active.isOwn && <button onClick={() => start(challenges.find((challenge) => challenge.id === active.challenge_id)!, active)}><Pencil size={17} /> طوّر الفكرة</button>}</div><div className="comments-section"><h3>زوايا جديدة <span>{active.comments.length}</span></h3>{active.comments.length ? active.comments.map((entry) => <div className="comment" key={entry.id}><div><strong>{entry.name}</strong><time dateTime={entry.created_at}>{date(entry.created_at)}</time></div><p>{entry.body}</p></div>) : <p className="muted">سؤال صغير أو اقتراح منك قد يغيّر الفكرة.</p>}<form onSubmit={saveComment} className="comment-form"><label htmlFor="comment-body">زاويتك</label><Textarea id="comment-body" disabled={busy} required minLength={5} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="سؤال أو اقتراح يحرّك الفكرة…" />{formError && <p className="form-error" role="alert">{formError}</p>}{data.signedIn ? <Button className="launch-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'أضف الزاوية'} <MessageCircle size={18} /></Button> : <a className="launch-button signin-link" href={signInHref({ view: tab, idea: active.id })} target="_top">دخول لإضافة زاويتك <ArrowUpLeft size={18} /></a>}</form></div></>}</DialogContent></Dialog>
  </>;
}
