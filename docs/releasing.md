# 发布：你决定合并，然后手动上线

## 日常流程

1. 修改者从 `main` 创建 `codex/...` 或自己的功能分支，提交 PR。
2. GitHub 的 `Validation / validate` 自动执行素材、类型、规则和框架测试、文档链接、正式构建及本地接口验收；失败先修。
3. 按 [验收说明](testing.md) 检查实际页面，在 PR 说明结果。Martin 决定是否合并。
4. 合并后，需要上线时，在当前项目的 Codex 中说 **“发布 main，按 docs/releasing.md 执行”**。
5. Codex 完成下面的发布步骤，交付线上地址和核验结果。合并本身不触发上线。

GitHub Actions 可以手动重新运行验收并保留构建产物，但没有被配置成可直接部署 Sites 的按钮。当前发布授权来自已连接的 Codex / Sites；短期源码凭据不会存成 GitHub Secret，更不会写进仓库。

## 给 Codex / 发布者的执行约定

### 1. 确定发布源码

读取 `config/release.json` 和 `.openai/hosting.json`。只使用约定的 GitHub 仓库、`main` 和现有 Sites 项目，不创建新站或新数据库，不改变访问范围。

先更新远端引用。如果当前目录有别人的修改或停在功能分支，使用同仓库的独立、干净检出目录验收合并后的 `origin/main`；不要丢弃修改、强推或替用户合并 PR。安装依赖后运行：

```bash
npm run release:prepare
```

它会核对远端、当前提交、工作目录和项目 ID，运行 `check`、`build`、`test:smoke`，再次核对 main 没有在中途变化，然后调用本机 Sites 插件的正式打包工具。

输出在忽略的 `release/` 目录：`candidate.json` 写明准确源码、压缩包和校验值，`site-<commit>.tar.gz` 是发布包。`dist/client/build-info.json` 记录构建提交。准备失败不得继续发布，也不要用旧的 candidate 冒充本次产物。

### 2. 发布到原 Sites 项目

使用当前 Sites building / hosting 技能和原生连接器的完整流程：

1. 核对 candidate 的文件校验值及当前 HEAD；调用 `get_site` 确认是原站点与现有访问范围。
2. 获取同一项目的短期源码写入凭据，只以单次 Git 请求头使用，不落盘、不写 remote、不输出令牌。
3. 推送这次验收的准确源码到平台返回的仓库和分支，禁止强推。出现分歧时停止并说明。
4. 推送成功后**重新执行 `git rev-parse --verify HEAD`**，把完整结果原样用于 `save_site_version`，同时提交本次压缩包。
5. 只部署刚保存的版本。保持原访问范围，等待 `get_deployment_status` 返回成功。用户本次“发布 main”是对原站点发布的授权，不反复询问同一授权。
6. 将平台版本、部署状态和原样返回的网址记在 `release/deployment.json`。确认成功后运行 `npm run release:verify`。

连接器不可用或权限不够时，保留已准备的包并说明卡在哪一步。不能假造版本号或把“包已生成”说成“已上线”。

### 3. 核验与交付

`release:verify` 检查线上构建提交、五个入口和全部动画素材的内容指纹，生成 `release/online-verification.json`。它只读取公开页面和素材，不读取玩家资料或操纵真实房间。

Sites 可能把 WebP 返回为 `application/octet-stream`；核验同时检查 WebP 文件头、文件大小和精确内容指纹，不把通用二进制类型误报为图片丢失。本机需通过已配置的代理访问时，可用 `NODE_USE_ENV_PROXY=1 npm run release:verify`（支持该环境变量的 Node 版本）；不得忽略 HTTP 错误或素材不匹配。

最后在原站点页面检查入口，涉及交互的改动按本次范围核验。Cloudflare 拦截、网络超时或浏览器打不开都要分别记录；部署成功不代表所有浏览器检查通过。交付时区分“已部署”“自动检查通过”“实际页面已检查”。

## 发布失败或需要回退

- 验收失败：停在 PR / 本地阶段，原站不变。
- 准备完成但未部署：修复问题后重新生成包，不手工改包。
- 部署失败：读取平台状态；先确认线上仍运行哪个版本，再重试，不重复创建版本碰运气。
- 已发布后发现问题：优先通过修复 PR 发布。若要回退，只能选仍兼容现有规则快照与追加迁移的版本。不能让旧引擎处理它不认识的 ham 房间。
- 不回滚玩家数据库，不覆盖账号密码，不删除已执行迁移。

## GitHub 设置

仓库已提供工作流和 PR 模板。建议在 GitHub 的分支规则中将 `main` 设为需要 PR、要求 `validate` 成功并禁止强推；这些是仓库设置，不会因为提交 YAML 自动生效，也没有在本次未经另行指示时替换现有权限设置。

工作流只授予 `contents: read`；官方 Actions 固定到提交版本。升级 Node 或 Action 时单独提 PR 并重新验收。参考：[官方 checkout](https://github.com/actions/checkout)、[setup-node](https://github.com/actions/setup-node)、[upload-artifact](https://github.com/actions/upload-artifact)、[Node 发布状态](https://nodejs.org/en/about/previous-releases)。
