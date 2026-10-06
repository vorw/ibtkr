import assert from 'node:assert/strict';
import { test,beforeEach,afterEach } from 'node:test';
import { createOpeningAudio } from '../lib/opening-audio.ts';

let contexts;
class AudioFixture {
  state='suspended';currentTime=5;sampleRate=48000;destination={};sources=[];closed=false;
  constructor(){contexts.push(this);}
  async resume(){this.state='running';}
  async close(){this.state='closed';this.closed=true;}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{value:0},connect(){},disconnect(){}};}
  source(){const node={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(t){this.startTime=t;},stop(t){this.stopTime=t;}};this.sources.push(node);return node;}
  createBufferSource(){return this.source();}
  createOscillator(){return this.source();}
}
beforeEach(()=>{contexts=[];globalThis.window={AudioContext:AudioFixture};});
afterEach(()=>{delete globalThis.window;});

test('page construction and unopened effects never create audio or autoplay',()=>{
  const audio=createOpeningAudio();audio.charge();audio.cut();audio.reveal();assert.equal(contexts.length,0);
});
test('a gesture unlocks bounded effects, and disposal makes later effects silent',async()=>{
  const audio=createOpeningAudio();await audio.unlock();audio.charge();audio.cut();audio.reveal();
  assert.equal(contexts.length,1);const ctx=contexts[0];assert.ok(ctx.sources.length>0);
  assert.ok(ctx.sources.every(s=>s.startTime>=ctx.currentTime&&s.stopTime>s.startTime&&s.stopTime<ctx.currentTime+3));
  ctx.sources.forEach(s=>s.onended());audio.dispose();assert.equal(ctx.closed,true);
  const count=ctx.sources.length;audio.charge();audio.cut();audio.reveal();assert.equal(ctx.sources.length,count);
});
test('unsupported audio and rejected browser activation do not break the activity',async()=>{
  window.AudioContext=undefined;const unsupported=createOpeningAudio();await unsupported.unlock();unsupported.charge();unsupported.cut();unsupported.reveal();
  window.AudioContext=class extends AudioFixture{async resume(){throw Error('Audio blocked');}};
  const restricted=createOpeningAudio();await restricted.unlock();restricted.charge();restricted.cut();restricted.reveal();
  assert.equal(contexts[0].sources.length,0);restricted.dispose();
});
test('re-enabling after mute creates a fresh usable context',async()=>{
  const audio=createOpeningAudio();await audio.unlock();audio.dispose();await audio.unlock();audio.cut();
  assert.equal(contexts.length,2);assert.equal(contexts[0].closed,true);assert.equal(contexts[1].state,'running');
  assert.ok(contexts[1].sources.length>0);audio.dispose();
});
