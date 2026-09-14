import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"娱乐中心 · 好友游戏室",description:"开个房间，和朋友来一局斗地主、麻将或 4–10 人德州扑克。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
