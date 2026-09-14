import {Info} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger,DialogDescription} from '@/components/ui/dialog';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {HAM,hamRulePreset,isHamRules,RULE_NOTES,FAN_TABLE} from '@/lib/mahjong/rules';
import {FAN_DETAILS} from '@/lib/mahjong/rule-guide';

export function MahjongRules({rulesId=HAM.id,name='ham 规'}:{rulesId?:string;name?:string}){
 const ham=isHamRules(rulesId),preset=hamRulePreset(rulesId),legacy=ham&&rulesId!==HAM.id;
 const closed=preset?.closedBonus!==false,noWild=preset?.noWildBonus!==false;
 const notes:readonly (readonly [string,string])[]=ham?[
  ['先认识几个词','顺子：同一花色连续三张，如三、四、五万。刻子：三张同牌。杠：四张同牌。面子指一副顺子、刻子或杠；将牌指一对同牌。字牌为东、南、西、北、中、发、白；幺九指数牌的 1 和 9。'],
  ['开局与赖子',`四人、136 张，无花牌，不换三张、不定缺。每局从白板以外的 33 种牌中等概率选一种赖子，不抽走实体牌。例如五万为赖子：实体五万可在胡牌时代表任意 34 种牌，实体白板作为普通五万使用。${preset?.forbidWildDiscard?'实体赖子不能打出；摸到赖子后，超时会改打最右侧的非赖子。':''}白板仍可正常打出、吃碰杠。`],
  ['吃碰杠中的身份','赖子不能替代吃、碰、杠所需的牌。白板先转换为本局指定身份，再参与组合。完整胡牌方案中，同一种代表牌最多四张，手牌与所有副露一起计算，杠的四张全部计入。'],
  ...(preset?.fourWildWin?[["四赖胡","手中四张实体赖子，轮到自己摸牌后即可主动胡牌；庄家起手 14 张、正常摸牌和杠后补牌都可以，闲家起手 13 张须等自己的摸牌回合。不要求普通胡牌结构或中张。四赖胡 ×4 与自摸 ×2、奖牌及其他有效因素继续相乘，三家各付。仍由玩家选定赖子身份；不成型时只按牌张组成计算清一色、混一色、字一色、幺九类，七对、碰碰胡、三元四喜、十三幺、九莲、天胡等必须确实组成对应结构才加倍。"]] as const:[]),
  ['普通胡怎么成立','四副面子加一对将，最后胡进的牌必须位于一副顺子的中间，并代表数字 4、5、6、7、8。例如三万、五万胡四万可以；二万、四万胡三万不可以。自摸、点炮、抢杠都适用，最后一张是赖子也按所选身份判断。'],
  ['哪些情况免中张限制',`七对及豪华、碰碰胡、三元、四喜、字一色、幺九类、十三幺、九莲、四杠、天胡、地胡可以免除上述限制，仍须组成完整合法结构。单独清一色、混一色、自摸、杠上开花、抢杠胡不免除。${preset?.fourWildWin?'四赖直胡是特例，不成型也可胡；字一色、幺九类奖励此时只按所选牌张组成判定。':''}`],
  ['选择方案后再翻奖牌',`宣布胡牌并确定胡牌者后，有 60 秒选择完整拆法和每张赖子的身份；即使只有一个方案也要确认。确认后锁定，再翻当前牌墙末尾两张作为奖牌。超时或掉线超时采用最高倍数，并列按固定顺序，选择不参考隐藏奖牌。${preset?.revealSeconds?'锁定方案后，由胡牌玩家依次点击两张牌背，其他玩家同步观看；每张 15 秒，超时自动翻开。未翻牌面不提前公开，两张揭晓后再结算。':''}`],
  ['奖牌怎样命中','奖牌与所选方案的完整代表牌比较，包括吃碰杠。白板奖牌先转换身份；实体赖子奖牌按它印着的原牌种比较，不自动中奖。每张奖牌最多命中一次，手中同种牌再多也不重复加分；两张相同奖牌都命中则算两次。赖子代表的牌即使没有自然牌，也可命中。'],
  ['筹码怎么算',`设基础筹码为 B，命中奖牌数为 n（0、1 或 2），所有有效倍数相乘为 M：每位付款者付 B ×（1+n）× M。自摸本身 ×${preset?.selfDrawUnit}，另外三家各付一次；点炮本身 ×1，只有点炮者付一次，不包三家。抢杠胡只有补杠者付款，并计抢杠胡倍数。${closed?'本桌旧版保留门前清 ×2。':'门前清不加倍。'}${noWild?'本桌旧版保留无赖子 ×2。':'无赖子不加倍。'}独立倍数相乘、不封顶，筹码允许为负。`],
  ['杠分单独结算','明杠、补杠成功，另外三家各付 1B；暗杠成功，各付 2B。成功后立即记账，并从当前牌墙末尾补一张。只抢补杠；补杠被抢时该杠未完成，不收此次杠分。已成功的杠分不乘胡牌倍数，也不受奖牌加成影响。'],
  ['响应与超时','只有存在合法吃碰杠胡时才开启 8 秒响应；没有响应就直接下家。胡优先于碰杠，碰杠优先于吃，同级取距出牌者最近的一位；只有下家能吃。尚未响应的人已无法改变结果时提前执行。响应超时视为放弃，出牌按房间时限处理。'],
  ['流局与坐庄','牌墙留最后 12 张。从 13 张摸到剩 12 张后，可以完成本次出牌及响应；下一次需要摸牌时流局。剩 12 张不能再杠，胡后的两张奖牌仍可从中取。流局保留已成功的杠分，不抽奖。首局房主坐庄；庄家胡或流局连庄，闲家胡后由原庄下家坐庄；庄家和连庄次数不额外加倍。'],
  ['一局与整桌','一人胡牌即结束本局。筹码在本桌独立记账，首局后固定四位玩家，支持重连。房主在两局之间结束整桌。管理员中止未完成的一局，包括选方案和翻奖牌期间，撤销本局全部杠分，保留此前各局的结算。'],
 ]:RULE_NOTES.map(([title,text],i)=>[title,rulesId==='basic-136-v2'&&i===3?'一人胡牌即结束。自摸三家各付本桌基础筹码；点炮、抢杠由出牌者付一次。摸完牌墙流局，杠不计分，下一局顺序轮庄。筹码仅在本桌独立记录。':rulesId==='basic-136-v2'&&i===4?'出牌沿用房间时限；响应固定 8 秒，无人能响应则直接推进。响应超时视为放弃；出牌超时打出刚摸的牌，吃碰后打出最右一张。':text]);
 return <Dialog><DialogTrigger asChild><Button variant="ghost" className="mahjong-rules-trigger" aria-label="本桌规则"><Info size={17}/><span>本桌规则</span></Button></DialogTrigger><DialogContent className="rules-modal ham-rules-modal"><DialogHeader><DialogTitle>{name} · 本桌规则</DialogTitle><DialogDescription>{legacy?'本桌沿用建房时的旧版规则；下方倍数按本桌版本展示。':'按建房时的规则与基础筹码结算。可向下查看每种牌型的条件和例子。'}</DialogDescription></DialogHeader>
 <div className="rules-list ham-rule-guide">{notes.map(([title,text])=><section key={title}><h3>{title}</h3><p>{text}</p></section>)}</div>
 {ham&&<><section className="ham-rule-example"><h3>算一笔就明白</h3><p>基础筹码 10，两张奖牌都命中，最终有效倍数合计 4 倍：每位付款者付 <b>10 ×（1 + 2）× 4 = 120</b>。自摸由三家各付 120，合计收 360；点炮只由点炮者付 120。</p><p>这里的“最终 4 倍”已经包含适用的自摸或牌型因素，不能再重复乘一次。杠分最后另外相加。</p></section>
 <section className="ham-fan-guide"><h3>牌型倍数与成立条件</h3><p>先按普通、特殊牌型或本桌允许的四赖胡确认胡牌资格，再乘符合条件的倍数。不同拆法分别计算，不能把两套方案的奖励拼在一起。表中没有写明排除的独立因素可以相乘。</p><Table className="ham-fan-table"><TableHeader><TableRow><TableHead>牌型</TableHead><TableHead>倍数</TableHead><TableHead>怎样成立 · 怎样叠加</TableHead></TableRow></TableHeader><TableBody>
 <TableRow><TableCell>普通胡</TableCell><TableCell>×1</TableCell><TableCell><p>四副面子加一对将，最后进牌是顺子中间的 4–8。</p><small>没有其他有效牌型因素时按 1 倍；自摸因素仍按本桌规则计算。</small></TableCell></TableRow>
 {FAN_TABLE.filter(([id])=>id==='selfDraw'?preset?.selfDrawUnit===2:id==='noWild'?noWild:id==='closed'?closed:id==='fourWild'?!!preset?.fourWildWin:true).map(([id,label,m])=><TableRow key={id}><TableCell>{label}</TableCell><TableCell>×{m}</TableCell><TableCell><p>{FAN_DETAILS[id].condition}</p><small>{FAN_DETAILS[id].note}</small></TableCell></TableRow>)}
 </TableBody></Table></section></>}
 </DialogContent></Dialog>;
}
