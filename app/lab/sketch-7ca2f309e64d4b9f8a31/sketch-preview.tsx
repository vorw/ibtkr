'use client';
import { useEffect,useState,type FormEvent,type ReactNode } from 'react';
import { ArrowUpLeft,Lightbulb,Users,X } from 'lucide-react';
import DrawingStudio from '../../drawing-studio';
import WeeklyChallengeView from '../../weekly-challenge-view';
import { ThemeToggle } from '../../theme-toggle';
import { weeklyChallenges,type WeeklyChallenge } from '@/lib/weekly';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { Dialog,DialogClose,DialogContent,DialogDescription,DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NativeSelect,NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import './sketch-preview.css';

const navigation=[{id:'home',label:'تحدّي الأسبوع'},{id:'ideas',label:'المجتمع'},{id:'leaderboard',label:'المتصدرون'},{id:'profile',label:'رحلتك'}];
type PreviewProps={mission?:WeeklyChallenge;drawingHero?:ReactNode;angleVisuals?:ReactNode[];notice?:string;captionPlaceholder?:string;selectionKind?:'angle'|'symbol'};
export default function SketchPreview({mission=weeklyChallenges[2],drawingHero,angleVisuals,notice='معاينة الأسبوع 03 · بدون نشر أو قصّ الشريط',captionPlaceholder='كيف يشتغل تعديلك؟',selectionKind='angle'}:PreviewProps){
  const [drawing,setDrawing]=useState(''),[caption,setCaption]=useState(''),[angleIndex,setAngleIndex]=useState<number|null>(null),[dialog,setDialog]=useState(false),[preview,setPreview]=useState(false),[working,setWorking]=useState(false),[tick,setTick]=useState(0);
  const week=mission,angle=angleIndex===null?undefined:week.angles[angleIndex];
  useEffect(()=>{setTick(Date.now());const timer=setInterval(()=>setTick(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const remaining=Math.max(0,Date.parse(week.endsAt)-tick);
  const timeLeft=!tick?'…':remaining>0?`${Math.floor(remaining/86400000)} يوم · ${Math.floor(remaining/3600000)%24} ساعة · ${Math.floor(remaining/60000)%60} دقيقة`:'أُغلق التحدّي';
  function navigate(view:string){if(view==='home'){window.scrollTo({top:0,behavior:'smooth'});return;}window.location.assign('/?view='+view);}
  function start(){if(angleIndex===null){const first=document.querySelector<HTMLButtonElement>('.mission-options button');first?.scrollIntoView({block:'nearest',behavior:'smooth'});first?.focus({preventScroll:true});return;}setPreview(false);setDialog(true);}
  function showPreview(event:FormEvent){event.preventDefault();if(drawing&&caption.trim().length>=2)setPreview(true);}
  return <>
    <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
    <div className="scroll-meter" aria-hidden="true"><span/></div>
    <Tabs dir="rtl" value="home" onValueChange={navigate} className="app-shell">
      <header className="site-header"><div className="header-inner">
        <button className="brand" onClick={()=>navigate('home')} aria-label="ابتكر، الرئيسية"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل" width="90" height="48"/><span className="brand-cut"/><span className="brand-product"><strong>ابتكر<span>▪</span></strong><small>لجنة الابتكار</small></span></button>
        <TabsList className="main-nav" aria-label="التنقل الرئيسي" data-page="home"><span className="nav-active" aria-hidden="true"/>{navigation.map(item=><TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
        <div className="header-end"><span className="beta-label">نسخة تجريبية</span><ThemeToggle/><a className="header-login" href="/login?return_to=%2F%3Fview%3Dhome">دخول <ArrowUpLeft size={17}/></a></div>
      </div></header>
      <main className="workspace" id="main-content" tabIndex={-1}>
        <div className="weekly-preview-notice" role="status"><span>{notice}</span><a href="/">العودة للموقع <ArrowUpLeft size={15}/></a></div>
        <div className="page-stage">
          <div className="workspace-label"><span>مشكلة واحدة · ثلاث زوايا</span><span lang="en" dir="ltr">FTC / IBTKR</span></div>
          <WeeklyChallengeView mission={week} missionIndex={angleIndex} onSelectAngle={setAngleIndex} onStart={start} onLeaderboard={()=>navigate('leaderboard')} timeLeft={timeLeft} drawingHero={drawingHero} angleVisuals={angleVisuals} selectionKind={selectionKind}/>
          <section className="community-preview section-block"><div className="section-heading"><div><span className="eyebrow">من المجتمع</span><h2>فكرة منك.<br/><span>وزاوية من غيرك.</span></h2></div><div className="section-aside"><p>اقرأ الحلول، ناقشها، وصوّت للفكرة اللي تلفتك.</p><button className="text-link" onClick={()=>navigate('ideas')}>شاهد المشاركات</button></div></div>
            <div className="signin-panel"><span className="rank-glyph" aria-hidden="true"><Users size={22}/></span><div><strong>انضم لمساحة الأفكار.</strong><p>سجّل دخولك ببريدك الإلكتروني لمشاهدة المشاركات، وحفظ أفكارك وتقدّمك.</p></div><a className="outline-button signin-link" href="/login?return_to=%2F%3Fview%3Dideas">دخول للمجتمع <ArrowUpLeft size={18}/></a></div>
          </section>
        </div>
      </main>
      <footer className="site-footer"><span>ابتكر · لجنة الابتكار</span><p>الفكرة القادمة قد تبدأ منك.</p><a href="https://ftcksu.com/" target="_blank" rel="noreferrer">نادي تقنية المستقبل <ArrowUpLeft size={16}/></a></footer>
    </Tabs>
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="ftc-dialog composer drawing-composer" dir="rtl" showCloseButton={false}>
      <DialogClose className="dialog-close" aria-label="إغلاق"><X size={20}/></DialogClose>
      <div className="dialog-sequence"><span>معاينة · بدون نشر</span><span>الأسبوع {week.number}</span></div>
      <DialogTitle className="dialog-title">خلّ فكرتك تنرسم.</DialogTitle>
      <DialogDescription className="dialog-description">رسمة واحدة. فكرة مختلفة.</DialogDescription>
      {preview?<div className="weekly-preview-result"><img src={drawing} alt="معاينة رسمتك"/><p>{caption}</p><Button className="outline-button" onClick={()=>setPreview(false)}>ارجع للرسم</Button></div>:<form className="idea-form" onSubmit={showPreview}>
        <div className="form-field"><label htmlFor="preview-angle">{selectionKind==='symbol'?'الرمز المختار':'زاوية الحل'}</label><NativeSelect id="preview-angle" value={angle?.id??''} onChange={event=>setAngleIndex(week.angles.findIndex(item=>item.id===event.target.value))}>{week.angles.map(item=><NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelect><p className="compose-prompt">{angle?.prompt}</p></div>
        <DrawingStudio value={drawing} onChange={setDrawing} onBusyChange={setWorking}/>
        <div className="form-field"><label htmlFor="preview-caption">فكرتك بجملة</label><Textarea id="preview-caption" maxLength={180} minLength={2} required rows={2} value={caption} placeholder={captionPlaceholder} onChange={event=>setCaption(event.target.value)}/></div>
        <div className="form-helper"><span>تجربة فقط؛ لا تُحفظ في المجتمع.</span><span dir="ltr">{caption.length} / 180</span></div>
        <div className="form-footer"><span><Lightbulb size={17}/> البداية أهم من الكمال</span><Button type="submit" className="launch-button" disabled={!drawing||caption.trim().length<2||working}>معاينة رسمتي <ArrowUpLeft size={20}/></Button></div>
      </form>}
    </DialogContent></Dialog>
  </>;
}
