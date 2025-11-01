// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg(desktop)]
mod menu;
#[cfg(desktop)]
mod menu_i18n;
#[cfg(desktop)]
mod tray;

#[cfg(desktop)]
use menu::build_menu;
#[cfg(desktop)]
use tray::{build_tray, handle_window_close};
use tauri::{AppHandle, Manager, Emitter};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 获取当前语言（默认中文，后续可从存储中读取）
#[tauri::command]
fn get_current_locale() -> String {
    "zh".to_string() // TODO: 从存储或前端获取
}

/// 更新菜单语言（仅桌面平台）
#[tauri::command]
#[cfg(desktop)]
async fn update_menu_locale(app: AppHandle, locale: String) -> Result<(), String> {
    let menu = build_menu(&app, &locale).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

/// 更新菜单语言（移动平台占位）
#[tauri::command]
#[cfg(not(desktop))]
async fn update_menu_locale(_app: AppHandle, _locale: String) -> Result<(), String> {
    Ok(())
}

/// 退出应用（供前端快捷键调用）
#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

/// 更新窗口标题（仅桌面平台）
#[tauri::command]
#[cfg(desktop)]
fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_title(&title).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 更新窗口标题（移动平台占位）
#[tauri::command]
#[cfg(not(desktop))]
fn set_window_title(_app: AppHandle, _title: String) -> Result<(), String> {
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());
    
    // 桌面平台特定功能
    #[cfg(desktop)]
    {
        builder = builder
            .setup(|app| {
                // 获取初始语言（默认中文）
                let locale = "zh";
                
                // 构建并设置应用菜单
                let menu = build_menu(app.handle(), locale).map_err(|e| {
                    eprintln!("Failed to build menu: {}", e);
                    e
                })?;
                app.set_menu(menu)?;
                
                // 构建并设置系统托盘
                let _tray = build_tray(app.handle()).map_err(|e| {
                    eprintln!("Failed to build system tray: {}", e);
                    e
                })?;
                // 托盘会通过事件处理
                
                // 设置窗口关闭事件（最小化到托盘而不是退出）
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
            .on_menu_event(|app, event| {
                let menu_id = event.id().0.clone();
                
                // 处理退出应用（不发送到前端，直接退出）
                if menu_id == "app_quit" {
                    app.exit(0);
                    return;
                }
                
                // 托盘菜单事件已在 TrayIconBuilder 的 on_menu_event 回调中处理
                // 这里不再需要单独处理
                
                // 处理其他菜单事件，发送到前端
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("menu-event", menu_id);
                }
            });
    }
    
    // 注册命令处理器（桌面和移动平台都使用相同的命令）
    builder = builder.invoke_handler(tauri::generate_handler![
        greet,
        get_current_locale,
        update_menu_locale,
        exit_app,
        set_window_title
    ]);
    
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
