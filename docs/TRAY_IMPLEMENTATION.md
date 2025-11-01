# 系统托盘与菜单功能实现文档

## 概述

基于 [Tauri 2.0](https://v2.tauri.app/) 实现了跨平台的系统托盘功能，支持：
- 系统托盘图标显示
- 托盘菜单（显示/隐藏窗口、退出应用）
- 托盘图标点击切换窗口显示/隐藏
- 窗口关闭时最小化到托盘（不退出应用）

## 实现文件

### 1. 核心实现文件

- **`src-tauri/src/tray.rs`**：系统托盘模块
  - `build_tray()`：构建并初始化系统托盘
  - `build_tray_menu()`：构建托盘菜单
  - `handle_tray_event()`：处理托盘菜单事件
  - `handle_window_close()`：处理窗口关闭事件（最小化到托盘）

- **`src-tauri/src/menu_i18n.rs`**：多语言支持
  - 添加了托盘菜单的多语言文本（中文/英文）

- **`src-tauri/src/lib.rs`**：主程序集成
  - 在 `setup()` 中初始化系统托盘
  - 设置窗口关闭事件监听

### 2. 配置文件

- **`src-tauri/Cargo.toml`**：依赖配置
  ```toml
  tauri = { version = "2", features = ["tray-icon"] }
  ```

- **`src-tauri/tauri.conf.json`**：应用配置
  - 图标配置在 `bundle.icon` 中定义

## 功能特性

### 1. 系统托盘菜单

托盘菜单包含以下选项：
- **显示主窗口** (`tray_show`)：显示并聚焦主窗口
- **隐藏窗口** (`tray_hide`)：隐藏主窗口到系统托盘
- **退出** (`tray_quit`)：退出应用

### 2. 托盘图标交互

- **左键点击托盘图标**：切换主窗口显示/隐藏状态
- **右键点击托盘图标**：显示托盘菜单

### 3. 窗口关闭行为

当用户点击窗口关闭按钮（×）时：
- 阻止默认关闭行为
- 隐藏窗口到系统托盘
- 应用继续在后台运行
- 可通过托盘菜单或点击托盘图标重新显示

## Tauri 2.0 API 使用

### TrayIconBuilder API

```rust
tauri::tray::TrayIconBuilder::new()
    .menu(&menu)                                    // 设置托盘菜单
    .show_menu_on_left_click(false)                 // 左键点击不显示菜单
    .on_tray_icon_event(|tray, event| { ... })      // 托盘图标点击事件
    .on_menu_event(|app, event| { ... })           // 托盘菜单事件
    .build(app)?                                    // 构建并注册托盘
```

### 关键 API 说明

1. **`TrayIconBuilder::new()`**：创建托盘构建器（不需要参数）
2. **`menu()`**：设置托盘菜单（使用 `MenuBuilder` 构建）
3. **`show_menu_on_left_click(false)`**：左键点击不显示菜单，改为切换窗口
4. **`on_tray_icon_event()`**：处理托盘图标点击事件
5. **`on_menu_event()`**：处理托盘菜单项点击事件
6. **`build(app)`**：构建并注册托盘图标到系统

## 多语言支持

托盘菜单文本支持中文和英文：

```rust
// 中文
tray_show()   -> "显示主窗口"
tray_hide()   -> "隐藏窗口"
tray_quit()   -> "退出"

// English
tray_show()   -> "Show Main Window"
tray_hide()   -> "Hide Window"
tray_quit()   -> "Quit"
```

## 跨平台兼容性

- **Windows**：系统托盘图标显示在任务栏系统托盘区域
- **macOS**：系统托盘图标显示在菜单栏
- **Linux**：系统托盘图标显示在系统托盘区域（取决于桌面环境）

## 使用示例

### 在应用启动时初始化

```rust
use tray::build_tray;

tauri::Builder::default()
    .setup(|app| {
        // 构建并设置系统托盘
        let _tray = build_tray(app.handle())?;
        
        // 设置窗口关闭事件（最小化到托盘）
        if let Some(window) = app.get_webview_window("main") {
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    handle_window_close(&window_clone);
                }
            });
        }
        
        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

## 注意事项

1. **图标资源**：托盘图标会自动使用应用在 `tauri.conf.json` 中配置的图标
2. **事件处理**：托盘菜单事件在 `TrayIconBuilder::on_menu_event()` 回调中处理，不需要在全局 `on_menu_event()` 中重复处理
3. **窗口关闭**：需要调用 `api.prevent_close()` 来阻止默认关闭行为

## 参考资料

- [Tauri 2.0 官方文档](https://v2.tauri.app/)
- [Tauri System Tray 文档](https://v2.tauri.app/learn/system-tray)
- [Tauri Menu API](https://docs.rs/tauri/2.9.2/tauri/menu/index.html)
- [Tauri Tray API](https://docs.rs/tauri/2.9.2/tauri/tray/index.html)

