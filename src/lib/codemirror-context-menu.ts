import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { selectAll, undo, redo } from '@codemirror/commands';

// 多语言菜单文本
const menuTexts = {
  zh: {
    lookUp: '查找 ""',
    translate: '翻译 ""',
    searchWithGoogle: '使用 Google 搜索',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    undo: '撤销',
    redo: '重做',
    spellingAndGrammar: '拼写和语法',
    substitutions: '替换',
    transformations: '转换',
    font: '字体',
    speech: '语音',
    paragraphDirection: '段落方向',
    share: '共享...',
    inspectElement: '检查元素',
  },
  en: {
    lookUp: 'Look Up ""',
    translate: 'Translate ""',
    searchWithGoogle: 'Search with Google',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    undo: 'Undo',
    redo: 'Redo',
    spellingAndGrammar: 'Spelling and Grammar',
    substitutions: 'Substitutions',
    transformations: 'Transformations',
    font: 'Font',
    speech: 'Speech',
    paragraphDirection: 'Paragraph Direction',
    share: 'Share...',
    inspectElement: 'Inspect Element',
  },
};

// 获取当前语言
function getCurrentLocale(): 'zh' | 'en' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale');
    if (stored === 'zh' || stored === 'en') {
      return stored;
    }
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

// 获取主题颜色（直接使用白色背景，不检测）
function getThemeColors() {
  // 直接使用固定的白色主题配色
  return {
    background: '#ffffff', // 白色背景
    border: '#e5e7eb', // 浅灰边框
    textPrimary: '#1f2328', // 深色文字
    textSecondary: '#666666', // 灰色文字
    hoverBackground: '#f5f5f5', // 浅灰悬停背景
    separator: '#e5e7eb', // 分隔线
    disabledText: '#9ca3af', // 禁用文字
  };
}

// 创建自定义右键菜单
function createContextMenu(view: EditorView, event: MouseEvent) {
  const locale = getCurrentLocale();
  const texts = menuTexts[locale];
  const colors = getThemeColors();
  
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.cm-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // 创建菜单容器
  const menu = document.createElement('div');
  menu.className = 'cm-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${event.clientX}px;
    top: ${event.clientY}px;
    background: ${colors.background};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    z-index: 10000;
    font-size: 13px;
    min-width: 200px;
    color: ${colors.textPrimary};
  `;

  const hasSelection = view.state.selection.main.empty === false;
  
  // 检查撤销/重做状态（简化处理，始终显示，如果不可用则在点击时无效）
  let canUndo = false;
  let canRedo = false;
  
  // 尝试检查历史状态（历史扩展可能没有暴露状态字段）
  // 简化：总是启用，由命令本身处理
  canUndo = true;
  canRedo = true;

  // 获取选中的文本
  const selectedText = hasSelection ? view.state.sliceDoc(
    view.state.selection.main.from,
    view.state.selection.main.to
  ) : '';

  // 创建菜单项
  const menuItems: Array<{
    type?: 'separator';
    label?: string;
    action?: () => void;
    enabled?: boolean;
    shortcut?: string;
    hasSubmenu?: boolean;
  }> = [
    {
      label: texts.lookUp,
      action: async () => {
        if (selectedText) {
          const dictUrl = `https://www.dictionary.com/browse/${encodeURIComponent(selectedText)}`;
          try {
            // 查找功能：在字典网站查找
            const { openUrl } = await import('@tauri-apps/plugin-opener');
            await openUrl(dictUrl);
          } catch (err) {
            console.warn('Failed to open dictionary with opener:', err);
            // 回退到 window.open（如果是开发模式或 opener 不可用）
            try {
              window.open(dictUrl, '_blank');
            } catch (e) {
              console.error('Failed to open with window.open:', e);
            }
          }
        }
        menu.remove();
      },
      enabled: hasSelection && selectedText.length > 0,
    },
    {
      label: texts.translate,
      action: async () => {
        if (selectedText) {
          const translateUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(selectedText)}`;
          try {
            // 翻译功能
            const { openUrl } = await import('@tauri-apps/plugin-opener');
            await openUrl(translateUrl);
          } catch (err) {
            console.warn('Failed to open translate with opener:', err);
            try {
              window.open(translateUrl, '_blank');
            } catch (e) {
              console.error('Failed to open with window.open:', e);
            }
          }
        }
        menu.remove();
      },
      enabled: hasSelection && selectedText.length > 0,
    },
    { type: 'separator' },
    {
      label: texts.searchWithGoogle,
      action: async () => {
        if (selectedText) {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
          try {
            const { openUrl } = await import('@tauri-apps/plugin-opener');
            await openUrl(searchUrl);
          } catch (err) {
            console.warn('Failed to open search with opener:', err);
            try {
              window.open(searchUrl, '_blank');
            } catch (e) {
              console.error('Failed to open with window.open:', e);
            }
          }
        }
        menu.remove();
      },
      enabled: hasSelection && selectedText.length > 0,
    },
    { type: 'separator' },
    {
      label: texts.cut,
      action: async () => {
        if (hasSelection) {
          const selection = view.state.selection.main;
          const text = view.state.sliceDoc(selection.from, selection.to);
          try {
            await navigator.clipboard.writeText(text);
            view.dispatch({
              changes: {
                from: selection.from,
                to: selection.to,
                insert: '',
              },
              selection: { anchor: selection.from },
            });
          } catch (err) {
            console.warn('Failed to cut:', err);
          }
        }
        menu.remove();
      },
      enabled: hasSelection,
      shortcut: 'Ctrl+X',
    },
    {
      label: texts.copy,
      action: async () => {
        if (hasSelection) {
          const selection = view.state.selection.main;
          const text = view.state.sliceDoc(selection.from, selection.to);
          try {
            await navigator.clipboard.writeText(text);
          } catch (err) {
            console.warn('Failed to copy:', err);
          }
        }
        menu.remove();
      },
      enabled: hasSelection,
      shortcut: 'Ctrl+C',
    },
    {
      label: texts.paste,
      action: async () => {
        try {
          // 优先使用 clipboard API（如果可用）
          const text = await navigator.clipboard.readText();
          const selection = view.state.selection.main;
          view.dispatch({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: text,
            },
            selection: { anchor: selection.from + text.length },
          });
        } catch (err) {
          // 如果 clipboard API 不可用（如权限问题），触发原生粘贴事件
          // CodeMirror 会处理原生的 paste 事件
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          view.dom.dispatchEvent(pasteEvent);
        }
        menu.remove();
      },
      enabled: true,
      shortcut: 'Ctrl+V',
    },
    {
      label: texts.speech,
      action: () => {
        if (selectedText && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(selectedText);
          speechSynthesis.speak(utterance);
        }
        menu.remove();
      },
      enabled: hasSelection && 'speechSynthesis' in window,
    },
    { type: 'separator' },
    {
      label: texts.selectAll,
      action: () => {
        // 确保编辑器获得焦点
        view.focus();
        // 执行全选命令
        const result = selectAll(view);
        // 如果命令执行失败（返回 false），手动设置选择范围
        if (!result) {
          view.dispatch({
            selection: { anchor: 0, head: view.state.doc.length },
          });
        }
        menu.remove();
      },
      enabled: true,
      shortcut: 'Ctrl+A',
    },
    { type: 'separator' },
    {
      label: texts.undo,
      action: () => {
        undo(view);
        menu.remove();
      },
      enabled: canUndo,
      shortcut: 'Ctrl+Z',
    },
    {
      label: texts.redo,
      action: () => {
        redo(view);
        menu.remove();
      },
      enabled: canRedo,
      shortcut: 'Ctrl+Shift+Z',
    },
  ];

  // 渲染菜单项
  menuItems.forEach((item) => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.style.cssText = `height: 1px; background: ${colors.separator}; margin: 4px 0;`;
      menu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'cm-context-menu-item';
      menuItem.innerHTML = `
        <span>${item.label}</span>
        ${item.shortcut ? `<span style="color: ${colors.textSecondary}; font-size: 11px; margin-left: auto; padding-left: 20px;">${item.shortcut}</span>` : ''}
        ${item.hasSubmenu ? `<span style="color: ${colors.textSecondary}; margin-left: 8px;">›</span>` : ''}
      `;
      menuItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        cursor: ${item.enabled ? 'pointer' : 'default'};
        color: ${item.enabled ? colors.textPrimary : colors.disabledText};
        border-radius: 4px;
        user-select: none;
      `;

      if (item.enabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = colors.hoverBackground;
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.action) {
            item.action();
          }
        });
      } else {
        // 禁用项仍然显示，但不可点击
        menuItem.style.opacity = '0.6';
      }

      menu.appendChild(menuItem);
    }
  });

  // 添加到页面
  document.body.appendChild(menu);

  // 点击外部关闭菜单
  const closeMenu = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };

  // 延迟添加监听器，避免立即关闭
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 100);

  // 调整菜单位置，确保不超出视窗
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

/**
 * CodeMirror 右键菜单扩展
 */
export function contextMenu(): Extension {
  return EditorView.domEventHandlers({
    contextmenu(event: MouseEvent, view: EditorView) {
      event.preventDefault();
      createContextMenu(view, event);
      return true;
    },
  });
}

