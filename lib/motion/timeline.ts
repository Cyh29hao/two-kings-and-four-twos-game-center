export type AtlasSheet={src:string;columns:number;rows:number;cellWidth:number;cellHeight:number};
export type MotionFrame={sheet:number;cell:number;duration:number};
export type FrameMotion={id:string;label:string;poster:string;sheets:AtlasSheet[];frames:MotionFrame[]};
export function motionDuration(motion:FrameMotion){return motion.frames.reduce((total,frame)=>total+frame.duration,0);}
export function frameAt(motion:FrameMotion,elapsed:number){
 let end=0;
 for(let index=0;index<motion.frames.length;index++){
  end+=motion.frames[index].duration;
  if(Math.max(0,elapsed)<end)return index;
 }
 return Math.max(0,motion.frames.length-1);
}
export function frameStart(motion:FrameMotion,index:number){return motion.frames.slice(0,Math.max(0,index)).reduce((sum,frame)=>sum+frame.duration,0);}
export function validMotion(motion:FrameMotion){
 const local=(src:string)=>/^\/(?:motion-samples|emotes|effects)\/[a-zA-Z0-9_./-]+$/.test(src)&&!src.includes('..');
 return !!motion.id&&local(motion.poster)&&motion.sheets.length>0&&motion.sheets.length<=16&&motion.frames.length>0&&motion.frames.length<=300
  &&motion.sheets.every(sheet=>local(sheet.src)&&[sheet.columns,sheet.rows,sheet.cellWidth,sheet.cellHeight].every(n=>Number.isInteger(n)&&n>0)&&sheet.columns*sheet.rows<=300&&sheet.cellWidth*sheet.columns<=8192&&sheet.cellHeight*sheet.rows<=8192)
  &&motion.frames.every(frame=>Number.isInteger(frame.sheet)&&frame.sheet>=0&&frame.sheet<motion.sheets.length&&Number.isInteger(frame.cell)&&frame.cell>=0&&frame.cell<motion.sheets[frame.sheet].columns*motion.sheets[frame.sheet].rows&&Number.isFinite(frame.duration)&&frame.duration>0&&frame.duration<=6000)
  &&motionDuration(motion)<=15000;
}
