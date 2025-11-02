<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { EditorView, lineNumbers } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { foldGutter, foldedRanges, foldEffect } from '@codemirror/language';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap, openSearchPanel } from '@codemirror/search';
import { history, defaultKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { closeBrackets, startCompletion } from '@codemirror/autocomplete';
import { createJsonSchemaExtension } from '../lib/codemirror-json-schema';
import { contextMenu } from '../lib/codemirror-context-menu';
import { createJsonSchemaAutocompleteExtension } from '../lib/json-schema-autocomplete';
import { createSyntaxHighlighting } from '../lib/editor-themes';
import { createEditorTheme } from '../lib/editor-custom-theme';
import { useI18n } from '../i18n';
import { settings, getAutocompleteSchemaPath } from '../stores/settings';

const { currentLocale } = useI18n();

// 组件初始化日志
console.log('%c[JsonEditor] 组件初始化开始', 'color: blue; font-weight: bold;');
console.log('[JsonEditor] settings 对象:', settings);
console.log('[JsonEditor] enableAutocomplete 值:', settings?.enableAutocomplete);

const props = defineProps<{ 
  modelValue: string;
}>();
const emit = defineEmits<{ 
  (e: 'update:modelValue', v: string): void;
  (e: 'gotoLine', line: number, column?: number): void;
}>();

let editor: EditorView | null = null;
const container = ref<HTMLElement | null>(null);
let changeTimer: number | undefined;
let resizeObserver: ResizeObserver | null = null;

// 监听语言变化，重新验证以更新错误消息和菜单
watch(currentLocale, () => {
  // 语言变化时，更新 localStorage 并触发编辑器重新验证
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', currentLocale.value);
  }
  // 关闭已打开的菜单
  const existingMenu = document.querySelector('.cm-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  if (editor) {
    // 触发 CodeMirror 重新运行 linter 以更新错误消息
    editor.dispatch({
      effects: [],
    });
    editor.requestMeasure();
  }
});

/**
 * 构建编辑器扩展（支持动态配置）
 */
async function buildExtensions(): Promise<Extension[]> {
  console.log('[JsonEditor] buildExtensions 被调用');
  console.log('[JsonEditor] 当前设置:', {
    enableAutocomplete: settings.enableAutocomplete,
    autocompleteActivateOnTyping: settings.autocompleteActivateOnTyping,
    autocompleteDelay: settings.autocompleteDelay,
  });
  
  const extensions: Extension[] = [];
  
  // 基础 UI 功能
  if (settings.enableLineNumbers) {
    extensions.push(lineNumbers());
  }
  if (settings.enableFoldGutter) {
    extensions.push(foldGutter());
  }
  if (settings.enableBracketMatching) {
    extensions.push(bracketMatching());
  }
  
  // 条件扩展
  if (settings.autoIndent) {
    extensions.push(indentOnInput());
    extensions.push(indentUnit.of(' '.repeat(settings.indentSize)));
  }
  
  if (settings.autoCloseBrackets) {
    extensions.push(closeBrackets());
  }
  
  if (settings.autoHighlightSelectionMatches) {
    extensions.push(highlightSelectionMatches());
  }
  
  // 自动补全（使用新的配置函数，独立于 Schema 验证）
  if (settings.enableAutocomplete) {
    const autocompletePath = getAutocompleteSchemaPath();
    console.log('[JsonEditor] 准备添加自动补全扩展:', {
      enabled: settings.enableAutocomplete,
      activateOnTyping: settings.autocompleteActivateOnTyping,
      delay: settings.autocompleteDelay,
      schemaPath: autocompletePath,
    });
    const autocompleteExtensions = createJsonSchemaAutocompleteExtension({
      enabled: true,
      activateOnTyping: settings.autocompleteActivateOnTyping,
      delay: settings.autocompleteDelay,
      schemaPath: autocompletePath, // 使用独立的自动补全 Schema 路径
    });
    console.log('[JsonEditor] 自动补全扩展已创建，数量:', autocompleteExtensions.length);
    extensions.push(...autocompleteExtensions);
  } else {
    console.log('[JsonEditor] 自动补全已禁用');
  }
  
  // 语法高亮（使用新的配置函数）
  extensions.push(...createSyntaxHighlighting({
    theme: settings.theme,
    enabled: settings.syntaxHighlightingEnabled,
  }));
  
  // 编辑器主题（使用新的配置函数）
  extensions.push(...createEditorTheme({
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    lineHeight: settings.lineHeight,
    showWhitespace: settings.showWhitespace,
  }));
  
  // 基础功能
  extensions.push(history());
  extensions.push(json());
  extensions.push(contextMenu());
  
  // Tab 键触发补全（移除缩进功能）
  const tabAutocompleteCommand = (view: any) => {
    // 直接触发补全，不需要检查上下文
    console.log('[JsonEditor] Tab 键按下，触发补全');
    return startCompletion(view);
  };
  
  // 移除 indentWithTab，添加 Tab 键补全
  // Tab 键映射放在最前面，优先级最高，会覆盖默认的缩进行为
  extensions.push(keymap.of([
    {
      key: 'Tab',
      run: tabAutocompleteCommand,
    },
  ]));
  
  // 添加其他快捷键（不包括 Tab，因为我们已经在上面处理了）
  extensions.push(keymap.of([...defaultKeymap, ...searchKeymap]));
  
  // 文档变更监听
  extensions.push(EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => {
        const content = editor?.state.doc.toString() || '';
        emit('update:modelValue', content);
      }, 300);
    }
  }));
  
  // 自动折行
  if (settings.wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }
  
  // 滚动条样式
  extensions.push(EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': {
      overflow: 'auto',
      '&::-webkit-scrollbar': { width: '10px', height: '10px' },
      '&::-webkit-scrollbar-track': { background: '#f1f5f9' },
      '&::-webkit-scrollbar-thumb': {
        background: '#cbd5e1',
        borderRadius: '5px',
        '&:hover': { background: '#94a3b8' },
      },
    },
    '.cm-editor': { height: '100%' },
    '.cm-selectionBackground': { background: '#dbeafe !important' },
    '&.cm-focused .cm-selectionBackground': { background: '#bfdbfe !important' },
    '.cm-foldPlaceholder': {
      border: '1px solid #e2e8f0',
      borderRadius: '3px',
      backgroundColor: '#f8fafc',
      color: '#64748b',
      padding: '2px 6px',
      cursor: 'pointer',
    },
    '.cm-lineNumbers': {
      backgroundColor: '#f8fafc',
      borderRight: '1px solid #e2e8f0',
      minWidth: '40px',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px' },
    '.cm-foldGutter': { width: '16px' },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
  }));
  
  // Schema 校验（异步，单独处理）
  if (settings.enableSchemaValidation) {
    const schemaExt = await createJsonSchemaExtension({
      enabled: true,
      delay: settings.schemaValidationDelay,
      schemaPath: settings.schemaFilePath,
    });
    extensions.push(...schemaExt);
  }
  
  return extensions;
}

onMounted(async () => {
  console.log('[JsonEditor] onMounted 被调用');
  console.log('[JsonEditor] container.value:', !!container.value);
  
  if (!container.value) {
    console.error('[JsonEditor] container.value 为空，无法创建编辑器');
    return;
  }
  
  console.log('[JsonEditor] 开始构建扩展...');
  // 构建扩展
  const allExtensions = await buildExtensions();
  console.log('[JsonEditor] 扩展构建完成，数量:', allExtensions.length);
  console.log('[JsonEditor] 所有扩展已构建，总数:', allExtensions.length);
  console.log('[JsonEditor] 扩展列表:', allExtensions.map((ext: any) => ext?.constructor?.name || typeof ext).slice(0, 10));
  
  // 创建编辑器
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue ?? '',
      extensions: allExtensions,
    }),
    parent: container.value,
  });
  
  console.log('[JsonEditor] 编辑器已创建，检查自动补全扩展:', {
    hasEditor: !!editor,
    extensionsCount: allExtensions.length,
  });

  // 确保编辑器在容器大小变化时自动调整
  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      if (editor) {
        editor.requestMeasure();
      }
    });
    resizeObserver.observe(container.value);
  }
});

watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== editor.state.doc.toString()) {
      const pos = editor.state.selection.main.head;
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: v ?? '',
        },
        selection: { anchor: Math.min(pos, (v ?? '').length) },
      });
    }
  }
);

// 监听设置变化并重建编辑器
let pendingReconfiguration: number | undefined;

async function reconfigureEditor() {
  if (!editor || !container.value) return;
  
  console.log('Reconfiguring editor with new settings...');
  
  // 保存当前状态
  const currentContent = editor.state.doc.toString();
  const currentSelection = editor.state.selection.main.head;
  const scrollPos = editor.scrollDOM;
  const scrollTop = scrollPos.scrollTop;
  const scrollLeft = scrollPos.scrollLeft;
  
  // 重建扩展
  const allExtensions = await buildExtensions();
  
  // 创建新状态
  const newState = EditorState.create({
    doc: currentContent,
    extensions: allExtensions,
    selection: { anchor: currentSelection, head: currentSelection },
  });
  
  // 应用新状态
  editor.setState(newState);
  
  // 恢复滚动位置
  await nextTick();
  editor.scrollDOM.scrollTop = scrollTop;
  editor.scrollDOM.scrollLeft = scrollLeft;
  
  editor.requestMeasure();
  editor.focus();
  console.log('Editor reconfigured successfully');
}

watch(
  () => ({
    autoIndent: settings.autoIndent,
    indentSize: settings.indentSize,
    enableAutocomplete: settings.enableAutocomplete,
    autocompleteActivateOnTyping: settings.autocompleteActivateOnTyping,
    autocompleteDelay: settings.autocompleteDelay,
    autocompleteSchemaFilePath: settings.autocompleteSchemaFilePath,
    enableSchemaValidation: settings.enableSchemaValidation,
    schemaValidationDelay: settings.schemaValidationDelay,
    schemaFilePath: settings.schemaFilePath,
    autoCloseBrackets: settings.autoCloseBrackets,
    autoHighlightSelectionMatches: settings.autoHighlightSelectionMatches,
    enableLineNumbers: settings.enableLineNumbers,
    enableFoldGutter: settings.enableFoldGutter,
    enableBracketMatching: settings.enableBracketMatching,
    theme: settings.theme,
    syntaxHighlightingEnabled: settings.syntaxHighlightingEnabled,
    lineHeight: settings.lineHeight,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    wordWrap: settings.wordWrap,
    showWhitespace: settings.showWhitespace,
  }),
  async () => {
    // 防抖：300ms 内的多次变化只触发一次重建
    clearTimeout(pendingReconfiguration);
    pendingReconfiguration = window.setTimeout(() => {
      reconfigureEditor();
    }, 300);
  },
  { deep: true }
);

onBeforeUnmount(() => {
  clearTimeout(pendingReconfiguration);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (editor) {
    editor.destroy();
    editor = null;
  }
});

defineExpose({
  gotoLine: (line: number, column = 1) => {
    if (editor) {
      const lineObj = editor.state.doc.line(Math.min(line, editor.state.doc.lines));
      const pos = lineObj.from + column - 1;
      editor.dispatch({
        selection: { anchor: pos, head: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      editor.focus();
    }
  },
  getScrollPosition: () => {
    if (editor) {
      const scrollDOM = editor.scrollDOM;
      return {
        scrollTop: scrollDOM.scrollTop,
        scrollLeft: scrollDOM.scrollLeft,
      };
    }
    return { scrollTop: 0, scrollLeft: 0 };
  },
  setScrollPosition: (scrollTop: number, scrollLeft = 0) => {
    if (editor) {
      const scrollDOM = editor.scrollDOM;
      scrollDOM.scrollTop = scrollTop;
      scrollDOM.scrollLeft = scrollLeft;
    }
  },
  undo: () => {
    if (editor) {
      undo(editor);
      editor.focus();
    }
  },
  redo: () => {
    if (editor) {
      redo(editor);
      editor.focus();
    }
  },
  openSearch: () => {
    if (editor) {
      openSearchPanel(editor);
    }
  },
  openReplace: () => {
    if (editor) {
      // 在 CodeMirror 6 中，替换功能是搜索面板的一部分
      // 打开搜索面板后，用户可以通过面板中的按钮切换到替换模式
      // 或者直接使用快捷键 Ctrl+H (已包含在 searchKeymap 中)
      openSearchPanel(editor);
      // 注意：替换面板实际上就是搜索面板的扩展模式
      // 用户打开搜索面板后，可以看到替换相关的输入框和按钮
    }
  },
  getFoldState: () => {
    if (editor) {
      // 获取所有折叠的范围
      const folded = foldedRanges(editor.state);
      const ranges: Array<{ from: number; to: number }> = [];
      folded.between(0, editor.state.doc.length, (from, to) => {
        ranges.push({ from, to });
      });
      return ranges;
    }
    return [];
  },
  setFoldState: (ranges: Array<{ from: number; to: number }>) => {
    if (editor && ranges.length > 0) {
      // 应用折叠状态
      const effects = ranges.map(range => foldEffect.of(range));
      editor.dispatch({
        effects,
      });
    }
  },
});
</script>

<template>
  <div ref="container" class="json-editor"></div>
</template>

<style scoped>
.json-editor { 
  width: 100%; 
  height: 100%; 
  flex: 1;
  min-height: 0;
}

/* CodeMirror 基础样式 */
:deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', 'Courier New', 'Menlo', monospace;
  /* 优化字体渲染 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

:deep(.cm-scroller) {
  overflow: auto;
  height: 100%;
  /* 确保没有横向滚动条（自动折行会处理） */
  overflow-x: hidden;
}

:deep(.cm-content) {
  min-height: 100%;
}

:deep(.cm-focused) {
  outline: none;
}

/* 错误高亮 - 移除左侧红色标记 */
:deep(.cm-lint-marker-error) {
  background-color: transparent;
  border-left: none;
}

:deep(.cm-lint-marker-warning) {
  background-color: transparent;
  border-left: none;
}

/* CodeMirror 诊断样式 - 移除左侧红色标记 */
:deep(.cm-diagnostic-error) {
  background-color: transparent !important;
  border-left: none !important;
}

:deep(.cm-diagnostic-warning) {
  background-color: transparent !important;
  border-left: none !important;
}

/* 诊断列表项样式 - 多种选择器确保覆盖 */
:deep(li.cm-diagnostic.cm-diagnostic-error),
:deep(.cm-diagnostic.cm-diagnostic-error),
:deep(ul.cm-tooltip-lint li.cm-diagnostic.cm-diagnostic-error),
:deep(ul.cm-tooltip-lint .cm-diagnostic.cm-diagnostic-error),
:deep(ul.cm-tooltip-lint-section li.cm-diagnostic.cm-diagnostic-error) {
  background-color: transparent !important;
  border-left: none !important;
  padding-left: 0 !important;
  /* 确保覆盖所有可能的边框样式 */
  border-left-width: 0 !important;
  border-left-style: none !important;
  border-left-color: transparent !important;
}

:deep(li.cm-diagnostic.cm-diagnostic-warning),
:deep(.cm-diagnostic.cm-diagnostic-warning),
:deep(ul.cm-tooltip-lint li.cm-diagnostic.cm-diagnostic-warning) {
  background-color: transparent !important;
  border-left: none !important;
  padding-left: 0 !important;
  border-left-width: 0 !important;
  border-left-style: none !important;
  border-left-color: transparent !important;
}

/* 错误提示气泡容器样式 - 移除原生的边框和背景 */
/* 注意：CodeMirror 使用动态生成的类名，可能包含特殊字符 */
/* 移除所有包含 cm-tooltip 的元素的默认样式，但不包括 cm-tooltip-lint */
:deep([class*="cm-tooltip"]:not([class*="cm-tooltip-lint"])) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 错误提示气泡样式（与右侧栏保持一致） */
:deep(.cm-tooltip-lint),
:deep([class*="cm-tooltip-lint"]) {
  background: #fef2f2 !important;
  border: 1px solid #fecaca !important;
  border-left: 3px solid #ef4444 !important;
  border-radius: 6px !important;
  padding: 12px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
  color: #dc2626 !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  font-weight: 500 !important;
  max-width: 400px !important;
}

/* 工具提示箭头样式（如果需要） */
:deep(.cm-tooltip-lint::before) {
  border-color: transparent transparent #fecaca transparent !important;
}

:deep(.cm-tooltip-lint::after) {
  border-color: transparent transparent #fef2f2 transparent !important;
}

/* 行号样式 */
:deep(.cm-lineNumbers) {
  min-width: 30px;
  padding-right: 8px;
}

:deep(.cm-lineNumbers .cm-gutterElement) {
  text-align: right;
  color: #6b7280;
}
</style>
