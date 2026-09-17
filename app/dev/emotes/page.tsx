import {notFound} from 'next/navigation';
import {EmotePreview} from '@/components/emote-preview';
import {localDevTools} from '@/lib/dev-tools';
export default function Page(){if(!localDevTools())notFound();return <EmotePreview/>;}
