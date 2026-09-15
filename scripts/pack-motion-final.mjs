import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {EMOTE_PACK_V2} from '../lib/motion/emote-pack.ts';

// The generated drawings and their original alpha are only sliced and padded.
// No new poses, color keying, image painting, or alpha replacement is performed.
const a='/tmp/yule-emotes-v2-pack-a',b='/tmp/yule-emotes-v2-pack-b',badges='/tmp/yule-motion-badge-final';
const archive=resolve('outputs/motion-final-source');await mkdir(archive,{recursive:true});
const partial=process.argv.includes('--available');
const deferred=new Set(['goblin-shush','night-witch-clap']); // User confirmed these two await usable artwork.
const specs=[
 ['king-cry','国王大哭',a,'king-cry-redraw-v1.png','king-cry'],
 ['king-angry','国王愤怒',a,'king-angry-redraw-v1.png','king-angry'],
 ['king-thumbs-up','国王点赞',a,'king-thumb-redraw-v1.png','king-thumb'],
 ['goblin-laugh','哥布林大笑',a,'goblin-laugh-original-redraw-v1.png','goblin-laugh-original'],
 ['goblin-eye-roll','哥布林白眼',a,'goblin-roll-redraw-v1.png','goblin-roll'],
 ['goblin-tongue','哥布林吐舌',a,'goblin-tongue-redraw-v1.png','goblin-tongue'],
 ['goblin-cry','哥布林搓眼哭',a,'goblin-cry-original-redraw-v1.png','goblin-cry-original'],
 ['goblin-facepalm','哥布林捂脸',a,'goblin-facepalm-redraw-v1.png','goblin-facepalm'],
 ['goblin-fire','火中强装镇定',a,'goblin-fire-redraw-v1.png','goblin-fire'],
 ['goblin-shush','哥布林嘘',a,'goblin-shush-redraw-v1.png','goblin-shush'],
 ['princess-whistle','公主吹口哨',a,'princess-whistle-redraw-v1.png','princess-whistle'],
 ['skeleton-dance','骷髅跳舞',b,'skeleton-dance.png','skeleton-dance'],
 ['electro-laugh','电法大笑',b,'electro-laugh.png','electro-laugh'],
 ['barbarian-laugh','野蛮人大笑',b,'barbarian-laugh.png','barbarian-laugh'],
 ['hog-scream','野猪骑士惊叫',b,'hog-scream-v2.png','hog-scream'],
 ['hog-think','野猪骑士疑惑',b,'hog-think.png','hog-think'],
 ['little-prince-cry','小王子哭',b,'little-prince-cry.png','little-prince-cry'],
 ['night-witch-clap','暗夜女巫鼓掌',b,'night-witch-clap-v2.png','night-witch-clap'],
 ['chicken','小鸡',b,'chicken.png','chicken'],
 ['pig-twerk','猪猪扭腰',b,'pig-twerk.png','pig-twerk'],
];
const packed=EMOTE_PACK_V2.filter(e=>['royale-v2-king-laugh','royale-v2-princess-yawn','royale-v2-skeleton-cry'].includes(e.id));
const samples=JSON.parse(await readFile('outputs/motion-stage1-source/emotes/motion-samples-manifest.json','utf8')).samples;
const records=samples.map(s=>({id:`royale-v2-${s.id}`,name:packed.find(e=>e.id===`royale-v2-${s.id}`).name,reference:s.reference.pageUrl??s.reference.sourcePageUrl??s.reference.url,referenceRangeSeconds:s.reference.timeRangeSeconds,generator:'GPT Image 2, built-in image generation',sha256:s.redraw.sha256,note:'非官方逐帧重绘；原版参考不随站点发布。'})),qa=[];
function gutterCuts(data,width,height,axis,count){
 const size=axis==='x'?width:height,across=axis==='x'?height:width,cuts=[0];
 for(let k=1;k<count;k++){
  const target=Math.round(k*size/count),candidates=[];
  for(let p=target-32;p<=target+32;p++){
   let occupied=0;for(let q=0;q<across;q++)for(let d=-1;d<=0;d++){
    const x=axis==='x'?p+d:q,y=axis==='y'?p+d:q;
    if(data[(y*width+x)*4+3]>16)occupied++;
   }
   if(!occupied)candidates.push(p);
  }
  if(!candidates.length)throw Error(`No transparent gutter at ${axis}:${k}`);
  cuts.push(candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0]);
 }return [...cuts,size];
}
for(const [id,name,source,file,ref] of specs){
 if(deferred.has(id))continue;
 const raw=resolve(source,file);try{await stat(raw)}catch(e){if(partial)continue;throw e}
 const dir=resolve('public/emotes/royale-v2',id);await mkdir(dir,{recursive:true});
 const metadata=await sharp(raw).metadata();if(metadata.width!==1536||metadata.height!==1024||!metadata.hasAlpha)throw Error(`${id}: expected transparent 6x4 atlas`);
 const {data:atlasPixels}=await sharp(raw).raw().toBuffer({resolveWithObject:true});
 const xs=gutterCuts(atlasPixels,1536,1024,'x',6),ys=gutterCuts(atlasPixels,1536,1024,'y',4);
 const cells=[],bounds=[],extracted=[];
 for(let i=0;i<24;i++){
  const col=i%6,row=Math.floor(i/6),left=xs[col],topEdge=ys[row],width=xs[col+1]-left,height=ys[row+1]-topEdge;
  const cell=await sharp(raw).extract({left,top:topEdge,width,height}).png().toBuffer();
  const {data}=await sharp(cell).raw().toBuffer({resolveWithObject:true});let bottom=-1,edges=0,opaque=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>128){bottom=Math.max(bottom,y);opaque++;if(x===0||x===width-1||y===0||y===height-1)edges++;}
  if(bottom<0||opaque<100)throw Error(`${id}: empty frame ${i}`);
  if(edges)throw Error(`${id}: visible crop edge in frame ${i}`);
  // Generated rows can cross the nominal 256px line. Actual transparent gutters preserve every limb.
  // Keep the nominal horizontal anchor and one common body baseline; never scale individual poses.
  const offsetX=40+left-col*256;
  extracted.push({cell,bottom,height,width,offsetX});bounds.push({frame:i,bottom,edges,crop:{left,top:topEdge,width,height}});
 }
 const baseline=Math.min(288,...extracted.map(c=>c.bottom+1+328-c.height));
 for(let i=0;i<extracted.length;i++){
  const {cell,bottom,height,width,offsetX}=extracted[i],top=baseline-(bottom+1);
  if(top<0||top+height>336||offsetX<0||offsetX+width>336)throw Error(`${id}: padding too small`);
  cells.push(await sharp({create:{width:336,height:336,channels:4,background:'#00000000'}}).composite([{input:cell,left:offsetX,top}]).png().toBuffer());bounds[i].offsetY=top;
 }
 await sharp({create:{width:2016,height:1344,channels:4,background:'#00000000'}}).composite(cells.map((input,i)=>({input,left:i%6*336,top:Math.floor(i/6)*336}))).webp({quality:94,alphaQuality:100,effort:4}).toFile(resolve(dir,'atlas.webp'));
 const posterCell=id==='pig-twerk'?15:id==='skeleton-dance'?4:0;
 await sharp(cells[posterCell]).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'poster.webp'));
 const timing=JSON.parse(await readFile(resolve(source,source===a?`${ref}-timing.json`:`refs/${ref}-timing.json`),'utf8'));
 const duration=timing.durationMs??timing.duration_ms;
 let frames=Array.from({length:24},(_,cell)=>({sheet:0,cell,duration:duration/24}));
 // Pig reference has an initial hold and a final hold around the 0.3–2.0s turn.
 if(id==='pig-twerk')frames=frames.map((f,i)=>({...f,duration:1700/24+(i===0?300:i===23?450:0)}));
 // Five original rubbing pulses, reusing only the matching generated open/closed fist poses.
 if(id==='goblin-cry')frames=Array.from({length:30},(_,i)=>({sheet:0,cell:i%6,duration:duration/30}));
 const path=`/emotes/royale-v2/${id}`,emoteId=`royale-v2-${id}`;
 packed.push({id:emoteId,name,src:`${path}/poster.webp`,motion:'frames',enabled:true,sendable:true,frames:{id:emoteId,label:name,poster:`${path}/poster.webp`,sheets:[{src:`${path}/atlas.webp`,columns:6,rows:4,cellWidth:336,cellHeight:336}],frames}});
 let sourceUrl;if(source===a)sourceUrl=JSON.parse(await readFile(resolve(source,`${ref}-source.json`),'utf8')).pageUrl;else {const sources={...JSON.parse(await readFile(resolve(b,'refs/sources.json'),'utf8')),...JSON.parse(await readFile(resolve(b,'refs/sources-more.json'),'utf8'))};sourceUrl=sources[ref]?.page;}
 if(!sourceUrl)throw Error(`${id}: missing source`);
 const sourceDir=resolve(archive,id);await mkdir(sourceDir,{recursive:true});await copyFile(raw,resolve(sourceDir,'generated.png'));
 await copyFile(resolve(source,source===a?`${ref}-timing.json`:`refs/${ref}-timing.json`),resolve(sourceDir,'reference-timing.json'));
 records.push({id:emoteId,name,reference:sourceUrl,referenceRangeSeconds:[0,duration/1000],generator:'GPT Image 2, built-in image generation',sha256:createHash('sha256').update(await readFile(raw)).digest('hex'),frames:frames.map(({cell,duration})=>({cell,duration})),note:'非官方逐帧重绘；参考来源不代表官方授权。原版参考不随站点发布。'});qa.push({id,bounds});
}
packed.sort((x,y)=>{
 const order=['king-laugh','king-cry','king-angry','king-thumbs-up','goblin-laugh','goblin-eye-roll','goblin-tongue','goblin-cry','goblin-facepalm','goblin-fire','goblin-shush','princess-yawn','princess-whistle','skeleton-cry','skeleton-dance','electro-laugh','barbarian-laugh','hog-scream','hog-think','little-prince-cry','night-witch-clap','chicken','pig-twerk'];return order.indexOf(x.id.slice(10))-order.indexOf(y.id.slice(10));
});
await writeFile('lib/motion/emote-pack.ts',"import type {Emote} from '../emotes.ts';\n// Versioned ids preserve historical chat. Images decode only on playback.\nexport const EMOTE_PACK_V2:readonly Emote[]=[\n"+packed.map(e=>' '+JSON.stringify(e)).join(',\n')+'\n];\n');
await writeFile(resolve(archive,'emote-manifest.json'),JSON.stringify(records,null,2));await writeFile(resolve(archive,'emote-geometry-qa.json'),JSON.stringify(qa,null,2));
if(records.some(r=>!r.reference))throw Error('Missing reference credit');
await writeFile('public/emotes/royale-v2/SOURCES.json',JSON.stringify({notice:'非官方重绘，无音轨。经典角色归各自权利人所有。本说明不是官方授权声明。',omitted:[{name:'野猪骑士飞吻',reason:'未核实完整动作参考；用户确认本轮省略'},{name:'哥布林嘘、暗夜女巫鼓掌',reason:'尚无通过检查的生成素材；用户确认本轮暂缓'}],emotes:records.map(({sha256,frames,...r})=>r)},null,2));
const badgeNames=[['rocket','ddz-rocket-atlas-raw'],['airplane-single','ddz-airplane-single-atlas-raw'],['airplane-pair','ddz-airplane-pair-atlas-raw'],['straight','ddz-straight'],['pairs','ddz-pair-run'],['four-two','ddz-four-two'],['four-pairs','ddz-four-two-pairs'],['spring','ddz-spring'],['anti-spring','ddz-reverse-spring'],['chi','mahjong-chi'],['pong','mahjong-peng'],['kong','mahjong-gang']];
for(const [id,name] of badgeNames){
 const raw=resolve(badges,`${name}.png`);try{await stat(raw)}catch(e){if(partial)continue;throw e}
 const dir=resolve('public/effects/v1',id);await mkdir(dir,{recursive:true});const meta=await sharp(raw).metadata();if(!meta.hasAlpha)throw Error(`${name}: no alpha`);
 if(name.includes('atlas')){
  const cells=[];
  for(let i=0;i<16;i++){
   const x=Math.round(i%4*meta.width/4),y=Math.round(Math.floor(i/4)*meta.height/4),right=Math.round((i%4+1)*meta.width/4),bottom=Math.round((Math.floor(i/4)+1)*meta.height/4);
   const cell=await sharp(raw).extract({left:x,top:y,width:right-x,height:bottom-y}).resize(314,314).png().toBuffer();const {data}=await sharp(cell).raw().toBuffer({resolveWithObject:true});let last=0;
   for(let py=0;py<314;py++)for(let px=0;px<314;px++)if(data[(py*314+px)*4+3]>128)last=Math.max(last,py);
   cells.push(await sharp({create:{width:360,height:360,channels:4,background:'#00000000'}}).composite([{input:cell,left:23,top:Math.min(46,322-last)}]).png().toBuffer());
  }
  await sharp({create:{width:1440,height:1440,channels:4,background:'#00000000'}}).composite(cells.map((input,i)=>({input,left:i%4*360,top:Math.floor(i/4)*360}))).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'atlas.webp'));await sharp(cells[15]).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'poster.webp'));
 }else await sharp(raw).resize(360,360).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'poster.webp'));
 await copyFile(raw,resolve(archive,`${id}-generated.png`));
}
console.log(JSON.stringify({emotes:packed.length,badges:badgeNames.length,partial}));
