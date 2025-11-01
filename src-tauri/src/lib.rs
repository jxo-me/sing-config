// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod menu;
mod menu_i18n;

use menu::build_menu;
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

/// 更新菜单语言
#[tauri::command]
async fn update_menu_locale(app: AppHandle, locale: String) -> Result<(), String> {
    let menu = build_menu(&app, &locale).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

/// 退出应用（供前端快捷键调用）
#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 获取初始语言（默认中文）
            let locale = "zh";
            let menu = build_menu(app.handle(), locale).map_err(|e| {
                eprintln!("Failed to build menu: {}", e);
                e
            })?;
            
            app.set_menu(menu)?;
            
            Ok(())
        })
        .on_menu_event(|app, event| {
            let menu_id = event.id().0.clone();
            
            // 处理退出应用（不发送到前端，直接退出）
            if menu_id == "app_quit" {
                app.exit(0);
                return;
            }
            
            // 处理其他菜单事件，发送到前端
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("menu-event", menu_id);
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_locale,
            update_menu_locale,
            exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
