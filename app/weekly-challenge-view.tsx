'use client';

import type { PointerEvent,ReactNode } from 'react';
import { Clock3,Lightbulb,RotateCcw,Shuffle,Trophy,Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WeeklyChallenge } from '@/lib/weekly';
import { WarningSurveyHero,WarningSymbol,warningSymbolKinds } from './warning-challenge-visuals';

const icons={shuffle:Shuffle,flip:RotateCcw,people:Users};
const palette=['violet','acid','signal'] as const;
type Props={mission:WeeklyChallenge;missionIndex:number|null;onSelectAngle:(index:number)=>void;onStart:()=>void;onLeaderboard:()=>void;timeLeft:string;signedIn?:boolean;ownEntries?:number;ownLikes?:number;drawingHero?:ReactNode;angleVisuals?:ReactNode[];selectionKind?:'angle'|'symbol'};

// Production and the read-only lab deliberately share the entire challenge
// surface: hierarchy, timing, hints, motion and score panel cannot drift apart.
export default function WeeklyChallengeView({mission,missionIndex,onSelectAngle,onStart,onLeaderboard,timeLeft,signedIn=false,ownEntries=0,ownLikes=0,drawingHero,angleVisuals,selectionKind:providedSelectionKind}:Props){
  const warning=mission.drawingTheme==='warning-symbols';
  const selectionKind=providedSelectionKind??(warning?'symbol':'angle');
  const hero=drawingHero??(warning?<WarningSurveyHero/>:undefined);
  const visuals=angleVisuals??(warning?warningSymbolKinds.map(kind=><WarningSymbol key={kind} kind={kind}/>):undefined);
  const angle=missionIndex===null?undefined:mission.angles[missionIndex];
  const headline=mission.title.match(/^(.*?[؟…])\s*(.*)$/);
  function moveSpotlight(event:PointerEvent<HTMLElement>){
    if(event.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rectangle=event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x',`${event.clientX-rectangle.left}px`);
    event.currentTarget.style.setProperty('--spot-y',`${event.clientY-rectangle.top}px`);
  }
  return <section className={'mission-layout weekly-layout'+(warning?' warning-challenge':'')} aria-label="تحدّي الأسبوع">
    <article key={mission.id} className="mission-hero tone-violet" onPointerMove={moveSpotlight}>
      <div className="hero-grid" aria-hidden="true"/>
      <div className="mission-topline"><span className="week-marker"><span>الأسبوع</span><b className="week-number" dir="ltr">{mission.number}</b></span><span className="week-status"><Clock3 size={15}/> ينتهي الجمعة، ١١:٥٩ م</span></div>
      <div className="mission-copy"><span className="mission-type">{mission.category}</span><h1>{headline?<><span>{headline[1]}</span><span>{headline[2]}</span></>:mission.title}</h1><p>{mission.description}</p>{mission.submission==='drawing'&&(hero??<><div className="drawing-hero-art" aria-hidden="true"><svg viewBox="0 0 180 125" fill="none"><ellipse cx="78" cy="25" rx="36" ry="10" stroke="currentColor" strokeWidth="2" className="sketch-line"/><path d="M42 25l9 78q27 14 54 0l9-78M111 46h14c27 0 24 36-2 36h-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sketch-line"/><path d="M66 5l-3-6m20 4v-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M54 109l-10 4m61-4 8 3" stroke="currentColor" opacity=".3"/></svg></div><div className="drawing-hero-note">الفكرة أهم من جمالها</div></>)}</div>
      <div aria-live="polite">{angle?<div className="selected-angle" key={angle.id}><span className={`angle-tag tone-${palette[mission.angles.indexOf(angle)]}`}>{angle.label}</span><p>{angle.prompt}</p></div>:<p className="angle-invitation">{selectionKind==='symbol'?'اختر رمزًا من القائمة، وبيظهر تحدّيه هنا.':'اختر زاوية من القائمة، وبيظهر سؤالها هنا.'}</p>}</div>
      <div className="mission-controls"><Button className="launch-button" onClick={onStart}>{angle?mission.submission==='drawing'?'ارسم فكرتك':'شارك حلّك' :selectionKind==='symbol'?'اختر رمزك':'اختر زاويتك'}</Button></div>
      <div className="mission-footer"><span>تحدّي جديد السبت، ١٢:٠٠ ص بتوقيت الرياض.</span><span className="weekly-countdown" aria-label="الوقت المتبقي">{timeLeft}</span></div>
    </article>
    <aside className="command-stack">
      <section className="mission-selector"><div className="panel-top"><h2>{selectionKind==='symbol'?'أي رمز تعيد تصميمه؟':'من أي زاوية تبدأ؟'}</h2><span dir="ltr">01—03</span></div><div className="mission-options">{mission.angles.map((item,index)=>{const Icon=icons[item.icon];return <button key={item.id} className={`mission-option tone-${palette[index]}`} aria-pressed={missionIndex===index} onClick={()=>onSelectAngle(index)}><span className="option-number">0{index+1}</span><span className="option-copy"><strong>{item.label}</strong><small>{selectionKind==='symbol'?(index===missionIndex?'رمزك المختار':'اختر هذا الرمز'):(index===missionIndex?'زاويتك المختارة':angle?'نفس المشكلة، منظور مختلف':'اختر هالزاوية')}</small></span>{visuals?.[index]??<Icon size={20} strokeWidth={1.5}/>}</button>;})}</div><div className="angle-hint" key={angle?.id}><Lightbulb size={18}/><p>{angle?.hint??(selectionKind==='symbol'?'ثلاثة رموز. اختر واحدًا وخلّ معناه أوضح.':'كل زاوية تفتح لك طريقة مختلفة للحل.')}</p></div></section>
      <section className="weekly-score-panel"><Trophy size={23}/><div><small>{signedIn?'مشاركتك هذا الأسبوع':'مبتكر الأسبوع'}</small><strong>{signedIn?`${ownEntries} مشاركة · ${ownLikes} إعجاب`:'باختيار المجتمع'}</strong></div><button className="panel-link" onClick={onLeaderboard}>شاهد المتصدرين</button></section>
    </aside>
  </section>;
}
