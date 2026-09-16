import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {findSitesPackager} from '../../scripts/release/sites-helper.mjs';

test('release finds the current Sites distribution and newest complete packager',()=>{
 const cache=mkdtempSync(path.join(os.tmpdir(),'sites-helper-'));
 const add=(relative:string)=>{const file=path.join(cache,relative);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,'');return file;};
 try{
  assert.throws(()=>findSitesPackager(cache),/未找到/);
  const legacy=add('openai-bundled/sites/0.1.9/scripts/package-site.sh');
  assert.deepEqual(findSitesPackager(cache),{command:'bash',script:legacy});
  add('openai-curated-remote/sites/0.1.9/scripts/package-site.mjs');
  const current=add('openai-curated-remote/sites/0.1.62/scripts/package-site.mjs');
  mkdirSync(path.join(cache,'openai-curated-remote/sites/0.1.63'));
  assert.deepEqual(findSitesPackager(cache),{command:process.execPath,script:current});
 }finally{rmSync(cache,{recursive:true,force:true});}
});
