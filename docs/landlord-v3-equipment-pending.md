# Landlord V3 待定装备列表

> 状态：下列装备已在[选定装备列表](landlord-v3-equipment-selected.md)冻结 ID 与效果，但服务端效果尚未实现。新候选须先在此记录稳定 ID、精确效果、触发窗口、限制、公开性、持久化状态、冲突、第 13 局行为与正反例，再按[装备要求](landlord-v3-equipment-requirements.md)进入选定列表。

## 当前候选（已选定、待实现）

溜了溜了 `quit-early`、殊死一搏 `last-stand`。两件仅保留冻结 ID 和设计文档，不进入随机商店、购买接口或玩家装备图鉴；不能把待实现效果当作已开放功能。

每件仍需在实现时补齐：服务端原子提交、金币守恒测试、第 13 局禁用或替代行为，以及对话框中的公开信息说明。

## 已实现（本轮迁出）

| 装备 | 实现要点 | 测试 |
| --- | --- | --- |
| 我不叫 `no-bid` | 声明后本局每次竞价自动提交不叫；最终地主另有其人时发 1 金币，被强制指定为地主则不发放 | `v3 no-bid auto-passes every bid…` |
| 我全都要 `take-the-lot` | 三带二／四带二出牌后开弃牌窗口，每局最多 3 次 | `v3 take-the-lot lets the holder discard…` |
| 独食 `solo-diet` | 主结算后按本局最大单手牌数与是否出过牌发放 3 金币 | `v3 solo-diet, no-chase and appearance-fee…` |
| 首富 `richest` | 以装备金币发放前的同一快照比较，并列或独占最高发 1 金币 | `v3 airdrop, richest and interest…` |
| 计息 `interest` | 同一快照 `min(floor(金币/4),2)` | 同上 |
| 出场费 `appearance-fee` | 第 3、6、9 局商店刷新前发 2 金币，每桌最多 3 次 | `v3 appearance-fee pays on rounds three, six and nine…` |
| 买定离手 `bet-is-set` | 竞价前托管 2 金币；主结算后胜方返还托管并额外发 2 金币，败方托管移出本局 | `v3 bet-is-set escrows two coins…` |
| 空投 `airdrop` | 同一快照下不是最高金币者发 5 金币，每桌最多 3 次 | `v3 airdrop, richest and interest…` |
| 残局 `endgame-change` | 主结算后手牌 0--5 张发 1 金币 | `v3 endgame-change pays holders…` |
| 穷寇莫追 `no-chase` | 未获胜且手牌 1--5 张发 1 金币 | `v3 solo-diet, no-chase and appearance-fee…` |
| 接龙 `skip-straight` | 把相邻差 1 或差 2 的单张组合（3 5 6 7 8 或 3 4 5 6 7）**按「顺子」打出**，不产生新牌型：普通顺子与接龙顺子视为同一种，只有张数相同且最大牌更大的顺子能压过，炸弹与王炸仍可压制 | `v3 skip-straight plays a gapped run as a normal straight…` |
| 断你财路 `cut-off-income` | 自己回合开始时指定一名对手，本局该对手的装备金币奖励逐笔减半向下取整 | `v3 cut-off-income halves the target…` |
| 站起来跟他打 `stand-up-fight` | 地主确定后弃置 1--5 张实体手牌并保留至少 1 张，此后本局手牌对另外两人可见 | `v3 stand-up-fight discards up to five physical cards…` |

仍然待实现：溜了溜了 `quit-early`、殊死一搏 `last-stand`（都需要「退休状态」与二人残局结算分支）。


## 迁入记录

| 日期 | 决策 | 装备 | 结果 |
| --- | --- | --- | --- |
| 2026-09-16 | 选定 | 我不叫、穷寇莫追、我全都要、独食、首富、计息、出场费、买定离手、站起来跟他打、溜了溜了、殊死一搏、断你财路、空投、人脉 | 已迁入[选定装备列表](landlord-v3-equipment-selected.md)，包括二人残局和结算规则。 |

## 不再候选

抽风、重抽、反手、双王、错位、同花和全部点数修正类装备，继续不进入候选池：它们与 54 张完整发牌、实体牌不可变或现有点数映射窗口冲突。
