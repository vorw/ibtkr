import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('production retains the complete challenge interface and site navigation',()=>{
 const app=read('app/innovation-app.tsx');assert.match(app,/<WeeklyChallengeView\s+mission=\{/);
 for(const route of ['home','ideas','leaderboard','profile'])assert.match(app,new RegExp("id:\\s*[\"']"+route+"[\"']"));
 const view=read('app/weekly-challenge-view.tsx');
 for(const name of ['mission-layout weekly-layout','mission-topline','weekly-countdown','mission-selector','angle-hint','weekly-score-panel'])assert.ok(view.includes(name),name);
});
test('prototype routes, hidden opening bypass and review mode are removed',()=>{
 for(const path of ['app/lab','app/drawing-preview','app/drawing-preview2','app/ink-7q','app/opening-preview','lib/committee-review.js','examples','build'])assert.equal(existsSync(new URL('../'+path,import.meta.url)),false,path);
 assert.doesNotMatch(read('app/opening-gate.tsx'),/SitePreviewContext|opening-hidden-entry|previewState/);
 assert.doesNotMatch(read('app/innovation-app.tsx'),/openingPreview|weekly\.review|displayedChallenge/);
});
test('the removed reassurance is absent from application and challenge source',()=>{
 const removed=['خطوط','بسيطة','تكفي'].join(' ');
 function scan(dir){for(const e of readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())scan(path);else if(/\.(tsx?|css)$/.test(e.name))assert.equal(read(path).includes(removed),false,path);}}
 scan('app');scan('lib');
});
test('desktop angle cards fit content without changing mobile stacking',()=>{
 assert.match(read('app/globals.css'),/@media \(min-width: 901px\)\s*\{\s*\.weekly-layout \.command-stack\s*\{ align-self: start; \}\s*\.weekly-layout \.mission-selector\s*\{ flex: 0 0 auto; \}/);
});
