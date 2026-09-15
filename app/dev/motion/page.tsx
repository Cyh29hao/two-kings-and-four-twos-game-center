import {notFound} from 'next/navigation';
import {MotionLab} from '@/components/motion-lab';
import './motion.css';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <MotionLab/>;}
