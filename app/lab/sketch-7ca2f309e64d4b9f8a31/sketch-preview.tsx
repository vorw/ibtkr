'use client';
import { useState } from 'react';
import { ArrowUpLeft,Check } from 'lucide-react';
import DrawingStudio from '../../drawing-studio';
import { ThemeToggle } from '../../theme-toggle';
import { weeklyChallenges } from '@/lib/weekly';
import './sketch-preview.css';
export default function SketchPreview(){
  const [drawing,setDrawing]=useState(''),[caption,setCaption]=useState(''),[angle,setAngle]=useState<string|null>(null),[preview,setPreview]=useState(false);
  const week=weeklyChallenges[2];
  return <main className="sketch-preview app-shell" dir="rtl"><header className="sketch-preview-header"><a className="brand" href="/"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل" width="90" height="48"/><span className="brand-cut"/><span className="brand-product"><strong>ابتكر<span>▪</span></strong><small>لجنة الابتكار</small></span></a><div><span className="eyebrow">معاينة · بدون نشر</span><ThemeToggle/></div></header>
    <section className="sketch-preview-layout"><div className="sketch-preview-copy"><span className="eyebrow">الأسبوع 03 / تحدّي الرسم</span><h1>كوب…<br/><span>بس مو أي كوب.</span></h1><p>{week.description}</p><div className="sketch-preview-angles">{week.angles.map((item,index)=><button key={item.id} className={'tone-'+['violet','acid','signal'][index]} aria-pressed={angle===item.id} onClick={()=>setAngle(item.id)}><span>0{index+1}</span><strong>{item.label}</strong>{angle===item.id&&<Check size={16}/>}</button>)}</div><div className="sketch-preview-hint" aria-live="polite">{angle?week.angles.find(item=>item.id===angle)?.prompt:'اختر زاويتك، وخلّ الفكرة تنرسم.'}</div><small>خطوط بسيطة تكفي. الفكرة أهم من جمال الرسمة.</small></div>
    <section className="sketch-preview-studio"><div className="dialog-sequence"><span>مساحة فكرتك</span><span dir="ltr">IBTKR / SKETCH</span></div><h2>خلّ فكرتك تنرسم.</h2>{preview?<div className="sketch-preview-result"><img src={drawing} alt="معاينة رسمتك"/><p>{caption}</p><button className="outline-button" onClick={()=>setPreview(false)}>ارجع للرسم</button></div>:<><DrawingStudio value={drawing} onChange={setDrawing}/><label htmlFor="preview-caption">فكرتك بجملة</label><textarea id="preview-caption" maxLength={180} rows={2} value={caption} placeholder="كيف يشتغل تعديلك؟" onChange={event=>setCaption(event.target.value)}/><div className="sketch-preview-bottom"><small>تجربة فقط؛ لا تُحفظ في المجتمع.</small><button className="launch-button" disabled={!drawing||caption.trim().length<2||!angle} onClick={()=>setPreview(true)}>معاينة رسمتي <ArrowUpLeft size={18}/></button></div></>}</section></section>
  </main>;
}
