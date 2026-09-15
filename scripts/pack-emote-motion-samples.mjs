import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';
import {resolve} from 'node:path';

// Crop the generated grid without changing its art or alpha. The torso bottom
// is the fixed anchor; crown, mouth, head, hands, and tears retain their motion.
const source=resolve(process.argv[2]??'/tmp/yule-motion-emote-samples');
const output=resolve('outputs/motion-preview-assets');
const archive=resolve('outputs/motion-stage1-source/emotes');
await mkdir(archive,{recursive:true});
const manifest=[],checks=[];
for(const [name,id,label,version]of [['king','king-laugh','国王大笑',1],['princess','princess-yawn','公主哈欠',1],['skeleton','skeleton-cry','骷髅哭',2]]){
 const raw=resolve(source,`${name}-redraw-v${version}.png`),dir=resolve(output,id);
 const timing=JSON.parse(await readFile(resolve(source,`${name}-reference-timing.json`),'utf8'));
 await mkdir(dir,{recursive:true});await copyFile(raw,resolve(archive,`${name}-redraw-selected.png`));
 const frames=[],baselines=[];
 for(let index=0;index<24;index++){
  const cell=await sharp(raw).extract({left:(index%6)*256,top:Math.floor(index/6)*256,width:256,height:256}).png().toBuffer();
  const {data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let last=-1,edge=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){last=Math.max(last,y);if(x===0||y===0||x===255||y===255)edge++;}
  if(last<0||edge)throw Error(`${name} frame ${index} has missing or clipped artwork`);
  const top=288-(last+1);if(top<0||top+256>336)throw Error(`${name} frame ${index} needs more padding`);
  const padded=await sharp({create:{width:336,height:336,channels:4,background:'#00000000'}}).composite([{input:cell,left:40,top}]).png().toBuffer();
  frames.push(padded);baselines.push({frame:index,sourceBottom:last+1,offsetY:top});
 }
 await sharp({create:{width:2016,height:1344,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:(i%6)*336,top:Math.floor(i/6)*336}))).webp({quality:94,alphaQuality:100,effort:4}).toFile(resolve(dir,'atlas.webp'));
 await sharp(frames[0]).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'poster.webp'));
 const refId=`reference-${name}`,refDir=resolve(output,refId),reference=[];
 await mkdir(refDir,{recursive:true});
 // References are development-only. Resize all reference cells uniformly to
 // 256px to keep a complete original timeline without large GPU allocations.
 for(let index=0;index<timing.frameCount;index++)reference.push(await sharp(resolve(source,`${name}-reference-atlas.png`)).extract({left:index%timing.columns*timing.cellWidth,top:Math.floor(index/timing.columns)*timing.cellHeight,width:timing.cellWidth,height:timing.cellHeight}).resize(256,256).png().toBuffer());
 const rows=Math.ceil(reference.length/8);
 await sharp({create:{width:2048,height:rows*256,channels:4,background:'#00000000'}}).composite(reference.map((input,i)=>({input,left:i%8*256,top:Math.floor(i/8)*256}))).webp({quality:90,alphaQuality:100,effort:4}).toFile(resolve(refDir,'atlas.webp'));
 await sharp(reference[0]).webp({quality:92,alphaQuality:100}).toFile(resolve(refDir,'poster.webp'));
 const duration=timing.durationMs??timing.durationsMs.reduce((sum,n)=>sum+n,0);
 manifest.push({id,motion:{id,label,poster:`/motion-samples/${id}/poster.webp`,sheets:[{src:`/motion-samples/${id}/atlas.webp`,columns:6,rows:4,cellWidth:336,cellHeight:336}],frames:Array.from({length:24},(_,cell)=>({sheet:0,cell,duration:duration/24}))},reference:{id:refId,label:`${label}原版动作参考`,poster:`/motion-samples/${refId}/poster.webp`,sheets:[{src:`/motion-samples/${refId}/atlas.webp`,columns:8,rows,cellWidth:256,cellHeight:256}],frames:timing.durationsMs.map((duration,cell)=>({sheet:0,cell,duration}))}});
 checks.push({id,baselines,referenceDuration:duration});
 await copyFile(resolve(source,`${name}-reference-timing.json`),resolve(archive,`${name}-reference-timing.json`));
}
await writeFile(resolve(archive,'prepared-motion.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(resolve(archive,'alignment-checks.json'),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify(manifest));
