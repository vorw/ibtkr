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
