# 默认角色图片替换

版本：0.2.4+membership.5。仅 Codex 合作扩展，制作者 spceyee。

按用户要求，将默认角色显示为用户提供的透明 PNG；原文件直接复制，未重绘或改动像素。尺寸 1254×1254，RGBA PNG，1,387,209 字节；SHA-256：d2ce48591f195d27f1473b4695b0ad8bcc288ce055b141f2e827fedca456133e。

唯一实现改动为 runtime/dispatcher.mjs 中默认资源路径 /dsh-whale/image.png 的映射，新增 assets/default-character.png。保留 default 角色 ID 与“小鲸鱼”菜单名称，兼容 ?v=2；GET/HEAD 提供图片，其他方法拒绝。此资源路径用于初始图片、默认缩略图和失效自定义角色回退。图片缺失时使用原资源处理器。既有自定义角色选择、尺寸、镜像、透明命中、拖动、菜单、气泡、会员额度、API 与插话功能保留。

原 lib/widget-host.mjs、assets/whale-widget.js、10 份上游图片/音效、上游署名及原 LICENSE/PROVENANCE/THIRD_PARTY_NOTICES/README 均与 .4 同哈希。封存原版不改。新图按用户提供材料登记，不把它冒称上游或 OpenAI 创作，也不自动并入代码 MIT。前次版权审查是 .4 的历史记录，许可文件和固定源码材料继续随包附上。

本次检查默认图解码与透明命中、菜单缩略图、自定义角色切换和重启、坏角色回退、默认图片缺失回退及完整安装包校验。实际结果随包“默认角色验证.json”“安装启动验证.json”；未进行真实截图/API 请求。原 127 项功能测试属于之前版本，本次不冒称重新执行。
