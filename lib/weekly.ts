import { preparedChallenges } from './weekly-content';
import { committeeReviewWeekId } from './committee-review.js';
export type Angle = { id: string; label: string; prompt: string; hint: string; icon: 'shuffle' | 'flip' | 'people' };
export type WeeklyChallenge = { id: string; number: string; category: string; title: string; short: string; description: string; startsAt: string; endsAt: string; angles: Angle[]; submission?: 'drawing'; drawingTheme?: 'warning-symbols' | 'packaging-icons' };

export const packagingChallengeContent={
  category:'تحدّي الرسم · دقيقتان',title:'رسالة على علبة. يفهمها أي أحد.',
  short:'مهمة مفاجأة، ودقيقتان لتصميم رمز تغليف يُفهم بدون كلمات.',
  description:'صمّم رمزًا يوصل تعليمات التعامل مع طرد. ابدأ المؤقت لتكشف مهمتك، ثم ارسم رمزك خلال دقيقتين باستخدام العلبة والأشكال والأسهم، بدون كلمات.',
  submission:'drawing' as const,drawingTheme:'packaging-icons' as const,
  angles:[
    {id:'change',label:'الحماية والتخزين',icon:'shuffle' as const,prompt:'صمّم رمزًا يوضّح تعليمات حماية الطرد وتخزينه.',hint:'المهمة تُكشف بعد بدء المؤقت؛ ارسم باستخدام العلبة والأشكال والأسهم فقط.'},
    {id:'reverse',label:'النقل والفتح',icon:'flip' as const,prompt:'صمّم رمزًا يوضّح حركة التعامل مع العبوة أو فتحها.',hint:'المهمة تُكشف بعد بدء المؤقت؛ ارسم باستخدام العلبة والأشكال والأسهم فقط.'},
    {id:'what-if',label:'الاستخدام والتدوير',icon:'people' as const,prompt:'صمّم رمزًا يوضّح استخدام العبوة أو ما يحدث بعد إفراغها.',hint:'المهمة تُكشف بعد بدء المؤقت؛ ارسم باستخدام العلبة والأشكال والأسهم فقط.'},
  ],
};

// Retain the original comparison preview independently of the scheduled round.
export const cupPreviewContent={
  category:'تحدّي الرسم',title:'كوب… بس مو أي كوب.',short:'ارسم تعديلًا ذكيًا على كوبك، واشرحه بجملة.',description:'كوبك معك في طريق الجامعة. كيف تخليه أذكى؟ اختر زاوية وارسم فكرتك.',submission:'drawing' as const,drawingTheme:undefined,
  angles:[
    {id:'change',label:'ما ينكب',icon:'shuffle' as const,prompt:'ارسم طريقة تمنع الانسكاب وتبقي الشرب سهلًا.',hint:'فكّر في الغطاء أو شكل الكوب. سهم واحد يوضّح فكرتك.'},
    {id:'reverse',label:'ينحمل بسهولة',icon:'flip' as const,prompt:'يدك مشغولة بالجوال أو الشنطة. كيف تحمل كوبك؟',hint:'ارسم كيف تمسكه أو تثبّته، بدون ما يعطّل حركتك.'},
    {id:'what-if',label:'أكثر من كوب',icon:'people' as const,prompt:'أضف للكوب وظيفة ثانية مفيدة، ووضّحها بالرسم.',hint:'وظيفة تخدم يومك، مو مجرد زينة.'},
  ],
};
export const warningChallengeContent={
  category:'تحدّي الرسم',title:'لمبة ولعت… فهمتها؟',short:'أعد رسم رمز من طبلون السيارة ليُفهم من أول نظرة.',
  description:'رمز صغير، ومعنى مو واضح. اختر تنبيهًا من طبلون السيارة وأعد رسم رمزه ليُفهم من أول نظرة، بدون كلمات.',submission:'drawing' as const,drawingTheme:'warning-symbols' as const,
  // Keep the round's existing angle identifiers for drafts, filters and entries.
  angles:[
    {id:'change',label:'تحذير الفرامل',icon:'shuffle' as const,prompt:'أعد رسم رمز تحذير الفرامل بحيث يوضّح أن التنبيه يخص نظام الفرامل، بدون كلمات.',hint:'كيف توضح الفرامل نفسها، بدل الاكتفاء بعلامة تعجّب؟'},
    {id:'reverse',label:'ضغط الإطارات',icon:'flip' as const,prompt:'أعد رسم رمز انخفاض ضغط الإطارات ليُفهم أن الهواء داخل أحد الإطارات أقل من المطلوب.',hint:'وضّح نقص الضغط، لا مجرد وجود إطار.'},
    {id:'what-if',label:'فحص المحرك',icon:'people' as const,prompt:'أعد رسم رمز فحص المحرك ليُفهم أن المحرك أو نظام الانبعاثات يحتاج فحصًا.',hint:'الرمز يطلب فحصًا؛ لا يفترض أن المحرك تعطّل تمامًا.'},
  ],
};

// The public launch begins Saturday October 10 at 00:00 Riyadh.
// All twenty weeks close Saturday 00:00 (Friday 21:00 UTC), so voting stays
// open through Friday 23:59:59.999. Keep the current week identifier stable;
// the pre-opening October 7 round is no longer a public scheduled week.
export const weeklyChallenges: WeeklyChallenge[] = [{
  id: 'week-2026-10-14', number: '01', category: 'التجارب الرقمية',
  title: 'إلغاء الاشتراك… بدون دوّامة.',
  short: 'المستخدم يبي يوقف الاشتراك، والخدمة تبي تعرف السبب. كيف توازن بينهم؟',
  description: 'شخص قرّر يوقف اشتراكه في خدمة رقمية. الشركة تبي تفهم السبب وتحافظ على علاقتها معه، لكن كثرة الخطوات تزعجه. صمّم تجربة تحترم قراره وتفيد الشركة، بدون إجباره يتواصل مع الدعم.',
  startsAt: '2026-10-09T21:00:00.000Z', endsAt: '2026-10-16T21:00:00.000Z',
  angles: [
    { id: 'change', label: 'غيّر القاعدة', icon: 'shuffle', prompt: 'كيف تخلي الإلغاء بخطوة واضحة، وفي نفس الوقت تعطي المستخدم خيارًا مفيدًا إذا كان سبب إلغائه مؤقتًا؟ بدون ما تخفي زر الإلغاء.', hint: 'فكّر في ترتيب الخيارات، وفي الشيء اللي يحتاج يعرفه قبل التأكيد.' },
    { id: 'reverse', label: 'اقلب الفكرة', icon: 'flip', prompt: 'صمّم أسوأ تجربة إلغاء: اختر ثلاثة أشياء تعرقل المستخدم، ثم اعكس كل واحد إلى جزء عملي من تجربة أفضل.', hint: 'لا تكتفي بحذف الإزعاج؛ وضّح كيف يشتغل البديل وماذا يراه المستخدم.' },
    { id: 'what-if', label: 'ماذا لو؟', icon: 'people', prompt: 'ماذا لو المستخدم يجرب الإنترنت لأول مرة، وقراءته محدودة؟ كيف يتأكد أنه ألغى فعلًا، ويفهم متى تتوقف الرسوم؟', hint: 'اختبر وضوح الحل بدون مصطلحات تقنية أو اعتماد على اللون وحده.' },
  ],
}, {
  id: 'week-2026-10-21', number: '02', category: 'التجارب الرقمية',
  title: 'جرّبها… قبل ما تشتريها.',
  short: 'كيف يجرّب المستخدم فائدة المنتج قبل شرائه، بدون زيارة المتجر؟',
  description: 'شخص شاف منتجًا في متجر إلكتروني وأعجبه، لكنه متردد: هل بيناسبه فعلًا؟ المتجر يبي يساعده يقرر بثقة. صمّم طريقة تخليه يجرّب فائدة المنتج قبل شرائه، بدون زيارة المتجر.',
  startsAt: '2026-10-16T21:00:00.000Z', endsAt: '2026-10-23T21:00:00.000Z',
  angles: [
    { id: 'change', label: 'غيّر القاعدة', icon: 'shuffle', prompt: 'كيف تخلي تجربة المنتج تبدأ قبل الدفع؟', hint: 'فكّر في شيء يقدر يجرّبه بنفسه بدل الاكتفاء بالصور والتقييمات.' },
    { id: 'reverse', label: 'اقلب الفكرة', icon: 'flip', prompt: 'بدل ما الشخص يبحث عن منتج يناسبه، كيف تخلي المنتج يثبت إنه مناسب له؟', hint: 'ابدأ باحتياج الشخص، ثم خلّه يشوف كيف المنتج يلبيه.' },
    { id: 'what-if', label: 'ماذا لو؟', icon: 'people', prompt: 'ماذا لو عندك دقيقة واحدة فقط عشان تساعده يعرف هل المنتج يناسبه؟', hint: 'وش أهم شيء يحتاج يكتشفه خلال هالدقيقة؟' },
  ],
}, ...preparedChallenges.map((content,index):WeeklyChallenge => {
  const start = Date.parse('2026-10-23T21:00:00.000Z') + index * 7 * 86400000;
  // Date-shaped identifiers use the following Wednesday; starts are Saturday.
  const localDate = new Date(start + 4 * 86400000 + 3 * 3600000).toISOString().slice(0,10);
  const types: Pick<Angle,'id'|'label'|'icon'>[] = [
    {id:'change',label:'غيّر القاعدة',icon:'shuffle'},
    {id:'reverse',label:'اقلب الفكرة',icon:'flip'},
    {id:'what-if',label:'ماذا لو؟',icon:'people'},
  ];
  const drawing=index===0,packaging=localDate==='2026-11-11';
  return {...content,...(drawing?warningChallengeContent:{}),...(packaging?packagingChallengeContent:{}),id:'week-'+localDate,number:String(index+3).padStart(2,'0'),
    startsAt:new Date(start).toISOString(),endsAt:new Date(start+7*86400000).toISOString(),
    angles:packaging?packagingChallengeContent.angles:drawing?warningChallengeContent.angles:content.angles.map((angle,i)=>({...angle,...types[i]}))};
})];

export function currentChallenge(now = new Date()): WeeklyChallenge | null {
  const time = now.toISOString();
  return weeklyChallenges.find(week => week.startsAt <= time && time < week.endsAt) ?? null;
}
// Presentation selection only. currentChallenge and SQL deadline checks still
// use real time, so historical entries cannot become eligible for new votes.
export function displayedChallenge(now = new Date()): WeeklyChallenge | null {
  return (committeeReviewWeekId ? findWeek(committeeReviewWeekId) : null) ?? currentChallenge(now);
}
export function challengeStatus(week: WeeklyChallenge, now = new Date()): 'upcoming' | 'open' | 'closed' {
  const time = now.toISOString();
  return time < week.startsAt ? 'upcoming' : time < week.endsAt ? 'open' : 'closed';
}
export function findWeek(id: string): WeeklyChallenge | undefined { return weeklyChallenges.find(week => week.id === id); }
export function angleLabel(id: string | null | undefined,weekId?:string): string { return (findWeek(weekId??'')??weeklyChallenges[0]).angles.find(angle => angle.id === id)?.label ?? 'مشاركة سابقة'; }
export const legacyChallengeIds = ['queue', 'reverse', 'alone'];
export function validateSchedule() {
  const ordered = [...weeklyChallenges].sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const ids = new Set<string>();
  for (let index=0; index<ordered.length; index++) {
    const week = ordered[index];
    const start = new Date(week.startsAt), end = new Date(week.endsAt);
    const midnightRiyadh = (date: Date) => date.getUTCHours() === 21 && date.getUTCMinutes() === 0
      && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
    if (ids.has(week.id) || !/^week-\d{4}-\d{2}-\d{2}$/.test(week.id)
      || start.toISOString() !== week.startsAt || end.toISOString() !== week.endsAt
      || !midnightRiyadh(start) || !midnightRiyadh(end) || end.getUTCDay() !== 5
      || (end.getTime()-start.getTime() !== 7*86400000 || start.getUTCDay() !== 5)
      || week.angles.length !== 3 || new Set(week.angles.map(angle => angle.id)).size !== 3
      || week.angles.some(angle=>!angle.prompt.trim()||!angle.hint.trim())
      || (index && ordered[index-1].endsAt !== week.startsAt)) throw new Error('Invalid weekly challenge schedule');
    ids.add(week.id);
  }
}
validateSchedule();


