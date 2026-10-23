'use client';

import SketchPreview from '../lab/sketch-7ca2f309e64d4b9f8a31/sketch-preview';
import { weeklyChallenges,type WeeklyChallenge } from '@/lib/weekly';
import './warning-preview.css';

type SymbolKind='brakes'|'tires'|'engine';
const survey=[
  {kind:'brakes' as const,label:'تحذير الفرامل',percentage:'٦٩٪'},
  {kind:'tires' as const,label:'ضغط الإطارات',percentage:'٣٦٪'},
  {kind:'engine' as const,label:'فحص المحرك',percentage:'٢٧٪'},
];

// Preview-only content. The published weekly schedule and submissions stay independent.
const challenge:WeeklyChallenge={
  ...weeklyChallenges[2],id:'preview-warning-symbols',
  title:'لمبة ولعت… فهمتها؟',short:'أعد رسم رمز من طبلون السيارة ليُفهم من أول نظرة.',
  description:'رمز صغير، ومعنى مو واضح. اختر تنبيهًا من طبلون السيارة وأعد رسم رمزه ليُفهم من أول نظرة، بدون كلمات.',
  angles:[
    {id:'brakes',label:'تحذير الفرامل',icon:'shuffle',prompt:'أعد رسم رمز تحذير الفرامل بحيث يوضّح أن التنبيه يخص نظام الفرامل، بدون كلمات.',hint:'كيف توضح الفرامل نفسها، بدل الاكتفاء بعلامة تعجّب؟'},
    {id:'tires',label:'ضغط الإطارات',icon:'flip',prompt:'أعد رسم رمز انخفاض ضغط الإطارات ليُفهم أن الهواء داخل أحد الإطارات أقل من المطلوب.',hint:'وضّح نقص الضغط، لا مجرد وجود إطار.'},
    {id:'engine',label:'فحص المحرك',icon:'people',prompt:'أعد رسم رمز فحص المحرك ليُفهم أن المحرك أو نظام الانبعاثات يحتاج فحصًا.',hint:'الرمز يطلب فحصًا؛ لا يفترض أن المحرك تعطّل تمامًا.'},
  ],
};

function WarningSymbol({kind}:{kind:SymbolKind}){
  return <svg className="warning-symbol" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='brakes'?<><circle cx="32" cy="24" r="14"/><path d="M11 11a25 25 0 0 0 0 26M53 11a25 25 0 0 1 0 26M32 16v10M32 32h.01"/></>:kind==='tires'?<><path d="M18 7C12 16 11 29 15 39h34c4-10 3-23-3-32M14 33h4m2 6v-4m7 4v-4m10 4v-4m7 4v-4m6-2h-4M32 13v11M32 29h.01"/></>:<><path d="M17 16h9l5-6h11v6h7v7h6v-5h5v18h-5v-5h-6v6H24l-7-8h-5V16h5ZM30 5h11M36 5v5M5 18v13M5 24h7"/></>}
  </svg>;
}

function SurveyHero(){
  return <section className="warning-survey" aria-label="نتائج استطلاع التعرّف على رموز السيارة">
    <div className="warning-survey-heading"><span>المشكلة بالأرقام</span><small>استطلاع أمريكي · ١٬٠٠٠ مشارك</small></div>
    <div className="warning-survey-grid">{survey.map(item=><div className="warning-survey-stat" key={item.kind}>
      <WarningSymbol kind={item.kind}/><strong>{item.percentage}</strong><span>{item.label}</span>
    </div>)}</div>
    <p className="warning-survey-meaning">لم يتعرّفوا على معنى الرمز.</p>
    <div className="warning-survey-source"><a href="https://www.jiffylube.com/resource-center/car-dashboard-symbols-and-meanings" target="_blank" rel="noreferrer">المصدر: <bdi>Jiffy Lube ↗</bdi></a>
      <details><summary>عن الاستطلاع</summary><p>اختُبر تعرّف ١٬٠٠٠ أمريكي على ١٠ رموز. النسب تخص المشاركين الذين لم يتعرّفوا على كل رمز، وليست إحصاءً للسعودية أو ترتيبًا لحجم البحث. تاريخ إجراء الاستطلاع غير مذكور في المصدر.</p></details>
    </div>
  </section>;
}

export default function WarningPreview(){
  return <div className="warning-preview"><SketchPreview mission={challenge} drawingHero={<SurveyHero/>} selectionKind="symbol"
    angleVisuals={survey.map(item=><WarningSymbol key={item.kind} kind={item.kind}/>)}
    notice="معاينة ثانية · رموز السيارة · بدون نشر أو قصّ الشريط"
    captionPlaceholder="كيف يوضّح رمزك المعنى؟"/>
  </div>;
}
