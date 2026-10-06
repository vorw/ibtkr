'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUpLeft, Check, RotateCcw, Scissors, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { OpeningState } from '@/lib/opening';
import { createOpeningAudio } from '@/lib/opening-audio';
import './opening-celebration.css';

const arabic=(n:number)=>new Intl.NumberFormat('ar-SA').format(n);
async function requestOpening(cut=false):Promise<OpeningState>{
  const response=await fetch('/api/opening',{method:cut?'POST':'GET',cache:'no-store',credentials:'same-origin',
    headers:cut?{'Content-Type':'application/json'}:{},
    ...(cut?{body:JSON.stringify({action:'cut'})}:{}),signal:AbortSignal.timeout(15000)});
  const body=await response.json() as Partial<OpeningState>&{error?:string};
  if(!response.ok)throw new Error(body.error??'تعذّر الاتصال. جرّب مرة ثانية.');
  if(typeof body.eventId!=='string'||typeof body.target!=='number'||typeof body.count!=='number'||typeof body.isOpen!=='boolean'||typeof body.canCut!=='boolean'||typeof body.hasCut!=='boolean')throw new Error('تعذّر قراءة حالة الافتتاح. جرّب مرة ثانية.');
  return body as OpeningState;
}

const previewState:OpeningState={eventId:'visual-preview',target:2,count:0,isOpen:false,canCut:true,hasCut:false,position:null,openedAt:null};
export default function OpeningGate({children,preview=false}:{children:ReactNode;preview?:boolean}){
  const [state,setState]=useState<OpeningState|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [drag,setDrag]=useState(0);
  const [opening,setOpening]=useState(false);
  const [entered,setEntered]=useState(false);
  const [soundEnabled,setSoundEnabled]=useState(true);
  const soundAllowed=useRef(true);
  const sound=useRef<ReturnType<typeof createOpeningAudio>|null>(null);
  const previousCount=useRef<number|null>(null);
  const started=useRef<{id:number;y:number}|null>(null);
  const wasWaiting=useRef(false);
  const mutation=useRef(false);
  const refreshing=useRef(false);
  const alive=useRef(true);
  const sequence=useRef(0);

  function unlockSound(){
    if(!soundAllowed.current)return Promise.resolve();
    sound.current??=createOpeningAudio();return sound.current.unlock();
  }
  function toggleSound(){
    const enabled=!soundAllowed.current;soundAllowed.current=enabled;setSoundEnabled(enabled);
    if(enabled)void unlockSound();else{sound.current?.dispose();sound.current=null;}
  }
  useEffect(()=>()=>{sound.current?.dispose();sound.current=null;},[]);
  useEffect(()=>{
    if(!state)return;
    if(previousCount.current!==null&&state.count>previousCount.current&&soundAllowed.current&&document.visibilityState==='visible')sound.current?.cut();
    previousCount.current=state.count;
  },[state?.count]);

  const refresh=useCallback(async()=>{
    if(preview){setState(current=>current??previewState);return;}
    if(mutation.current||refreshing.current)return;
    refreshing.current=true;
    const version=++sequence.current;
    try{
      const next=await requestOpening();
      if(!alive.current||version!==sequence.current)return;
      setState(current=>current?.isOpen?current:next);setError('');
    }catch(e){if(alive.current&&version===sequence.current)setError(e instanceof Error?e.message:'تعذّر الاتصال.');}
    finally{refreshing.current=false;}
  },[preview]);
  useEffect(()=>{
    if(entered)return;
    alive.current=true;void refresh();
    if(preview)return()=>{alive.current=false;};
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},2000);
    const onFocus=()=>{void refresh();};window.addEventListener('focus',onFocus);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('focus',onFocus);};
  },[refresh,entered,preview]);
  useEffect(()=>{
    if(!state)return;
    if(!state.isOpen){wasWaiting.current=true;return;}
    if(!wasWaiting.current){setEntered(true);return;}
    setOpening(true);setDrag(0);
    if(soundAllowed.current&&document.visibilityState==='visible')sound.current?.reveal();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer=setTimeout(()=>setEntered(true),reduced?450:3400);
    return()=>clearTimeout(timer);
  },[state?.isOpen]);

  async function cut(){
    if(mutation.current||!state?.canCut||state.hasCut||state.isOpen)return;
    void unlockSound();
    mutation.current=true;++sequence.current;setBusy(true);setError('');
    try{
      const next=preview?{...state,count:Math.min(state.count+1,state.target),hasCut:true,canCut:false,position:state.count+1,isOpen:state.count+1>=state.target,openedAt:state.count+1>=state.target?new Date().toISOString():null}:await requestOpening(true);
      if(alive.current){setState(next);setDrag(0);}
    }catch(e){if(alive.current){setError(e instanceof Error?e.message:'تعذّر حفظ القصّة.');setDrag(0);void refresh();}}
    finally{mutation.current=false;if(alive.current)setBusy(false);}
  }
  const canCut=Boolean(state?.canCut&&!state.hasCut&&!state.isOpen&&!busy);
  function pointerDown(event:PointerEvent<HTMLButtonElement>){
    if(!canCut)return;
    const activation=unlockSound();
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    started.current={id:event.pointerId,y:event.clientY};setDrag(0);
    void activation.then(()=>{if(alive.current&&started.current?.id===event.pointerId&&soundAllowed.current)sound.current?.charge();});
  }
  function pointerMove(event:PointerEvent<HTMLButtonElement>){
    if(!started.current||started.current.id!==event.pointerId)return;
    setDrag(Math.max(0,Math.min(180,event.clientY-started.current.y)));
  }
  function pointerUp(event:PointerEvent<HTMLButtonElement>){
    if(!started.current||started.current.id!==event.pointerId)return;
    const distance=event.clientY-started.current.y;
    started.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(distance>=160){setDrag(180);void cut();}else setDrag(0);
  }
  function cancel(){started.current=null;setDrag(0);}

  if(entered)return <>{children}</>;
  const count=state?.count??0,target=state?.target??(preview?2:15);
  const cutX=10+((Math.min(count,target-1)+1)/(target+1))*80;
  const style={'--cut-y':`${drag}px`,'--cut-x':`${cutX}%`,'--drag-energy':drag/180,'--burst-x':`${10+count/(target+1)*80}%`} as CSSProperties;
  return <div className={`opening-page${opening?' is-opening':''}${state?.hasCut?' has-cut':''}`} dir="rtl" style={style}>
    <div className="opening-atmosphere" aria-hidden="true"><div className="opening-aura aura-violet"/><div className="opening-aura aura-gold"/><div className="opening-aura aura-lilac"/><svg className="opening-flow-lines" viewBox="0 0 1440 900" preserveAspectRatio="none"><path d="M -120 760 C 150 380 510 860 820 450 S 1270 130 1560 180"/><path d="M -100 180 C 280 70 180 530 570 380 S 1110 510 1540 70"/><path d="M -80 870 C 280 530 660 930 1010 640 S 1250 420 1550 500"/></svg>{Array.from({length:18},(_,i)=><i className="opening-glint" key={i} style={{'--x':`${7+(i*37)%88}%`,'--y':`${13+(i*19)%73}%`,'--delay':`${-i*1.7}s`,'--duration':`${6+i%5*1.2}s`,'--rotation':`${i*31}deg`} as CSSProperties}/>)}</div>
    {opening&&<div className="opening-celebration" aria-hidden="true"><span className="opening-reveal-glow"/><span className="opening-reveal-ring"/><span className="opening-reveal-ring ring-delayed"/>{Array.from({length:32},(_,i)=><i key={i} className="opening-party-piece" style={{'--x':`${10+(i*23)%80}%`,'--drift':`${(i%7-3)*55}px`,'--spin':`${270+i*37}deg`,'--delay':`${i%8*0.035}s`} as CSSProperties}/>)}</div>}
    {preview&&<div className="opening-preview-label">معاينة بصرية · لا تغيّر الافتتاح الحقيقي</div>}
    <header className="opening-header">
      <div className="opening-brand"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل" width="90" height="48"/><span/><strong>ابتكر<span>▪</span><small>لجنة الابتكار</small></strong></div>
      <div className="opening-header-actions"><span className="opening-edition"><span className="opening-live-dot"/> لحظة البداية</span><button type="button" className="opening-sound" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled?'إيقاف المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'} title={soundEnabled?'إيقاف المؤثرات الصوتية':'تشغيل المؤثرات الصوتية'}>{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{soundEnabled?'الصوت':'بدون صوت'}</span></button></div>
    </header>
    <main className="opening-main" id="main-content">
      <div className="opening-copy"><span className="opening-eyebrow">قصّة صغيرة. بداية كبيرة.</span>
        <h1>{opening?<>فتحناها<span>معًا.</span></>:<>البداية<span>بأيديكم.</span></>}</h1>
        <p>{opening?'أهلًا في ابتكر. الفكرة القادمة تبدأ منك.':'شريط واحد، وبداية نصنعها معًا. قصّة منك، ونفتح ابتكر للجميع.'}</p>
      </div>
      <div className={`opening-stage${count>0?' ribbon-touched':''}`} aria-label="شريط افتتاح ابتكر">
        <div className="opening-ribbon" aria-hidden="true">
          <div className="ribbon-half ribbon-left"><span>IBTKR · ابتكر · IBTKR</span></div><div className="ribbon-half ribbon-right"><span>IBTKR · ابتكر · IBTKR</span></div>
          {Array.from({length:count},(_,i)=><span key={i} className="ribbon-snip" style={{left:`${10+(i+1)/(target+1)*80}%`}}/>)}
          <span className="opening-ribbon-sheen"/>
        </div>
        {count>0&&!opening&&<div key={count} className="opening-cut-wave" aria-hidden="true"/>}
        {!state?.hasCut&&!opening&&<>
          <span className="opening-cut-guide" aria-hidden="true"/>
          <button className={`opening-scissors${drag>0?' is-dragging':''}`} aria-label="اسحب المقص للأسفل، أو اضغط Enter لقصّ الشريط" disabled={!canCut}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancel}
            onClick={e=>{if(e.detail===0)void cut();}}><Scissors size={42} strokeWidth={1.6}/></button>
          <span className="opening-drag-hint"><ArrowDown size={15}/>{busy?'نحفظ قصّتك…':'اسحب المقص للأسفل'}</span>
        </>}
        {state?.hasCut&&!opening&&<div className="opening-cut-thanks"><span><Check size={25}/></span><strong>قصّتك صارت جزءًا من البداية.</strong><small>قصّتك رقم {arabic(state.position??count)} من {arabic(target)}. باقي {arabic(Math.max(0,target-count))} ونفتحها معًا.</small>{preview&&<button className="opening-accessible-cut opening-preview-next" onClick={()=>setState(current=>current?{...current,hasCut:false,canCut:true}:current)}>جرّب القصّة الثانية كمشارك آخر <ArrowUpLeft size={14}/></button>}</div>}
      </div>
      <section className="opening-participation" aria-label="تقدم الافتتاح" aria-live="polite">
        <div className={`opening-tally${target>3?' opening-tally-many':''}`}><span key={count} className="opening-tally-number" dir="ltr">{arabic(count)}<span>/</span>{arabic(target)}</span><div><strong>{opening?'البداية اكتملت.':count?'أول قصّة وصلت.':'كن جزءًا من أول لحظة.'}</strong><p>{opening?'حياك في مساحة الأفكار.':`نحتاج ${arabic(target)} قصّة لنفتح ابتكر للجميع.`}</p></div><div className="opening-dots" aria-hidden="true">{Array.from({length:target},(_,i)=><span key={i} className={i<count?'cut':''}>{i<count?<Check size={14}/>:arabic(i+1)}</span>)}</div></div>
        {!state&&!error&&<p className="opening-connection" role="status">نجهّز لحظة البداية…</p>}

        {canCut&&<p className="opening-guest-note">الافتتاح للجميع، بدون تسجيل دخول. قصّة واحدة لكل متصفح.</p>}
        {canCut&&<button className="opening-accessible-cut" onClick={()=>void cut()}>أو اضغط هنا لقصّ الشريط <Scissors size={14}/></button>}
        {state?.hasCut&&!opening&&<p className="opening-wait"><span/> ننتظر باقي المشاركين. الصفحة تتحدّث تلقائيًا.</p>}
        {error&&<div className="opening-error" role="alert"><p>{error}</p><button onClick={()=>void refresh()}><RotateCcw size={14}/> إعادة المحاولة</button></div>}
      </section>
    </main>
    <footer className="opening-footer"><span>الفكرة القادمة قد تبدأ منك.</span><span dir="ltr">FTC / IBTKR <Sparkles size={13}/></span></footer>
  </div>;
}
