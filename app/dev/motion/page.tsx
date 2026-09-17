import {notFound} from 'next/navigation';
import {MotionLab} from '@/components/motion-lab';
import {localDevTools} from '@/lib/dev-tools';
import './motion.css';
export default function Page(){if(!localDevTools())notFound();return <MotionLab/>;}
