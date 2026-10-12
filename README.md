# codex-改版小AI插话挂件

跟随 Codex 桌面窗口的透明伴随挂件，保留小 AI 插话、气泡聊天、API 余额与记账，并增加 Codex 会员与额度展示。

**本仓库首版为 v1.0.0，以当前实际使用版 `0.2.4+membership.5` 为基础。** 本次随包提供用户指定的默认角色 PNG，并将托盘和插件图标指向这张图；主要功能逻辑保持当前版。`package.json` 的 `0.2.4`、原插件构建号及上游链接保留，便于追溯。这里的 v1.0.0 是本仓库的发行编号，不代表上游升级，也没有用较新的上游版本替换正在使用的版本。

仓库：[spaceyee1/codex-ai-interjection-widget](https://github.com/spaceyee1/codex-ai-interjection-widget)。本项目为个人改版，与 OpenAI 官方发布无关。

<img src="assets/default-character.png" alt="Codex 版默认角色：用户提供的透明背景图片" width="220">

## 这份发布包含什么

包含实际运行应用的源代码、Codex 插件元数据、原许可文件、`smol-toml` 源码依赖、用户指定的默认角色图片，以及本次发布文档。源文件、发布适配与排除项记录在 [SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json)。

**这是需要自行准备运行条件的源码版。** `assets/default-character.png` 按用户本次明确要求随包发布，并用于默认角色、托盘和插件图标。它与原安装版的默认图同字节；已有自定义角色选择不会被强行重置，切回默认角色会使用这张图。该图片单独登记来源，不纳入代码 MIT，也不把用户提供等同于用户原创。

公开包不包含其余 **10 个上游图片、动图和音效**，也不包含 Electron、离线安装 EXE、用户配置、密钥、账本、聊天记录或本机运行日志。现有材料不足以证明这 10 个上游媒体可以在这个新仓库公开再分发，因此仅登记来源和哈希；这不等于认定素材侵权。需要原气泡动图或预设音效时，应自行准备有权使用的资源；未准备时不要选用相应预设，并关闭相应音效。资源要求见 [ASSETS.md](ASSETS.md)。

本次发布没有改动、停止或重装作者本机正在使用的挂件。

## 功能

| 功能 | 当前源码保留的行为 |
| --- | --- |
| 桌面跟随 | 透明 Electron 窗口跟随 Codex，保留拖动、缩放、吸附、角色翻转与气泡。 |
| 小 AI 插话 | 普通陪聊与工作模式、手动聊天、窗口观察、自动插话开关及提示词设置。 |
| API 余额 | 原 API 设置、余额查询、观察到的消耗记录、USD/CNY 显示与汇率说明。 |
| 会员与额度 | 通过本机 Codex 程序读取账户套餐、额度窗口、重置时间和官方提供的活动记录。缺失数据与零值分别显示。 |
| 气泡通知 | 默认摘要和每轮通知可展示会员额度；用户自定义首页继续保留。 |
| 素材管理 | 用户指定的默认角色随包提供；保留角色、泡泡图和音效导入及管理代码，其余原预设资源需自行补充或停用。 |

该源码版本的会员展示规则包括 Plus 的 5 小时窗口，以及对 Pro 类套餐隐藏该窗口的处理。这是当前快照的实现规则，不代表官方套餐政策的永久保证；识别接口和显示行为仍需随宿主变化验证。

## Windows 手动部署

适用于准备在独立测试环境中部署源码的开发者。需要 Windows 10/11 x64、已安装并登录的 Codex 桌面应用、Node.js 24+（含 npm），以及自行安装的 Electron。原运行包使用 Electron `44.3.0`；本次未对其他版本做兼容性回归。

1. 下载本仓库源码并完整解压，保持目录结构及随包的 `assets/default-character.png`。默认角色和图标使用此图；按 [ASSETS.md](ASSETS.md) 处理未包含的上游预设资源，补充有权使用的文件，或停用相应气泡图和音效预设。
2. 单独准备 Electron。以下命令需要联网下载运行组件，在源码根目录的 PowerShell 中执行。示例把运行组件和挂件数据放在专用目录。

```powershell
$whaleRuntime = Join-Path $env:LOCALAPPDATA 'CodexAiInterjectionWidget-runtime'
$whaleData = Join-Path $env:LOCALAPPDATA 'CodexAiInterjectionWidget-data'
npm install --prefix "$whaleRuntime" --no-audit --no-fund --save-exact electron@44.3.0
$whaleElectron = Join-Path $whaleRuntime 'node_modules\electron\dist\electron.exe'
if (!(Test-Path -LiteralPath $whaleElectron)) { throw 'Electron 安装未完成' }
```

3. 在没有另一份该挂件占用默认任务的测试账号中注册自动跟随。这个命令会注册当前用户的 **Codex API Balance Whale** 计划任务，并启动 GUI 监督器；它不是只读检查。已有挂件用户应继续使用现有安装，先在隔离环境验证源码，不要把下面步骤当作无影响升级。

```powershell
$env:WHALE_HOME = $whaleData
powershell.exe -NoProfile -File .\scripts\install-follow.ps1 -DataDir "$whaleData" -ElectronPath "$whaleElectron"
node .\scripts\control.mjs status
```

4. 打开 Codex，检查挂件是否实际显示、能否随窗口移动及最小化恢复，再在挂件菜单中配置自己需要的功能。计划任务存在不等于界面和会员查询已验证。

本仓库保留的 `scripts/install-desktop.mjs` 属于旧离线安装包，只检查相邻 `runtime/electron.exe`，**不会下载 Electron**；直接运行 `npm run install:desktop` 不能完成本源码版部署。旧 README 提到的 EXE、CMD 入口及完整运行组件也没有随本次发布。

已按上面路径部署后，在新的终端使用控制命令前，应再次设置同一 `WHALE_HOME`。停用该测试安装时，在源码根目录执行：

```powershell
$whaleData = Join-Path $env:LOCALAPPDATA 'CodexAiInterjectionWidget-data'
powershell.exe -NoProfile -File .\scripts\uninstall-follow.ps1 -DataDir "$whaleData"
```

脚本会停用匹配本源码路径的自动跟随任务，保留数据。不要使用其他安装目录的回滚脚本处理当前实例。

macOS 的 Swift 窗口探针与 LaunchAgent 源码保留了上游贡献，但当前快照来自 Windows 运行实例。旧 macOS 安装器仍依赖特定 Electron 布局，而离线组件检查脚本不适用于新 Mac 安装；本首版不提供已验证的 macOS 安装流程。

## 数据与网络

会员模块通过本机 Codex 组件访问只读账户接口。账户登录态、API 余额凭据和插话 Key 用途不同；额度百分比也不是 API 余额，不能换算成固定剩余 token。

原余额模块会按用户配置向相应余额接口发送凭据。启用插话或手动附图时，插件会在本地 OCR 检查后向配置实现中的 DeepSeek 接口发送选定窗口截图；凭据检测不能保证识别所有私人信息。请只选择允许发送的窗口，并在挂件本地设置中填写自己的 Key，不要贴到 GitHub Issue。

发布包不携带任何人的登录态或本机使用数据。故障反馈方法见 [DEBUG.md](DEBUG.md)；完整署名与许可范围见 [CREDITS.md](CREDITS.md)。

## 鸣谢

- **[Yang-huai406](https://github.com/Yang-huai406)**：Codex 适配线的主要维护与贡献；独立上游为 [Codex-Whale-Public](https://github.com/Yang-huai406/Codex-Whale-Public)。
- **[MeteorNOX（月匠）](https://github.com/MeteorNOX)**：原小鲸鱼项目及 DSH 主线基础，保留其 MIT 版权。
- **[1llysviel](https://github.com/1llysviel)**：macOS 适配，[PR #128](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/pull/128)。
- **Cynthia Rey、Squirrel Chat 及贡献者**：`smol-toml`，保留 BSD-3-Clause 许可。
- **Electron、Chromium、Node.js、FFmpeg、SwiftShader、Vulkan、DXC 及其他运行组件贡献者**，以及 Microsoft 平台组件提供者：本仓库不包含这些运行时二进制。
- **原角色、气泡图和音效的制作者，以及 EmoteLab 等来源记录中列出的制作工具贡献者**：保留来源记录；这 10 个上游媒体未收入此公开包。
- **本次提供并明确要求发布默认角色图片的用户**：该 PNG 按原字节提供，权利范围单列，不归入 MIT，也不冒称任何一方原创。

本地会员扩展历史署名为 **spceyee**，本仓库由 **[spaceyee1](https://github.com/spaceyee1)** 整理发布。鸣谢不代表上游作者为本改版背书，也不替代素材或组件的授权条件。详见 [完整鸣谢与来源](CREDITS.md)。

## 文档与版本边界

本次发布范围、部署步骤以 **本 README、[DEBUG.md](DEBUG.md)、[CREDITS.md](CREDITS.md)、[ASSETS.md](ASSETS.md)** 为准；许可义务仍以对应许可原文为准。

[原安装版 README](docs/INSTALLED-README.md)、[原使用说明](用户使用方式.md)、[历史会员扩展 Debug](docs/MEMBERSHIP-ADDON-DEBUG.md)、[PROVENANCE](PROVENANCE.md) 和 [完整包许可说明](COMPLETE-PACKAGE-NOTICES.md) 按原字节保存，作为历史快照。它们提到的旧 EXE、媒体、运行组件、测试次数或缺失的旧文档，不能据此认定已包含在本次发布，或已经在本次重新验证。
