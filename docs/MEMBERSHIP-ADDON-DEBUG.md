# 0.2.4 原包＋会员额度与自动插话修复 debug

核对日期：2026-10-06。合作扩展：spceyee；扩展包 0.2.4+membership.5，原应用版本字段仍为 0.2.4。

## 基底和改动范围

唯一基底是用户指定的 codex-小鲸鱼AI插话-0.2.4-spceyee.zip。原 ZIP SHA-256：522763fd4f4fac77eb12d02f74a072c55d102560ccf56cb81512e4ccaff9f494；内置原 EXE SHA-256：96e5bb25d8c6fc55bd57c2410e37a56b66e8e5c61fbbe3fcd38144edd8c37234。原包完整封存不改，本次在前次 membership.2 合作副本上做指定修改，没有用此前大改版替换原程序。原 100 个文件中 90 个逐字节一致，无删除。修改位置如下：

- assets/whale-widget.js
- desktop/chat-controller.cjs
- desktop/local-text.cjs
- desktop/local-text.ps1
- desktop/ui/chat.js
- desktop/ui/client.js
- desktop/ui/widget.html
- desktop/window-capture.cjs
- runtime/dispatcher.mjs
- runtime/vision-chat.mjs

本次在 membership.2 上仅移除会员对话里的重复“原版 API / 插话设置”按钮及其事件绑定；主菜单 API 设置入口保留。其余功能和安全处理沿用前版。

原角色、图片／动图／音效、点击气泡进入对话、气泡编辑、普通／工作模式、默认／自定义提示词、聊天入口、记账／汇率等保留。10 个原素材逐项同哈希；LICENSE、原 README、PROVENANCE、THIRD_PARTY_NOTICES 与署名不改。API 设置只撤掉开始／停止／聊天三个操作按钮，保留开机自动插嘴复选框和状态说明；主菜单和原聊天窗口仍有操作入口。每轮通知沿用原队列、开关、自动关闭时间、失败／取消分类，只改为会员和额度进度条，清除旧金额／token 悬停文字。即使主摘要选择原余额，每轮通知仍按此次要求显示会员额度。

## 自动插话诊断

修改前实际运行诊断显示：active=true、hasKey=true、mode=work，无凭据或请求错误；最近三次有效模型请求均 model_quiet，后续检查 settling。最近手动测试气泡显示回执为 shown。它证明当时工作模式模型选择沉默，不能据此宣称自动观察没运行，也不能把手动显示测试当成自动模型回复已成功。保留工作模式不闲聊、相同画面不重复回复的规则。

代码另外发现并修复可复现的恢复缺口：锁屏／休眠会暂停观察，旧版未监听解锁／恢复事件，后续自动启动一直被 paused 阻挡。现在区分系统、手动、凭据和请求错误暂停；系统恢复仅在自动启动开启、且没有手动或错误暂停时恢复。用户手动停止、错误暂停或关闭自动启动不会被系统事件绕过。启动及窗口出现仍按明确配置启用，不替用户擅自改变工作／陪聊模式。

运行日志 companion-debug.jsonl 只记录时间、固定事件／原因代码、布尔状态、计数与等待状态，限制 64 KiB／200 行；不记录窗口标题、Key、提示词、聊天、截图、OCR 原文或模型解释。不直接序列化完整 status。新诊断字段用来区分自动启动未开、系统暂停、手动停止、凭据失败、等待文字稳定、去重／冷却、模型选择沉默与实际显示失败。报告不包含用户的真实 Key 或聊天内容。

## 安全与隐私边界

存在密文但无法解密时阻断插话请求，不再偷偷回退环境变量 Key；成功重存或明确删除密文后重新评估。文件不存在与损坏状态分开，保留原环境变量正常用途。插件 Key 本机加密保存，无 30 分钟失效。

截图发送前先进行本地 OCR 凭据检查；无法完成检查或识别到敏感凭据时不外发该截图。识别结果只返回检查布尔与哈希，不落截图／原文。该检查覆盖已识别的凭据模式，不保证 OCR 永不漏检，也不等于对所有隐私逐像素脱敏；用户仍须确认所选窗口可发送；通过检查后发送的仍是完整选定窗口画面。手动带截图也接受同样检查，手动纯文本聊天保留原外发行为。

插话实际请求目的地固定为 https://api.deepseek.com/chat/completions；显式头为 Content-Type 和插件 Key 的 Authorization，不携带主聊天 Key 作为插件请求凭据。禁用重定向、使用正常证书验证，保留请求超时及响应大小上限。会员模块只调用验签的官方 Codex 程序，只读账户／额度／活动接口，白名单返回，不直接读取主聊天 Key。

原 0.2.4 余额模块仍按配置在本地 resolve 主聊天 API Key，并可能向其配置的余额接口发送该 Key；会话用量与 FX 功能保留。不能把上述插件请求隔离说成整个程序不读取主 Key、零落盘或零外发。此次检查及回归针对列出的边界，不能保证程序不存在其他漏洞或运行环境被攻破后 Key 仍绝对安全。

## 验证结果

前次 membership.3 离线回归 127/127 通过，名称逐项附后；本次未重新执行这 127 项，以功能实现逐字节一致复用其覆盖结论。前次隔离 Electron 实际渲染通过：Plus 每轮显示 5 小时和每周额度；Pro 每轮及详情不显示 5 小时；未知与 0 区分，不猜剩余 token 数。旧金额／token 值和悬停文字不出现在每轮通知；关闭主摘要会员显示也不改变每轮通知要求。原点击对话、菜单、角色／音效、API 表单保存及显示开关回归通过。API 设置缺失按钮不会触发空元素异常。外部真实网络请求 0，renderer 错误 0；自动恢复和安全请求路径另用隔离 fixture 验证。

完整 EXE 内置运行组件／素材／用户使用方式，无 GitHub 资源下载依赖。打包后逐文件哈希、凭据候选扫描、独立安装及当前机器启动核对的实际结果单独写入交付校验／安装验证文件；此段不预先宣称尚未执行的安装已通过。

## 来源与许可

感谢 MeteorNOX（https://github.com/MeteorNOX）及 For-Codex 上游分支（https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/tree/For-Codex）。原包封存、合作扩展另存；DSH 和用户原 ZIP 未修改，不能冒称上游或 OpenAI 官方更新。当前 Codex 的原包关系按封存 ZIP 与 EXE 核对；本次 smol-toml 官方 npm 19 个文件与 Electron 官方运行 ZIP 73 个文件均重新线上取证核验。不能把其他 DSH 交付的 Git/npm 文件计数套用到本版。

代码与素材许可分开判断：上游图片、动图和音效若不在仓库 MIT 范围内，同源、同哈希或测试通过只证明内容／来源／运行一致，不能推出素材再分发合法，也不是全部素材授权已经核验的证明。发布须按实际合作授权核实素材使用范围。

## 离线回归逐项

1. sensitive, missing, malformed and unavailable OCR checks block automatic screenshots before HTTP
2. manual screenshots also fail closed and recover after hiding sensitive content
3. transport receives only plugin Authorization; omits cookies and refuses redirects
4. OCR helper validates and projects only digest, length and sensitivity, never arbitrary stdout fields
5. manual capture runs the same local privacy check and retains no recognized text
6. production PowerShell credential matcher detects actual high-confidence formats and allows ordinary conversation
7. native Windows OCR returns only safe metadata and blocks a rendered synthetic credential
8. auto-start runs immediately without waiting for the 10-second retry
9. lock and suspend require both unlock and resume before automatic observation returns
10. a manual stop remains stopped after later system resume events
11. manual start while locked cannot bypass the capture suspension
12. auto-start disabled does not resume a previously manual observer after suspend
13. missing credentials stay paused without repeated external requests
14. a still-finishing request waits rather than poisoning the automatic start pause
15. unreadable ciphertext blocks fallback credentials until successful deletion
16. saving a replacement credential releases the unreadable-file block without restarting
17. failed ciphertext deletion keeps external requests blocked
18. deleting a missing local Key gives an explicit notice and keeps no-Key requests disabled
19. an unreadable-file block can be cleared even if the file was removed externally
20. closing during window selection cannot start capture after disposal
21. turning automatic startup off during source selection cancels the pending automatic start
22. closing a controller removes system listeners and leaves no retry timer
23. diagnostic projection discards all content and unknown enum strings
24. debug log remains bounded and deduplicates identical state
25. old debug entries are sanitized when retained across a restart
26. a non-file debug path is left alone and cannot become an arbitrary write target
27. companion may offer social acknowledgement while main model generates; work cannot
28. model diagnostics contain enums, not screenshot descriptions or reply text
29. ordinary prompt no longer imposes work-only usefulness or unconditional generation silence
30. quiet explanation is exposed and stale model decision cleared on a failed request
31. automatic observer remains active and speaks again on new content after cooldown
32. queued acknowledgement does not count as displayed; late queued cannot downgrade shown
33. renderer refusal rejects delivery instead of reporting success
34. empty descriptive fields and optional null quietReason do not reject otherwise valid output
35. quiet omissions remain silent; never construct a spoken reply
36. required display fields and contradictory silence are still rejected
37. field diagnostics name failed fields without retaining model content
38. automatic format error retries at normal interval and valid reply recovers
39. two consecutive invalid outputs stop instead of retrying indefinitely
40. stop cancels a scheduled format retry
41. old settings migrate and unknown modes reject
42. strict protocol rejects empty, legacy, truncated, conflicting quiet and malformed fields
43. companion greeting allowed; work greeting and unsupported claims blocked
44. duplicate, near duplicate, cooldown and repeated greeting blocked
45. accepted output reaches UI; work social output never reaches UI or history
46. explicit silence is success and retains request usage; identical frames skip network
47. empty and malformed output are errors, not silence; failed frame remains retryable
48. HTTP and connection failures remain distinct from quiet and count attempts
49. request timeout is reported as error, not silence
50. text gate waits for stability and does not consume failed requests
51. temporary generating context can be checked again on identical frame
52. mode switch reevaluates same frame and source change resets history
53. manual text reply bypasses automatic decision protocol
54. stop during request discards stale reply
55. diagnostic records are bounded metadata only
56. Membership endpoint is additive; legacy config GET/PUT remains functional and credential-free in renderer responses
57. Legacy balance and ledger retain monetary data and observed-debit accounting alongside membership quota
58. Public FX route remains available and does not carry balance or subscription credentials
59. Membership route is read-only and its lifecycle joins the existing dispatcher shutdown
60. Plus keeps official 300-minute and weekly windows; percentages do not imply token quotas
61. Pro families hide every 5-hour window, including incomplete metadata; retain the weekly window
62. Free is only displayed for real Free data; unknown and other real plans remain distinct
63. Main bubble displays remaining reset count; Pro avoids repeating weekly quota and preserves zero versus missing
64. API Key, signed-out, unsupported and unavailable status never imply a subscription quota
65. Missing, invalid and expired fields stay explicit; reset count zero is distinguishable from missing
66. Presentation ignores private account fields and redacts accidental email or Key text
67. Offline DOM renders Plus dates, count missing, reset grant details and token activity without fabricating quota
68. Offline DOM Pro drops 5-hour detail and bubble; switching account modes removes stale plan
69. Local subscription fetch coalesces, rate-limits refresh and polls without reset or credential requests
70. Failed request clears previous membership instead of reusing an unconfirmed account snapshot
71. Membership addition preserves the exact 0.2.4 API settings and currency helper files
72. Membership presentation can be disabled without erasing any original settings
73. presets work without input; custom text survives switching
74. Codex recognized and ambiguous windows never guessed
75. display failure does not consume observation frame
76. changing OCR fingerprints cannot starve observation indefinitely
77. only fixed hidden System32 PowerShell discovers public official installation metadata
78. official Appx resources are allowed while the graphical Codex executable is not
79. official standalone default Programs directory supports signed direct and versioned CLI files
80. unknown platform and invalid discovery limits fail closed without launching a command
81. unsigned, false publishers, PATH executables and traversal/device paths are refused
82. RAM cache avoids repeated signatures but a changed or missing file must be reverified
83. reparse paths and canonical substitutions cannot be returned or reused from cache
84. simultaneous discovery shares one bounded metadata process and expiration refreshes it
85. failed, noisy and malformed helpers return null without exposing raw diagnostics
86. a hanging helper is killed after its deadline and cannot publish a late trusted result
87. abort rejects before spawn or immediately kills only its own helper without caching a late result
88. a cancellable query cannot cancel or poison an independent ongoing discovery
89. successful signal-owned discovery caches only the authenticated unchanged file
90. an abort occurring inside spawn still kills the returned process once
91. RPC performs exact handshake and only allowed read methods/params; kills and removes isolated temp files
92. account-only probe does not read quota/usage or create a thread
93. signed out/API Key do not call unsupported subscription endpoints
94. account change during query rejects all account/usage output
95. account/updated notification while reading invalidates in-flight result
96. account update in the same JSONL chunk as account response is not lost before await resumes
97. server authentication-token refresh request is rejected without a response or secret handling
98. rate/usage RPC errors are fixed partial metadata and do not expose backend bodies
99. JSONL parser handles split multibyte UTF8 but malformed messages fail closed
100. stdout overflow is bounded and its raw contents never appear in error
101. stderr overflow is bounded and its raw contents never appear in error
102. global timeout and explicit close cancel every subprocess
103. CLI discovery never falls back to executing bare PATH commands
104. timeout covers stalled discovery and closed service never spawns a late executable
105. cleanup waits for child close before touching its owned temp directory
106. await RPC.close waits for child close and finally temp cleanup
107. identity hash is private to RAM and changes for account/plan/workspace changes
108. official window durations, percentages, nullable absolute quota and token summary are projected
109. pro canonical Pro excludes five-hour windows without claiming unlimited
110. prolite canonical Pro excludes five-hour windows without claiming unlimited
111. promax canonical Pro excludes five-hour windows without claiming unlimited
112. primary weekly and secondary five-hour are classified by duration
113. authoritative map preferred even when empty; legacy only when map is absent
114. Plus missing five-hour data is explicit and unknown plan never becomes Free
115. missing reset count stays null even if detail rows are present or expired
116. reset grant display allowlist preserves title/status/dates and excludes opaque IDs/description
117. unknown/null metrics are preserved as null; invalid dates and values are not invented
118. projection never returns account identifiers, raw unknown strings, credits/balance or token secrets
119. signed-out/API key modes explicitly exclude all supplied quota and usage data
120. concurrent get calls debounce and each receives an independent snapshot
121. cache is RAM-only, checks current account before use, expires within 30 seconds
122. account switch after cache hit discards old data and reads new account full response
123. account-read failure clears cached plan and quota without returning error details
124. public error codes remain an allowlist even for an injected RPC error
125. unidentifiable account is not cached across calls
126. timeout and close abort in-flight work and prevent late cache resurrection
127. await Service.close also waits for its native RPC subprocess and temporary directory cleanup

## 前次 .4 源码与许可审查补充

.4 仅补分发材料，所有 .3 功能实现与运行 DLL 保持原字节。未发现需要替换的未授权复制片段；没有重写合法 BSD/MIT 库或删除其署名。完整包许可见 app/COMPLETE-PACKAGE-NOTICES.md，源码审查见 app/docs/COPYRIGHT-SOURCE-AUDIT.md。安装目录 third-party-sources/ 包含固定 FFmpeg 源码、Electron 补丁和相关构建材料，归档不会自动运行。它们不是完整离线 Electron 构建环境，实际官方 CI 参数与重建 DLL 未核验。图片、音效及部分微软二进制的授权边界仍须分别确认。

## 本次 .5 默认角色替换

上一节 .4 的功能字节一致结论仅指该次许可材料补充。.5 只额外修改 dispatcher 的默认图片映射并添加用户 PNG，未更改原角色组件、CSS、透明命中或气泡逻辑。默认图片缺失仍返回原内置图片；自定义角色路由继续使用原处理器。检查与图像哈希详见 DEFAULT-CHARACTER.md，实际验证结果另附，前版 127 项测试仍为历史证据。

### 角色恢复测试的限度

手工构造不存在角色 ID 后重载的恢复测试，初次两次在 1.4 秒及 10 秒观察期限内未恢复；随后两次通过（最后一次允许最多 16 秒，覆盖原 alpha 缓存 12 秒等待上限）。这说明该恢复场景存在未解释的时序波动，本次没有把最后通过当成根因已经修好，也没有修改原恢复实现。正常默认图、透明命中、自定义角色和菜单缩略图在各次检查中均通过。
