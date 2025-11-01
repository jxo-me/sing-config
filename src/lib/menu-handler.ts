/**
 * 菜单事件处理器
 * 监听 Tauri 菜单事件，并调用相应的前端功能
 */

import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// 菜单事件类型
type MenuEvent = string;

// Topbar 组件引用（通过全局变量或事件总线传递）
let topbarRef: { onOpen?: () => Promise<void>; onSave?: () => Promise<void>; onSaveAs?: () => Promise<void>; onLoadExample?: () => Promise<void>; showWizard?: () => void; showTemplates?: () => void } | null = null;

// Editor 组件引用
let editorRef: { mode?: string; setMode?: (mode: 'form' | 'json') => void; runPreflight?: () => Promise<void>; runValidation?: () => Promise<void>; jsonEditor?: { undo?: () => void; redo?: () => void } | null } | null = null;

/**
 * 设置 Topbar 引用
 */
export function setTopbarRef(ref: typeof topbarRef) {
  topbarRef = ref;
}

/**
 * 设置 Editor 引用
 */
export function setEditorRef(ref: typeof editorRef) {
  editorRef = ref;
}

/**
 * 处理菜单事件
 */
async function handleMenuEvent(menuId: string) {
  console.log('Menu event:', menuId);

  switch (menuId) {
    // 文件菜单
    case 'file_new':
      // TODO: 实现新建文件功能
      console.log('New file');
      break;

    case 'file_open':
      topbarRef?.onOpen?.();
      break;

    case 'file_open_recent':
      // TODO: 实现打开最近文件功能
      console.log('Open recent');
      break;

    case 'file_clear_recent':
      // TODO: 实现清除最近文件列表功能
      console.log('Clear recent');
      break;

    case 'file_save':
      topbarRef?.onSave?.();
      break;

    case 'file_save_as':
      topbarRef?.onSaveAs?.();
      break;

    // 编辑菜单
    case 'edit_undo':
      // 使用 CodeMirror API
      editorRef?.jsonEditor?.undo?.();
      break;

    case 'edit_redo':
      // 使用 CodeMirror API
      editorRef?.jsonEditor?.redo?.();
      break;

    case 'edit_cut':
      document.execCommand('cut');
      break;

    case 'edit_copy':
      document.execCommand('copy');
      break;

    case 'edit_paste':
      document.execCommand('paste');
      break;

    case 'edit_find':
      // TODO: 实现查找功能（CodeMirror 自带）
      console.log('Find');
      break;

    case 'edit_replace':
      // TODO: 实现替换功能（CodeMirror 自带）
      console.log('Replace');
      break;

    case 'edit_format':
      // 触发格式化事件（通过右键菜单的格式化功能）
      const formatEvent = new CustomEvent('format-json');
      window.dispatchEvent(formatEvent);
      break;

    // 视图菜单
    case 'view_form_mode':
      editorRef?.setMode?.('form');
      break;

    case 'view_json_mode':
      editorRef?.setMode?.('json');
      break;

    case 'view_toggle_sidebar':
      // TODO: 实现侧边栏切换功能
      console.log('Toggle sidebar');
      break;

    case 'view_language_zh':
      // 触发语言切换事件
      const zhEvent = new CustomEvent('change-locale', { detail: 'zh' });
      window.dispatchEvent(zhEvent);
      // 更新菜单语言
      await invoke('update_menu_locale', { locale: 'zh' });
      break;

    case 'view_language_en':
      // 触发语言切换事件
      const enEvent = new CustomEvent('change-locale', { detail: 'en' });
      window.dispatchEvent(enEvent);
      // 更新菜单语言
      await invoke('update_menu_locale', { locale: 'en' });
      break;

    // 工具菜单
    case 'tools_run_check':
      editorRef?.runPreflight?.();
      break;

    case 'tools_run_validation':
      editorRef?.runValidation?.();
      break;

    case 'tools_wizard':
      topbarRef?.showWizard?.();
      break;

    case 'tools_templates':
      topbarRef?.showTemplates?.();
      break;

    // 设置菜单
    case 'settings_preferences':
      // TODO: 实现偏好设置对话框
      console.log('Preferences');
      break;

    // 帮助菜单
    case 'help_shortcuts':
      // TODO: 实现快捷键说明对话框
      console.log('Keyboard shortcuts');
      break;

    case 'help_documentation':
      // TODO: 打开文档链接
      console.log('Documentation');
      break;

    case 'help_about':
    case 'app_about':
      // TODO: 实现关于对话框
      console.log('About');
      break;

    default:
      console.warn('Unknown menu event:', menuId);
  }
}

/**
 * 初始化菜单事件监听
 */
export async function setupMenuHandlers() {
  try {
    // 监听菜单事件
    await listen<MenuEvent>('menu-event', (event) => {
      handleMenuEvent(event.payload);
    });

    console.log('Menu handlers initialized');
  } catch (error) {
    console.error('Failed to setup menu handlers:', error);
  }
}

/**
 * 清理菜单事件监听
 */
export function cleanupMenuHandlers() {
  // Tauri 的 listen 返回的 UnlistenFn 会自动清理
  // 如果需要手动清理，可以存储返回的函数
}

