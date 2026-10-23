import type { Metadata } from 'next';
import SketchPreview from './sketch-preview';
export const metadata:Metadata={title:'مساحة الرسم | ابتكر',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <SketchPreview/>;}
