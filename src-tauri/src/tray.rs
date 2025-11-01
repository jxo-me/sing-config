use tauri::{Manager, Runtime};
use crate::menu_i18n::MenuI18n;

/// 构建系统托盘
/// 参考：Tauri 2 System Tray API
/// 文档：https://v2.tauri.app/
pub fn build_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<tauri::tray::TrayIcon<R>, Box<dyn std::error::Error>> {
    // 获取当前语言
    let locale = "zh"; // TODO: 从存储获取
    let i18n = MenuI18n::new(locale);
    
    // 创建托盘菜单
    let menu = build_tray_menu(app, &i18n)?;
    
    // 创建托盘图标
    // Tauri 2.0: TrayIconBuilder::new() 不需要参数
    // 使用应用的默认窗口图标作为托盘图标
    let tray = tauri::tray::TrayIconBuilder::new()
        .menu(&menu)
        // 设置左键点击不显示菜单，而是切换窗口显示/隐藏（通过菜单项实现）
        .show_menu_on_left_click(false)
        // 托盘图标点击事件处理
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    // 切换窗口显示/隐藏状态
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        // 菜单事件处理
        .on_menu_event(|app, event| {
            handle_tray_event(app, &event);
        })
        // 图标从应用默认图标加载，如果没有则使用系统默认
        .build(app)?;
    
    Ok(tray)
}

/// 构建托盘菜单
fn build_tray_menu<R: Runtime>(
    app: &tauri::AppHandle<R>,
    i18n: &MenuI18n,
) -> Result<tauri::menu::Menu<R>, Box<dyn std::error::Error>> {
    use tauri::menu::{MenuBuilder, MenuItem};
    
    let show = MenuItem::with_id(app, "tray_show", i18n.tray_show(), true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "tray_hide", i18n.tray_hide(), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray_quit", i18n.tray_quit(), true, None::<&str>)?;
    
    let menu = MenuBuilder::new(app)
        .item(&show)
        .item(&hide)
        .separator()
        .item(&quit)
        .build()?;
    
    Ok(menu)
}

/// 处理托盘菜单事件
pub fn handle_tray_event<R: Runtime>(app: &tauri::AppHandle<R>, event: &tauri::menu::MenuEvent) {
    let id = event.id();
    match id.as_ref() {
        "tray_show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "tray_hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        "tray_quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

/// 处理托盘图标点击事件（左键点击）
/// 注意：此功能需要在 TrayIconBuilder 中使用 on_tray_icon_event 回调
#[allow(dead_code)]
pub fn handle_tray_icon_click<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        // 切换窗口显示/隐藏状态
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// 处理窗口关闭事件（最小化到托盘而不是退出）
pub fn handle_window_close<R: Runtime>(window: &tauri::webview::WebviewWindow<R>) {
    // 阻止默认关闭行为，改为隐藏
    let _ = window.hide();
}

