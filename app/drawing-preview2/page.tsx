import type { Metadata } from 'next';
import WarningPreview from './warning-preview';

export const metadata:Metadata={title:'لمبة ولعت… فهمتها؟ | ابتكر',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <WarningPreview/>;}
