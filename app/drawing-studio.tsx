'use client';

import { useEffect,useRef,useState,type PointerEvent } from 'react';
import { Pencil,Eraser,Undo2,Upload,ImagePlus,Check,LoaderCircle } from 'lucide-react';
import { sessionHeaders } from '@/lib/auth-client';
import { drawingByteLimit } from '@/lib/drawing-policy';
import './drawing-studio.css';

const colours=[{name:'حبر',value:'#252035'},{name:'بنفسجي',value:'#6941c6'},{name:'أخضر',value:'#4b7526'},{name:'برتقالي',value:'#c85d34'}];
export async function readDrawing(id:string,signal?:AbortSignal):Promise<string>{
  const response=await fetch('/api/drawing?id='+encodeURIComponent(id),{headers:await sessionHeaders(),cache:'no-store',signal});
  if(!response.ok)throw new Error('تعذّر تحميل الرسمة. أعد المحاولة.');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
}
export function DrawingImage({id,revision,title}:{id:string;revision?:string|null;title:string}){
  const [src,setSrc]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();setSrc('');setFailed(false);readDrawing(id,controller.signal).then(value=>{if(!controller.signal.aborted)setSrc(value);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});return()=>controller.abort();},[id,revision,attempt]);
  if(failed)return <span className="drawing-unavailable">تعذّر تحميل الرسمة <button type="button" onClick={event=>{event.stopPropagation();setAttempt(x=>x+1);}}>إعادة المحاولة</button></span>;
  return src?<img className="entry-drawing" src={src} alt={'رسمة: '+title} width="1000" height="700"/>:<span className="drawing-loading" role="status"><LoaderCircle size={22}/> تحميل الرسمة…</span>;
}

function encode(canvas:HTMLCanvasElement){
  const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
  let marked=false;for(let index=0;index<pixels.length;index+=4){if(pixels[index]<245||pixels[index+1]<245||pixels[index+2]<245){marked=true;break;}}
  if(!marked)return '';
  for(const quality of [.88,.76,.62,.48,.34]){const data=canvas.toDataURL('image/jpeg',quality);if((data.length-23)*.75<=drawingByteLimit)return data;}
  throw new Error('الصورة مليئة بالتفاصيل. جرّب صورة أبسط أو أصغر.');
}
export default function DrawingStudio({value,onChange,disabled=false,onBusyChange}:{value?:string;onChange:(value:string)=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
  const [mode,setMode]=useState<'draw'|'upload'>('draw'),[tool,setTool]=useState<'pen'|'eraser'>('pen'),[colour,setColour]=useState(colours[0].value),[width,setWidth]=useState(4),[error,setError]=useState(''),[processing,setProcessing]=useState(false),[historyCount,setHistoryCount]=useState(0);
  const canvas=useRef<HTMLCanvasElement>(null),file=useRef<HTMLInputElement>(null),history=useRef<string[]>([]),stroke=useRef<{id:number;x:number;y:number}|null>(null),last=useRef<string|undefined>(undefined);
  const [inking,setInking]=useState(false);
  useEffect(()=>{onBusyChange?.(processing||inking);return()=>onBusyChange?.(false);},[processing,inking,onBusyChange]);
  const locked=disabled||processing;
  useEffect(()=>{
    if(mode!=='draw'||!canvas.current)return;
    const element=canvas.current,context=element.getContext('2d')!;let active=true;
    if(value===last.current&&element.dataset.ready==='true')return;
    context.fillStyle='#ffffff';context.fillRect(0,0,element.width,element.height);element.dataset.ready='true';
    if(value){const image=new Image();image.onload=()=>{if(!active)return;const scale=Math.min(element.width/image.width,element.height/image.height);context.drawImage(image,(element.width-image.width*scale)/2,(element.height-image.height*scale)/2,image.width*scale,image.height*scale);last.current=value;};image.src=value;}else last.current=value;
    return()=>{active=false;};
  },[value,mode]);
  const point=(event:PointerEvent<HTMLCanvasElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();return {x:(event.clientX-bounds.left)*1000/bounds.width,y:(event.clientY-bounds.top)*700/bounds.height};};
  function begin(event:PointerEvent<HTMLCanvasElement>){
    if(locked||stroke.current||event.button!==0)return;
    event.preventDefault();const element=event.currentTarget;history.current.push(value||'');if(history.current.length>20)history.current.shift();setHistoryCount(history.current.length);
    const p=point(event);stroke.current={id:event.pointerId,...p};setInking(true);element.setPointerCapture(event.pointerId);
    const ctx=element.getContext('2d')!;ctx.fillStyle=tool==='eraser'?'#ffffff':colour;ctx.beginPath();ctx.arc(p.x,p.y,(tool==='eraser'?width*5:width)/2,0,Math.PI*2);ctx.fill();
  }
  function move(event:PointerEvent<HTMLCanvasElement>){
    const previous=stroke.current;if(!previous||previous.id!==event.pointerId)return;event.preventDefault();const p=point(event),ctx=event.currentTarget.getContext('2d')!;
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=tool==='eraser'?width*5:width;ctx.strokeStyle=tool==='eraser'?'#ffffff':colour;ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(p.x,p.y);ctx.stroke();stroke.current={id:event.pointerId,...p};
  }
  function finish(event:PointerEvent<HTMLCanvasElement>){
    if(!stroke.current||stroke.current.id!==event.pointerId)return;stroke.current=null;setInking(false);
    try{const data=encode(event.currentTarget);last.current=data;onChange(data);setError('');}catch(caught){setError((caught as Error).message);}
  }
  function undo(){const previous=history.current.pop();if(previous===undefined)return;setHistoryCount(history.current.length);last.current=undefined;onChange(previous);}
  async function upload(selected?:File){
    if(!selected)return;
    if(!['image/jpeg','image/png','image/webp'].includes(selected.type)){setError('اختر صورة JPG أو PNG أو WebP.');return;}
    if(selected.size>12_000_000){setError('اختر صورة أصغر من ١٢ ميجابايت.');return;}
    setProcessing(true);setError('');const url=URL.createObjectURL(selected);
    try{
      const image=new Image();image.src=url;await image.decode();
      if(image.naturalWidth*image.naturalHeight>30_000_000)throw new Error('أبعاد الصورة كبيرة جدًا. جرّب نسخة أصغر.');
      const scale=Math.min(1,1400/Math.max(image.width,image.height)),element=document.createElement('canvas');element.width=Math.max(16,Math.round(image.width*scale));element.height=Math.max(16,Math.round(image.height*scale));
      const ctx=element.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,element.width,element.height);ctx.drawImage(image,0,0,element.width,element.height);
      const data=encode(element);if(!data)throw new Error('الصورة فارغة. اختر صورة يظهر فيها رسمك.');last.current=undefined;history.current=[];setHistoryCount(0);onChange(data);
    }catch(caught){setError(caught instanceof Error?caught.message:'تعذّر فتح الصورة. جرّب صورة ثانية.');}
    finally{URL.revokeObjectURL(url);setProcessing(false);if(file.current)file.current.value='';}
  }
  return <section className="drawing-studio" aria-label="رسمة فكرتك">
    <div className="drawing-mode" role="group" aria-label="طريقة الرسم"><button type="button" aria-pressed={mode==='draw'} disabled={locked} onClick={()=>setMode('draw')}><Pencil size={17}/> ارسم هنا</button><button type="button" aria-pressed={mode==='upload'} disabled={locked} onClick={()=>setMode('upload')}><Upload size={17}/> ارفع رسمتك</button></div>
    {mode==='draw'?<>
      <div className="drawing-toolbar"><div className="drawing-tools"><button type="button" aria-label="قلم" title="قلم" aria-pressed={tool==='pen'} disabled={locked} onClick={()=>setTool('pen')}><Pencil size={18}/></button><button type="button" aria-label="ممحاة" title="ممحاة" aria-pressed={tool==='eraser'} disabled={locked} onClick={()=>setTool('eraser')}><Eraser size={18}/></button><span className="tool-separator"/>{colours.map(item=><button type="button" key={item.value} className="ink-swatch" style={{'--ink':item.value} as React.CSSProperties} aria-label={item.name} aria-pressed={colour===item.value&&tool==='pen'} disabled={locked} onClick={()=>{setColour(item.value);setTool('pen');}}>{colour===item.value&&tool==='pen'&&<Check size={13}/>}</button>)}</div><div className="drawing-tools"><button type="button" aria-label={width===4?'قلم عريض':'قلم رفيع'} title="سماكة القلم" disabled={locked} onClick={()=>setWidth(width===4?9:4)}><span className={'pen-width '+(width===9?'thick':'')}/></button><button type="button" aria-label="تراجع عن آخر خط" title="تراجع" disabled={locked||historyCount===0} onClick={undo}><Undo2 size={18}/></button></div></div>
      <div className={'drawing-paper '+(tool==='eraser'?'erase':'')}><canvas ref={canvas} width="1000" height="700" aria-label="مساحة الرسم؛ استخدم إصبعك أو القلم، أو اختر رفع صورة بدلًا من الرسم" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}/>{!value&&<span className="paper-invitation" aria-hidden="true"><Pencil size={28} strokeWidth={1.2}/><span>فكرتك تبدأ بخط.</span></span>}<span className="paper-signature" aria-hidden="true">ابتكر<span>▪</span></span></div>
    </>:<div className={'drawing-upload '+(value?'has-image':'')}>
      {value?<><img src={value} alt="معاينة رسمتك"/><div className="upload-actions"><button type="button" disabled={locked} onClick={()=>file.current?.click()}><Upload size={16}/> غيّر الصورة</button><button type="button" disabled={locked} onClick={()=>setMode('draw')}><Pencil size={16}/> ارسم عليها</button></div></>:<button className="upload-target" type="button" disabled={locked} onClick={()=>file.current?.click()}><span><ImagePlus size={30} strokeWidth={1.3}/></span><strong>رسمتك، بطريقتك.</strong><small>صورة ورقة أو رسم رقمي</small><b>اختر صورة <Upload size={16}/></b><small dir="ltr">JPG · PNG · WebP</small></button>}
    </div>}
    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" aria-label="اختر صورة رسمتك" hidden disabled={locked} onChange={event=>void upload(event.target.files?.[0])}/>
    <div className="drawing-note"><span>{processing?'نجهّز رسمتك…':'الفكرة أهم من جمال الرسمة.'}</span><span>{value?<><Check size={13}/> الرسمة جاهزة</>:'خطوط بسيطة تكفي'}</span></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
  </section>;
}
