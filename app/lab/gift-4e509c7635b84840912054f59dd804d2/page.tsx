import type {Metadata} from 'next';
import GiftLab from './gift-lab';
export const metadata:Metadata={title:'الهدية المستحيلة | ابتكر',description:'مختبر خاص لتجربة تحدّي ابتكر القادم.',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function GiftPrototype(){return <GiftLab/>;}
