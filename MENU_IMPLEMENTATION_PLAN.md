# Tauri 菜单实现方案 - 工作步骤与扩展需求

## 📋 目录
1. [当前状态分析](#当前状态分析)
2. [工作步骤](#工作步骤)
3. [详细实现方案](#详细实现方案)
4. [扩展需求列表](#扩展需求列表)
5. [跨平台注意事项](#跨平台注意事项)

---

## 🔍 当前状态分析

### 现有实现
- **顶部栏（Topbar.vue）**：使用 Vue 组件实现的自定义工具栏
  - 文件操作：打开、保存、另存为
  - 功能按钮：加载示例、向导、模板
  - 语言切换：中英文切换下拉框

### 目标改进
- 使用 Tauri 原生菜单系统（符合各平台原生体验）
- 支持系统托盘菜单（最小化到托盘）
- 支持键盘快捷键（跨平台标准）
- 支持多语言菜单项

---

## 🚀 工作步骤

### 阶段 1：准备工作和依赖配置（优先级：高）

#### 1.1 更新 Cargo.toml 依赖
**文件**：`src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = { version = "2.9", features = [
  "menu",           # 顶部菜单支持
  "tray-icon",      # 系统托盘支持
  "macos-private-api", # macOS 私有 API（如需要）
] }
tauri-plugin-store = "2.0" # 用于存储菜单偏好设置（可选）
```

#### 1.2 安装前端菜单监听器（可选）
如果需要在前端监听菜单事件：

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2.9.0"  // 已安装，用于前端监听事件
  }
}
```

**预估时间**：15 分钟

---

### 阶段 2：实现顶部菜单（优先级：高）

#### 2.1 创建菜单构建模块
**文件**：`src-tauri/src/menu.rs`（新建）

**功能**：
- 构建完整的应用菜单结构
- 支持多语言菜单文本
- 定义菜单项 ID 和快捷键

**菜单结构**：
```
应用 (App)
├── 关于 (About)
└── 退出 (Quit)

文件 (File)
├── 新建 (New) - Ctrl+N
├── 打开 (Open) - Ctrl+O
├── 打开最近 (Open Recent)
│   ├── [最近文件列表]
│   └── 清除列表 (Clear List)
├── ────────────
├── 保存 (Save) - Ctrl+S
├── 另存为 (Save As) - Ctrl+Shift+S
├── ────────────
└── 退出 (Quit) - Ctrl+Q (macOS: Cmd+Q)

编辑 (Edit)
├── 撤销 (Undo) - Ctrl+Z
├── 重做 (Redo) - Ctrl+Shift+Z / Ctrl+Y
├── ────────────
├── 剪切 (Cut) - Ctrl+X
├── 复制 (Copy) - Ctrl+C
├── 粘贴 (Paste) - Ctrl+V
├── ────────────
├── 查找 (Find) - Ctrl+F
├── 替换 (Replace) - Ctrl+H
├── ────────────
└── 格式化 (Format) - Ctrl+Shift+F

视图 (View)
├── 表单模式 (Form Mode) - Ctrl+1
├── JSON 模式 (JSON Mode) - Ctrl+2
├── ────────────
├── 显示/隐藏侧边栏 (Toggle Sidebar) - Ctrl+B
└── 语言 (Language)
    ├── 中文 (Chinese)
    └── English

工具 (Tools)
├── 运行检查 (Run Check) - Ctrl+R
├── 运行验证 (Run Validation) - Ctrl+Shift+V
├── ────────────
├── 向导 (Wizard)
└── 模板库 (Template Library)

设置 (Settings)
├── 编辑器设置 (Editor Settings)
├── 验证设置 (Validation Settings)
└── 偏好设置 (Preferences) - Ctrl+,

帮助 (Help)
├── 快捷键 (Keyboard Shortcuts) - Ctrl+Shift+?
├── 文档 (Documentation)
└── 关于 (About)
```

**预估时间**：2-3 小时

#### 2.2 在 main.rs 中集成菜单
**文件**：`src-tauri/src/main.rs`

**功能**：
- 初始化菜单
- 设置菜单事件处理器
- 处理菜单项点击事件
- 通过 Tauri 命令与前端通信

**预估时间**：1-2 小时

#### 2.3 前端菜单事件监听
**文件**：`src/lib/menu-handler.ts`（新建）

**功能**：
- 监听 Tauri 菜单事件
- 调用相应的前端函数
- 处理快捷键冲突

**预估时间**：1 小时

#### 2.4 更新 Topbar.vue
**文件**：`src/components/Topbar.vue`

**改动**：
- 保留必要的功能按钮（或全部迁移到菜单）
- 可选：隐藏 Topbar，完全依赖系统菜单
- 或者：Topbar 作为快捷工具栏，菜单提供完整功能

**预估时间**：30 分钟

---

### 阶段 3：实现系统托盘菜单（优先级：中）

#### 3.1 准备托盘图标资源
**目录**：`src-tauri/icons/`

**所需图标**：
- `icon.png`（基础图标，32x32, 64x64, 128x128 多种尺寸）
- `icon@2x.png`（高分辨率版本）
- `icon-template.png`（macOS 模板图标，支持深色模式）

**预估时间**：30 分钟（如果已有图标）

#### 3.2 配置 tauri.conf.json
**文件**：`src-tauri/tauri.conf.json`

```json
{
  "tauri": {
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true,  // macOS 模板图标
      "menuOnLeftClick": false  // 左键点击显示菜单（可选）
    }
  }
}
```

**预估时间**：15 分钟

#### 3.3 创建系统托盘菜单
**文件**：`src-tauri/src/tray.rs`（新建）

**功能**：
- 创建系统托盘菜单
- 处理托盘图标点击事件
- 处理托盘菜单项点击
- 支持托盘图标状态更新（如：有错误时显示警告图标）

**托盘菜单结构**：
```
显示主窗口 (Show)
隐藏窗口 (Hide)
────────────
运行检查 (Run Check)
────────────
关于 (About)
退出 (Quit)
```

**预估时间**：2 小时

#### 3.4 集成到 main.rs
**文件**：`src-tauri/src/main.rs`

**功能**：
- 初始化系统托盘
- 设置托盘事件处理器
- 处理窗口最小化到托盘

**预估时间**：1 小时

---

### 阶段 4：多语言菜单支持（优先级：中）

#### 4.1 创建菜单文本资源
**文件**：`src-tauri/src/menu_i18n.rs`（新建）

**功能**：
- 定义所有菜单项的多语言文本
- 支持动态切换菜单语言
- 与前端 i18n 系统同步

**预估时间**：1-2 小时

#### 4.2 实现菜单语言切换
**文件**：`src-tauri/src/main.rs`、`src/lib/menu-handler.ts`

**功能**：
- 监听前端语言切换事件
- 更新菜单文本
- 保存语言偏好

**预估时间**：1 小时

---

### 阶段 5：快捷键支持（优先级：高）

#### 5.1 定义快捷键映射
**文件**：`src-tauri/src/menu.rs`

**功能**：
- 使用 Tauri 的 `accelerator` API
- 定义跨平台快捷键（自动处理 Cmd vs Ctrl）
- 处理快捷键冲突检测

**预估时间**：1 小时

#### 5.2 处理编辑器快捷键冲突
**文件**：`src/components/JsonEditor.vue`

**功能**：
- 检测菜单快捷键与编辑器快捷键冲突
- 优先处理菜单快捷键（或提供选项让用户选择）

**预估时间**：1 小时

---

### 阶段 6：测试和优化（优先级：高）

#### 6.1 跨平台测试
- **macOS**：测试菜单栏、托盘图标、快捷键
- **Windows**：测试菜单栏（如有）、托盘、快捷键
- **Linux**：测试托盘图标（需要 `libayatana-appindicator` 或 `libappindicator3`）

**预估时间**：2-3 小时

#### 6.2 用户体验优化
- 菜单项启用/禁用状态管理
- 动态更新菜单项（如：最近文件列表）
- 托盘图标状态提示（如：验证错误、保存状态）

**预估时间**：2 小时

---

## 📝 详细实现方案

### 菜单构建示例代码

```rust
// src-tauri/src/menu.rs
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, MenuEntry};

pub fn build_menu(locale: &str) -> Menu {
    let is_zh = locale == "zh";
    
    // 应用菜单（macOS）或文件菜单（Windows/Linux）
    let app_menu = if cfg!(target_os = "macos") {
        build_app_menu(is_zh)
    } else {
        build_file_menu(is_zh)
    };
    
    // 编辑菜单
    let edit_menu = build_edit_menu(is_zh);
    
    // 视图菜单
    let view_menu = build_view_menu(is_zh);
    
    // 工具菜单
    let tools_menu = build_tools_menu(is_zh);
    
    // 设置菜单
    let settings_menu = build_settings_menu(is_zh);
    
    // 帮助菜单
    let help_menu = build_help_menu(is_zh);
    
    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(tools_menu)
        .add_submenu(settings_menu)
        .add_submenu(help_menu)
}

fn build_file_menu(is_zh: bool) -> Submenu {
    let new = CustomMenuItem::new("file_new", if is_zh { "新建" } else { "New" })
        .accelerator("CmdOrCtrl+N");
    let open = CustomMenuItem::new("file_open", if is_zh { "打开" } else { "Open" })
        .accelerator("CmdOrCtrl+O");
    let separator = MenuItem::Separator;
    let save = CustomMenuItem::new("file_save", if is_zh { "保存" } else { "Save" })
        .accelerator("CmdOrCtrl+S");
    let save_as = CustomMenuItem::new("file_save_as", if is_zh { "另存为" } else { "Save As" })
        .accelerator("CmdOrCtrl+Shift+S");
    
    Submenu::new(
        if is_zh { "文件" } else { "File" },
        Menu::new()
            .add_item(new)
            .add_item(open)
            .add_native_item(separator)
            .add_item(save)
            .add_item(save_as)
            .add_native_item(MenuItem::Quit)
    )
}

// ... 其他菜单构建函数
```

### 系统托盘示例代码

```rust
// src-tauri/src/tray.rs
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem};

pub fn build_tray_menu(locale: &str) -> SystemTrayMenu {
    let is_zh = locale == "zh";
    
    let show = CustomMenuItem::new("tray_show", if is_zh { "显示主窗口" } else { "Show" });
    let hide = CustomMenuItem::new("tray_hide", if is_zh { "隐藏窗口" } else { "Hide" });
    let separator = SystemTrayMenuItem::Separator;
    let check = CustomMenuItem::new("tray_check", if is_zh { "运行检查" } else { "Run Check" });
    let quit = CustomMenuItem::new("tray_quit", if is_zh { "退出" } else { "Quit" });
    
    SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(separator)
        .add_item(check)
        .add_native_item(separator)
        .add_item(quit)
}
```

### 主程序集成示例

```rust
// src-tauri/src/main.rs
use tauri::{Manager, SystemTray, SystemTrayEvent};

mod menu;
mod tray;

#[tauri::command]
fn get_current_locale() -> String {
    // 从存储或前端获取当前语言
    "zh".to_string() // 示例
}

fn main() {
    let locale = get_current_locale();
    let app_menu = menu::build_menu(&locale);
    let tray_menu = tray::build_tray_menu(&locale);
    
    tauri::Builder::default()
        .menu(app_menu)
        .on_menu_event(|app, event| {
            // 处理菜单事件
            match event.menu_item_id() {
                "file_new" => {
                    // 发送事件到前端
                    app.emit_all("menu-new", ()).unwrap();
                }
                "file_open" => {
                    app.emit_all("menu-open", ()).unwrap();
                }
                // ... 其他菜单项
                _ => {}
            }
        })
        .system_tray(SystemTray::new().with_menu(tray_menu))
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "tray_show" => {
                            let window = app.get_window("main").unwrap();
                            window.show().unwrap();
                        }
                        "tray_hide" => {
                            let window = app.get_window("main").unwrap();
                            window.hide().unwrap();
                        }
                        "tray_quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                }
                SystemTrayEvent::LeftClick { .. } => {
                    // 左键点击托盘图标：显示/隐藏窗口
                    let window = app.get_window("main").unwrap();
                    if window.is_visible().unwrap() {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Tauri 命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 前端事件监听示例

```typescript
// src/lib/menu-handler.ts
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';

export function setupMenuHandlers() {
  // 监听菜单事件
  listen('menu-new', () => {
    // 处理新建操作
    console.log('New file from menu');
  });
  
  listen('menu-open', () => {
    // 调用 Topbar 的 onOpen 方法
    const topbar = getTopbarRef();
    topbar?.onOpen();
  });
  
  // ... 其他菜单事件
}

// 监听语言切换，更新菜单
import { currentLocale } from '../stores/locale';

watch(currentLocale, async (locale) => {
  // 通知后端更新菜单语言
  await invoke('update_menu_locale', { locale });
});
```

---

## 🎯 扩展需求列表

### 优先级 1：核心功能（必须实现）

#### 1.1 基础菜单功能
- [x] ✅ 文件菜单（新建、打开、保存、另存为、退出）
- [x] ✅ 编辑菜单（撤销、重做、剪切、复制、粘贴、查找、替换、格式化）
- [x] ✅ 视图菜单（模式切换、侧边栏切换、语言切换）
- [x] ✅ 工具菜单（运行检查、运行验证、向导、模板库）
- [x] ✅ 设置菜单（编辑器设置、验证设置、偏好设置）
- [x] ✅ 帮助菜单（快捷键、文档、关于）

#### 1.2 系统托盘基础功能
- [x] ✅ 托盘图标显示
- [x] ✅ 托盘菜单（显示、隐藏、退出）
- [x] ✅ 左键点击切换窗口显示/隐藏
- [x] ✅ 右键点击显示菜单

#### 1.3 快捷键支持
- [x] ✅ 标准快捷键（Ctrl+N/O/S 等）
- [x] ✅ 跨平台快捷键（自动处理 Cmd vs Ctrl）
- [x] ✅ 快捷键冲突检测和处理

---

### 优先级 2：增强功能（建议实现）

#### 2.1 最近文件功能
- [ ] 最近打开的文件列表（菜单中显示）
- [ ] 文件路径显示（截断长路径）
- [ ] 清除最近文件列表
- [ ] 持久化存储（使用 `tauri-plugin-store`）

**实现要点**：
```rust
// 存储最近文件
use tauri_plugin_store::StoreBuilder;

let mut store = StoreBuilder::new("settings.json").build();
store.insert("recent_files".to_string(), json!([...]));
```

#### 2.2 动态菜单项状态
- [ ] 根据应用状态启用/禁用菜单项
  - 未保存时禁用"关闭"菜单项（或显示警告）
  - 无选中文本时禁用"复制/剪切"
  - 剪贴板为空时禁用"粘贴"
- [ ] 实时更新菜单项文本（如：当前语言高亮显示）

**实现要点**：
```rust
// 更新菜单项状态
app.get_window("main")
    .unwrap()
    .menu_handle()
    .get_item("edit_paste")
    .set_enabled(false)
    .unwrap();
```

#### 2.3 托盘图标状态指示
- [ ] 正常状态图标（默认）
- [ ] 警告状态图标（有验证错误）
- [ ] 保存中状态图标（保存操作进行中）
- [ ] 通知图标（可选：显示未读消息数）

**实现要点**：
```rust
// 更新托盘图标
tray_handle.set_icon(tauri::Icon::Raw(include_bytes!("../icons/warning.png"))).unwrap();
```

#### 2.4 托盘气泡通知
- [ ] 保存成功提示
- [ ] 验证错误提示
- [ ] 系统消息通知

**实现要点**：
- Windows: 使用 `tauri-plugin-notification`
- macOS: 使用原生通知 API
- Linux: 使用桌面通知

---

### 优先级 3：高级功能（可选实现）

#### 3.1 上下文菜单增强
- [ ] 根据编辑器位置显示不同的右键菜单
- [ ] 表单模式下的上下文菜单
- [ ] JSON 模式下的上下文菜单（已实现，需整合）

#### 3.2 全局快捷键（应用不在前台时）
- [ ] 全局快捷键打开主窗口
- [ ] 全局快捷键触发特定操作（需平台支持）

**实现要点**：
- Windows: 使用 `global-shortcut` 插件
- macOS: 需要特殊权限
- Linux: 依赖 X11/Wayland

#### 3.3 菜单自定义
- [ ] 用户自定义菜单项
- [ ] 用户自定义快捷键
- [ ] 菜单布局保存和恢复

#### 3.4 多窗口菜单管理
- [ ] 不同窗口显示不同菜单（如果支持多窗口）
- [ ] 窗口特定的快捷键绑定

---

### 优先级 4：平台特定优化（可选）

#### 4.1 macOS 特定功能
- [ ] 应用菜单（符合 macOS 规范）
- [ ] 服务菜单（Services）
- [ ] 窗口菜单（Window）
- [ ] Dock 菜单（可选）

#### 4.2 Windows 特定功能
- [ ] 任务栏跳转列表（Jump Lists）
- [ ] 任务栏进度指示
- [ ] 系统通知集成

#### 4.3 Linux 特定功能
- [ ] 应用指示器（AppIndicator）支持
- [ ] 桌面文件集成（.desktop）
- [ ] 系统托盘兼容性（检测可用实现）

---

### 优先级 5：用户体验优化

#### 5.1 菜单交互优化
- [ ] 菜单项图标支持（可选）
- [ ] 菜单项分隔符优化
- [ ] 子菜单动画效果（平台原生）

#### 5.2 快捷键提示显示
- [ ] 在 Topbar 按钮上显示快捷键提示
- [ ] 快捷键帮助对话框
- [ ] 快捷键冲突提示

#### 5.3 菜单搜索（高级功能）
- [ ] 菜单项搜索功能（macOS Big Sur+）
- [ ] 命令面板（类似 VS Code）

---

## 🌍 跨平台注意事项

### macOS
- **菜单栏位置**：菜单自动显示在系统顶部菜单栏
- **应用菜单**：第一个菜单必须是应用菜单（显示应用名称）
- **快捷键**：使用 `Cmd` 而不是 `Ctrl`
- **图标模板**：托盘图标需要使用模板图标（透明背景）
- **权限**：全局快捷键需要辅助功能权限

### Windows
- **菜单栏位置**：菜单显示在窗口顶部（如果启用）
- **快捷键**：使用 `Ctrl` 而不是 `Cmd`
- **托盘图标**：需要提供 `.ico` 格式图标
- **任务栏**：支持跳转列表和进度指示

### Linux
- **系统托盘**：需要安装 `libayatana-appindicator3` 或 `libappindicator3`
- **桌面环境兼容性**：
  - GNOME: 需要扩展支持
  - KDE: 原生支持
  - XFCE: 原生支持
- **菜单栏**：可集成到窗口标题栏或独立显示

### 依赖安装（Linux）

```bash
# Ubuntu/Debian
sudo apt-get install libayatana-appindicator3-dev

# 或
sudo apt-get install libappindicator3-dev

# Fedora
sudo dnf install libappindicator-gtk3-devel
```

---

## 📊 实施时间估算

| 阶段 | 任务 | 预估时间 |
|------|------|---------|
| 阶段 1 | 准备工作和依赖配置 | 0.5 小时 |
| 阶段 2 | 实现顶部菜单 | 4-6 小时 |
| 阶段 3 | 实现系统托盘菜单 | 3-4 小时 |
| 阶段 4 | 多语言菜单支持 | 2-3 小时 |
| 阶段 5 | 快捷键支持 | 2 小时 |
| 阶段 6 | 测试和优化 | 4-5 小时 |
| **总计** | | **15.5-21.5 小时** |

---

## 🔗 相关资源

- [Tauri Menu API 文档](https://tauri.app/v1/api/js/menu/)
- [Tauri SystemTray API 文档](https://tauri.app/v1/api/js/tray/)
- [Tauri Menu Rust API](https://docs.rs/tauri/latest/tauri/menu/index.html)
- [Tauri SystemTray Rust API](https://docs.rs/tauri/latest/tauri/struct.SystemTray.html)

---

## 📋 工作步骤总结

### 快速概览

实施 Tauri 菜单系统需要完成 **6 个主要阶段**，总预估时间为 **15.5-21.5 小时**。

### 详细步骤

#### 🚀 阶段 1：准备工作和依赖配置（优先级：高，15 分钟）

**目标**：配置项目依赖，为菜单功能做准备

**任务清单**：
- [ ] 更新 `src-tauri/Cargo.toml`，添加 `menu` 和 `tray-icon` 特性
- [ ] 确认 `@tauri-apps/api` 版本兼容性（前端已安装）
- [ ] 检查现有图标资源，准备托盘图标

**关键代码**：
```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = ["menu", "tray-icon"] }
```

**验收标准**：
- ✅ 项目可以正常编译
- ✅ Tauri 特性已正确启用

---

#### 📋 阶段 2：实现顶部菜单（优先级：高，4-6 小时）

**目标**：创建完整的应用菜单系统

**任务清单**：
- [ ] 创建 `src-tauri/src/menu.rs` 模块
  - 实现菜单构建函数
  - 定义菜单项 ID 和结构
  - 支持多语言菜单文本
- [ ] 在 `src-tauri/src/main.rs` 中集成菜单
  - 初始化菜单系统
  - 设置菜单事件处理器
  - 通过事件与前端通信
- [ ] 创建前端菜单事件监听器 `src/lib/menu-handler.ts`
  - 监听 Tauri 菜单事件
  - 调用相应的前端功能
- [ ] 更新 `src/components/Topbar.vue`
  - 决定保留或移除 Topbar（建议保留作为快捷工具栏）
  - 整合菜单功能

**关键功能**：
- 文件菜单（新建、打开、保存、另存为、退出）
- 编辑菜单（撤销、重做、剪切、复制、粘贴、查找、替换、格式化）
- 视图菜单（模式切换、侧边栏、语言）
- 工具菜单（运行检查、验证、向导、模板）
- 设置菜单
- 帮助菜单

**验收标准**：
- ✅ 所有菜单项都能正常显示
- ✅ 菜单点击能触发对应功能
- ✅ 快捷键正常工作
- ✅ 多语言菜单文本正确显示

---

#### 🔔 阶段 3：实现系统托盘菜单（优先级：中，3-4 小时）

**目标**：添加系统托盘功能，支持最小化到托盘

**任务清单**：
- [ ] 准备托盘图标资源
  - 检查 `src-tauri/icons/` 目录
  - 准备多种尺寸的图标（32x32, 64x64, 128x128）
  - 准备 macOS 模板图标（支持深色模式）
- [ ] 配置 `src-tauri/tauri.conf.json`
  - 添加 `systemTray` 配置
  - 设置图标路径和属性
- [ ] 创建 `src-tauri/src/tray.rs` 模块
  - 实现托盘菜单构建函数
  - 处理托盘图标点击事件
  - 支持托盘菜单项点击
- [ ] 在 `src-tauri/src/main.rs` 中集成托盘
  - 初始化系统托盘
  - 设置托盘事件处理器
  - 处理窗口最小化到托盘

**关键功能**：
- 显示主窗口
- 隐藏窗口
- 运行检查
- 退出应用
- 左键点击切换窗口显示/隐藏

**验收标准**：
- ✅ 托盘图标正常显示
- ✅ 托盘菜单可以打开
- ✅ 托盘菜单项功能正常
- ✅ 左键点击能切换窗口显示/隐藏
- ✅ 窗口最小化后显示在托盘

---

#### 🌍 阶段 4：多语言菜单支持（优先级：中，2-3 小时）

**目标**：实现菜单的多语言动态切换

**任务清单**：
- [ ] 创建 `src-tauri/src/menu_i18n.rs` 模块
  - 定义所有菜单项的多语言文本
  - 实现文本获取函数
- [ ] 实现菜单语言切换功能
  - 在 `main.rs` 中添加语言切换命令
  - 实现菜单文本动态更新
- [ ] 前端集成语言切换
  - 在 `src/lib/menu-handler.ts` 中监听语言切换事件
  - 通知后端更新菜单语言
- [ ] 持久化语言偏好
  - 保存用户选择的语言
  - 应用启动时恢复语言设置

**验收标准**：
- ✅ 切换语言后菜单文本立即更新
- ✅ 语言偏好能持久化保存
- ✅ 应用重启后恢复正确的语言

---

#### ⌨️ 阶段 5：快捷键支持（优先级：高，2 小时）

**目标**：实现跨平台快捷键支持

**任务清单**：
- [ ] 在 `src-tauri/src/menu.rs` 中定义快捷键
  - 使用 Tauri 的 `accelerator` API
  - 定义标准快捷键映射
  - 处理跨平台差异（Cmd vs Ctrl）
- [ ] 处理编辑器快捷键冲突
  - 检测菜单快捷键与 CodeMirror 快捷键冲突
  - 实现快捷键优先级处理
  - 提供用户配置选项（可选）
- [ ] 测试快捷键功能
  - 验证所有快捷键正常工作
  - 测试跨平台快捷键行为

**标准快捷键**：
- `Ctrl/Cmd+N` - 新建
- `Ctrl/Cmd+O` - 打开
- `Ctrl/Cmd+S` - 保存
- `Ctrl/Cmd+Shift+S` - 另存为
- `Ctrl/Cmd+Z` - 撤销
- `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` - 重做
- `Ctrl/Cmd+F` - 查找
- `Ctrl/Cmd+H` - 替换
- `Ctrl/Cmd+Shift+F` - 格式化

**验收标准**：
- ✅ 所有快捷键正常工作
- ✅ macOS 使用 `Cmd`，Windows/Linux 使用 `Ctrl`
- ✅ 快捷键冲突已妥善处理

---

#### 🧪 阶段 6：测试和优化（优先级：高，4-5 小时）

**目标**：确保菜单系统在所有平台上正常工作

**任务清单**：
- [ ] 跨平台功能测试
  - **macOS**：测试菜单栏、托盘图标、快捷键
  - **Windows**：测试菜单栏、托盘、快捷键
  - **Linux**：测试托盘图标（需安装依赖）、快捷键
- [ ] 用户体验测试
  - 菜单项启用/禁用状态管理
  - 动态更新菜单项（如：最近文件列表）
  - 托盘图标状态指示（验证错误、保存状态）
- [ ] 性能测试
  - 菜单初始化性能
  - 菜单事件响应速度
  - 托盘图标更新性能
- [ ] 文档更新
  - 更新 README.md
  - 更新 PROJECT_STATUS.md
  - 添加快捷键说明文档

**测试检查清单**：
- [ ] macOS 菜单栏显示正常
- [ ] macOS 托盘图标和菜单正常
- [ ] Windows 菜单显示正常
- [ ] Windows 托盘图标和菜单正常
- [ ] Linux 托盘图标显示正常（需安装 `libayatana-appindicator3`）
- [ ] 所有快捷键在所有平台正常工作
- [ ] 多语言切换在所有平台正常工作
- [ ] 菜单项状态更新正常
- [ ] 托盘图标状态更新正常

**验收标准**：
- ✅ 所有功能在所有目标平台上正常工作
- ✅ 用户体验流畅，无卡顿
- ✅ 文档已更新
- ✅ 无已知严重 bug

---

### 时间估算汇总

| 阶段 | 任务 | 预估时间 | 优先级 |
|------|------|---------|--------|
| 阶段 1 | 准备工作和依赖配置 | 15 分钟 | 高 |
| 阶段 2 | 实现顶部菜单 | 4-6 小时 | 高 |
| 阶段 3 | 实现系统托盘菜单 | 3-4 小时 | 中 |
| 阶段 4 | 多语言菜单支持 | 2-3 小时 | 中 |
| 阶段 5 | 快捷键支持 | 2 小时 | 高 |
| 阶段 6 | 测试和优化 | 4-5 小时 | 高 |
| **总计** | | **15.5-21.5 小时** | |

### 实施建议

#### 推荐实施顺序

1. **第一阶段**：完成阶段 1 和阶段 2
   - 先实现顶部菜单基础功能
   - 确保菜单系统基本可用
   - **预估时间**：4.5-6.5 小时

2. **第二阶段**：完成阶段 5
   - 添加快捷键支持
   - 提升用户体验
   - **预估时间**：2 小时

3. **第三阶段**：完成阶段 3 和阶段 4
   - 添加系统托盘功能
   - 完善多语言支持
   - **预估时间**：5-7 小时

4. **第四阶段**：完成阶段 6
   - 全面测试和优化
   - **预估时间**：4-5 小时

#### 分阶段里程碑

- **里程碑 1**（完成阶段 1-2）：✅ 顶部菜单功能完整
- **里程碑 2**（完成阶段 5）：✅ 快捷键支持完整
- **里程碑 3**（完成阶段 3-4）：✅ 托盘和多语言支持完整
- **里程碑 4**（完成阶段 6）：✅ 所有功能测试通过，准备发布

---

## 📝 实施检查清单

### 开发前准备
- [ ] 阅读 Tauri 2 菜单 API 文档
- [ ] 确认所有依赖版本兼容性
- [ ] 准备托盘图标资源
- [ ] 规划菜单结构

### 开发中
- [ ] 实现菜单构建函数
- [ ] 实现菜单事件处理
- [ ] 实现系统托盘
- [ ] 实现多语言支持
- [ ] 测试快捷键功能

### 开发后
- [ ] 跨平台测试（macOS/Windows/Linux）
- [ ] 用户体验测试
- [ ] 性能测试
- [ ] 文档更新

---

*最后更新：2025年*

