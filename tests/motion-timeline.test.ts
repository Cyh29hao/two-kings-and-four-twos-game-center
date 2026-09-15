import test from 'node:test';
import assert from 'node:assert/strict';
import {frameAt,frameStart,motionDuration,validMotion,type FrameMotion} from '../lib/motion/timeline.ts';
const motion:FrameMotion={id:'sample',label:'样片',poster:'/motion-samples/test/poster.webp',sheets:[{src:'/motion-samples/test/atlas.webp',columns:2,rows:2,cellWidth:128,cellHeight:128}],frames:[{sheet:0,cell:0,duration:100},{sheet:0,cell:1,duration:250},{sheet:0,cell:2,duration:50},{sheet:0,cell:3,duration:600}]};
test('variable frame durations preserve pauses and finish on the final pose',()=>{
 assert(validMotion(motion));assert.equal(motionDuration(motion),1000);
 for(const [time,index]of [[-1,0],[0,0],[99,0],[100,1],[349,1],[350,2],[399,2],[400,3],[1000,3],[100000,3]])assert.equal(frameAt(motion,time),index);
 assert.deepEqual(motion.frames.map((_,i)=>frameStart(motion,i)),[0,100,350,400]);
});
test('repeated source poses keep their own timing; seeking backwards is deterministic',()=>{
 const repeated={...motion,frames:[{sheet:0,cell:0,duration:200},{sheet:0,cell:1,duration:100},{sheet:0,cell:0,duration:500}]};
 assert.equal(repeated.frames[frameAt(repeated,350)].cell,0);assert.equal(frameAt(repeated,250),1);assert.equal(frameAt(repeated,20),0);
});
test('unsafe or malformed atlases fail without indexing beyond sheets',()=>{
 assert(!validMotion({...motion,frames:[]}));assert(!validMotion({...motion,poster:'https://example.com/asset.webp'}));
 assert(!validMotion({...motion,sheets:[{...motion.sheets[0],src:'/emotes/../private.webp'}]}));
 for(const frame of [{sheet:1,cell:0,duration:100},{sheet:0,cell:4,duration:100},{sheet:0,cell:0,duration:0},{sheet:0,cell:0,duration:NaN}])assert(!validMotion({...motion,frames:[frame]}));
 assert(!validMotion({...motion,sheets:[{...motion.sheets[0],columns:0}]}));
});
