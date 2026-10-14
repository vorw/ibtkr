import { preparedChallenges } from './weekly-content';
export type Angle = { id: string; label: string; prompt: string; hint: string; icon: 'shuffle' | 'flip' | 'people' };
export type WeeklyChallenge = { id: string; number: string; category: string; title: string; short: string; description: string; startsAt: string; endsAt: string; angles: Angle[] };

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
  return {...content,id:'week-'+localDate,number:String(index+3).padStart(2,'0'),
    startsAt:new Date(start).toISOString(),endsAt:new Date(start+7*86400000).toISOString(),
    angles:content.angles.map((angle,i)=>({...angle,...types[i]}))};
})];

export function currentChallenge(now = new Date()): WeeklyChallenge | null {
  const time = now.toISOString();
  return weeklyChallenges.find(week => week.startsAt <= time && time < week.endsAt) ?? null;
}
export function challengeStatus(week: WeeklyChallenge, now = new Date()): 'upcoming' | 'open' | 'closed' {
  const time = now.toISOString();
  return time < week.startsAt ? 'upcoming' : time < week.endsAt ? 'open' : 'closed';
}
export function findWeek(id: string): WeeklyChallenge | undefined { return weeklyChallenges.find(week => week.id === id); }
export function angleLabel(id: string | null | undefined): string { return weeklyChallenges[0].angles.find(angle => angle.id === id)?.label ?? 'مشاركة سابقة'; }
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
