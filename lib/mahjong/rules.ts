/** Rules are snapshotted per room; future presets must receive a new version. */
export type MahjongRules = {
  id: string; version: number; name: string; tileCount: 136;
  allowChi: boolean; allowRobAddedKong: boolean; sevenPairs: boolean;
  selfDrawUnit: number; discardUnit: number;
};
export const BASIC_136: MahjongRules = {
  id: 'basic-136-v1', version: 1, name: '136 张 · 基础试玩', tileCount: 136,
  allowChi: true, allowRobAddedKong: true, sevenPairs: false,
  selfDrawUnit: 1, discardUnit: 1,
};
export type ModernRules = MahjongRules & {
  chipLedger: true; reserve: number; claimSeconds: 8; chooseSeconds: number;
  wildcards: boolean; kongPayments: boolean; dealerPolicy: 'rotate' | 'dealer-stays';
};
export const BASIC_CHIPS: ModernRules = {
  ...BASIC_136, id: 'basic-136-v2', version: 2, name: '基础试玩', chipLedger: true,
  reserve: 0, claimSeconds: 8, chooseSeconds: 0, wildcards: false, kongPayments: false, dealerPolicy: 'rotate',
};
export const HAM_V1: ModernRules = {
  ...BASIC_CHIPS, id: 'ham-v1', version: 1, name: 'ham 规', sevenPairs: true,
  reserve: 12, chooseSeconds: 60, wildcards: true, kongPayments: true, dealerPolicy: 'dealer-stays',
};
export const HAM: ModernRules = {...HAM_V1,id:'ham-v2',version:2,selfDrawUnit:2};
export const isHamRules=(id:string)=>id===HAM.id||id===HAM_V1.id;
export const MODERN_PRESETS = [HAM, BASIC_CHIPS] as const;
export const FAN_TABLE = [
  ['seven', '七小对', 2], ['luxury1', '豪华七小对', 4], ['luxury2', '双豪华七小对', 8], ['luxury3', '三豪华七小对', 16],
  ['pong', '碰碰胡', 2], ['pure', '清一色', 4], ['mixed', '混一色', 2], ['doubleWild', '双赖子', 4],
  ['closed', '门前清', 2], ['noWild', '无赖子', 2], ['selfDraw', '自摸', 2], ['flower', '杠上开花', 2], ['rob', '抢杠胡', 2],
  ['smallDragons', '小三元', 8], ['bigDragons', '大三元', 16], ['smallWinds', '小四喜', 16], ['bigWinds', '大四喜', 64],
  ['honors', '字一色', 16], ['mixedTerminals', '混幺九', 8], ['terminals', '清幺九', 16],
  ['orphans', '十三幺', 32], ['gates', '九莲宝灯', 32], ['fourKongs', '四杠', 32], ['heaven', '天胡', 32], ['earth', '地胡', 16],
] as const;
export const HAM_NOTES = [
  ['牌张与赖子', '136 张，无花、不换三张、不定缺。每局随机一种非白板牌为赖子，实体白板代替原牌。赖子只在胡牌时替代，可代表任意牌；完整方案同种最多四张。'],
  ['胡牌限制', '普通胡必须胡顺子中间的 4–8；七对、碰碰胡、三元四喜、字一色、幺九、十三幺、九莲、四杠、天地胡免除此限制，但仍需完整胡牌结构。'],
  ['双赖子', '胡前恰好两赖，其余有效 11 张自然组成三副面子加一对将。两赖必须与胡进的牌组成同一顺子，胡进牌居中为 4–8，计 4 倍。'],
  ['赖子选择与奖牌', '胡牌后有 60 秒选择完整方案，确认后才翻末尾两张奖牌。奖牌匹配所选代表牌（包括吃碰杠），每张命中加一单位基础筹码。超时选最高倍数，并列按固定顺序。'],
  ['筹码公式', '每位付款者付：基础筹码 ×（1 + 命中奖牌数）× 倍数。自摸独立计 2 倍，三家各付；可与杠上开花等独立倍数相乘。点炮、抢杠只有出牌者付一次，不计自摸倍数。倍数不封顶，可负余额；庄家不另外加倍。'],
  ['杠与流局', '明杠、补杠三家各付一单位；暗杠三家各付两单位。成功即记账，牌尾补牌。抢补杠不收该杠分。摸牌需保留 12 张，最后一轮可完成出牌与响应；流局保留杠分。'],
  ['响应与坐庄', '胡优先于碰杠，碰杠优先于吃；同级取离出牌者最近的一位，只能吃上家。可响应时等 8 秒，无响应立即推进。庄家胡或流局连庄，闲家胡后原庄下一位坐庄。'],
  ['牌型细节', '豪华七对须自然四张同牌，赖子凑的四张不算豪华。门前清允许暗杠。天地胡只认原始开局，先杠即取消资格。十三幺、九莲与七对不允许任何吃碰杠。'],
  ['不重复加倍', '七对只计最高等级；七对、十三幺、九莲、天地胡不加门前清。九莲不加清一色；十三幺不加混幺九。大三元／四喜不加对应小牌型。大四喜、四杠、字一色及幺九类不加碰碰胡。字一色、混幺九、清幺九互斥。'],
  ['结束整桌', '房主可在两局之间结束整桌。首局后固定四位玩家；掉线可重连。管理员中止未完成局时撤销本局杠分，保留此前各局结算。'],
] as const;
export const RULE_NOTES = [
  ['牌张与开局', '万、筒、条各 36 张，东南西北、中发白共 28 张。共 136 张，不含花牌；不换三张、不定缺。四人准备后发牌，庄家 14 张，其余 13 张。'],
  ['吃、碰、杠', '只能吃上家的万筒条；可以碰、明杠、暗杠、补杠。杠后从牌墙末端补一张，杠不另计分。补杠可以被抢胡；暗杠不公开牌面。'],
  ['胡牌与优先级', '基础胡牌为四组顺子或刻子，加一对将牌；已吃碰杠的组计入其中。暂不支持七对、十三幺和特殊番型。胡优先于碰杠，碰杠优先于吃；多人可胡时，按从出牌者起的座次取最近一位。'],
  ['结束与积分', '一人胡牌即结束。自摸时每位其他玩家付 1 分；点炮或被抢杠者付 1 分。牌墙摸完且无人胡牌则流局，0 分。全为娱乐积分。下一局轮换庄家。'],
  ['操作时限', '跟随房间时限；超时默认放弃吃碰杠胡，轮到出牌时默认打出刚摸的牌，吃碰后超时则打出最右一张。掉线后可回到原桌；全员离线时等恢复访问再推进。'],
] as const;
