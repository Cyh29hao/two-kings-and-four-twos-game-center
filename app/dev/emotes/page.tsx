import {notFound} from 'next/navigation';
import {EmotePreview} from '@/components/emote-preview';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <EmotePreview/>;}
