import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {packagingGameHtml,packagingTasks} from '../lib/packaging-game.ts';

const weekStart=Date.parse('2026-11-06T21:00:00Z'),weekEnd='2026-11-13T21:00:00.000Z';
const html=packagingGameHtml.replace('__PACKAGING_TASKS__',JSON.stringify(packagingTasks)).replaceAll('__WEEK_ID__','week-2026-11-11').replaceAll('__WEEK_ENDS__',weekEnd);
const script=html.split('<script>')[1].split('</script>')[0];
function game(saved=new Map(),start=weekStart){
  let now=start;const elements=new Map();
  const context=new Proxy({}, {get:()=>()=>{}});
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:900,height:900}),value:5});return elements.get(id);};
  const document={getElementById:element,addEventListener(){},body:{scrollHeight:800},referrer:'https://ibtkr.space/'};
  const window={parent:{postMessage(){}},scrollTo(){},addEventListener(){}};
  const Clock=class extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
  const c=vm.createContext({document,window,Date:Clock,URL,crypto:webcrypto,Uint32Array,Math,console,ResizeObserver:class{observe(){}},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},setTimeout:fn=>{fn();return 1;},setInterval:()=>1,confirm:()=>true});
  vm.runInContext(script,c);
  return {c,element,saved,run:source=>vm.runInContext(source,c),advance:ms=>{now+=ms;vm.runInContext('tick()',c);}};
}
test('30 different object-focused tasks are hidden before starting',()=>{
  assert.equal(packagingTasks.length,30);assert.equal(new Set(packagingTasks.map(t=>t[0])).size,30);
  assert.match(html,/<section id="play" hidden>/);assert.match(html,/<h2 id="tasktitle"><\/h2>/);
  assert.match(html,/العلبة والأشكال والأسهم فقط/);
  const g=game();assert.equal(g.run('state'),null);assert.equal(g.element('tasktitle').textContent,undefined);
});
test('a 120-second attempt survives refresh and locks exactly at expiry',async()=>{
  const g=game();await g.run('begin()');
  assert.equal(g.run('state.deadline-Date.now()'),120000);assert.equal(g.element('seconds').textContent,'02:00');
  const deadline=g.run('state.deadline');g.advance(90000);
  const restored=game(g.saved,weekStart+90000);assert.equal(restored.run('state.deadline'),deadline);assert.equal(restored.element('seconds').textContent,'00:30');
  restored.advance(30000);assert.equal(restored.run('state.status'),'done');assert.equal(restored.run('canDraw()'),false);assert.equal(restored.element('pen').disabled,true);
});
test('30 attempts in one browser receive 30 different tasks',async()=>{
  const g=game(),picked=[];
  for(let i=0;i<30;i++){await g.run('begin()');picked.push(g.run('state.task'));g.run('end(true);state=null;');}
  assert.equal(new Set(picked).size,30);
});
test('an attempt cannot extend beyond the weekly closing deadline',async()=>{
  const g=game(new Map(),Date.parse(weekEnd)-30000);await g.run('begin()');assert.equal(g.run('state.deadline'),Date.parse(weekEnd));
});
test('only two skips reveal different tasks without resetting time, even after refresh',async()=>{
 const g=game();await g.run('begin()');const original=g.run('state.task'),deadline=g.run('state.deadline');
 g.advance(10000);g.run("strokes=[{mode:'pen',width:5,points:[{x:1,y:1}]}];skipTask()");
 const second=g.run('state.task');assert.notEqual(second,original);assert.equal(g.run('strokes.length'),0);
 assert.equal(g.run('state.deadline'),deadline);assert.equal(g.run('skipCount()'),1);
 const restored=game(g.saved,weekStart+10000);assert.equal(restored.run('skipCount()'),1);
 restored.run('skipTask()');const third=restored.run('state.task');assert.notEqual(third,original);assert.notEqual(third,second);
 assert.equal(restored.run('state.deadline'),deadline);assert.equal(restored.run('skipCount()'),2);assert.equal(restored.element('skip').disabled,true);
 restored.run('skipTask()');assert.equal(restored.run('state.task'),third);assert.equal(restored.run('skipCount()'),2);
 const again=game(restored.saved,weekStart+10000);again.run('skipTask()');assert.equal(again.run('state.task'),third);
});
test('skipping is blocked once the timer expires or the attempt finishes',async()=>{
 const g=game();await g.run('begin()');const task=g.run('state.task');g.advance(120000);g.run('skipTask()');assert.equal(g.run('state.task'),task);assert.equal(g.run('skipCount()'),0);assert.equal(g.element('skip').disabled,true);
});
test('finished attempts expose only share and cannot restart, including after refresh',async()=>{
 const g=game();await g.run('begin()');const id=g.run('state.attemptId'),task=g.run('state.task');
 g.run('end(true)');await g.run('begin()');assert.equal(g.run('state.status'),'done');assert.equal(g.run('state.attemptId'),id);assert.equal(g.run('state.task'),task);
 assert.equal(g.element('drawing-tools').hidden,true);assert.equal(g.element('skip').hidden,true);assert.equal(g.element('finish').hidden,true);
 const restored=game(g.saved);await restored.run('begin()');assert.equal(restored.run('state.attemptId'),id);assert.equal(restored.run('state.status'),'done');
 const actions=html.match(/<div id="actions"[\s\S]*?<\/div>/)[0];assert.equal((actions.match(/<button /g)||[]).length,1);assert.match(actions,/id="publish"/);
 for(const id of ['sound','download','again'])assert.equal(html.includes('id="'+id+'"'),false);
 assert.ok(html.includes('ابدأ التحدّي (دقيقتان)'));assert.equal(html.includes('تخطّ المهمة ·'),false);
});
