import { committeeReviewEnabled } from './committee-review.js';

// Temporary pause. Expiry is evaluated per request and cron invocation;
// normal operation resumes without another deployment or a new scheduled task.
export const MAINTENANCE_STARTS_AT = '2026-11-13T20:59:00.000Z';
export const MAINTENANCE_ENDS_AT = '2026-11-20T21:00:00.000Z';

export function isMaintenanceActive(now = Date.now()): boolean {
  return !committeeReviewEnabled && now >= Date.parse(MAINTENANCE_STARTS_AT) && now < Date.parse(MAINTENANCE_ENDS_AT);
}

const maintenanceAssets = new Set([
  '/assets/ftc-logo.svg', '/favicon.svg',
  '/fonts/plex-arabic-regular.woff2', '/fonts/plex-arabic-medium.woff2',
]);

export const maintenanceHtml = `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="300">
<title>ابتكر | أنتم قدّها</title>
<meta name="description" content="وقفة لأسبوع الاختبارات. الله يفتح عليكم وييسّر اختباراتكم. نعود السبت ٢١ نوفمبر.">
<link rel="icon" href="/favicon.svg">
<link rel="preload" href="/fonts/plex-arabic-regular.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:Plex;src:url('/fonts/plex-arabic-regular.woff2') format('woff2');font-display:swap;font-weight:400}
@font-face{font-family:Plex;src:url('/fonts/plex-arabic-medium.woff2') format('woff2');font-display:swap;font-weight:500}
*{box-sizing:border-box}body{margin:0;background:#f6f7fb;color:#252035;font-family:Plex,Arial,sans-serif;min-height:100svh;display:flex;flex-direction:column}
header,footer{width:min(1120px,calc(100% - 48px));margin-inline:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
header{padding-block:28px}.brand{display:flex;align-items:center;gap:22px}.brand img{width:92px;height:42px;object-fit:contain}.divider{width:1px;height:33px;background:#e0dce9}.name{font-size:27px;font-weight:500;line-height:1.25}.name span{color:#6941c6}.name small{display:block;font-size:11px;font-weight:400;color:#686174;margin-top:6px}
.status{display:flex;align-items:center;gap:8px;font-size:12px;color:#686174}.status i{width:7px;height:7px;border-radius:50%;background:#6941c6}
.prayer{font-size:clamp(15px,2.5vw,18px);line-height:2;color:#51416f;margin:0 auto 32px;max-width:480px}.encourage{color:#6941c6;font-weight:500}
main{flex:1;display:grid;place-items:center;padding:40px 24px 70px;text-align:center;overflow:hidden}.content{width:min(100%,610px)}
.visual{position:relative;margin:0 auto 24px;width:min(290px,100%);height:198px;isolation:isolate}
.study-scene{width:100%;height:100%;overflow:visible;fill:none;stroke:#6941c6;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.study-scene .paper{fill:#fff}.study-scene .soft{stroke:#d5c9ed}.study-scene .ink{stroke:#9c82cc;stroke-width:1.6}.desk-shadow{fill:#eae4f4;stroke:none}
.page-turn{transform-box:fill-box;transform-origin:right center;animation:page-turn 14s ease-in-out infinite}.study-pencil{transform-box:fill-box;transform-origin:center;animation:pencil-study 14s ease-in-out infinite}.study-phone{transform-box:fill-box;transform-origin:center;animation:phone-distraction 14s ease-in-out infinite}.phone-buzz{animation:phone-buzz 14s ease-in-out infinite}.fresh-ink{stroke-dasharray:85;stroke-dashoffset:85;animation:write-notes 14s ease-in-out infinite}
.study-aside{position:absolute;bottom:0;inset-inline:0;margin:0;color:#6941c6;font-size:13px;font-weight:500;animation:study-aside 14s ease-in-out infinite}
@keyframes page-turn{0%,14%,55%,100%{transform:perspective(350px) rotateY(0deg);opacity:1}18%,59%{transform:perspective(350px) rotateY(-145deg);opacity:.25}23%,64%{transform:perspective(350px) rotateY(0deg);opacity:1}}
@keyframes pencil-study{0%,5%,23%,28%,65%,71%,100%{transform:translate(0,0) rotate(0)}8%,26%,68%,77%,85%{transform:translate(6px,3px) rotate(-3deg)}11%,80%,88%{transform:translate(-3px,7px) rotate(2deg)}32%{transform:translate(0,-12px) rotate(-15deg)}39%{transform:translate(-108px,-8px) rotate(-62deg)}44%,48%{transform:translate(-128px,-8px) rotate(-62deg)}56%{transform:translate(0,-12px) rotate(-8deg)}}
@keyframes phone-distraction{0%,20%,60%,100%{transform:translate(-75px,15px) rotate(-12deg);opacity:0}25%,36%{transform:translate(0,0) rotate(0);opacity:1}40%{transform:translate(-7px,0) rotate(-8deg);opacity:1}47%,55%{transform:translate(-90px,18px) rotate(-25deg);opacity:0}}
@keyframes phone-buzz{0%,26%,30%,100%{transform:translateX(0)}27%,29%{transform:translateX(-2px)}28%{transform:translateX(2px)}}
@keyframes write-notes{0%,4%,64%{stroke-dashoffset:85}13%,53%,85%,100%{stroke-dashoffset:0}58%{stroke-dashoffset:85}}
@keyframes study-aside{0%,33%,65%,100%{opacity:0;transform:translateY(5px)}40%,56%{opacity:1;transform:translateY(0)}}
.eyebrow{font-size:12px;color:#6941c6;margin:0 0 14px}h1{font-size:clamp(33px,6vw,54px);font-weight:500;line-height:1.4;letter-spacing:-1.2px;margin:0 0 16px}.description{font-size:16px;color:#686174;line-height:1.9;margin:0 auto 30px;max-width:390px}.return{display:inline-flex;align-items:center;gap:12px;border:1px solid #e0dce9;background:#fff;padding:15px 22px;border-radius:12px;font-size:14px}.return svg{width:19px;height:19px;stroke:#6941c6;fill:none;stroke-width:1.6}.timezone{font-size:11px;color:#81788e;margin:12px 0 0}
footer{padding-block:23px;border-top:1px solid #e0dce9;color:#81788e;font-size:11px;line-height:1.8}.saved{color:#686174}
@media(prefers-reduced-motion:reduce){.study-scene *,.study-aside{animation:none!important}.study-phone,.study-aside{display:none}.fresh-ink{stroke-dashoffset:0}}
@media(max-width:520px){header,footer{width:calc(100% - 40px)}header{padding-block:22px}.brand{gap:13px}.brand img{width:69px}.name{font-size:24px}.status{font-size:10px}.visual{width:250px;height:175px;margin-bottom:24px}main{padding-block:35px 55px}.description{font-size:14px}footer{align-items:flex-start;flex-direction:column;gap:5px}}
</style></head><body>
<header><div class="brand"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل"><span class="divider"></span><div class="name">ابتكر<span> ▪</span><small>لجنة الابتكار</small></div></div><div class="status"><i></i>وقفة للاختبارات</div></header>
<main><div class="content"><div class="visual" role="img" aria-label="كتاب وقلم يعودان للمذاكرة بعد إبعاد الجوال"><svg class="study-scene" viewBox="0 0 290 198" aria-hidden="true">
<ellipse class="desk-shadow" cx="155" cy="157" rx="104" ry="9"/>
<g class="study-phone"><g class="phone-buzz"><rect x="30" y="76" width="38" height="68" rx="7" fill="#f4f0fb"/><rect x="35" y="85" width="28" height="46" rx="2" fill="#fff" stroke="#c8b8e8"/><path d="M44 80h10M46 137h6"/><path d="m44 101 11 0m-11 7h8m-8 7h11" class="soft"/></g></g>
<path d="M78 76q37-11 73 3 34-14 72-3v77q-36-10-72 1-35-11-73-1Z" fill="#e4d9f5"/>
<path class="paper" d="M80 69q34-11 71 6 35-17 70-6v77q-35-10-70 5-35-15-71-5Z"/>
<path class="soft" d="M151 75v76M88 144q30-6 56 4m15 0q29-10 54-4"/>
<path class="ink" d="M94 89q23-4 41 4M94 101q23-4 41 4M94 113q16-2 28 1M168 89q17-5 36-3"/>
<path class="fresh-ink ink" d="M168 100q17-5 36-3m-36 14q17-5 36-3m-36 14q11-4 23-3"/>
<g class="page-turn"><path d="M151 75q-35-17-71-6v77q36-10 71 5Z" fill="#fff"/><path class="ink" d="M94 89q23-4 41 4M94 101q23-4 41 4M94 113q16-2 28 1"/></g>
<path d="M160 148v16l7-4 7 4v-19" fill="#b8a0df" stroke="none"/>
<g class="study-pencil"><path d="m198 111 26-54 8 4-26 54-10 7Z" fill="#dacbf0"/><path d="m224 57 3-6q2-3 5-1l3 2q2 1 0 5l-3 4" fill="#6941c6"/><path d="m198 111 8 4-10 7Z" fill="#fff"/><path d="m196 122 3-5M225 61l-23 48"/></g>
</svg><p class="study-aside" aria-hidden="true">الجوال بعدين.</p></div>
<p class="eyebrow">وقفة قصيرة لأسبوع الاختبارات</p><h1>ابتكر ينتظركم.<br>الحين وقت المذاكرة.</h1><p class="description">خطوة خطوة… <span class="encourage">أنتم قدّها.</span><br>خذوا نفس، رتّبوا وقتكم، وركّزوا على اختباراتكم.</p>
<p class="prayer">الله يفتح عليكم وييسّر اختباراتكم،<br>ويبارك في وقتكم وجهدكم.</p>
<div class="return"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg><span>نعود السبت، ٢١ نوفمبر</span></div><p class="timezone">الساعة ١٢:٠٠ صباحًا · بتوقيت الرياض</p>
</div></main><footer><span>ابتكر · لجنة الابتكار — نادي تقنية المستقبل</span><span class="saved">مشاركاتكم ونتائجكم السابقة محفوظة.</span></footer>
</body></html>`;

export function maintenanceResponse(request: Request, now = Date.now()): Response | null {
  if (!isMaintenanceActive(now)) return null;
  const path = new URL(request.url).pathname;
  if ((request.method === 'GET' || request.method === 'HEAD') && maintenanceAssets.has(path)) return null;
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'Retry-After': new Date(MAINTENANCE_ENDS_AT).toUTCString(),
    'X-Content-Type-Options': 'nosniff',
  };
  if (path === '/api' || path.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({
      error: 'ابتكر في وقفة لأسبوع الاختبارات. نعود السبت ٢١ نوفمبر. الله يوفقكم.',
      code: 'maintenance', resumesAt: MAINTENANCE_ENDS_AT,
    }), { status: 503, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
  }
  return new Response(request.method === 'HEAD' ? null : maintenanceHtml, {
    status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}


