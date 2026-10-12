# 素材来源与本次发布范围

适用版本：**codex-改版小AI插话挂件 v1.0.0**。记录日期：2026-10-12。

本版以本机正在使用的 `0.2.4+membership.5` 为基础。用户本次明确提供并指定用于发布的默认角色 PNG 已随包包含，用于默认角色、托盘图标和插件 logo；另外 10 个上游媒体文件未随公开仓库和源码包分发。本机安装目录中的原文件没有删除或替换。源码和保留的历史文档仍可能引用未包含的上游媒体，相关可选角色、气泡图片或音效可能不可用。运行环境和安装条件见 [README.md](README.md)。

## 来源与许可边界

- 感谢 **[Yang-huai406](https://github.com/Yang-huai406)** 的 Codex 适配与维护，以及 **[MeteorNOX（月匠）](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)** 的原始挂件与素材提供工作；macOS 贡献继续归属于 **[1llysviel](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/pull/128)**。本页不改变原作者署名。
- 本机保留的 [PROVENANCE.md](PROVENANCE.md) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 将图片、动图和音效排除于代码 MIT 范围。这些原文仍作为安装版本的来源记录保留，其中关于随包提供素材的描述不代表本次公开包包含它们。
- Yang 上游的 [素材分发说明](https://github.com/Yang-huai406/Codex-Whale-Public/blob/main/docs/MATERIALS-PERMISSION.md) 记录了其 For-Codex 仓库、安装包和历史版本的有限分发说明，并明确不授予第三方再许可。这里将它用于补充来源信息，没有把该说明扩大为对 spaceyee1 新仓库的授权。
- **排除原因 A**：尚未确认媒体在本改版公开仓库中的再分发权限；不把代码 MIT、来源相同、鸣谢或原样保留当成媒体授权。
- 用户本次明确提供默认角色图片，并指定随本版发布和作为默认显示。该图按用户提供素材登记，不推定用户就是原绘者，不自动纳入代码 MIT，也不替代上游素材署名。

## 已包含的用户提供图片

| 发布路径 | 来源与本次用途 | 文件核对 |
| --- | --- | --- |
| `assets/default-character.png` | 用户本次提供的透明 PNG，指定用于本次默认角色发布，同时用于托盘图标和插件 logo。原绘者未在现有材料中确定，不署为 Yang、MeteorNOX、spaceyee1 或 OpenAI 的原创。 | 1254 × 1254，1,387,209 字节；与本机原默认角色文件同 SHA-256。 |

SHA-256：`d2ce48591f195d27f1473b4695b0ad8bcc288ce055b141f2e827fedca456133e`。本次用户提供图与原默认图为同一字节内容，沿用原像素。历史使用记录见 [DEFAULT-CHARACTER.md](docs/DEFAULT-CHARACTER.md)，当前发布路径与来源说明见 [SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json)。这张图无需再从旧安装恢复。

## 未包含的 10 个上游文件

每个文件的原始字节数、SHA-256 和排除原因都保存在 [SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json) 的 `files` 数组中，按下表完整 `sourcePath` 查找；`publishedPath: null` 表示没有随本次源码发布。哈希用于确认文件身份，不证明权利状态。

| 原路径 | 已知来源与鸣谢 | 未包含原因 |
| --- | --- | --- |
| `assets/DSniang1.png` | MeteorNOX 提供的上游角色图；来源说明记为 AI 生成后人工挑选、裁切，具体工具与原始生成记录未能确定。 | A |
| `assets/DSniang02.png` | 同一上游角色系列的备用整图；具体生成工具与原始记录未能确定。 | A |
| `assets/DSH2.png` | 上游展示图，来源说明记为 MeteorNOX 自行设计排版、使用在线设计工具；现有记录未明确工具名称。 | A |
| `assets/rua.gif` | MeteorNOX 提供的动图；Yang 的补充说明记为使用网站工具制作，未给出工具名称。 | A |
| `assets/bubble-petpet.gif` | MeteorNOX 提供的动图；工具说明同上。本机快照中它与 `rua.gif` 同 SHA-256。 | A |
| `assets/bubble-yue-money.gif` | Yang 的补充说明记为 MeteorNOX 的个人角色，使用 **EmoteLab** 制作；不是 `bubble-money1.gif` 改名。工具与提供者分别致谢，工具名称不构成额外授权。 | A |
| `assets/D1.mp3` | MeteorNOX 上游内置按压／松开音效。现有来源记录没有确定该录音的具体制作人或原始素材地址。 | A |
| `assets/D2.mp3` | 同组上游内置音效；具体录音作者与原始素材地址未能确定。 | A |
| `assets/Ya1.mp3` | MeteorNOX 上游内置按压／松开音效；具体录音作者与原始素材地址未能确定。 | A |
| `assets/Ya2.mp3` | 同组上游内置音效；具体录音作者与原始素材地址未能确定。 | A |

Yang 上游说明记录了维护者继续保留四个 MP3 的决定；这不等于授予本仓库额外的音效分发权限。本页保留音效的提供方和来源线索，没有给未知录音作者补造姓名。

## 在自己的本地副本恢复可选上游素材

1. 保留已经正常使用的安装目录和个人数据。先将本源码包解压到另一个目录，不用空缺素材的源码目录覆盖当前安装。
2. 如需使用表中未包含的上游媒体，只从**自己有权使用的本地安装或备份**取出相应文件，逐个按上表同名路径复制到新副本的 `assets/`。已随包包含的 `assets/default-character.png` 不需要替换。不要把个人配置、密钥、账本、聊天或运行日志一起复制进去。
3. 如需复现这份快照，对照 `SOURCE-SNAPSHOT.json` 的 `sourcePath` 和 `sha256` 核对原文件；PowerShell 可用 `Get-FileHash -Algorithm SHA256 -LiteralPath '.\assets\DSniang1.png'` 查看单个哈希。不同哈希不一定是错误，但不能称为本快照相同素材。
4. 本仓库不自动下载这些媒体，也不指向网友图库替代下载。没有可合法使用的对应文件时，保留缺失状态；另行选择自有或明确获许素材属于后续资源适配工作，不能仅改扩展名就保证兼容。

恢复本地使用所需文件不会使它们自动变成可公开转载的文件。准备分享自己的副本时，仍需按各素材实际授权判断。运行时依赖和启动条件见 [README.md](README.md)；本页仅说明媒体，不宣称补齐素材后已完成所有安装条件。

