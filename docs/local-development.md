# 本地开发：先把游戏跑起来

## 新电脑

使用 Node.js 24 LTS。装有 nvm 时，在仓库运行 `nvm install && nvm use` 会读取 `.nvmrc`。然后运行：

```bash
npm run install:ci
npm run setup:local
npm run dev
```

浏览器打开 `http://localhost:5173/`。注册一个新账号，不要输入线上管理员密码。个人测试可直接建人机房；多人测试用不同浏览器或无痕窗口分别登录。

- `install:ci` 按锁文件安装依赖，不会自动升级框架。
- `setup:local` 只向本项目 `.wrangler/state` 的本地数据库应用尚未执行的迁移。重复运行不会清空数据。
- 普通玩家测试不需要线上密钥，也不需要复制 `.env`。管理员相关变量的含义见 [运维](operations.md)。
- macOS / Linux 可按上述命令运行；Windows 使用 PowerShell 运行同样的 npm 命令。Sites 最终打包需要 Bash，Windows 发布建议使用 WSL 或已配置的 Codex 环境。

## 改代码时

开发服务会更新页面。切到 `http://localhost:5173/emotes` 可以检查表情、牌型特效和缓存进度。新增素材后执行 `npm run assets:build`；文件名不变但换图时，也要重新生成内容指纹。

如果 5173 被占用，请停止旧服务，或者明确指定新的端口：

```bash
npm run dev -- --port 5174
```

这时需要主动打开 `http://localhost:5174/`。默认使用固定端口并在占用时退出，避免误看旧站点。

## 看正式构建效果

```bash
npm run build
npm start
```

打开 `http://localhost:8787/`。这是和上线同一类的 Worker 构建产物，仍只使用本地数据库。代码改动后要重新构建；`npm start` 不负责热更新。

`npm run test:smoke` 会自己选一个空闲端口并创建 `.wrangler/smoke-*` 独立数据库，测试完成后停止服务，不改你的手动测试房间。摘要在 `work/smoke-local.json`，失败日志在 `work/smoke-local.log`。

## 旧本地数据库提示“表已存在”

早期开发使用手工 SQL 建表，没有记录迁移进度。不要删除这个库，也不要把错误忽略后当作成功。保留 `.wrangler/state`，先用独立库验收：

```bash
npm run build
npm run test:smoke
```

如果需要继续使用旧库，由维护者对照 `drizzle/meta/_journal.json` 和实际表结构确认哪些迁移已经执行，再处理本地迁移记录。这个情况不能靠重复执行第一份 SQL 修复。

## 不进 Git 的文件

`.env*`（`.env.example` 除外）、`.dev.vars*`、`.wrangler/`、`work/`、`release/`、`dist/`、原画工作目录和本机工具设置都不提交。它们分别包含本地配置、测试数据或生成产物。线上环境变量由 Sites 管理。
