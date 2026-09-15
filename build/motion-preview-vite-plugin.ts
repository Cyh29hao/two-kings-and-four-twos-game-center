import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

/** Local review artwork and third-party motion references must not enter a release. */
export function motionPreview():Plugin {
 return {name:'local-motion-preview',apply:'serve',configureServer(server){
  const root=resolve(server.config.root,'outputs/motion-preview-assets');
  server.middlewares.use('/motion-samples/',async(req,res,next)=>{
   const path=(req.url??'').split('?')[0].replace(/^\//,'');
   if(!/^[a-z0-9-]+\/(?:atlas|poster)(?:-\d+)?\.(?:webp|png)$/.test(path))return next();
   try{const data=await readFile(resolve(root,path));res.setHeader('Content-Type',path.endsWith('.webp')?'image/webp':'image/png');res.setHeader('Cache-Control','no-cache');res.end(data);}
   catch{res.statusCode=404;res.end('Sample image unavailable');}
  });
 }};
}
