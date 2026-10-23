import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('production and the sketch preview share the complete weekly challenge view',()=>{
  for(const path of ['app/innovation-app.tsx','app/lab/sketch-7ca2f309e64d4b9f8a31/sketch-preview.tsx'])assert.match(read(path),/<WeeklyChallengeView mission=\{/);
  const view=read('app/weekly-challenge-view.tsx');
  for(const element of ['mission-layout weekly-layout','mission-hero tone-violet','mission-topline','week-number','week-status','weekly-countdown','mission-selector','angle-hint','weekly-score-panel'])assert.ok(view.includes(element),element);
});
test('the preview keeps the site shell and opens drawing in the existing composer dialog',()=>{
  const preview=read('app/lab/sketch-7ca2f309e64d4b9f8a31/sketch-preview.tsx');
  for(const element of ['site-header','header-inner','brand-product','main-nav','ThemeToggle','workspace','community-preview','site-footer','ftc-dialog composer drawing-composer'])assert.ok(preview.includes(element),element);
  for(const route of ['home','ideas','leaderboard','profile'])assert.ok(preview.includes("id:'"+route+"'"));
  assert.ok(preview.includes('missionIndex={angleIndex}'));assert.ok(preview.includes('useState<number|null>(null)'));
  assert.doesNotMatch(preview,/fetch\(|requestCommunity|sessionHeaders|database\(/);
});
test('the removed reassurance does not appear in any application or challenge source',()=>{
  const removed=['خطوط','بسيطة','تكفي'].join(' ');
  function check(directory){for(const entry of readdirSync(new URL('../'+directory,import.meta.url),{withFileTypes:true})){const path=directory+'/'+entry.name;if(entry.isDirectory())check(path);else if(/\.(tsx?|css)$/.test(entry.name))assert.equal(read(path).includes(removed),false,path);}}
  check('app');check('lib');
});
test('the short leader link renders the same unlisted preview without affecting the public homepage',()=>{
  const alias=read('app/drawing-preview/page.tsx');
  assert.match(alias,/import SketchPreview from '\.\.\/lab\/sketch-7ca2f309e64d4b9f8a31\/sketch-preview'/);
  assert.match(alias,/<SketchPreview\/>/);assert.match(alias,/index:false,follow:false/);
  assert.doesNotMatch(read('app/page.tsx'),/SketchPreview|drawing-preview/);
});
test('desktop angle cards fit their content without changing the stacked mobile layout',()=>{
  const css=read('app/globals.css');
  assert.match(css,/@media \(min-width: 901px\)\s*\{\s*\.weekly-layout \.command-stack\s*\{ align-self: start; \}\s*\.weekly-layout \.mission-selector\s*\{ flex: 0 0 auto; \}/);
});
test('the cup illustration has no detached callout arrow',()=>{
  const view=read('app/weekly-challenge-view.tsx');
  assert.ok(view.includes('M42 25l9 78'));assert.ok(view.includes('M66 5l-3-6m20 4v-8'));
  assert.equal(view.includes('M129 21l29-10'),false);
});
