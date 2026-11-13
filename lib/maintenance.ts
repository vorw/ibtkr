// Temporary pause. Expiry is evaluated per request and cron invocation;
// normal operation resumes without another deployment or a new scheduled task.
export const MAINTENANCE_ENDS_AT = '2026-11-20T21:00:00.000Z';

export function isMaintenanceActive(now = Date.now()): boolean {
  return now < Date.parse(MAINTENANCE_ENDS_AT);
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
.prayer{font-size:clamp(15px,2.5vw,18px);line-height:2;color:#51416f;margin:0 auto 32px;max-width:480px}.encourage{color:#6941c6;font-weight:500}.visual svg{animation:breathe 5s ease-in-out infinite}.spark{border-radius:2px}@keyframes breathe{50%{transform:translateY(-5px)}}
main{flex:1;display:grid;place-items:center;padding:40px 24px 70px;text-align:center;overflow:hidden}.content{width:min(100%,610px)}
.visual{position:relative;display:grid;place-items:center;margin:0 auto 38px;width:176px;height:176px;border:1px solid #e2dcef;border-radius:50%;background:radial-gradient(circle,#ede7fa 0,transparent 70%)}
.visual:before{content:'';position:absolute;inset:16px;border:1px dashed #c8b8e8;border-radius:50%;animation:orbit 55s linear infinite}.visual svg{width:73px;height:86px;stroke:#6941c6;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.spark{position:absolute;width:10px;height:10px;background:#c9df9a;transform:rotate(45deg);top:25px;right:18px}
.eyebrow{font-size:12px;color:#6941c6;margin:0 0 14px}h1{font-size:clamp(33px,6vw,54px);font-weight:500;line-height:1.4;letter-spacing:-1.2px;margin:0 0 16px}.description{font-size:16px;color:#686174;line-height:1.9;margin:0 auto 30px;max-width:390px}.return{display:inline-flex;align-items:center;gap:12px;border:1px solid #e0dce9;background:#fff;padding:15px 22px;border-radius:12px;font-size:14px}.return svg{width:19px;height:19px;stroke:#6941c6;fill:none;stroke-width:1.6}.timezone{font-size:11px;color:#81788e;margin:12px 0 0}
footer{padding-block:23px;border-top:1px solid #e0dce9;color:#81788e;font-size:11px;line-height:1.8}.saved{color:#686174}
@keyframes orbit{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.visual:before,.visual svg{animation:none}}
@media(max-width:520px){header,footer{width:calc(100% - 40px)}header{padding-block:22px}.brand{gap:13px}.brand img{width:69px}.name{font-size:24px}.status{font-size:10px}.visual{width:150px;height:150px;margin-bottom:30px}main{padding-block:35px 55px}.description{font-size:14px}footer{align-items:flex-start;flex-direction:column;gap:5px}}
</style></head><body>
<header><div class="brand"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل"><span class="divider"></span><div class="name">ابتكر<span> ▪</span><small>لجنة الابتكار</small></div></div><div class="status"><i></i>وقفة للاختبارات</div></header>
<main><div class="content"><div class="visual" aria-hidden="true"><span class="spark"></span><svg viewBox="0 0 64 80"><path d="M32 22c-7-5-16-7-26-5v40c10-2 19 0 26 5 7-5 16-7 26-5V17c-10-2-19 0-26 5ZM32 22v40"/><path d="M13 28c4 0 8 1 12 3m-12 8c4 0 8 1 12 3m14-11c4-2 8-3 12-3m-12 14c4-2 8-3 12-3"/><path d="M25 7h14M32 3v8"/></svg></div>
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

