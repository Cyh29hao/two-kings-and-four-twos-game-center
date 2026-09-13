// Integration test for an existing LOCAL fixture only. Never accepts a remote URL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const origin='http://localhost:5173';
const fixture=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));
const oldPassword='Local-test-only-913!';
const newPassword='Local-reset-test-only-913!';
const username='MartinHamburger';
async function post(data:Record<string,unknown>,cookie='',requestOrigin=origin){
 const response=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin,...(cookie?{cookie}:{})},body:JSON.stringify(data)});
 const text=await response.text();
 const result=response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):{error:text};
 return {status:response.status,data:result,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
const before=await post({action:'login',username,password:oldPassword});
assert.equal(before.status,200);
assert.equal(before.data.user.id,fixture.userId);
const reset={action:'reset',username,password:newPassword,token:fixture.token};
assert.equal((await post(reset,'','https://example.invalid')).status,403);
assert.equal((await post({...reset,token:'invalid'})).status,403);
assert.equal((await post({...reset,username:'SomeoneElse'})).status,403);
assert.equal((await post({...reset,password:'short'})).status,400);
const concurrent=await Promise.all([post(reset),post(reset)]);
assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
const oldSession=await fetch(origin+'/api/auth',{headers:{cookie:before.cookie}});
assert.equal((await oldSession.json() as any).user,null);
assert.equal((await fetch(origin+'/api/admin',{headers:{cookie:before.cookie}})).status,401);
assert.equal((await post({action:'login',username,password:oldPassword})).status,401);
const after=await post({action:'login',username,password:newPassword});
assert.equal(after.status,200);
assert.deepEqual(after.data.user,before.data.user);
assert.equal((await post({...reset,password:oldPassword})).status,409);
assert.equal((await post({action:'login',username,password:newPassword})).status,200);
console.log('PASS: reset validation, CSRF, concurrent single use, old password rejected, sessions revoked, new login, account preserved, replay rejected');
