use tauri::AppHandle;
use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder, CheckMenuItemBuilder};
use crate::menu_i18n::MenuI18n;

/// 构建应用菜单（根据 Tauri 2 API）
pub fn build_menu<R: tauri::Runtime>(app: &AppHandle<R>, locale: &str) -> Result<tauri::menu::Menu<R>, Box<dyn std::error::Error>> {
    let i18n = MenuI18n::new(locale);
    
    // macOS 使用应用菜单，Windows/Linux 使用文件菜单
    let file_menu = build_file_menu(app, &i18n)?;
    let edit_menu = build_edit_menu(app, &i18n)?;
    let view_menu = build_view_menu(app, &i18n)?;
    let tools_menu = build_tools_menu(app, &i18n)?;
    let settings_menu = build_settings_menu(app, &i18n)?;
    let help_menu = build_help_menu(app, &i18n)?;
    
    // macOS 需要第一个子菜单作为应用菜单
    let menu = if cfg!(target_os = "macos") {
        let app_menu = build_app_menu(app, &i18n)?;
        MenuBuilder::new(app)
            .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &tools_menu, &settings_menu, &help_menu])
            .build()?
    } else {
        MenuBuilder::new(app)
            .items(&[&file_menu, &edit_menu, &view_menu, &tools_menu, &settings_menu, &help_menu])
            .build()?
    };
    
    Ok(menu)
}

/// 构建应用菜单（macOS）
fn build_app_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let about = MenuItem::with_id(
        app,
        "app_about",
        i18n.help_about(),
        true,
        None::<&str>,
    )?;
    
    // 创建带快捷键的退出菜单项
    let quit = MenuItem::with_id(
        app,
        "app_quit",
        i18n.file_quit(),
        true,
        Some("CmdOrCtrl+Q"),
    )?;
    
    let menu = SubmenuBuilder::new(app, i18n.app_name())
        .item(&about)
        .separator()
        .item(&quit)
        .build()?;
    
    Ok(menu)
}

/// 构建文件菜单（Windows/Linux）
fn build_file_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let new_item = MenuItem::with_id(
        app,
        "file_new",
        i18n.file_new(),
        true,
        Some("CmdOrCtrl+N"),
    )?;
    
    let open_item = MenuItem::with_id(
        app,
        "file_open",
        i18n.file_open(),
        true,
        Some("CmdOrCtrl+O"),
    )?;
    
    let clear_recent = MenuItem::with_id(
        app,
        "file_clear_recent",
        i18n.file_clear_recent(),
        true,
        None::<&str>,
    )?;
    
    // TODO: 添加最近文件列表项
    let recent_submenu = SubmenuBuilder::new(app, i18n.file_open_recent())
        .item(&clear_recent)
        .build()?;
    
    let save_item = MenuItem::with_id(
        app,
        "file_save",
        i18n.file_save(),
        true,
        Some("CmdOrCtrl+S"),
    )?;
    
    let save_as_item = MenuItem::with_id(
        app,
        "file_save_as",
        i18n.file_save_as(),
        true,
        Some("CmdOrCtrl+Shift+S"),
    )?;
    
    // 创建带快捷键的退出菜单项（Windows/Linux）
    let quit = MenuItem::with_id(
        app,
        "app_quit",
        i18n.file_quit(),
        true,
        Some("CmdOrCtrl+Q"),
    )?;
    
    let menu = SubmenuBuilder::new(app, i18n.file_menu())
        .item(&new_item)
        .item(&open_item)
        .item(&recent_submenu)
        .separator()
        .item(&save_item)
        .item(&save_as_item)
        .separator()
        .item(&quit)
        .build()?;
    
    Ok(menu)
}

/// 构建编辑菜单
fn build_edit_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    // 手动创建撤销和重做菜单项，以便控制 ID
    let undo_item = MenuItem::with_id(
        app,
        "edit_undo",
        i18n.edit_undo(),
        true,
        Some("CmdOrCtrl+Z"),
    )?;
    
    let redo_item = MenuItem::with_id(
        app,
        "edit_redo",
        i18n.edit_redo(),
        true,
        Some("CmdOrCtrl+Shift+Z"),
    )?;
    
    let cut_item = MenuItem::with_id(
        app,
        "edit_cut",
        i18n.edit_cut(),
        true,
        Some("CmdOrCtrl+X"),
    )?;
    
    let copy_item = MenuItem::with_id(
        app,
        "edit_copy",
        i18n.edit_copy(),
        true,
        Some("CmdOrCtrl+C"),
    )?;
    
    let paste_item = MenuItem::with_id(
        app,
        "edit_paste",
        i18n.edit_paste(),
        true,
        Some("CmdOrCtrl+V"),
    )?;
    
    let menu = SubmenuBuilder::new(app, i18n.edit_menu())
        .item(&undo_item)
        .item(&redo_item)
        .separator()
        .item(&cut_item)
        .item(&copy_item)
        .item(&paste_item)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "edit_find",
            i18n.edit_find(),
            true,
            Some("CmdOrCtrl+F"),
        )?)
        .item(&MenuItem::with_id(
            app,
            "edit_replace",
            i18n.edit_replace(),
            true,
            Some("CmdOrCtrl+H"),
        )?)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "edit_format",
            i18n.edit_format(),
            true,
            Some("CmdOrCtrl+Shift+F"),
        )?)
        .build()?;
    
    Ok(menu)
}

/// 构建视图菜单
fn build_view_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let form_mode = MenuItem::with_id(
        app,
        "view_form_mode",
        i18n.view_form_mode(),
        true,
        Some("CmdOrCtrl+1"),
    )?;
    
    let json_mode = MenuItem::with_id(
        app,
        "view_json_mode",
        i18n.view_json_mode(),
        true,
        Some("CmdOrCtrl+2"),
    )?;
    
    let toggle_sidebar = MenuItem::with_id(
        app,
        "view_toggle_sidebar",
        i18n.view_toggle_sidebar(),
        true,
        Some("CmdOrCtrl+B"),
    )?;
    
    // 语言选择使用复选框菜单项
    let language_zh = CheckMenuItemBuilder::with_id("view_language_zh", i18n.view_language_zh())
        .checked(i18n.is_zh())
        .build(app)?;
    
    let language_en = CheckMenuItemBuilder::with_id("view_language_en", i18n.view_language_en())
        .checked(!i18n.is_zh())
        .build(app)?;
    
    let language_submenu = SubmenuBuilder::new(app, i18n.view_language())
        .item(&language_zh)
        .item(&language_en)
        .build()?;
    
    let menu = SubmenuBuilder::new(app, i18n.view_menu())
        .item(&form_mode)
        .item(&json_mode)
        .separator()
        .item(&toggle_sidebar)
        .separator()
        .item(&language_submenu)
        .build()?;
    
    Ok(menu)
}

/// 构建工具菜单
fn build_tools_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let menu = SubmenuBuilder::new(app, i18n.tools_menu())
        .item(&MenuItem::with_id(
            app,
            "tools_run_check",
            i18n.tools_run_check(),
            true,
            Some("CmdOrCtrl+R"),
        )?)
        .item(&MenuItem::with_id(
            app,
            "tools_run_validation",
            i18n.tools_run_validation(),
            true,
            Some("CmdOrCtrl+Shift+V"),
        )?)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "tools_wizard",
            i18n.tools_wizard(),
            true,
            None::<&str>,
        )?)
        .item(&MenuItem::with_id(
            app,
            "tools_templates",
            i18n.tools_templates(),
            true,
            None::<&str>,
        )?)
        .build()?;
    
    Ok(menu)
}

/// 构建设置菜单
fn build_settings_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let menu = SubmenuBuilder::new(app, i18n.settings_menu())
        .item(&MenuItem::with_id(
            app,
            "settings_preferences",
            i18n.settings_preferences(),
            true,
            Some("CmdOrCtrl+,"),
        )?)
        .build()?;
    
    Ok(menu)
}

/// 构建帮助菜单
fn build_help_menu<R: tauri::Runtime>(app: &AppHandle<R>, i18n: &MenuI18n) -> Result<tauri::menu::Submenu<R>, Box<dyn std::error::Error>> {
    let menu = SubmenuBuilder::new(app, i18n.help_menu())
        .item(&MenuItem::with_id(
            app,
            "help_shortcuts",
            i18n.help_shortcuts(),
            true,
            Some("CmdOrCtrl+Shift+?"),
        )?)
        .item(&MenuItem::with_id(
            app,
            "help_documentation",
            i18n.help_documentation(),
            true,
            None::<&str>,
        )?)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "help_about",
            i18n.help_about(),
            true,
            None::<&str>,
        )?)
        .build()?;
    
    Ok(menu)
}

