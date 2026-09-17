/** 开发者模式：只在本地开发与本地验收服务器上开启，正式部署不会带上这个变量。 */
export function localDevTools(){return process.env.NODE_ENV==='development'||process.env.LOCAL_DEV_TOOLS==='1';}
