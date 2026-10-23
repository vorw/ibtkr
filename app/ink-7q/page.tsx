import type { Metadata } from 'next';
import SketchPreview from '../lab/sketch-7ca2f309e64d4b9f8a31/sketch-preview';

// A memorable, unlisted share link; the original lab URL remains valid too.
export const metadata:Metadata={title:'مساحة الرسم | ابتكر',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <SketchPreview/>;}
