## sing-config 客户端需求与设计（v0）

### 1. 项目目标
- **目的**: 基于 `schema.json` 的规则，提供高可用交互界面，生成完整且可校验的 `config.full.example.json` 风格 sing-box 配置。
- **定位**: 桌面应用（Tauri 2 + Vue 3 + Vite + TS），支持新手向导与专家模式（JSON）。

### 2. 技术栈
- 前端: Vue 3、TypeScript、Vite、Monaco Editor（或 CodeMirror）。
- 后端: Tauri 2（Rust），`tauri-plugin-opener`。
- 校验: AJV（JSON Schema v7）、ajv-formats。

### 3. 需求范围（首发与增量）
- M1（最小闭环）
  - JSON 编辑器 + Schema 校验（实时+提交校验，防抖 300ms）
  - 打开/保存/导入/导出（保存前强校验，失败阻断并摘要错误）
  - 配置预览/差异视图（仅显示变更）
- M2（表单层基础）
  - DNS（Servers: local/tls/https/quic、Rules、Global）
  - Inbounds/Outbounds（socks/http/shadowsocks/vmess/vless/trojan/tuic：先必填，高级项折叠）
  - Route：默认规则最小集（Logical 延后）
  - 表单/JSON 双向同步
- M3（规则与效率）
  - Route 逻辑规则（AND/OR）树编辑器
  - RuleSet（Inline/Local/Remote）管理
  - 模板库（协议片段、DNS 方案、路由方案）与首配向导
- M4（高级能力与检查）
  - TLS/Multiplex/Transport 可选块
  - Endpoints/Services/Experimental 视图
  - 运行前检查（error/warn/info 分级 + 快速修复建议）

### 4. 信息架构（IA）
- 顶层分区：Log｜DNS｜NTP｜Certificate｜Endpoints｜Inbounds｜Outbounds｜Route｜Services｜Experimental。
- 二级分区：
  - DNS：Servers（按 type oneOf 切换）、Rules、Global。
  - Inbounds/Outbounds：按协议分组，列表页支持新增/克隆/禁用/筛选。
  - Route：Rules（Default/Logical）、Rule Set（Inline/Local/Remote）、Global。

### 5. 交互模式
- 表单模式（主模式）: 基于 Schema 的类型/必填/枚举/oneOf 渲染控件与校验；高级折叠。
- JSON 模式（专家）: Monaco + Schema 绑定，错误下划线，右侧错误收纳器，差异预览。
- 双向同步：模式切换不丢失；oneOf 切换保留分支草稿值。

### 6. 布局草图方案
- 方案 A（推荐）：三栏工作台
```
[侧边导航] | [编辑区(表单/JSON切换)] | [预览/错误/变更]
```
- 方案 B：双栏编辑器（轻量）
```
[侧边导航] | [左：表单/JSON]  [右：预览/错误/帮助(可切)]
```
- 方案 C：顶部 Tab + 右检查器（表单优先）
```
[顶部Tab: DNS/Inbounds/Outbounds/Route/...]
[主表单]                                  [右：字段说明/错误]
```
- 方案 D：规则构建器（Route/DNS Rules 专用）
```
[左：条件库/模板] | [中：规则树(AND/OR)] | [右：JSON/校验]
```
- 方案 E：首配向导（模板→出站→入站→DNS→Route→保存）
- 方案 F：JSON 专家模式（Monaco + 错误收纳/差异）

落地建议：首发 B+E，迭代到 A，并为 Route/DNS 增配 D；全程保留 F 入口。

### 7. 配色方案（直观）
- 明亮主题
  - 背景: #F7F7F8 / #FFFFFF；文字: #1F2328/#57606A/#8B949E
  - 主色: #3B82F6（hover #2563EB）；边框: #E5E7EB
  - 语义: 成功 #16A34A / 警告 #D97706 / 错误 #DC2626 / 信息 #0EA5E9
- 暗色主题
  - 背景: #0F141A / #121821；文字: #E6EDF3/#C9D1D9/#9AA4AE
  - 主色: #60A5FA（hover #3B82F6）；边框: #2A3441
  - 语义: 成功 #22C55E / 警告 #F59E0B / 错误 #EF4444 / 信息 #38BDF8
- JSON 错误：错误色文本 + 下划线；侧栏以错误计数徽标提示。

### 8. 功能菜单 vs 系统菜单
- 功能菜单（编辑相关）
  - 文件：新建/模板、打开/最近、保存/另存、导入/导出片段
  - 编辑：格式化、查找/替换、撤销/重做
  - 校验与预览：运行校验、差异视图、运行前检查
  - 构建：入/出站管理、DNS 方案、路由/规则集、TLS/Multiplex/Transport 快捷块
  - 向导与模板：首配向导、常用协议与 DNS/路由模板
  - 工具：片段校验、引用检查、一键脱敏导出
- 系统菜单（应用与环境）
  - 视图与主题：明亮/暗色/跟随系统、字号、侧/右栏显示切换
  - 设置：校验防抖、保存前强校验、自动备份、编辑器偏好、语言
  - 更新：检查/自动更新
  - 日志与诊断：查看日志、导出诊断
  - 数据与备份：打开数据目录、导入/恢复
  - 帮助：快捷键、文档、关于

### 9. 后端（Tauri）API 清单（精炼）
- 文件与项目
  - read_file(path) → { content, encoding }
  - write_file(path, content, backup?) → { ok }
  - file_exists(path) → { exists }；read_dir(path)
  - recent_files(get/set/clear)
- Schema 与校验
  - get_schema()；validate_config(config) → { valid, errors }
  - normalize_config(config)（可选）；migrate_config(...)（可选）
- 片段与模板
  - generate_template(kind, options)；extract_section(config, path)；merge_section(...)
- 引用与一致性
  - list_tags(config)；check_references(config)；check_ports(config)
- 规则与路由辅助
  - test_rule_match(config, sample) → { matchedRule, action, outbound }
- JSON 与差异
  - format_json(text|config)；diff_configs(a,b) → diffs
- 证书与路径
  - check_paths_exist(paths)；verify_cert_bundle(certPath?, keyPath?)
- 系统集成
  - open_in_folder(path)；open_url(url)
- 运行联动（可选）
  - run_sing_box(configPath, args?) / reload / stop / status
- 规则集下载（可选）
  - download_ruleset(url, detour?)；cache_ruleset_list()
- 偏好设置
  - get_prefs()/set_prefs(partial)

错误约定：统一 { code, message, details? }，提供 hints（如端口冲突、缺失 tag、路径不存在）。

### 10. 校验与约束策略
- AJV 严格校验 + 自定义跨字段规则：
  - selector/urltest 引用的 outbound 必须存在
  - rule.outbound 必须指向有效 tag
  - 出站 `tls.enabled=true` 且 `server_port=80` 给出警告
  - 证书/密钥路径存在性检查（保存或“运行前检查”时）

### 11. 可用性与性能
- 大 JSON 分区校验、局部渲染、防抖 300ms。
- 错误就地标红 + 右上角“错误收纳器”，侧栏分区显示错误计数。
- 敏感字段（密码/私钥）掩码，支持从文件选择；失败阻断保存并可定位。

### 12. 模板与向导
- 模板库：
  - 协议片段（SS/VMess/VLESS/Trojan/TUIC/Hysteria…）
  - DNS 方案（DoH/DoQ/本地优先）
  - 路由方案（广告阻断/区域直连/默认出站）
- 向导 5 步：模板 → 出站 → 入站 → DNS → Route Final → 摘要与保存。

### 13. 里程碑与验收
- 验收准则：
  - 能加载/编辑/校验/保存 `config.full.example.json` 无误
  - 修改后预览即时显示差异；错误阻断保存并可一键定位
- 构建：`pnpm tauri build`；README 更新使用说明与已支持清单。

### 14. 下一步实施（执行清单）
- 安装依赖：`ajv`、`ajv-formats`、`monaco-editor`（UI 库可选：Naive UI/Element Plus）。
- 新建模块：`src/lib/schema.ts`（加载 schema）、`src/lib/validation.ts`（AJV）、`src/stores/config.ts`（状态）。
- 页面：`src/pages/Editor.vue`（左 JSON/表单，右 预览/错误/差异），`src/components/Topbar.vue`（打开/保存/导入/导出/格式化）。
- Tauri 命令：read_file、write_file、get_schema、validate_config、format_json、diff_configs、check_references（最小集）。
- 将首页路由到 Editor，完成 M1 闭环后推进 M2 表单层。
