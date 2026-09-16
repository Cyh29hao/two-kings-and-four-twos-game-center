# 项目协作约定

如果有问题，就一定要问用户。不做模棱两可的事情。已有明确授权不重复询问。

- 先读 README.md；找代码看 docs/architecture.md。
- 功能改动在分支完成；不创建 PR。合并由用户决定。不要自动合并或强推。
- 用户说“发布 main”时，按 docs/releasing.md 使用当前 Sites 技能执行整套流程；这是对现有站点手动发布的指令。未合并的分支不能以正式版本发布。
- 不改 .openai/hosting.json 的项目身份，不迁移玩家数据，不把线上凭据带入本地测试。
- 规则变化保留旧版本快照；筹码使用 BigInt / 十进制字符串；提交使用现有原子事务和房间版本校验。
- 新动画走 lib/motion/catalog.ts 和统一缓存，不在三个游戏里另写下载器。新增素材后运行 npm run assets:build，并提交生成清单。
- 统一用 npm 与 package-lock.json；新增独立框架测试放 tests/unit/。
- 交付前运行 npm run check、npm run build、npm run test:smoke；所有点击测试均由用户按 docs/testing.md 在正式产物中完成，代理不得自行点击审查。
- .env、.dev.vars、数据库、Cookie、原始生成工作目录和 release/ 回执不能提交。不要将构建成功、HTTP 成功与人工交互通过混为一谈。
