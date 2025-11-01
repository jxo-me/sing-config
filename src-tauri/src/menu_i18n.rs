/// 菜单多语言文本定义
pub struct MenuI18n {
    pub locale: String,
}

impl MenuI18n {
    pub fn new(locale: &str) -> Self {
        Self {
            locale: locale.to_string(),
        }
    }

    pub fn is_zh(&self) -> bool {
        self.locale == "zh"
    }

    // 应用菜单（macOS）或文件菜单
    pub fn app_name(&self) -> &str {
        if self.is_zh() {
            "sing-config"
        } else {
            "sing-config"
        }
    }

    pub fn file_menu(&self) -> &str {
        if self.is_zh() {
            "文件"
        } else {
            "File"
        }
    }

    pub fn file_new(&self) -> &str {
        if self.is_zh() {
            "新建"
        } else {
            "New"
        }
    }

    pub fn file_open(&self) -> &str {
        if self.is_zh() {
            "打开"
        } else {
            "Open"
        }
    }

    pub fn file_open_recent(&self) -> &str {
        if self.is_zh() {
            "打开最近"
        } else {
            "Open Recent"
        }
    }

    pub fn file_clear_recent(&self) -> &str {
        if self.is_zh() {
            "清除列表"
        } else {
            "Clear List"
        }
    }

    pub fn file_save(&self) -> &str {
        if self.is_zh() {
            "保存"
        } else {
            "Save"
        }
    }

    pub fn file_save_as(&self) -> &str {
        if self.is_zh() {
            "另存为"
        } else {
            "Save As"
        }
    }

    pub fn file_quit(&self) -> &str {
        if self.is_zh() {
            "退出"
        } else {
            "Quit"
        }
    }

    // 编辑菜单
    pub fn edit_menu(&self) -> &str {
        if self.is_zh() {
            "编辑"
        } else {
            "Edit"
        }
    }

    pub fn edit_undo(&self) -> &str {
        if self.is_zh() {
            "撤销"
        } else {
            "Undo"
        }
    }

    pub fn edit_redo(&self) -> &str {
        if self.is_zh() {
            "重做"
        } else {
            "Redo"
        }
    }

    pub fn edit_cut(&self) -> &str {
        if self.is_zh() {
            "剪切"
        } else {
            "Cut"
        }
    }

    pub fn edit_copy(&self) -> &str {
        if self.is_zh() {
            "复制"
        } else {
            "Copy"
        }
    }

    pub fn edit_paste(&self) -> &str {
        if self.is_zh() {
            "粘贴"
        } else {
            "Paste"
        }
    }

    pub fn edit_find(&self) -> &str {
        if self.is_zh() {
            "查找"
        } else {
            "Find"
        }
    }

    pub fn edit_replace(&self) -> &str {
        if self.is_zh() {
            "替换"
        } else {
            "Replace"
        }
    }

    pub fn edit_format(&self) -> &str {
        if self.is_zh() {
            "格式化"
        } else {
            "Format"
        }
    }

    // 视图菜单
    pub fn view_menu(&self) -> &str {
        if self.is_zh() {
            "视图"
        } else {
            "View"
        }
    }

    pub fn view_form_mode(&self) -> &str {
        if self.is_zh() {
            "表单模式"
        } else {
            "Form Mode"
        }
    }

    pub fn view_json_mode(&self) -> &str {
        if self.is_zh() {
            "JSON 模式"
        } else {
            "JSON Mode"
        }
    }

    pub fn view_toggle_sidebar(&self) -> &str {
        if self.is_zh() {
            "显示/隐藏侧边栏"
        } else {
            "Toggle Sidebar"
        }
    }

    pub fn view_language(&self) -> &str {
        if self.is_zh() {
            "语言"
        } else {
            "Language"
        }
    }

    pub fn view_language_zh(&self) -> &str {
        "中文"
    }

    pub fn view_language_en(&self) -> &str {
        "English"
    }

    // 工具菜单
    pub fn tools_menu(&self) -> &str {
        if self.is_zh() {
            "工具"
        } else {
            "Tools"
        }
    }

    pub fn tools_run_check(&self) -> &str {
        if self.is_zh() {
            "运行检查"
        } else {
            "Run Check"
        }
    }

    pub fn tools_run_validation(&self) -> &str {
        if self.is_zh() {
            "运行验证"
        } else {
            "Run Validation"
        }
    }

    pub fn tools_wizard(&self) -> &str {
        if self.is_zh() {
            "向导"
        } else {
            "Wizard"
        }
    }

    pub fn tools_templates(&self) -> &str {
        if self.is_zh() {
            "模板库"
        } else {
            "Template Library"
        }
    }

    // 设置菜单
    pub fn settings_menu(&self) -> &str {
        if self.is_zh() {
            "设置"
        } else {
            "Settings"
        }
    }

    pub fn settings_preferences(&self) -> &str {
        if self.is_zh() {
            "偏好设置"
        } else {
            "Preferences"
        }
    }

    // 帮助菜单
    pub fn help_menu(&self) -> &str {
        if self.is_zh() {
            "帮助"
        } else {
            "Help"
        }
    }

    pub fn help_shortcuts(&self) -> &str {
        if self.is_zh() {
            "快捷键"
        } else {
            "Keyboard Shortcuts"
        }
    }

    pub fn help_documentation(&self) -> &str {
        if self.is_zh() {
            "文档"
        } else {
            "Documentation"
        }
    }

    pub fn help_about(&self) -> &str {
        if self.is_zh() {
            "关于"
        } else {
            "About"
        }
    }
}

