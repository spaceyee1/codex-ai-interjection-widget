# 鸣谢、来源与许可范围

适用仓库：**codex-改版小AI插话挂件**，首版 `v1.0.0`。整理日期：2026-10-12。

感谢以下项目作者、维护者、依赖贡献者和素材提供者。各项贡献及原署名保留如下；未能确认原作者的素材单独说明。

## 项目与改版贡献

| 贡献者 | 感谢内容与来源 |
| --- | --- |
| **[Yang-huai406](https://github.com/Yang-huai406)** | Codex 适配线的主要维护者。上游[发布说明](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/releases)记载其维护 For-Codex 适配线，后迁至 [Codex-Whale-Public](https://github.com/Yang-huai406/Codex-Whale-Public)。按本仓库作者要求列为 Codex 版主要鸣谢。 |
| **[MeteorNOX（月匠）](https://github.com/MeteorNOX)** | [DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget) 原作者及 DSH 主线基础。当前代码从其 For-Codex 适配线演变而来；[LICENSE](LICENSE) 中 `Copyright (c) 2026 MeteorNOX` 与 MIT 原文完整保留。 |
| **[1llysviel](https://github.com/1llysviel)** | [macOS 适配 PR #128](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/pull/128)：窗口探针、跟随恢复、Electron 浮窗及安装卸载流程。源码保留，未在本次做 Mac 实机测试。 |
| **spceyee / [spaceyee1](https://github.com/spaceyee1)** | 当前本地合作扩展的历史署名为 spceyee；本仓库由 spaceyee1 整理发布。保留会员、额度、诊断及相关接入修改的历史说明，见[会员扩展 Debug](docs/MEMBERSHIP-ADDON-DEBUG.md)。 |

鸣谢名单不改变许可证，也不表示上述作者支持或担保本改版。

## 随源码分发的依赖

**[smol-toml](https://github.com/squirrelchat/smol-toml) 1.8.0**：感谢 **Cynthia Rey、Squirrel Chat 及其他贡献者**。包元数据登记作者 Cynthia Rey；版权声明为 `Copyright (c) Squirrel Chat et al., All rights reserved.`。本仓库保留 [vendor/smol-toml/LICENSE](vendor/smol-toml/LICENSE)、源码中的版权头和 BSD-3-Clause 条件，不将其改为 MIT。

原程序代码的 MIT 条件见 [LICENSE](LICENSE)。`package.json` 中的许可证字段不覆盖每一种素材和所有外部组件。

## 运行环境贡献

感谢 **Electron contributors、Chromium authors、Node.js contributors、FFmpeg developers、SwiftShader、Vulkan、DXC / DirectXShaderCompiler contributors** 及相关开源项目作者，也感谢 **Microsoft** 提供 Windows、.NET 与相关系统组件。

Electron 44.3.0 及其依赖的历史分发说明见 [完整包许可补充说明](COMPLETE-PACKAGE-NOTICES.md)。**本次 GitHub 源码发布不包含 Electron、Chromium、FFmpeg DLL、Microsoft DLL 或外层 third-party-sources 归档**。开发者自行取得运行组件时应保留其配套许可证和第三方通告；不能用本项目的 MIT 代替这些条件。

## 素材来源与发布范围

感谢原角色、气泡图、动图和音效制作者，以及本次提供默认角色的用户。当前安装目录记录的媒体如下；**本公开包提供用户指定的 `default-character.png`，其余 10 个上游媒体只保留清单与哈希**。

| 文件 | 当前材料能够说明的来源 |
| --- | --- |
| `DSniang1.png`、`DSniang02.png`、`DSH2.png` | 随原小鲸鱼 / For-Codex 包提供的图片。来源补充记载 MeteorNOX 提供的角色图采用 AI 生成后人工挑选与裁切，展示图由其设计排版；具体生成和设计工具未确定。上述文件未随本次发布，也不能因随代码提供就称为 MIT 素材。 |
| `rua.gif`、`bubble-petpet.gif` | MeteorNOX 提供的互动 / 气泡动图；来源补充记为使用网站工具制作，工具名称未给出。代码使用 `petpet` 名称，名称本身不是独立作者证明；两份文件未随本次发布。 |
| `bubble-yue-money.gif` | 来源补充记为 MeteorNOX 个人角色，使用 **EmoteLab** 制作；一并感谢提供者与工具贡献者。代码标签为 `Yue_要米`，该文件未随本次发布。 |
| `Ya1.mp3`、`Ya2.mp3`、`D1.mp3`、`D2.mp3` | 原包中的按下 / 松开音效。现有材料没有为本新仓库提供足够的再分发授权。 |
| `default-character.png` | 用户本次明确要求作为默认角色并随当前发布的透明 PNG，与原安装默认图同字节：1254×1254、1,387,209 字节，SHA-256 为 `d2ce48591f195d27f1473b4695b0ad8bcc288ce055b141f2e827fedca456133e`。感谢用户提供该图；不把提供者自动列为原作者，不归入代码 MIT。历史记录见[默认角色说明](docs/DEFAULT-CHARACTER.md)，本次发布范围见 [ASSETS.md](ASSETS.md)。 |

上游 [素材分发说明](https://github.com/Yang-huai406/Codex-Whale-Public/blob/main/docs/MATERIALS-PERMISSION.md) 的有限范围没有自动扩展到本新仓库，因此这 10 个上游媒体继续排除。用户明确要求发布的默认图单独记录，不产生对全部媒体再许可或转授 MIT 的推论。这里保留鸣谢与来源，既不认定已经侵权，也不作全部权利已经核实的保证。文件哈希、发布适配及排除原因见 [SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json)，资源要求见 [ASSETS.md](ASSETS.md)。

## 历史声明如何阅读

[PROVENANCE.md](PROVENANCE.md)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、[完整包许可说明](COMPLETE-PACKAGE-NOTICES.md) 和 [原安装版 README](docs/INSTALLED-README.md) 保留了当时的分发描述与署名，部分文档提到原包包含媒体或 Electron。它们是历史材料，不是本源码包的附件目录。本次实际内容以 [README](README.md)、[ASSETS](ASSETS.md) 和 [源码清单](SOURCE-SNAPSHOT.json) 为准；原始版权和许可条件继续有效。
