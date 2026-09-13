import {randomBytes,timingSafeEqual} from 'node:crypto';
import {AppError,body,cookie,db,digest,json,limit,passwordHash,passwordValid,publicUser,safe,user,vars,type User} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){return safe(async()=>{const u=await user(req);return json({user:u?publicUser(u):null});})}
export async function POST(req:Request){return safe(async()=>{
 const b=await body(req),action=b.action;
 if(action==='logout'){const t=req.headers.get('cookie')?.match(/sanren_session=([a-f0-9]{64})/)?.[1];if(t)await db().prepare('DELETE FROM sessions WHERE hash=?').bind(digest(t)).run();return json({ok:true},200,{'Set-Cookie':cookie('',req,0)});}
 if(!['login','register','setup'].includes(action))throw new AppError('未知操作');
 const name=typeof b.username==='string'?b.username.trim():'';const canonical=name.toLowerCase();const pw=typeof b.password==='string'?b.password:'';
 if(!/^[a-zA-Z0-9_]{3,24}$/.test(name))throw new AppError('用户名需为 3–24 位字母、数字或下划线');
 if(pw.length<10||pw.length>128)throw new AppError('密码需为 10–128 个字符');
 const ip=req.headers.get('cf-connecting-ip')||'local';await limit('auth-ip:'+digest(ip),40);await limit('auth-user:'+digest(canonical),15);
 let u=await db().prepare('SELECT * FROM users WHERE username=?').bind(canonical).first<User>();
 if(action==='login'){if(!u||!passwordValid(pw,u.password))throw new AppError('用户名或密码不正确',401);if(u.banned)throw new AppError('账号已被停用，请联系管理员',403);}
 else{
 const reserved=(vars().ADMIN_USERNAME||'MartinHamburger').toLowerCase();
 if(action==='setup'){
 const expected=vars().ADMIN_SETUP_HASH;const token=typeof b.token==='string'?b.token:'';const actual=digest(token);
 if(!expected||expected.length!==64||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected))||canonical!==reserved)throw new AppError('管理员设置链接无效',403);
 if(await db().prepare("SELECT key FROM settings WHERE key='admin_claimed'").first())throw new AppError('管理员已设置，请直接登录',409);
 }else if(canonical===reserved)throw new AppError('此用户名已预留',409);
 if(u)throw new AppError('用户名已被使用',409);
 const display=typeof b.name==='string'&&b.name.trim()?b.name.trim():name;if(display.length>16)throw new AppError('昵称最多 16 个字符');
 u={id:crypto.randomUUID(),username:canonical,display,password:passwordHash(pw),role:action==='setup'?'admin':'player',banned:0,score:0};
 const statements=[db().prepare('INSERT INTO users (id,username,display,password,role,banned,score,created) VALUES (?,?,?,?,?,0,0,?)').bind(u.id,u.username,u.display,u.password,u.role,Date.now())];
 if(action==='setup')statements.push(db().prepare("INSERT INTO settings (key,value) VALUES ('admin_claimed',?)").bind(u.id));
 try{await db().batch(statements)}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('账号已创建，请登录',409);throw e;}
 }
 const token=randomBytes(32).toString('hex');await db().batch([db().prepare('INSERT INTO sessions (hash,user_id,expires) VALUES (?,?,?)').bind(digest(token),u!.id,Date.now()+604800000),db().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),db().prepare('DELETE FROM limits WHERE expires<?').bind(Date.now())]);
 return json({user:publicUser(u!)},200,{'Set-Cookie':cookie(token,req)});
 });}
