export type MaterialSound='brass'|'steel'|'wood'|'latch'|'hinge'|'air'|'impact';
export const materialProfiles={
 brass:{duration:.25,filter:'bandpass',frequency:1800,q:1.1,volume:.36,tail:.06},
 steel:{duration:.34,filter:'highpass',frequency:3100,q:.7,volume:.18,tail:.2},
 wood:{duration:.16,filter:'lowpass',frequency:750,q:.6,volume:.48,tail:.025},
 latch:{duration:.15,filter:'highpass',frequency:1900,q:.9,volume:.4,tail:.035},
 hinge:{duration:.9,filter:'bandpass',frequency:430,q:1.8,volume:.36,tail:.5},
 air:{duration:.65,filter:'lowpass',frequency:1800,q:.6,volume:.17,tail:.32},
 impact:{duration:.35,filter:'lowpass',frequency:180,q:.7,volume:.55,tail:.07},
} as const;
export class MaterialAudio{
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private muted=false;
 private lastView=0;
 setMuted(value:boolean){this.muted=value;this.master?.gain.setValueAtTime(value?0:.75,this.context!.currentTime);}
 private ready(){
  if(!this.context){const Audio=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Audio)return null;this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.75;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=6;this.master.connect(limiter);limiter.connect(this.context.destination);}
  if(this.context.state==='suspended')void this.context.resume();return this.context;
 }
 play(material:MaterialSound,delay=0,pan=0,level=1){
  if(this.muted)return;try{const ac=this.ready();if(!ac||!this.master)return;const p=materialProfiles[material],duration=p.duration,at=ac.currentTime+delay,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){const t=i/ac.sampleRate;let envelope=Math.min(1,t/.004)*Math.exp(-t/p.tail);if(material==='brass')envelope+=.7*Math.exp(-Math.abs(t-.08)/.008)+.5*Math.exp(-Math.abs(t-.16)/.009);if(material==='steel'||material==='hinge'||material==='air')envelope=Math.sin(Math.PI*t/duration)**2*(material==='hinge'?.65+.35*Math.random():1);data[i]=(Math.random()*2-1)*envelope;}
  const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain(),stereo=ac.createStereoPanner();source.buffer=buffer;filter.type=p.filter;filter.frequency.value=p.frequency;filter.Q.value=p.q;gain.gain.value=p.volume*level;stereo.pan.value=Math.max(-1,Math.min(1,pan));source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);source.start(at);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect();};
  }catch{/* Sound never blocks the puzzle. */}
 }
 ring(index:number){this.play('brass',0,(index-1)*.25);}
 slide(index:number){this.play('steel',0,(index-1)*.3);this.play('latch',.27,(index-1)*.3,.5);}
 key(index:number){this.play('wood',0,(index-1)*.3);this.play('latch',.05,(index-1)*.3,.35);}
 unlock(){this.play('latch',0,-.25);this.play('latch',.13,.25,.6);}
 view(){if(performance.now()-this.lastView<220)return;this.lastView=performance.now();this.play('air',0,0,.2);}
 reveal(){this.unlock();this.play('impact',.3,0,.55);this.play('hinge',.5,-.6);this.play('hinge',.8,.6);this.play('air',.8,0,1.5);this.play('wood',1.35,-.5,.6);this.play('wood',1.55,.5,.6);this.play('impact',2,0,.65);}
 close(){if(this.context)void this.context.close();}
}
