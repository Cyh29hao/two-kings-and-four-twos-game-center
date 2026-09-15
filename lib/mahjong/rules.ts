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
  /** Missing on saved ham-v1/v2 snapshots, which retain the original bonus. */
  noWildBonus?: boolean;
  /** Missing flags preserve historical room snapshots. */
  closedBonus?: boolean;
  forbidWildDiscard?: boolean;
  fourWildWin?: boolean;
  revealSeconds?: number;
  disabledWins?: string[];
  /** A double-wild plan already includes self draw; absent on historical rooms. */
  doubleWildIncludesSelfDraw?: boolean;
};
export const BASIC_CHIPS: ModernRules = {
  ...BASIC_136, id: 'basic-136-v2', version: 2, name: '基础试玩', chipLedger: true,
  reserve: 0, claimSeconds: 8, chooseSeconds: 0, wildcards: false, kongPayments: false, dealerPolicy: 'rotate',
};
export const HAM_V1: ModernRules = {
  ...BASIC_CHIPS, id: 'ham-v1', version: 1, name: 'ham 规', sevenPairs: true,
  reserve: 12, chooseSeconds: 60, wildcards: true, kongPayments: true, dealerPolicy: 'dealer-stays',
};
export const HAM_V2: ModernRules = {...HAM_V1,id:'ham-v2',version:2,selfDrawUnit:2};
export const HAM_V3: ModernRules = {...HAM_V2,id:'ham-v3',version:3,noWildBonus:false};
export const HAM_V4: ModernRules = {...HAM_V3,id:'ham-v4',version:4,closedBonus:false,forbidWildDiscard:true,fourWildWin:true,revealSeconds:15};
export const HAM_V5: ModernRules = {...HAM_V4,id:'ham-v5',version:5,disabledWins:[]};
export const HAM: ModernRules = {...HAM_V5,id:'ham-v6',version:6,doubleWildIncludesSelfDraw:true};
export const hamRulePreset=(id:string)=>[HAM,HAM_V5,HAM_V4,HAM_V3,HAM_V2,HAM_V1].find(r=>r.id===id);
export const isHamRules=(id:string)=>!!hamRulePreset(id);
export const MODERN_PRESETS = [HAM, BASIC_CHIPS] as const;
export const FAN_TABLE = [
  ['seven', '七小对', 2], ['luxury1', '豪华七小对', 4], ['luxury2', '双豪华七小对', 8], ['luxury3', '三豪华七小对', 16],
  ['pong', '碰碰胡', 2], ['pure', '清一色', 4], ['mixed', '混一色', 2], ['doubleWild', '双赖子', 4], ['fourWild', '四赖胡', 4],
  ['closed', '门前清', 2], ['noWild', '无赖子', 2], ['selfDraw', '自摸', 2], ['flower', '杠上开花', 2], ['rob', '抢杠胡', 2],
  ['smallDragons', '小三元', 8], ['bigDragons', '大三元', 16], ['smallWinds', '小四喜', 16], ['bigWinds', '大四喜', 64],
  ['honors', '字一色', 16], ['mixedTerminals', '混幺九', 8], ['terminals', '清幺九', 16],
  ['orphans', '十三幺', 32], ['gates', '九莲宝灯', 32], ['fourKongs', '四杠', 32], ['heaven', '天胡', 32], ['earth', '地胡', 16],
] as const;
export const RULE_NOTES = [
  ['牌张与开局', '万、筒、条各 36 张，东南西北、中发白共 28 张。共 136 张，不含花牌；不换三张、不定缺。四人准备后发牌，庄家 14 张，其余 13 张。'],
  ['吃、碰、杠', '只能吃上家的万筒条；可以碰、明杠、暗杠、补杠。杠后从牌墙末端补一张，杠不另计分。补杠可以被抢胡；暗杠不公开牌面。'],
  ['胡牌与优先级', '基础胡牌为四组顺子或刻子，加一对将牌；已吃碰杠的组计入其中。暂不支持七对、十三幺和特殊番型。胡优先于碰杠，碰杠优先于吃；多人可胡时，按从出牌者起的座次取最近一位。'],
  ['结束与积分', '一人胡牌即结束。自摸时每位其他玩家付 1 分；点炮或被抢杠者付 1 分。牌墙摸完且无人胡牌则流局，0 分。全为娱乐积分。下一局轮换庄家。'],
  ['操作时限', '跟随房间时限；超时默认放弃吃碰杠胡，轮到出牌时默认打出刚摸的牌，吃碰后超时则打出最右一张。掉线后可回到原桌；全员离线时等恢复访问再推进。'],
] as const;

export const WIN_SWITCHES=FAN_TABLE.filter(([id])=>!['closed','noWild','luxury1','luxury2','luxury3'].includes(id));
export function customMahjongRules(preset:ModernRules,v:unknown):ModernRules{const out={...preset};if(v===undefined)return out;if(!v||typeof v!=='object'||Array.isArray(v))throw Error('房间规则无效');const b=v as Record<string,unknown>;for(const k of ['allowChi','allowRobAddedKong'] as const){if(b[k]!==undefined){if(typeof b[k]!=='boolean')throw Error('规则开关无效');out[k]=b[k] as boolean;}}if(b.disabledWins!==undefined){if(!Array.isArray(b.disabledWins)||b.disabledWins.some(id=>!WIN_SWITCHES.some(([k])=>k===id)))throw Error('禁用胡牌方式无效');if(!preset.wildcards&&b.disabledWins.length)throw Error('基础试玩不能设置 ham 特殊胡法');out.disabledWins=[...new Set(b.disabledWins)] as string[];}return out;}
