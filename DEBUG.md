# v1.0.0 调试与发布核对

对象：**codex-改版小AI插话挂件**。日期：2026-10-12。

本页记录 v1.0.0 的文件核对、默认图片适配和静态检查，内部扩展标识为 `0.2.4+membership.5`。托盘与插件图标使用用户指定的默认图；验证时没有重新安装、修改或停止本机正在运行的挂件。

## 当前版的确认方法

本次核对了 Windows 当前运行的 GUI 启动器、Electron 程序路径和计划任务：它们均指向同一 `0.2.4+membership.5-20261006-71b0499e` 发行目录，`Codex API Balance Whale` 任务为 Running。读取的是非敏感程序路径与状态，没有读取密钥、账户配置正文、账本或聊天记录。

应用 `package.json` 与 `runtime/paths.mjs` 保持原版本 `0.2.4`，插件元数据保留其原构建号；扩展版本由原使用说明和完整包声明确认为 `0.2.4+membership.5`。因此，本次没有按桌面 ZIP 的版本排序选取旧的 `0.2.5～0.2.7` 重构版。

[SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json) 记录原安装应用的 113 个文件：102 个非媒体文件和用户指定的 `default-character.png`，共 103 个文件收入发布副本；其余 10 个上游媒体只登记哈希和排除原因。原 README 原字节移至 [docs/INSTALLED-README.md](docs/INSTALLED-README.md)。新增发布文档不属于原安装源码。

本次用户上传的 PNG 与原安装默认图同字节，SHA-256 为 `d2ce48591f195d27f1473b4695b0ad8bcc288ce055b141f2e827fedca456133e`。`runtime/dispatcher.mjs` 已将默认角色资源映射到此图，无需改动。两处发布适配为：`desktop/main.cjs` 的托盘图标，以及 `.codex-plugin/plugin.json` 的 `composerIcon` / `logo`，均从缺失的上游图片改用 `default-character.png`。没有强行清除已有自定义角色选择，切回默认角色会使用这张图。

## 验证范围

| 项目 | 本次范围 |
| --- | --- |
| 当前运行来源 | 已只读核对启动器、运行程序路径、计划任务和版本说明。 |
| 代码与许可清点 | 保留主要功能、MIT 版权、BSD-3-Clause 库及历史署名；默认图按用户明确发布要求单列，其他上游媒体和用户数据排除。 |
| 源码一致性 | 103 个收入发布的原文件中，101 个保持原字节，包含默认 PNG 和原 README 的移动映射；`desktop/main.cjs`、`.codex-plugin/plugin.json` 记录上述图标适配差异。 |
| 静态检查 | 最终图标适配后的 63 个 `.js` / `.mjs` / `.cjs` 文件全部通过 `node --check`，包含随附 vendor。语法通过不等同功能测试。 |
| 默认角色资源 | 在临时数据目录中调用真实 `createDispatcher`，关闭 watcher / 自动刷新、注入空账户服务并禁止网络。3 条默认图片 GET 路径均为 200，返回字节 SHA-256 与用户图一致；HEAD 为 200 且空正文，POST 为 405。插件两个图标路径均存在，PNG 为 1254×1254 RGBA，外部请求 0。 |
| 公开内容检查 | 初次源码扫描未发现所检查的 Key / token / JWT / 私钥头、带凭据 URL 或个人绝对用户目录特征；最终包只增加用户指定 PNG，不含其余 10 个媒体、外层 Electron 或用户配置账本。这是限定特征的扫描，不是没有任何秘密的绝对保证。 |
| 付费模型 / 真实额度接口 | 本次未调用。 |
| 安装、重启、Electron 交互、音效、窗口跟随 | 本次未执行完整回归；资源路由检查和当前进程正在运行不能替代界面或重装验证。 |
| macOS、多屏和长期稳定性 | 本次未验证。 |

原 [MEMBERSHIP-ADDON-DEBUG.md](docs/MEMBERSHIP-ADDON-DEBUG.md) 中的 127 项测试、隔离 Electron 结果及其他历史计数属于之前工作，本次没有把它们记为重新通过。当前应用目录不含这套测试文件。

本次默认图检查的 GET 路径为 `/dsh-whale/image.png`、`/dsh-whale/image.png?v=2` 和 `/assets/default-character.png`。该检查确认发布资源的映射和字节，不调用真实账号接口，也不等同于完成 Electron 中的点击、切换角色或透明命中交互验证。

## 本地只读语法检查

在源码根目录执行，下列命令只解析 `.js`、`.mjs` 和 `.cjs` 文件，不启动挂件、不调用模型或读取真实账户：

```powershell
$whaleCheckFiles = Get-ChildItem -LiteralPath . -Recurse -File |
  Where-Object { $_.Extension -in '.js', '.mjs', '.cjs' -and $_.FullName -notmatch '[\\/]node_modules[\\/]' }
$whaleCheckFailures = @()
foreach ($whaleCheckFile in $whaleCheckFiles) {
  node --check $whaleCheckFile.FullName
  if ($LASTEXITCODE -ne 0) { $whaleCheckFailures += $whaleCheckFile.FullName }
}
if ($whaleCheckFailures.Count) { throw ('语法检查失败：' + $whaleCheckFailures.Count + ' 个文件') }
'语法检查通过：' + $whaleCheckFiles.Count + ' 个文件'
```

原安装文件哈希及发布路径可与 `SOURCE-SNAPSHOT.json` 对照。托盘脚本和插件元数据存在已记录的图标适配差异，不应将它们与原文件哈希不同误判成下载损坏。其余 10 个排除媒体的 `publishedPath` 为 `null`，也不属于漏下载；默认 PNG 则应存在且与记录哈希一致。

## 常见问题

### “完整运行组件缺失，请重新解压完整安装包”

这是 `scripts/install-desktop.mjs` 的旧离线包检查。它检查源码上层的 `runtime/electron.exe`，不会为本源码仓库下载组件。按 [README 的 Windows 部署说明](README.md#windows-手动部署) 单独准备 Electron，并使用安装脚本真实支持的 `-ElectronPath` 参数。

### 挂件没有角色、托盘图标缺失或资源请求失败

先检查随包的 `assets/default-character.png` 是否存在且哈希匹配。默认角色、托盘和插件图标应使用这张图；删除它会触发依赖缺失，原角色回退资源不在公开包中。已经选择自定义角色的用户需要手动切回默认，本次不会强行重置选择。

其余 10 个上游媒体未随包提供，旧气泡动图或预设音效可能因此不可用。按 [ASSETS.md](ASSETS.md) 自行补充有权使用的资源，或不要选用这些预设并关闭相关音效；不要将预期的资源缺失直接归因于窗口渲染故障。本次没有做完整素材组合及功能回归。

### 会员或额度显示“暂时无法读取 / 暂不可用”

这个文案可能对应官方程序发现、只读 RPC、超时或账户数据读取失败，不能单凭文案判断套餐或余额为零。当前显示层还区分 `cli_unavailable`、`unsupported_auth`、`rate_limits_unavailable`、`usage_unavailable`、`timeout` 和 `account_changed` 等状态。

先确认 Codex 本身已正常登录，再在挂件“会员与额度”中手动刷新。检查实际显示的状态码与发生时间，不通过百分比推算剩余 token，也不要把显示失败改成免费账户。可阅读 [subscription-executable.mjs](runtime/subscription-executable.mjs)、[subscription-rpc.mjs](runtime/subscription-rpc.mjs)、[subscription.mjs](runtime/subscription.mjs) 和 [membership.js](desktop/ui/membership.js) 定位；本次发布没有执行新的账户识别修复或真实账号回归。

### 自动插话没有出现

确认本地已保存插件 Key、启用自动插话并选择可以发送的观察窗口。工作模式允许模型保持沉默；冷却、重复画面、不可识别文字或凭据检测也可能抑制发送。不要为了测试而展示含凭据、私密聊天或个人数据的窗口。

历史实现的 `companion-debug.jsonl` 位于挂件数据目录，只设计为保存状态代码和计数。发布故障时仅摘录必要的非敏感状态，不上传整个数据目录、OCR 文本、截图或请求正文。

### 计划任务正在运行，但挂件没有显示

确认 Codex 窗口可见，再核对启动器对应的源码位置和 Electron 路径。不要为了诊断重复注册同名任务或并行启动多份监督器。`node scripts/control.mjs status` 使用 `WHALE_HOME` 指向的数据目录；若诊断了另一个目录，得到的结果不能代表当前实例。

在新终端运行控制命令前设置部署时同一个 `WHALE_HOME`。先保存状态和错误代码，再按自己的安装位置排障；不删除账本或配置来掩盖错误。

## 报告问题

到[本仓库 Issues](https://github.com/spaceyee1/codex-ai-interjection-widget/issues) 提供仓库版本、内部版本、Windows / Node / Electron 版本、最短复现步骤、期望结果和非敏感错误代码。不要提交 `auth.json`、`config.toml` 原文、API Key、登录令牌、完整日志、聊天记录或截图中的私人内容。

历史 [SECURITY.md](SECURITY.md) 保留上游流程，引用的旧联系方式不代表其维护者负责本改版。涉及凭据或未公开漏洞时，不要在公开 Issue 粘贴细节。
