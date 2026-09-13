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
export const RULE_NOTES = [
  ['牌张与开局', '万、筒、条各 36 张，东南西北、中发白共 28 张。共 136 张，不含花牌；不换三张、不定缺。四人准备后发牌，庄家 14 张，其余 13 张。'],
  ['吃、碰、杠', '只能吃上家的万筒条；可以碰、明杠、暗杠、补杠。杠后从牌墙末端补一张，杠不另计分。补杠可以被抢胡；暗杠不公开牌面。'],
  ['胡牌与优先级', '基础胡牌为四组顺子或刻子，加一对将牌；已吃碰杠的组计入其中。暂不支持七对、十三幺和特殊番型。胡优先于碰杠，碰杠优先于吃；多人可胡时，按从出牌者起的座次取最近一位。'],
  ['结束与积分', '一人胡牌即结束。自摸时每位其他玩家付 1 分；点炮或被抢杠者付 1 分。牌墙摸完且无人胡牌则流局，0 分。全为娱乐积分。下一局轮换庄家。'],
  ['操作时限', '跟随房间时限；超时默认放弃吃碰杠胡，轮到出牌时默认打出刚摸的牌，吃碰后超时则打出最右一张。掉线后可回到原桌；全员离线时等恢复访问再推进。'],
] as const;
