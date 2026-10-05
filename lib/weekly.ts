export type Angle = { id: string; label: string; prompt: string; hint: string; icon: 'shuffle' | 'flip' | 'people' };
export type WeeklyChallenge = { id: string; number: string; category: string; title: string; short: string; description: string; startsAt: string; endsAt: string; angles: Angle[] };

// Publish reviewed content here before its start. Dates are UTC; Wednesday
// 00:00 in Riyadh is Tuesday 21:00 UTC. Never recycle IDs or overwrite past weeks.
export const weeklyChallenges: WeeklyChallenge[] = [{
  id: 'week-2026-09-30', number: '01', category: 'الحياة اليومية',
  title: 'الانتظار… بس بطريقة ثانية.',
  short: 'طابور طويل، وناس مستعجلة. كيف تغيّر التجربة؟',
  description: 'تخيّل مطعمًا صغيرًا وقت الزحمة. الزبائن ينتظرون طلباتهم، وما يعرفون متى يجي دورهم. ابتكر تجربة تخلي الانتظار أقل إزعاجًا، بدون موظفين إضافيين. نفس الموقف، وثلاث زوايا تفتح لك حلول مختلفة.',
  startsAt: '2026-09-29T21:00:00.000Z', endsAt: '2026-10-06T21:00:00.000Z',
  angles: [
    { id: 'change', label: 'غيّر القاعدة', icon: 'shuffle', prompt: 'لو الزبون ما يحتاج يوقف في الطابور أصلًا، كيف يعرف دوره ويستلم طلبه بدون تطبيق جديد؟', hint: 'غيّر طريقة ترتيب الدور أو توصيل المعلومة، مو بس سرعة الخدمة.' },
    { id: 'reverse', label: 'اقلب الفكرة', icon: 'flip', prompt: 'تخيّل أسوأ تجربة انتظار ممكنة. اختر شيئين يخلّونها مزعجة، واقلبهم إلى حل قابل للتطبيق.', hint: 'ابدأ بالإزعاج: غموض الدور، أو الخوف من فواته. كيف يصير كل واحد منهم ميزة؟' },
    { id: 'what-if', label: 'ماذا لو؟', icon: 'people', prompt: 'ماذا لو بعض الزبائن ما معهم جوال، وبعضهم ما يسمعون إعلان الأسماء؟ كيف تخلي حلّك واضحًا للجميع وبدون تكلفة كبيرة؟', hint: 'جرّب حلّك مع أكثر من شخص واحتياج. فكّر في شيء يُرى أو يُفهم بدون شرح طويل.' },
  ],
}, {
  id: 'week-2026-10-07', number: '02', category: 'التجارب الرقمية',
  title: 'إلغاء الاشتراك… بدون دوّامة.',
  short: 'المستخدم يبي يوقف الاشتراك، والخدمة تبي تعرف السبب. كيف توازن بينهم؟',
  description: 'شخص قرّر يوقف اشتراكه في خدمة رقمية. الشركة تبي تفهم السبب وتحافظ على علاقتها معه، لكن كثرة الخطوات تزعجه. صمّم تجربة تحترم قراره وتفيد الشركة، بدون إجباره يتواصل مع الدعم.',
  startsAt: '2026-10-06T21:00:00.000Z', endsAt: '2026-10-13T21:00:00.000Z',
  angles: [
    { id: 'change', label: 'غيّر القاعدة', icon: 'shuffle', prompt: 'كيف تخلي الإلغاء بخطوة واضحة، وفي نفس الوقت تعطي المستخدم خيارًا مفيدًا إذا كان سبب إلغائه مؤقتًا؟ بدون ما تخفي زر الإلغاء.', hint: 'فكّر في ترتيب الخيارات، وفي الشيء اللي يحتاج يعرفه قبل التأكيد.' },
    { id: 'reverse', label: 'اقلب الفكرة', icon: 'flip', prompt: 'صمّم أسوأ تجربة إلغاء: اختر ثلاثة أشياء تعرقل المستخدم، ثم اعكس كل واحد إلى جزء عملي من تجربة أفضل.', hint: 'لا تكتفي بحذف الإزعاج؛ وضّح كيف يشتغل البديل وماذا يراه المستخدم.' },
    { id: 'what-if', label: 'ماذا لو؟', icon: 'people', prompt: 'ماذا لو المستخدم يجرب الإنترنت لأول مرة، وقراءته محدودة؟ كيف يتأكد أنه ألغى فعلًا، ويفهم متى تتوقف الرسوم؟', hint: 'اختبر وضوح الحل بدون مصطلحات تقنية أو اعتماد على اللون وحده.' },
  ],
}, {
  id: 'week-2026-10-14', number: '03', category: 'المجتمع',
  title: 'جاي لحالك؟ مكانك موجود.',
  short: 'كيف تتحول أول خمس دقائق من إحراج إلى مشاركة مريحة؟',
  description: 'شخص وصل لفعالية جامعية لحاله، والموجودون يعرفون بعض. ابتكر تجربة بسيطة تساعده يشارك براحة، بدون تعريف بنفسه أمام الجميع، وبدون ميزانية إضافية.',
  startsAt: '2026-10-13T21:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z',
  angles: [
    { id: 'change', label: 'غيّر القاعدة', icon: 'shuffle', prompt: 'غيّر طريقة بدء النشاط بحيث ما يحتاج أحد يدور على مجموعة بنفسه. كيف يشارك القادم وحده بدون ما يشعر أنه حالة خاصة؟', hint: 'صمّم خطوة واحدة تمرّ على الجميع، مو حلًّا يلفت النظر للشخص وحده.' },
    { id: 'reverse', label: 'اقلب الفكرة', icon: 'flip', prompt: 'تخيّل نشاطًا يخلي القادم وحده ينسحب. حدّد ثلاثة أسباب، واعكسها إلى نشاط يختار فيه مستوى مشاركته براحة.', hint: 'فكّر في الاختيار، والضغط الاجتماعي، والوقت قبل أول تفاعل.' },
    { id: 'what-if', label: 'ماذا لو؟', icon: 'people', prompt: 'ماذا لو بعض الحضور يفضلون المشاركة بدون كلام، ويصلون في أوقات مختلفة؟ كيف يبقى نشاطك مفهومًا ومفتوحًا لهم؟', hint: 'اختبر الحل مع شخص وصل متأخرًا وآخر ما يبي يبدأ محادثة.' },
  ],
}];

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
    if (ids.has(week.id) || !/^week-\d{4}-\d{2}-\d{2}$/.test(week.id) || new Date(week.startsAt).toISOString() !== week.startsAt || new Date(week.endsAt).toISOString() !== week.endsAt || week.startsAt >= week.endsAt || week.angles.length !== 3 || new Set(week.angles.map(angle => angle.id)).size !== 3 || (index && ordered[index-1].endsAt > week.startsAt)) throw new Error('Invalid weekly challenge schedule');
    ids.add(week.id);
  }
}
validateSchedule();
