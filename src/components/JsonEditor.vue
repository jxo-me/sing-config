<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { EditorView, lineNumbers } from '@codemirror/view';
import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { foldGutter } from '@codemirror/language';
import { bracketMatching } from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { history, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, indentUnit } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import { closeBrackets } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { jsonSchema, jsonSchemaSync } from '../lib/codemirror-json-schema';
import { contextMenu } from '../lib/codemirror-context-menu';
import { jsonSchemaAutocompleteExtension } from '../lib/json-schema-autocomplete';
import { useI18n } from '../i18n';

const { currentLocale } = useI18n();

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

// JSON 语法高亮样式
const jsonHighlightStyle = HighlightStyle.define([
  { tag: t.string, color: '#0ea5e9' }, // 字符串：蓝色
  { tag: t.number, color: '#8b5cf6' }, // 数字：紫色
  { tag: t.bool, color: '#f59e0b' }, // 布尔值：橙色
  { tag: t.null, color: '#ef4444' }, // null：红色
  { tag: t.propertyName, color: '#10b981', fontWeight: 'bold' }, // 属性名：绿色粗体
  { tag: t.punctuation, color: '#6b7280' }, // 标点符号：灰色
  { tag: t.bracket, color: '#6b7280' }, // 括号：灰色
  { tag: t.separator, color: '#6b7280' }, // 分隔符：灰色
]);

onMounted(async () => {
  if (!container.value) return;

  // 先加载基础扩展
  const baseExtensions: Extension[] = [
    lineNumbers(),
    foldGutter(),
    bracketMatching(),
    closeBrackets(),
    history(),
    indentOnInput(),
    indentUnit.of('  '), // 2 spaces
    highlightSelectionMatches(),
    json(), // JSON 语言支持（包含语法高亮）
    syntaxHighlighting(jsonHighlightStyle), // 应用语法高亮样式
    jsonSchemaSync(), // JSON Schema 验证（占位，后续更新）
    jsonSchemaAutocompleteExtension(), // JSON Schema 自动补全
    contextMenu(), // 自定义多语言右键菜单
    keymap.of([
      indentWithTab, // Tab 键缩进，Shift+Tab 取消缩进
      ...defaultKeymap, // 其他默认快捷键（包括 Ctrl+A, Ctrl+C, Ctrl+V 等）
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        window.clearTimeout(changeTimer);
        changeTimer = window.setTimeout(() => {
          const content = editor?.state.doc.toString() || '';
          emit('update:modelValue', content);
        }, 300);
      }
    }),
    // 启用自动折行，避免横向滚动条
    EditorView.lineWrapping,
    // 自动布局和主题样式
    EditorView.theme({
      '&': {
        height: '100%',
      },
      '.cm-scroller': {
        overflow: 'auto',
        // 自定义滚动条样式（仅在 Webkit 浏览器中）
        '&::-webkit-scrollbar': {
          width: '10px',
          height: '10px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f5f9',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#cbd5e1',
          borderRadius: '5px',
          '&:hover': {
            background: '#94a3b8',
          },
        },
      },
      '.cm-editor': {
        height: '100%',
      },
      '.cm-content': {
        minHeight: '100%',
        padding: '12px', // 增加内边距，提高可读性
      },
      '.cm-line': {
        lineHeight: '1.6', // 增加行高，提高可读性
        padding: '0 4px', // 行内边距
      },
      // 优化选中文本样式
      '.cm-selectionBackground': {
        background: '#dbeafe !important', // 更明显的选中背景
      },
      '&.cm-focused .cm-selectionBackground': {
        background: '#bfdbfe !important',
      },
      // 优化代码折叠区域
      '.cm-foldPlaceholder': {
        border: '1px solid #e2e8f0',
        borderRadius: '3px',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        padding: '2px 6px',
        cursor: 'pointer',
      },
      // 优化行号样式
      '.cm-lineNumbers': {
        backgroundColor: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        minWidth: '40px', // 增加行号宽度，支持更多行数
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px',
      },
      // 优化折叠图标
      '.cm-foldGutter': {
        width: '16px',
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
      },
    }),
  ];

  // 创建编辑器
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue ?? '',
      extensions: baseExtensions,
    }),
    parent: container.value,
  });

  // 异步加载 schema 并更新扩展
  const schemaExtensions = await jsonSchema();
  // 使用 StateEffect.appendConfig 来添加新扩展
  editor.dispatch({
    effects: StateEffect.appendConfig.of(schemaExtensions),
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

onBeforeUnmount(() => {
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

/* 错误高亮 */
:deep(.cm-lint-marker-error) {
  background-color: rgba(239, 68, 68, 0.2);
  border-left: 3px solid #ef4444;
}

:deep(.cm-lint-marker-warning) {
  background-color: rgba(251, 191, 36, 0.2);
  border-left: 3px solid #fbbf24;
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
