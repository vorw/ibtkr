import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

// Preserve previously shared links while using the requested preview address.
export const metadata:Metadata={title:'مساحة الرسم | ابتكر',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){permanentRedirect('/drawing-preview');}
