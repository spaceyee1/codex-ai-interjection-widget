# Windows 安装器 v1.0.1

下载 Release 中的 `CodexWhale-v1.0.1-Setup-x64.exe`，运行后点击“安装并启用”。需要 Windows 10/11 x64 和已安装的 Codex 桌面应用；无需另外安装 Node.js、npm 或原版挂件。已有个人设置保存在原数据目录，安装器继续使用原目录。

本版安装器沿用本地 `0.2.4+membership.5` 完整包，内部安装目录版本提升为 `0.2.4+membership.6`。完整包 226 个文件中只替换 `app/desktop/main.cjs`，修复已销毁窗口上的迟到 IPC 消息；其余 225 个文件字节相同。安装器 `Installer.cs`、安装入口 `setup.ps1` 的实现保持原样，仅生成新的版本和载荷校验信息。

EXE 内含原完整包的程序源码、运行组件、媒体、许可和固定第三方源码材料；公开源码 ZIP 的素材排除范围继续见 `ASSETS.md`。两种包的历史图标映射各自保留，本次没有把公开源码版的图标适配合并到原本机安装包。完整 EXE 对应的应用源码可以直接解压查看。

## 解压与构建

在 PowerShell 中使用较短的空目录路径。原 .NET 安装器受 Windows 路径长度限制，解压路径过深会失败。

```powershell
& .\CodexWhale-v1.0.1-Setup-x64.exe --extract-only C:\Whale101
powershell.exe -NoProfile -File .\installer\build.ps1 -PackageRoot C:\Whale101 -OutputPath C:\CodexWhale-rebuild.exe
```

构建使用 Windows 自带的 .NET Framework x64 C# 编译器。`-PackageRoot` 必须是完整 EXE 解压后的目录，仓库源码 ZIP 没有 Electron 组件和第三方源码归档，不能单独作为完整包构建输入。安装器将载荷 SHA-256 嵌入 EXE，解压时校验载荷及每个输出文件。

自动化用例：在仓库根目录运行 `node --test tests/ipc-lifecycle.test.cjs`。Release 的 `CodexWhale-v1.0.1-validation.json` 记录实际 EXE 的隔离安装、计划任务和真实 Electron 销毁窗口测试结果。本次验证没有调用真实 API。
