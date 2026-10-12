# Codex 合作扩展源码与许可审查

核对日期：2026-10-06。对象：0.2.4+membership.3 的生产代码、安装脚本及完整 EXE；改进交付：0.2.4+membership.4。未检查 DSH 的所有代码，不将此前 DSH 的“25 个 Git 文件／20 个 npm 文件”结果套用到 Codex。

## 结论与处理

审阅新增 6 个实现文件、原基底的 10 个接入修改、安装包装脚本以及第三方目录，未发现可确认的未授权复制片段。没有为了“看起来原创”重写已获 BSD/MIT 许可的库；仅换词、翻译或让 AI 改写不能自动解除来源作品的权利限制，也不能证明新实现绝对原创。若后续收到具体疑似来源，应逐段比对并按功能规格独立实现，而非隐藏来源或删除署名。

发现的是分发材料缺口：完整 EXE 已含 Electron，但原分发说明仍称需单独下载；FFmpeg 已带 LGPL 全文，缺少固定版本源码和相关构建资料。本次新加完整包说明、固定源码归档、许可／来源摘要和打包检查，不修改上一版功能代码、原授权文件或任何运行 DLL。

## 查过哪些代码

用户指定原包含 100 个 app 文件；当前合作版与原包相比 90 个未变、10 个修改、无删除。membership.3 有 108 个生产文件及 14 个测试文件。当前 6 个新增实现为：desktop/companion-debug.cjs、desktop/ui/membership.css、desktop/ui/membership.js、runtime/subscription-executable.mjs、runtime/subscription-rpc.mjs、runtime/subscription.mjs。对 HTTP/RPC、进程签名检查、DOM、日志和原生脚本接入进行来源标记与导入检查；没有新增 npm 依赖。其余新增为使用说明、debug 和测试。

原 10 个修改位置：assets/whale-widget.js；desktop/chat-controller.cjs；desktop/local-text.cjs；desktop/local-text.ps1；desktop/window-capture.cjs；desktop/ui/chat.js；desktop/ui/client.js；desktop/ui/widget.html；runtime/dispatcher.mjs；runtime/vision-chat.mjs。本次 .4 对它们逐字节保留 .3；封存用户原 ZIP 与原应用文件不改，合作方署名不删。

标准库调用、API 字段名和公开协议名称不单独证明复制；未见来源标记也不能证明全部实现独立。本次属于源码／导入／许可与固定版本核验，没有进行全球代码库穷尽比对，不作法院意义的“无侵权”判定。

## 已核实来源

| 核对对象 | 实际结果 | 可支持的结论 |
| --- | --- | --- |
| 用户原 ZIP / EXE | 封存哈希保留；应用 100 文件可反查 | 与用户指定基底的关联，不是所有作者链认证 |
| smol-toml 1.8.0 | 官方 npm 19/19 个文件同哈希，无缺失／额外；registry SHA-1、SHA-512 integrity 符合 | 该 BSD-3-Clause 库来源与版权条件保留，不需要改写 |
| Electron 44.3.0 Windows x64 | 官方 ZIP SHA-256 与官方 SHASUMS256.txt 相符；73/73 个运行文件与原运行目录及 .3 内嵌 payload 相同 | 使用原样官方运行文件及完整许可通告，不推导全部依赖都 MIT |
| FFmpeg 固定源码 | 11,015 普通文件重建 Git tree c60e6b597c312801ce91d81110442d40fbf4d672 与固定提交一致 | 完整 FFmpeg 原始 tree 来源一致；未重建官方 DLL |
| Electron FFmpeg 补丁 | 清单仅 link_with_loader_path.patch，git apply --check 通过 | 补丁适用于固定源码；不是编译或二进制等价验证 |

固定 Electron tag commit 为 07e460719c75b2ec5ee4893f7d2192ef31c7b8c2；DEPS 指向 Chromium 152.0.7977.78，后者 pin FFmpeg 2b68d2babae73714846961fb0ee47e3b3d2e39a9。本次实际线上读取公开官方校验、npm、固定 tag/commit/pin 材料；不沿用“本次未查询线上”的旧描述。app/docs/SOURCE-PROVENANCE-SUMMARY.json 和 third-party-sources/source-materials.json 提供可公开复核的版本、URL 与哈希，无本机用户名绝对路径。

## 未确认事项

图片、动图和音效不包含在代码 MIT 中。合作关系、原样提供、相同哈希及 127 项回归通过不能替代素材作者的授权证明。本次保留 10 个原素材，并将素材再分发权限标为需依据实际授权确认，没有证据就不擅自认定侵权，也不将图片“转译”成新原创。

原 app/LICENSE 的 MIT 原文及 SquirrelChat BSD 条件、免责声明完整保留；Electron MIT 与 780 项 Chromium 通告保留。具体 Microsoft SDK 的全部适用条款、当前 DXIL 预编译版本的单独授权尚未完整核实。Electron 官方同字节和有效签名只能证明来源／完整性，不能代替这些条款。详见 COMPLETE-PACKAGE-NOTICES.md。

已提供 FFmpeg 固定源码、补丁、源码配置、相关构建子树及修改／替换说明；未重现官方 Windows CI 展开的全部 GN、编译／链接参数，未下载全部 Chromium DEPS 与工具链，未重编译或测试修改 DLL 替换。不能宣称仅补声明或源码档就证明整个运行包全部许可义务完成。

## 验证与隐私

.4 的所有既有实现文件和 73 个官方运行文件逐字节沿用 .3；文档、源码材料及包装检查是本次新增／更改范围。既有 127 项离线回归与 Electron 渲染验证属于 .3 的测试证据，不冒称本次重新执行全部功能测试。此次新 EXE 应另核对源码/材料哈希、完整许可、独立安装解压、ZIP 与内嵌说明一致性；实际结果写入安装启动验证.json 和交付校验.json。

本次不读取真实 API Key／聊天记录；测试使用新隔离目录，不读取用户数据目录。公开上游资料下载不向外发送用户源码。没有执行真实截图/API 测试，也没有变更当前挂件的设置或任务。

原 ZIP SHA-256：522763fd4f4fac77eb12d02f74a072c55d102560ccf56cb81512e4ccaff9f494。内置原 EXE SHA-256：96e5bb25d8c6fc55bd57c2410e37a56b66e8e5c61fbbe3fcd38144edd8c37234。

公开来源和详细许可位置见 COMPLETE-PACKAGE-NOTICES.md。感谢 [MeteorNOX](https://github.com/MeteorNOX)、SquirrelChat、Electron、Chromium、FFmpeg 及其他组件作者；第三方成果不改称 spceyee 或 OpenAI 原创。

## 后续 .5 变更登记

上文审查对象与字节不变结论记录 .4 的许可补充。.5 另新增用户提供的默认 PNG，仅在合作扩展 dispatcher 映射默认图片路径。第三方库、运行文件、原许可文件、上游素材与 fixed 源码材料保留不变；此后续变更不等于已补齐此前列出的所有授权边界。详见 DEFAULT-CHARACTER.md。
