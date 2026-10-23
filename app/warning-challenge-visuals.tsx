'use client';

import './warning-challenge.css';

type SymbolKind='brakes'|'tires'|'engine';
const survey=[
  {kind:'brakes' as const,label:'تحذير الفرامل',percentage:'٦٩٪'},
  {kind:'tires' as const,label:'ضغط الإطارات',percentage:'٣٦٪'},
  {kind:'engine' as const,label:'فحص المحرك',percentage:'٢٧٪'},
];

export const warningSymbolKinds=['brakes','tires','engine'] as const;

export function WarningSymbol({kind}:{kind:SymbolKind}){
  return <svg className="warning-symbol" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='brakes'?<><circle pathLength="1" cx="32" cy="24" r="14"/><path pathLength="1" d="M11 11a25 25 0 0 0 0 26M53 11a25 25 0 0 1 0 26M32 16v10M32 32h.01"/></>:kind==='tires'?<>
      <path pathLength="1" d="M19 8C12 17 10 27 14 35L17 38H47L50 35C54 27 52 17 45 8"/>
      <path pathLength="1" d="M19 38v3m6-3v3m7-3v3m7-3v3m6-3v3"/>
      <path pathLength="1" d="M32 15v11"/><circle pathLength="1" cx="32" cy="32" r=".8"/>
    </>:<><path pathLength="1" d="M17 16h9l5-6h11v6h7v7h6v-5h5v18h-5v-5h-6v6H24l-7-8h-5V16h5ZM30 5h11M36 5v5M5 18v13M5 24h7"/></>}
  </svg>;
}

export function WarningSurveyHero(){
  return <section className="warning-survey" aria-label="نتائج استطلاع التعرّف على رموز السيارة">
    <div className="warning-survey-heading">المشكلة بالأرقام</div>
    <p className="warning-survey-intro">سُئل ١٬٠٠٠ شخص من الولايات المتحدة عن معاني رموز السيارة.</p>
    <div className="warning-survey-grid">{survey.map(item=><div className="warning-survey-stat" key={item.kind}>
      <WarningSymbol kind={item.kind}/><span>{item.label}</span><strong>{item.percentage}</strong><small>لم يعرفوا معنى هذا الرمز</small>
    </div>)}</div>
    <div className="warning-survey-source"><a href="https://www.jiffylube.com/resource-center/car-dashboard-symbols-and-meanings" target="_blank" rel="noreferrer">المصدر: <bdi>Jiffy Lube ↗</bdi></a>
      <details><summary>عن الاستطلاع</summary><p>اختُبر تعرّف ١٬٠٠٠ أمريكي على ١٠ رموز. النسب تخص المشاركين الذين لم يتعرّفوا على كل رمز، وليست إحصاءً للسعودية أو ترتيبًا لحجم البحث. تاريخ إجراء الاستطلاع غير مذكور في المصدر.</p></details>
    </div>
  </section>;
}
