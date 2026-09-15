import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';
import {resolve} from 'node:path';

// Deterministic atlas preparation: slice existing generated poses, align the
// fixed badge lettering, and pad. No painted pixels, alpha removal, or new poses.
const source=resolve(process.argv[2]??'/tmp/yule-motion-badge-samples');
const output=resolve('outputs/motion-preview-assets');
const archive=resolve('outputs/motion-stage1-source/badges');
await mkdir(archive,{recursive:true});
const bounds=JSON.parse(await readFile(resolve(source,'qa-cell-bounds.json'),'utf8'));
const timings=JSON.parse(await readFile(resolve(source,'frame-timings.json'),'utf8')).timings;
const manifest=[];
for(const [name,id,label]of [['bomb','bomb','炸弹'],['airplane','airplane','飞机'],['mahjong-hu','hu','胡']]){
 const raw=resolve(source,`${name}-atlas-raw.png`),dir=resolve(output,id);
 await mkdir(dir,{recursive:true});await copyFile(raw,resolve(archive,`${name}-atlas-raw.png`));
 const frames=[];
 for(let index=0;index<16;index++){
  const [x,y,right,bottom]=bounds[`${name}-atlas-raw`][index].source_crop;
  const offset=index>=12?(name==='airplane'?20:name==='bomb'?4:0):0;
  const cell=await sharp(raw).extract({left:x,top:y,width:right-x,height:bottom-y}).resize(314,314).png().toBuffer();
  const padded=await sharp({create:{width:360,height:360,channels:4,background:'#00000000'}}).composite([{input:cell,left:23,top:17+offset}]).png().toBuffer();
  frames.push(padded);
 }
 await sharp({create:{width:1440,height:1440,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:(i%4)*360,top:Math.floor(i/4)*360}))).webp({quality:94,alphaQuality:100,effort:6}).toFile(resolve(dir,'atlas.webp'));
 await sharp(frames[15]).webp({quality:94,alphaQuality:100}).toFile(resolve(dir,'poster.webp'));
 manifest.push({id,label,poster:`/motion-samples/${id}/poster.webp`,sheets:[{src:`/motion-samples/${id}/atlas.webp`,columns:4,rows:4,cellWidth:360,cellHeight:360}],frames:timings[name].map((duration,cell)=>({sheet:0,cell,duration}))});
}
for(const file of ['prompts.json','qa-cell-bounds.json','frame-timings.json','README.md'])await copyFile(resolve(source,file),resolve(archive,file));
await writeFile(resolve(archive,'prepared-motion.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
