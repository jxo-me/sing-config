/**
 * 菜单事件处理器
 * 监听 Tauri 菜单事件，并调用相应的前端功能
 */

import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// 菜单事件类型
type MenuEvent = string;

// Topbar 组件引用（通过全局变量或事件总线传递）
let topbarRef: { onNew?: () => Promise<void>; onOpen?: () => Promise<void>; onSave?: () => Promise<void>; onSaveAs?: () => Promise<void>; onLoadExample?: () => Promise<void>; showWizard?: () => void; showTemplates?: () => void; isOpening?: () => boolean } | null = null;

// 正在处理的事件集合，防止同一事件被并发处理
const processingEvents = new Set<string>();

// Editor 组件引用
let editorRef: { mode?: string; setMode?: (mode: 'form' | 'json') => void; runPreflight?: () => Promise<void>; runValidation?: () => Promise<void>; jsonEditor?: { undo?: () => void; redo?: () => void; openSearch?: () => void; openReplace?: () => void } | null } | null = null;

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
  // 立即检查并设置标志（必须在任何异步操作之前）
  if (processingEvents.has(menuId)) {
    return;
  }
  
  // 立即标记为正在处理（防止并发）
  processingEvents.add(menuId);

  try {
    switch (menuId) {
      // 文件菜单
      case 'file_new':
        await topbarRef?.onNew?.();
        break;

      case 'file_open':
        // 检查 Topbar 是否已经在打开中
        if (!topbarRef || topbarRef.isOpening?.()) {
          return;
        }
        await topbarRef.onOpen?.();
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
        // 打开搜索面板（CodeMirror 自带）
        editorRef?.jsonEditor?.openSearch?.();
        break;

      case 'edit_replace':
        // 打开替换面板（CodeMirror 自带）
        editorRef?.jsonEditor?.openReplace?.();
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
  } finally {
    // 处理完成后移除标记
    // 对于需要对话框的操作，延迟移除以确保对话框已打开
    if (menuId === 'file_open' || menuId === 'file_save_as') {
      setTimeout(() => {
        processingEvents.delete(menuId);
      }, 300);
    } else {
      processingEvents.delete(menuId);
    }
  }
}

// 存储 unlisten 函数，避免重复注册监听器
let unlistenMenuEvent: (() => void) | null = null;
// 追踪最后处理的事件和时间戳，用于防重复
let lastProcessedEvent: { menuId: string; timestamp: number } | null = null;
// 追踪正在接收的事件（在事件监听器层面）
const receivingEvents = new Set<string>();
const EVENT_DEBOUNCE_MS = 500; // 500ms 内的重复事件视为重复（对话框操作需要更长时间）
// 监听器初始化标志，防止重复初始化
let isInitialized = false;
// 初始化锁，防止并发初始化
let isInitializing = false;

/**
 * 初始化菜单事件监听
 */
export async function setupMenuHandlers() {
  // 防止并发初始化 - 使用锁机制
  if (isInitializing) {
    // 等待当前初始化完成
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return;
  }
  
  // 防止重复初始化
  if (isInitialized && unlistenMenuEvent) {
    return;
  }
  
  // 设置初始化锁
  isInitializing = true;
  
  try {
    // 如果已经有监听器，先清理旧的
    if (unlistenMenuEvent) {
      unlistenMenuEvent();
      unlistenMenuEvent = null;
    }
    
    // 清理相关状态
    receivingEvents.clear();
    lastProcessedEvent = null;
    processingEvents.clear();
    
    // 监听菜单事件
    unlistenMenuEvent = await listen<MenuEvent>('menu-event', (event) => {
      const menuId = event.payload;
      const now = Date.now();
      
      // 第一层防护：如果该事件正在接收处理中，立即忽略
      if (receivingEvents.has(menuId)) {
        return;
      }
      
      // 第二层防护：防抖检查
      const debounceTime = (menuId === 'file_open' || menuId === 'file_save_as') ? EVENT_DEBOUNCE_MS : 100;
      if (lastProcessedEvent && 
          lastProcessedEvent.menuId === menuId && 
          now - lastProcessedEvent.timestamp < debounceTime) {
        return;
      }
      
      // 立即标记为正在接收（防止并发事件）
      receivingEvents.add(menuId);
      // 立即更新最后处理的事件
      lastProcessedEvent = { menuId, timestamp: now };
      
      // 处理事件
      handleMenuEvent(menuId).finally(() => {
        // 处理完成后，延迟移除标记（对于对话框操作，需要更长时间）
        const delay = (menuId === 'file_open' || menuId === 'file_save_as') ? 300 : 0;
        setTimeout(() => {
          receivingEvents.delete(menuId);
        }, delay);
      });
    });

    isInitialized = true;
  } catch (error) {
    console.error('Failed to setup menu handlers:', error);
    isInitialized = false;
  } finally {
    // 释放初始化锁
    isInitializing = false;
  }
}

/**
 * 清理菜单事件监听
 */
export function cleanupMenuHandlers() {
  if (unlistenMenuEvent) {
    unlistenMenuEvent();
    unlistenMenuEvent = null;
    isInitialized = false;
    isInitializing = false;
    receivingEvents.clear();
    lastProcessedEvent = null;
    processingEvents.clear();
  }
}

