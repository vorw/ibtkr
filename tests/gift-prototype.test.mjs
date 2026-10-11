import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const root='../app/lab/gift-4e509c7635b84840912054f59dd804d2/';
const source=readFileSync(new URL(root+'mechanics.ts',import.meta.url),'utf8');
const code=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {ringGoal,sliderGoal,sealGoal,turnRing,shiftSlider,matches,pressSeal}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function reachable(step,mod){const states=new Set(['0,0,0']),queue=[[0,0,0]];for(let i=0;i<queue.length;i++)for(let j=0;j<3;j++){const v=step(queue[i],j);assert.ok(v.every(x=>x>=0&&x<mod));const key=v.join(',');if(!states.has(key)){states.add(key);queue.push(v);}}return states;}
test('every ring and slider configuration is reachable, including intended solutions',()=>{const rings=reachable(turnRing,4),sliders=reachable(shiftSlider,3);assert.equal(rings.size,64);assert.equal(sliders.size,27);assert.ok(rings.has(ringGoal.join(',')));assert.ok(sliders.has(sliderGoal.join(',')));assert.equal(matches([0,0,0],ringGoal),false);assert.equal(matches(ringGoal,ringGoal),true);});
test('mechanisms move their paired neighbours and preserve their input',()=>{const v=[0,0,0];assert.deepEqual(turnRing(v,0),[1,1,0]);assert.deepEqual(turnRing(v,2),[0,0,1]);assert.deepEqual(shiftSlider(v,2),[1,0,1]);assert.deepEqual(v,[0,0,0]);});
test('seal requires its engraved sequence and recovers from wrong symbols',()=>{let p=0;for(const s of sealGoal)p=pressSeal(p,s);assert.equal(p,3);assert.equal(pressSeal(1,'△'),0);assert.equal(pressSeal(2,'○'),1);});
test('prototype contains no production service imports or requests and is excluded from indexing',()=>{const client=readFileSync(new URL(root+'gift-lab.tsx',import.meta.url),'utf8');assert.doesNotMatch(client,/fetch\(|XMLHttpRequest|WebSocket|localStorage|database|supabase|resend|\/api\//i);const page=readFileSync(new URL(root+'page.tsx',import.meta.url),'utf8');assert.match(page,/index:false,follow:false/);});
