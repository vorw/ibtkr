// Self-contained maintenance screen. Only the club logo and local fonts load,
// so the application, database and email processing can stay paused.
export const maintenanceHtml = `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ابتكر | وقفة قصيرة</title>
<meta name="description" content="ابتكر متوقف مؤقتًا للصيانة والتحسين. مشاركاتكم ونتائجكم محفوظة.">
<link rel="icon" href="/favicon.svg">
<link rel="preload" href="/fonts/plex-arabic-regular.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:Plex;src:url('/fonts/plex-arabic-regular.woff2') format('woff2');font-display:swap;font-weight:400}
@font-face{font-family:Plex;src:url('/fonts/plex-arabic-medium.woff2') format('woff2');font-display:swap;font-weight:500}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column;background:#f6f7fb;color:#252035;font-family:Plex,Arial,sans-serif}
header,footer{width:min(1120px,calc(100% - 48px));margin-inline:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}header{padding-block:30px}.brand{display:flex;align-items:center;gap:22px}.brand img{width:96px;height:46px;object-fit:contain}.divider{width:1px;height:38px;background:#ded9e8}.name{font-size:29px;font-weight:500;line-height:1.2}.name span{color:#6941c6}.name small{display:block;margin-top:8px;color:#756d82;font-size:12px;font-weight:400}.status{font-size:14px;line-height:1.8;color:#6941c6;border:1px solid #e1d8ef;background:#f0ebf8;padding:8px 15px;border-radius:100px}
main{flex:1;display:grid;place-items:center;padding:24px 24px 64px;text-align:center;overflow:hidden}.content{width:min(100%,650px)}.visual{width:280px;max-width:100%;margin:0 auto 24px;position:relative}.visual svg{display:block;width:100%;height:auto;overflow:visible;fill:none;stroke-linecap:round;stroke-linejoin:round}.orbit{transform-origin:140px 115px;animation:orbit 18s linear infinite}.bulb{animation:breathe 5s ease-in-out infinite}.spark{animation:light 5s ease-in-out infinite}.trace{stroke-dasharray:340;stroke-dashoffset:340;animation:trace 5s ease-in-out infinite}.pencil{animation:pencil 5s ease-in-out infinite}.shadow{animation:shadow 5s ease-in-out infinite;transform-origin:140px 210px}
.eyebrow{font-size:15px;color:#6941c6;margin:0 0 16px}h1{font-weight:500;font-size:clamp(36px,6vw,58px);line-height:1.45;letter-spacing:-1px;margin:0 0 20px}h1 span{color:#6941c6}.description{color:#6b6377;font-size:18px;line-height:2;margin:0 auto;max-width:460px}.note{display:inline-flex;align-items:center;gap:10px;color:#6b6377;font-size:14px;line-height:1.8;margin:28px 0 0;padding:11px 18px;border:1px solid #e1dce9;background:#ffffffb3;border-radius:8px}.note svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:#6941c6;stroke-width:1.5}footer{padding-block:22px;border-top:1px solid #e1dce9;font-size:12px;line-height:1.8;color:#83798f}
@keyframes orbit{to{transform:rotate(360deg)}}@keyframes breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes shadow{50%{transform:scaleX(.85);opacity:.65}}@keyframes light{0%,15%,95%,100%{opacity:.25}35%,75%{opacity:1}}@keyframes trace{0%,10%{stroke-dashoffset:340;opacity:0}20%{opacity:1}75%,85%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}@keyframes pencil{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-4px,-7px) rotate(-3deg)}55%{transform:translate(3px,-4px) rotate(2deg)}75%{transform:translate(0,0) rotate(0)}}
@media(prefers-reduced-motion:reduce){.visual *{animation:none!important}.trace{stroke-dashoffset:0}.spark{opacity:1}}
@media(max-width:520px){header,footer{width:calc(100% - 40px)}header{padding-block:24px}.brand{gap:13px}.brand img{width:72px;height:38px}.name{font-size:25px}.name small{font-size:11px}.status{font-size:12px;padding:7px 11px}.visual{width:240px;margin-bottom:20px}main{padding-block:20px 48px}.description{font-size:16px}.eyebrow{font-size:14px}footer{align-items:flex-start;flex-direction:column;gap:6px}}
</style></head><body>
<header><div class="brand"><img src="/assets/ftc-logo.svg" alt="نادي تقنية المستقبل"><span class="divider" aria-hidden="true"></span><div class="name">ابتكر<span> ▪</span><small>لجنة الابتكار</small></div></div><span class="status">صيانة مؤقتة</span></header>
<main><div class="content">
<div class="visual" aria-hidden="true"><svg viewBox="0 0 280 242">
<ellipse class="shadow" cx="140" cy="210" rx="72" ry="8" fill="#e9e2f3"/>
<g class="orbit" stroke="#e1d8ef" stroke-width="1"><ellipse cx="140" cy="115" rx="108" ry="79" transform="rotate(-24 140 115)"/></g>
<g class="bulb" stroke="#6941c6" stroke-width="2.5"><path d="M121 160c0-14-3-19-13-31a43 43 0 1 1 64 0c-10 12-13 17-13 31" fill="#fff"/><path d="M121 160h38v15h-38z" fill="#ece5f7"/><path d="M128 183h24m-19 8h14M140 160v-35m0 0-12-12m12 12 12-12"/>
<path class="trace" d="M121 160c0-14-3-19-13-31a43 43 0 1 1 64 0c-10 12-13 17-13 31" stroke="#b499e0" stroke-width="5"/>
<path class="spark" d="M140 35v-9M91 52l-7-7M73 94H63m126-42 7-7m11 49h10"/></g>
<g class="pencil" stroke="#6941c6" stroke-width="2"><path d="m192 174 28-55 9 5-28 55-12 9Z" fill="#dfd2f1"/><path d="m220 119 4-7q2-3 5-1l4 2q3 2 1 5l-5 6" fill="#6941c6"/><path d="m192 174 9 5-12 9Z" fill="#fff"/><path d="m189 188 4-5m30-58-24 48"/></g>
</svg></div>
<p class="eyebrow">نرتّب الفكرة الجاية</p><h1>وقفة قصيرة.<br><span>ونرجع نبتكر.</span></h1>
<p class="description">الموقع متوقف مؤقتًا للصيانة والتحسين.<br>مشاركاتكم ونتائجكم محفوظة.</p>
<p class="note"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>المشاركة والتصويت متوقفان مؤقتًا.</p>
</div></main><footer><span>ابتكر · لجنة الابتكار — نادي تقنية المستقبل</span><span>للفكرة وقتها. وللتحسين وقته.</span></footer>
</body></html>`;
