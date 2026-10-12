# 完整安装包许可补充说明

适用包：codex-小鲸鱼AI插话-0.2.4+membership.5-spceyee。核对日期：2026-10-06。合作扩展：spceyee；感谢 MeteorNOX 及各第三方作者。

## 与原文的关系

原 app/LICENSE、PROVENANCE.md、THIRD_PARTY_NOTICES.md、README.md 保留原字节和署名。本补充只纠正完整 EXE 的分发事实：本包内置 Electron 44.3.0 Windows x64；安装、使用不需再下载 GitHub 资源。原说明中“Electron 单独下载”只描述当时的仓库分发方式，不适用于此完整安装包。原说明引用的 docs/UPSTREAM-README.md 在用户原包与本包中都不存在；不能据该引用声称已经附上文件。

## 各部分许可范围

| 部分 | 来源与保留材料 | 范围 |
| --- | --- | --- |
| 原插件代码 | MeteorNOX 的 For-Codex 分支；用户原包封存，app/LICENSE 保留 MIT 原文 | 合作方原版与合作扩展分别保存；不冒称官方更新 |
| 新增会员／诊断模块及接入修复 | 本次合作扩展编写；应用内源码可查看，改动清单与哈希随包提供 | 不移除原作者署名，不将第三方代码改称个人原创；未发现需替换的未授权复制片段不等于绝对原创认证 |
| smol-toml 1.8.0 | app/vendor/smol-toml/LICENSE；SquirrelChat et al. 版权与 BSD-3-Clause，npm 作者 Cynthia Rey | 官方 npm 19 个文件逐字节一致，保留条件、免责声明与版权头 |
| Electron 44.3.0 | runtime/LICENSE；Electron contributors 的 MIT | Electron 本体许可，不覆盖所有内置依赖 |
| Chromium、Node、SwiftShader、Vulkan、DXC 等运行依赖 | runtime/LICENSES.chromium.html 原样保留 | 依各项通告判断，不能统一称 MIT；通告有 780 项，包含非 Windows 条目，不能当成实际链接组件清单 |
| FFmpeg | 运行通告含 LGPL 2.1 全文；third-party-sources 内有固定源码、补丁、许可证和相关构建资料 | 使用 LGPL 2.1 或更新许可的部分受其条款约束，见下文；不冒称本次已重编译 |
| 图片、动图与音效 | 原文件、原署名保留 | 不在代码 MIT 授权范围内；本次未核实全部再分发授权，须依据实际素材授权判断 |

封存原包只证明原始内容未改，不等于已证明所有文件是合作方独立创作。安装器 Installer.cs / setup.ps1 追溯到此前本地合作打包脚本，本次未变更其实现；系统 C# 编译器和 .NET 框架引用不等于将其源码复制到插件。

## FFmpeg 源码与修改权

本包使用 Electron 官方运行目录的 ffmpeg.dll。固定来源链：Electron v44.3.0 commit 07e460719c75b2ec5ee4893f7d2192ef31c7b8c2 → Chromium 152.0.7977.78 → FFmpeg commit 2b68d2babae73714846961fb0ee47e3b3d2e39a9。

安装目录的 third-party-sources/ 内有完整固定 FFmpeg Git tree 的 tar.gz、Electron tag 源码（含 FFmpeg 补丁及构建参数／脚本）、Chromium build 和 media/ffmpeg 子树、对应 DEPS/.gn/LICENSE、重点许可文件和 SOURCE-MATERIALS-README.txt。源码与二进制在同一个 EXE 中提供，归档不自动执行。完整 FFmpeg 原源码含原版权头及许可证；本次只检查补丁适用性，未改动封存原源码。

允许按 LGPL 条款修改相应库，并为调试这些修改进行所需的逆向工程；本扩展不增加禁止此类行为的许可条件。退出挂件进程后，兼容的重编译库应分别处理 runtime/ffmpeg.dll 和 runtime/electron/dist/ffmpeg.dll，两路径可能是硬链接或普通副本。运行代码未见对 ffmpeg.dll 的强制签名／哈希限制；安装时的哈希校验用于交付完整性。重跑安装脚本前应保证这两处一致；替换前备份，ABI 不兼容可能导致无法启动。本次未执行替换兼容性测试。

提供的材料不是完整离线 Electron 构建环境：还需固定 DEPS 声明的其余依赖、工具链和相应构建配置。未重现实际官方 Windows CI 的完整 GN/编译/链接参数，未验证重建 DLL 与官方二进制等价。因此不能把“有源码归档”写成“全部 LGPL／所有运行组件义务均已完成”。若调整编译选项、库或分发范围，必须重新核对相应源码和许可。

## 微软组件证据边界

d3dcompiler_47.dll 和 dxil.dll 与 Electron 官方 ZIP 同字节且 Microsoft 签名有效。Microsoft 文档允许 Windows SDK 的 D3DCompiler_47 作为应用旁加载 DLL 再分发，但本次没有逐条核验本批 SDK 的完整适用条款。当前 DXIL 1.8.2502.11 与 Microsoft NuGet 1.8.2502.8 的 x64 DLL 不同哈希；后者 LLVM 许可信息不能直接认证前者的具体授权。保留 Electron 运行通告及官方字节来源，具体二进制许可仍标为未独立完整确认。

## 公开来源

- 上游 MIT：[MeteorNOX For-Codex LICENSE](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/blob/For-Codex/LICENSE)
- TOML：[smol-toml v1.8.0 LICENSE](https://github.com/squirrelchat/smol-toml/blob/v1.8.0/LICENSE)
- 运行组件：[Electron v44.3.0](https://github.com/electron/electron/releases/tag/v44.3.0)，[官方 SHA-256](https://github.com/electron/electron/releases/download/v44.3.0/SHASUMS256.txt)
- 源码链：[Electron DEPS](https://github.com/electron/electron/blob/v44.3.0/DEPS)，[Chromium DEPS](https://chromium.googlesource.com/chromium/src/+/152.0.7977.78/DEPS)，[固定 FFmpeg](https://chromium.googlesource.com/chromium/third_party/ffmpeg/+/2b68d2babae73714846961fb0ee47e3b3d2e39a9/)
- 许可要求：[FFmpeg 官方许可说明](https://ffmpeg.org/legal.html)
- 微软：[D3DCompiler 分发说明](https://learn.microsoft.com/en-us/windows/win32/directx-sdk--august-2009-)，[DXC v1.8.2502](https://github.com/microsoft/DirectXShaderCompiler/releases/tag/v1.8.2502)，[DXC NuGet 1.8.2502.8](https://www.nuget.org/packages/Microsoft.Direct3D.DXC/1.8.2502.8)

来源核验、功能测试与授权判断是不同结论。本次没有把用户源码上传给外部查重服务，没有读取真实 Key 或聊天记录。核对范围及未确认事项见 docs/COPYRIGHT-SOURCE-AUDIT.md。

## .5 用户提供的默认角色

assets/default-character.png 是本次用户提供的图片，保留源文件像素与哈希，替换默认显示，不删除上游原素材。不将该图自动纳入代码 MIT，也不冒称上游或 OpenAI 创作。此图与原素材的授权范围分别判断，详见 docs/DEFAULT-CHARACTER.md。
