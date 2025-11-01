<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Topbar from '../components/Topbar.vue';
import JsonEditor from '../components/JsonEditor.vue';
import DnsForm from '../components/forms/DnsForm.vue';
import InboundForm from '../components/forms/InboundForm.vue';
import OutboundForm from '../components/forms/OutboundForm.vue';
import RouteForm from '../components/forms/RouteForm.vue';
import LogForm from '../components/forms/LogForm.vue';
import NtpForm from '../components/forms/NtpForm.vue';
import CertificateForm from '../components/forms/CertificateForm.vue';
import EndpointsForm from '../components/forms/EndpointsForm.vue';
import ServicesForm from '../components/forms/ServicesForm.vue';
import ExperimentalForm from '../components/forms/ExperimentalForm.vue';
import { currentConfig, errorCount, lastValidation, toPrettyJson, loadFromText, syncEditorContentToConfig, runValidation, configDiff, isDirty, lastSavedPath, lastOpenedPath } from '../stores/config';
import { useI18n } from '../i18n';
import { runPreflightCheck, type PreflightIssue } from '../lib/preflight';
import { editorErrors, editorValidationState } from '../lib/codemirror-json-schema';
import { setupMenuHandlers, cleanupMenuHandlers, setTopbarRef, setEditorRef } from '../lib/menu-handler';
import { invoke } from '@tauri-apps/api/core';
import { useResponsive } from '../composables/useResponsive';

const { t, currentLocale, setLocale } = useI18n();

// 响应式布局检测
const { isMobile, isLandscape } = useResponsive();

// 监听语言变化，触发错误消息重新本地化
watch(currentLocale, async () => {
  // 当语言切换时，编辑器会重新验证（通过 JsonEditor 中的 watch(currentLocale)）
  // 如果当前显示的是表单模式的错误，重新验证以更新消息语言
  if (mode.value === 'form') {
    await runValidation();
  }
  // 如果当前显示的是运行检查结果，重新运行检查以更新消息语言
  if (activeTab.value === 'preflight' && preflightIssues.value.length > 0) {
    preflightIssues.value = await runPreflightCheck();
  }
});

// 监听 currentConfig 变化，同步更新 text.value（用于外部更新场景：加载文件、加载示例、清空等）
watch(currentConfig, async () => {
  // 如果正在用户编辑，不自动更新 text.value（避免打断用户输入）
  if (isUserEditing) {
    return;
  }
  
  // 当 currentConfig 通过 loadFromText 等方式更新时，同步 text.value
  // 等待下一个 tick 确保配置已完全更新
  await nextTick();
  const currentTextFromConfig = toPrettyJson();
  
  // 只有当内容确实不同时才更新（避免不必要的更新）
  if (text.value !== currentTextFromConfig) {
    text.value = currentTextFromConfig;
  }
}, { flush: 'post' });

const preflightIssues = ref<PreflightIssue[]>([]);
const showPreflight = ref(false);
const topbarRef = ref<{ onNew: () => Promise<void>; onSave: () => Promise<void>; onSaveAs: () => Promise<void>; onOpen: () => Promise<void>; isOpening?: () => boolean } | null>(null);

const mode = ref<'json' | 'form'>('json');
const activeForm = ref<'log' | 'dns' | 'ntp' | 'certificate' | 'endpoints' | 'inbounds' | 'outbounds' | 'route' | 'services' | 'experimental'>('dns');
const activeTab = ref<'errors' | 'diff' | 'preflight'>('errors');

// 移动端布局控制状态
const showMobilePanel = ref(false); // 是否显示全屏面板
const showMobileSidebar = ref(false); // 是否显示表单抽屉
const text = ref(toPrettyJson());
const jsonEditorRef = ref<{ 
  gotoLine: (line: number, column?: number) => void;
  getScrollPosition: () => { scrollTop: number; scrollLeft: number };
  setScrollPosition: (scrollTop: number, scrollLeft?: number) => void;
  undo?: () => void;
  redo?: () => void;
  openSearch?: () => void;
  openReplace?: () => void;
  getFoldState?: () => Array<{ from: number; to: number }>;
  setFoldState?: (ranges: Array<{ from: number; to: number }>) => void;
} | null>(null);
const formContainerRef = ref<HTMLDivElement | null>(null);

// 保存滚动位置和折叠状态
const scrollPositions = ref<{
  json: { scrollTop: number; scrollLeft: number; foldRanges: Array<{ from: number; to: number }> };
  form: { scrollTop: number; scrollLeft: number };
}>({
  json: { scrollTop: 0, scrollLeft: 0, foldRanges: [] },
  form: { scrollTop: 0, scrollLeft: 0 },
});

function formatDiffValue(value: unknown): string {
  if (value === undefined || value === null) {
    return String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// 取消自动格式化 - 用户需要手动点击格式化按钮
// watch(currentConfig, () => {
//   text.value = toPrettyJson();
// });

let timer: number | undefined;
let isUserEditing = false; // 标记是否正在用户编辑

/**
 * JSON 模式下的输入处理
 * 使用 syncEditorContentToConfig 而不是 loadFromText，
 * 避免重置原始配置导致差异消失
 */
async function onInput(val: string) {
  isUserEditing = true; // 标记为用户编辑
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    // 使用 syncEditorContentToConfig 只同步内容，不更新原始配置
    // 这样差异计算可以正常工作，不会因为输入而消失
    syncEditorContentToConfig(val);
    isUserEditing = false; // 编辑完成
  }, 300);
}

// 校验函数：在 JSON 模式下使用编辑器错误，表单模式下使用独立校验
async function validateNow() {
  if (mode.value === 'json') {
    // JSON 模式下，编辑器已经实时校验，这里只需要刷新显示
    // editorErrors 会由编辑器 linter 自动更新
    return;
  } else {
    // 表单模式下，需要独立校验
    await runValidation();
  }
}

// 计算当前显示的错误（JSON 模式用编辑器错误，表单模式用 lastValidation）
const displayedErrors = computed(() => {
  if (mode.value === 'json') {
    return editorErrors.value;
  } else {
    return lastValidation.value.errors;
  }
});

// 计算当前错误数量
const currentErrorCount = computed(() => {
  if (mode.value === 'json') {
    return editorValidationState.value.errorCount;
  } else {
    return errorCount.value;
  }
});

// 计算当前表单标签
const currentFormLabel = computed(() => {
  const labels: Record<string, { zh: string; en: string }> = {
    'log': { zh: '日志', en: 'Log' },
    'dns': { zh: 'DNS', en: 'DNS' },
    'ntp': { zh: 'NTP', en: 'NTP' },
    'certificate': { zh: '证书', en: 'Certificate' },
    'endpoints': { zh: '端点', en: 'Endpoints' },
    'inbounds': { zh: '入站', en: 'Inbounds' },
    'outbounds': { zh: '出站', en: 'Outbounds' },
    'route': { zh: '路由', en: 'Route' },
    'services': { zh: '服务', en: 'Services' },
    'experimental': { zh: '实验', en: 'Experimental' },
  };
  const label = labels[activeForm.value] || { zh: '未知', en: 'Unknown' };
  return currentLocale.value === 'zh' ? label.zh : label.en;
});

// 计算差异统计信息
const diffStats = computed(() => {
  const added = configDiff.value.filter(d => d.type === 'added').length;
  const removed = configDiff.value.filter(d => d.type === 'removed').length;
  const modified = configDiff.value.filter(d => d.type === 'modified').length;
  return { added, removed, modified };
});

async function runPreflight() {
  preflightIssues.value = await runPreflightCheck();
  activeTab.value = 'preflight';
  showPreflight.value = true;
}

function getIssueLevelClass(level: string): string {
  return {
    error: 'issue-error',
    warning: 'issue-warning',
    info: 'issue-info',
  }[level] || '';
}


function handleKeyboardShortcuts(event: KeyboardEvent) {
  // Ctrl+Q / Cmd+Q: 退出应用（Windows 上的备用处理）
  if ((event.ctrlKey || event.metaKey) && event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    // 通过 Tauri 命令退出应用
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('exit_app');
    }).catch(() => {
      // 如果命令不存在，尝试直接调用 window.close
      window.close();
    });
    return;
  }
  
  // Ctrl+S / Cmd+S: 保存
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    if (topbarRef.value) {
      topbarRef.value.onSave();
    }
    return;
  }
  
  // Ctrl+Shift+S / Cmd+Shift+S: 另存为
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    if (topbarRef.value) {
      topbarRef.value.onSaveAs();
    }
    return;
  }
  
  // Ctrl+N / Cmd+N: 新建文件（作为菜单系统的后备）
  if ((event.ctrlKey || event.metaKey) && (event.key === 'n' || event.key === 'N')) {
    event.preventDefault();
    topbarRef.value?.onNew?.();
    return;
  }
  
  // Ctrl+O / Cmd+O: 打开文件（作为菜单系统的后备）
  if ((event.ctrlKey || event.metaKey) && (event.key === 'o' || event.key === 'O')) {
    // 检查是否已经在打开中，防止重复调用
    if (topbarRef.value?.isOpening?.()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    topbarRef.value?.onOpen?.();
    return;
  }
  
  // Ctrl+Z / Cmd+Z: 撤销（当编辑器在 JSON 模式时）
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
    // 只在 JSON 模式下处理，让 CodeMirror 在编辑器有焦点时处理
    // 如果编辑器没有焦点，或者 CodeMirror 没有处理，我们这里作为后备
    if (mode.value === 'json' && jsonEditorRef.value?.undo) {
      event.preventDefault();
      jsonEditorRef.value.undo();
    }
    return;
  }
  
  // Ctrl+Shift+Z / Cmd+Shift+Z: 重做（当编辑器在 JSON 模式时）
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
    if (mode.value === 'json' && jsonEditorRef.value?.redo) {
      event.preventDefault();
      jsonEditorRef.value.redo();
    }
    return;
  }
  
  // Ctrl+F / Cmd+F: 查找（JSON 模式）
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'f' || event.key === 'F')) {
    if (mode.value === 'json' && jsonEditorRef.value?.openSearch) {
      event.preventDefault();
      jsonEditorRef.value.openSearch();
    }
    return;
  }
  
  // Ctrl+H / Cmd+H: 替换（JSON 模式）
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'h' || event.key === 'H')) {
    if (mode.value === 'json' && jsonEditorRef.value?.openReplace) {
      event.preventDefault();
      jsonEditorRef.value.openReplace();
    }
    return;
  }
  
  // Ctrl+Shift+F / Cmd+Shift+F: 格式化（JSON 模式）
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'f' || event.key === 'F')) {
    event.preventDefault();
    handleFormat();
    return;
  }
  
}

let formatTextHandler: EventListener | null = null;

// 格式化功能
async function handleFormat() {
  try {
    // 先尝试解析当前的文本（可能包含无效 JSON）
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text.value || '{}');
    } catch (parseErr) {
      // 如果当前文本无效，尝试使用 currentConfig（如果存在）
      console.warn('Current text is invalid JSON, using currentConfig:', parseErr);
      parsed = currentConfig.value || {};
    }
    
    // 格式化 JSON（使用 2 空格缩进）
    const formatted = JSON.stringify(parsed, null, 2);
    
    // 更新文本和配置
    text.value = formatted;
    await loadFromText(formatted);
    
    // 确保编辑器内容同步
    await nextTick();
    if (text.value !== formatted) {
      text.value = formatted;
    }
  } catch (err) {
    console.error('Failed to format JSON:', err);
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyboardShortcuts);
  
  // 监听格式化/压缩事件
  formatTextHandler = ((event: Event) => {
    const customEvent = event as CustomEvent<string>;
    if (customEvent.detail) {
      text.value = customEvent.detail;
    }
  }) as EventListener;
  window.addEventListener('update-json-text', formatTextHandler);
  
  // 监听菜单触发的格式化事件
  window.addEventListener('format-json', handleFormat as EventListener);
  
  // 监听菜单触发的语言切换事件
  window.addEventListener('change-locale', ((event: Event) => {
    const customEvent = event as CustomEvent<'zh' | 'en'>;
    if (customEvent.detail) {
      setLocale(customEvent.detail);
    }
  }) as EventListener);
  
  // 初始化菜单事件处理器
  await setupMenuHandlers();
  
  // 设置 Topbar 和 Editor 引用
  await nextTick();
  setTopbarRef(topbarRef.value);
  
  // 创建 editorRef 对象的辅助函数
  const updateEditorRef = () => {
    setEditorRef({
      mode: mode.value,
      setMode: (m: 'form' | 'json') => {
        mode.value = m;
      },
      runPreflight: async () => {
        preflightIssues.value = await runPreflightCheck();
        activeTab.value = 'preflight';
      },
      runValidation: async () => {
        runValidation();
        activeTab.value = 'errors';
      },
      jsonEditor: jsonEditorRef.value
    });
  };
  
  // 初始设置
  updateEditorRef();
  
  // 监听 jsonEditorRef 的变化，确保编辑器初始化后更新引用
  watch(jsonEditorRef, (newRef) => {
    if (newRef) {
      updateEditorRef();
    }
  }, { immediate: true });
  
  // 更新窗口标题的函数
  const updateWindowTitle = async () => {
    let title = 'sing-config';
    // 优先使用保存路径，如果不存在则使用打开路径
    // 如果保存路径存在，说明文件已经保存过，应该显示保存的文件名
    // 如果只有打开路径，说明是新打开的文件，还未保存
    const filePath = lastSavedPath.value || lastOpenedPath.value;
    
    if (filePath) {
      // 提取文件名
      const fileName = filePath.split(/[/\\]/).pop() || 'untitled.json';
      title = fileName;
    }
    
    // 如果有未保存的修改，添加星号
    // 注意：如果文件已保存（有 lastSavedPath），但后来又被修改了，也应该显示星号
    if (isDirty.value) {
      title += '*';
    }
    
    try {
      await invoke('set_window_title', { title });
    } catch (error) {
      console.error('Failed to update window title:', error);
    }
  };
  
  // 监听 isDirty、lastSavedPath 和 lastOpenedPath 的变化，更新窗口标题
  watch([isDirty, lastSavedPath, lastOpenedPath], () => {
    updateWindowTitle();
  }, { immediate: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts);
  if (formatTextHandler) {
    window.removeEventListener('update-json-text', formatTextHandler);
  }
  window.removeEventListener('format-json', handleFormat);
  // 清理菜单事件监听器
  cleanupMenuHandlers();
});

// 保存当前模式的滚动位置和折叠状态
function saveScrollPosition(currentMode: 'json' | 'form') {
  if (currentMode === 'json' && jsonEditorRef.value) {
    const pos = jsonEditorRef.value.getScrollPosition();
    const foldRanges = jsonEditorRef.value.getFoldState ? jsonEditorRef.value.getFoldState() : [];
    scrollPositions.value.json = {
      ...pos,
      foldRanges,
    };
  } else if (currentMode === 'form' && formContainerRef.value) {
    scrollPositions.value.form = {
      scrollTop: formContainerRef.value.scrollTop,
      scrollLeft: formContainerRef.value.scrollLeft,
    };
  }
}

// 恢复滚动位置和折叠状态
async function restoreScrollPosition(targetMode: 'json' | 'form') {
  await nextTick();
  // 额外等待确保 DOM 完全渲染
  setTimeout(() => {
    if (targetMode === 'json' && jsonEditorRef.value) {
      const pos = scrollPositions.value.json;
      jsonEditorRef.value.setScrollPosition(pos.scrollTop, pos.scrollLeft);
      // 恢复折叠状态
      if (jsonEditorRef.value.setFoldState && pos.foldRanges.length > 0) {
        jsonEditorRef.value.setFoldState(pos.foldRanges);
      }
    } else if (targetMode === 'form' && formContainerRef.value) {
      const pos = scrollPositions.value.form;
      formContainerRef.value.scrollTop = pos.scrollTop;
      formContainerRef.value.scrollLeft = pos.scrollLeft;
    }
  }, 150);
}

// 监听模式切换
watch(mode, (newMode, oldMode) => {
  if (oldMode) {
    // 保存旧模式的滚动位置
    saveScrollPosition(oldMode);
  }
  // 恢复新模式的滚动位置
  restoreScrollPosition(newMode);
});

// 监听表单切换（表单模式内切换时也保存滚动位置）
watch(activeForm, (_newForm, oldForm) => {
  if (mode.value === 'form') {
    // 切换表单时保存当前滚动位置
    if (oldForm) {
      saveScrollPosition('form');
    }
    // 恢复新表单的滚动位置（如果之前有保存）
    restoreScrollPosition('form');
  }
});

async function gotoError(path: string) {
  if (!path) return;
  
  // 保存表单模式的滚动位置
  const wasFormMode = mode.value === 'form';
  if (wasFormMode) {
    saveScrollPosition('form');
  }
  
  // 切换到 JSON 模式
  mode.value = 'json';
  
  // 等待模式切换和编辑器渲染完成
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!jsonEditorRef.value) {
    console.warn('JsonEditor ref is not available');
    return;
  }
  
  // 策略1：尝试从 editorErrors 中查找匹配的错误，使用存储的位置信息（最准确）
  const matchingError = editorErrors.value.find(e => e.path === path);
  
  if (matchingError) {
    // 优先使用精确的位置信息（from/to）
    if (matchingError.from !== undefined) {
      try {
        // 计算行号
        const source = text.value;
        const beforePos = source.substring(0, matchingError.from);
        const line = beforePos.split('\n').length;
        
        // 如果可能，也计算列号（用于更精确的定位）
        const lastLineStart = beforePos.lastIndexOf('\n') + 1;
        const column = beforePos.length - lastLineStart;
        
        jsonEditorRef.value.gotoLine(line, column > 0 ? column : undefined);
        return;
      } catch (e) {
        console.warn('Failed to use from position:', e);
      }
    }
    
    // 其次使用存储的行号
    if (matchingError.line) {
      jsonEditorRef.value.gotoLine(matchingError.line);
      return;
    }
  }
  
  // 策略3：使用路径搜索（原有逻辑，作为后备）
  try {
    const source = text.value;
    // 验证 JSON 是否有效
    JSON.parse(source);
    const parts = path.split('/').filter(p => p && p !== '$schema');
    
    if (parts.length === 0) {
      // 根路径，跳转到第一行
      jsonEditorRef.value.gotoLine(1);
      return;
    }
    
    // 构建完整的搜索路径，用于精确匹配
    // 例如：/dns/servers/0/type -> 查找在 servers[0] 对象中的 type
    const lines = source.split('\n');
    let bestMatch: { line: number; score: number } | null = null;
    
    // 策略3a：查找最后一个字段名（最精确）
    const lastPart = parts[parts.length - 1];
    const searchKey = lastPart;
    const escapedKey = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 查找包含该键的行，但需要确保它在正确的上下文中
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 精确匹配键名（带引号和冒号）
      const keyPattern = new RegExp(`["']${escapedKey}["']\\s*:`, 'i');
      if (keyPattern.test(line)) {
        // 计算上下文匹配度（检查前面的路径部分是否在附近出现）
        let contextScore = 0;
        const contextStart = Math.max(0, i - 20); // 向上查找20行作为上下文
        const contextLines = lines.slice(contextStart, i + 1).join('\n');
        
        // 检查路径的父级是否在上下文中
        for (let j = parts.length - 2; j >= 0; j--) {
          const parentPart = parts[j];
          if (contextLines.includes(`"${parentPart}"`) || contextLines.includes(`'${parentPart}'`)) {
            contextScore++;
          }
        }
        
        // 如果找到的键有良好的上下文匹配，优先选择
        const score: number = contextScore * 10 + (bestMatch && i < bestMatch.line ? 1 : 0);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { line: i + 1, score };
        }
      }
    }
    
    // 如果找到最佳匹配，跳转到那里
    if (bestMatch) {
      jsonEditorRef.value.gotoLine(bestMatch.line);
      return;
    }
    
    // 策略4：如果找不到，尝试查找路径中的任何一个部分（从后往前）
    const reversedParts = [...parts].reverse();
    for (const part of reversedParts) {
      const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keyPattern = new RegExp(`["']${escapedPart}["']\\s*:`, 'i');
      
      for (let i = 0; i < lines.length; i++) {
        if (keyPattern.test(lines[i])) {
          jsonEditorRef.value.gotoLine(i + 1);
          return;
        }
      }
    }
    
    // 策略5：最后的后备方案 - 简单文本搜索
    const fallbackKey = parts[parts.length - 1];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${fallbackKey}"`) || lines[i].includes(`'${fallbackKey}'`)) {
        jsonEditorRef.value.gotoLine(i + 1);
        return;
      }
    }
    
    console.warn('Could not find path in source:', path);
  } catch (e) {
    // JSON 解析失败，使用简单的文本搜索
    console.warn('Failed to parse JSON, using fallback search:', e);
    const parts = path.split('/').filter(p => p && p !== '$schema');
    if (parts.length > 0) {
      const searchKey = parts[parts.length - 1];
      const lines = text.value.split('\n');
      const escapedKey = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keyPattern = new RegExp(`["']?${escapedKey}["']?\\s*:`, 'i');
      
      for (let i = 0; i < lines.length; i++) {
        if (keyPattern.test(lines[i])) {
          await nextTick();
          await new Promise(resolve => setTimeout(resolve, 100));
          if (jsonEditorRef.value) {
            jsonEditorRef.value.gotoLine(i + 1);
          }
          return;
        }
      }
    }
  }
}
</script>

<template>
  <div class="editor-layout" :class="{ 
    'mobile-layout': isMobile,
    'form-mode-portrait': isMobile && mode === 'form' && !isLandscape
  }">
    <Topbar ref="topbarRef" />
    <div class="mode-switcher">
      <button :class="{ active: mode === 'json' }" @click="mode = 'json'">{{ t.common.json }}</button>
      <button :class="{ active: mode === 'form' }" @click="mode = 'form'">{{ t.common.form }}</button>
    </div>
    
    <!-- Mobile: 表单抽屉按钮 -->
    <button v-if="isMobile && mode === 'form'" class="mobile-sidebar-toggle" @click="showMobileSidebar = true">
      {{ currentFormLabel }}
    </button>
    
    <div class="body">
      <!-- Desktop: 固定侧边栏 -->
      <div v-show="mode === 'form' && !isMobile" class="sidebar">
        <nav class="form-nav">
          <button :class="{ active: activeForm === 'log' }" @click="activeForm = 'log'">
            {{ currentLocale === 'zh' ? '日志' : 'Log' }}
          </button>
          <button :class="{ active: activeForm === 'dns' }" @click="activeForm = 'dns'">
            {{ t.dns.title }}
          </button>
          <button :class="{ active: activeForm === 'ntp' }" @click="activeForm = 'ntp'">
            {{ currentLocale === 'zh' ? 'NTP' : 'NTP' }}
          </button>
          <button :class="{ active: activeForm === 'certificate' }" @click="activeForm = 'certificate'">
            {{ currentLocale === 'zh' ? '证书' : 'Certificate' }}
          </button>
          <button :class="{ active: activeForm === 'endpoints' }" @click="activeForm = 'endpoints'">
            {{ currentLocale === 'zh' ? '端点' : 'Endpoints' }}
          </button>
          <button :class="{ active: activeForm === 'inbounds' }" @click="activeForm = 'inbounds'">
            {{ currentLocale === 'zh' ? '入站' : 'Inbounds' }}
          </button>
          <button :class="{ active: activeForm === 'outbounds' }" @click="activeForm = 'outbounds'">
            {{ currentLocale === 'zh' ? '出站' : 'Outbounds' }}
          </button>
          <button :class="{ active: activeForm === 'route' }" @click="activeForm = 'route'">
            {{ currentLocale === 'zh' ? '路由' : 'Route' }}
          </button>
          <button :class="{ active: activeForm === 'services' }" @click="activeForm = 'services'">
            {{ currentLocale === 'zh' ? '服务' : 'Services' }}
          </button>
          <button :class="{ active: activeForm === 'experimental' }" @click="activeForm = 'experimental'">
            {{ currentLocale === 'zh' ? '实验' : 'Experimental' }}
          </button>
        </nav>
      </div>
      <div class="left">
        <div v-show="mode === 'json'" class="json-editor-wrapper">
          <JsonEditor 
            ref="jsonEditorRef" 
            v-model="text" 
            @update:modelValue="onInput"
          />
        </div>
        <div v-show="mode === 'form'" ref="formContainerRef" class="form-container">
          <LogForm v-if="activeForm === 'log'" />
          <DnsForm v-else-if="activeForm === 'dns'" />
          <NtpForm v-else-if="activeForm === 'ntp'" />
          <CertificateForm v-else-if="activeForm === 'certificate'" />
          <EndpointsForm v-else-if="activeForm === 'endpoints'" />
          <InboundForm v-else-if="activeForm === 'inbounds'" />
          <OutboundForm v-else-if="activeForm === 'outbounds'" />
          <RouteForm v-else-if="activeForm === 'route'" />
          <ServicesForm v-else-if="activeForm === 'services'" />
          <ExperimentalForm v-else-if="activeForm === 'experimental'" />
          <div v-else class="placeholder">
            <p>{{ currentLocale === 'zh' ? '正在开发中...' : 'Coming soon...' }}</p>
          </div>
        </div>
      </div>
      
      <!-- Desktop: 固定右侧面板 -->
      <div v-if="!isMobile" class="right">
        <div class="panel">
          <div class="tabs">
            <button :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">
              {{ t.common.errors }} ({{ currentErrorCount }})
            </button>
            <button :class="{ active: activeTab === 'diff' }" @click="activeTab = 'diff'">
              {{ currentLocale === 'zh' ? '差异' : 'Diff' }} ({{ configDiff.length }})
            </button>
            <button :class="{ active: activeTab === 'preflight' }" @click="runPreflight">
              {{ currentLocale === 'zh' ? '运行检查' : 'Preflight' }} ({{ preflightIssues.length }})
            </button>
          </div>
          
          <div v-show="activeTab === 'errors'" class="tab-content">
            <button @click="validateNow" class="validate-btn" v-if="mode === 'form'">{{ t.common.validate }}</button>
            <div v-if="mode === 'json'" class="validation-status">
              <span class="status-text">
                {{ currentLocale === 'zh' 
                  ? `实时校验中... (${currentErrorCount} 个错误)` 
                  : `Real-time validation... (${currentErrorCount} errors)` }}
              </span>
            </div>
            <ul class="errors">
              <li v-for="(e, idx) in displayedErrors" :key="idx" @click="gotoError(e.path)" class="error-item">
                <span class="path">{{ e.path || (currentLocale === 'zh' ? '(根)' : '(root)') }}</span>
                <span class="msg">{{ e.message }}</span>
              </li>
              <li v-if="displayedErrors.length === 0" class="no-errors">
                {{ currentLocale === 'zh' ? '没有错误' : 'No errors' }}
              </li>
            </ul>
          </div>
          
          <div v-show="activeTab === 'diff'" class="tab-content">
            <div v-if="configDiff.length > 0" class="diff-summary">
              <div class="diff-stats">
                <span class="stat-item added">
                  <strong>{{ diffStats.added }}</strong> {{ currentLocale === 'zh' ? '新增' : 'Added' }}
                </span>
                <span class="stat-item removed">
                  <strong>{{ diffStats.removed }}</strong> {{ currentLocale === 'zh' ? '删除' : 'Removed' }}
                </span>
                <span class="stat-item modified">
                  <strong>{{ diffStats.modified }}</strong> {{ currentLocale === 'zh' ? '修改' : 'Modified' }}
                </span>
              </div>
            </div>
            <div class="diff-list">
              <div v-for="(diff, idx) in configDiff.slice(0, 50)" :key="idx" class="diff-item" :class="[diff.type, diff.severity || 'minor']">
                <div class="diff-header">
                  <div class="diff-path">{{ diff.path }}</div>
                  <span v-if="diff.severity === 'major'" class="diff-badge major">
                    {{ currentLocale === 'zh' ? '重要' : 'Major' }}
                  </span>
                </div>
                <div v-if="diff.type === 'modified'" class="diff-body">
                  <div class="diff-change">
                    <span class="diff-label">{{ currentLocale === 'zh' ? '旧值' : 'Old' }}:</span>
                    <span class="diff-value">{{ formatDiffValue(diff.oldValue) }}</span>
                  </div>
                  <div class="diff-change">
                    <span class="diff-label">{{ currentLocale === 'zh' ? '新值' : 'New' }}:</span>
                    <span class="diff-value">{{ formatDiffValue(diff.newValue) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="configDiff.length === 0" class="no-diff">
                {{ currentLocale === 'zh' ? '没有修改' : 'No changes' }}
              </div>
              <div v-if="configDiff.length > 50" class="diff-more">
                {{ currentLocale === 'zh' ? `还有 ${configDiff.length - 50} 个修改...` : `${configDiff.length - 50} more changes...` }}
              </div>
            </div>
          </div>
          
          <div v-show="activeTab === 'preflight'" class="tab-content">
            <button @click="runPreflight" class="validate-btn">{{ currentLocale === 'zh' ? '重新检查' : 'Re-check' }}</button>
            <div class="preflight-list">
              <div v-for="(issue, idx) in preflightIssues" :key="idx" class="preflight-item" :class="getIssueLevelClass(issue.level)" @click="gotoError(issue.path)">
                <div class="issue-header">
                  <span class="issue-level">{{ issue.level.toUpperCase() }}</span>
                  <span class="issue-path">{{ issue.path || (currentLocale === 'zh' ? '(根)' : '(root)') }}</span>
                </div>
                <div class="issue-message">{{ issue.message }}</div>
                <div v-if="issue.fix" class="issue-fix">
                  <span class="fix-label">{{ currentLocale === 'zh' ? '建议修复' : 'Suggested fix' }}:</span>
                  <span class="fix-text">{{ issue.fix }}</span>
                </div>
              </div>
              <div v-if="preflightIssues.length === 0" class="no-issues">
                {{ currentLocale === 'zh' ? '没有发现问题' : 'No issues found' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile: 底部标签栏 -->
    <!-- 竖屏模式 + 表单模式：隐藏标签栏 -->
    <!-- 竖屏模式 + JSON 模式：显示标签栏 -->
    <!-- 横屏模式：显示标签栏 -->
    <div v-if="isMobile && (mode === 'json' || isLandscape)" class="mobile-tabs">
      <button :class="{ active: activeTab === 'errors' }" @click="showMobilePanel = true; activeTab = 'errors'">
        {{ t.common.errors }} ({{ currentErrorCount }})
      </button>
      <button :class="{ active: activeTab === 'diff' }" @click="showMobilePanel = true; activeTab = 'diff'">
        {{ currentLocale === 'zh' ? '差异' : 'Diff' }} ({{ configDiff.length }})
      </button>
      <button :class="{ active: activeTab === 'preflight' }" @click="runPreflight">
        {{ currentLocale === 'zh' ? '运行检查' : 'Preflight' }} ({{ preflightIssues.length }})
      </button>
    </div>
    
    <!-- Mobile: 全屏错误/差异面板 -->
    <div v-if="isMobile && showMobilePanel" class="mobile-panel-overlay" @click="showMobilePanel = false">
      <div class="mobile-panel" @click.stop>
        <div class="panel">
          <div class="tabs">
            <button :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">
              {{ t.common.errors }} ({{ currentErrorCount }})
            </button>
            <button :class="{ active: activeTab === 'diff' }" @click="activeTab = 'diff'">
              {{ currentLocale === 'zh' ? '差异' : 'Diff' }} ({{ configDiff.length }})
            </button>
            <button :class="{ active: activeTab === 'preflight' }" @click="runPreflight">
              {{ currentLocale === 'zh' ? '运行检查' : 'Preflight' }} ({{ preflightIssues.length }})
            </button>
          </div>
          
          <div v-show="activeTab === 'errors'" class="tab-content">
            <button @click="validateNow" class="validate-btn" v-if="mode === 'form'">{{ t.common.validate }}</button>
            <div v-if="mode === 'json'" class="validation-status">
              <span class="status-text">
                {{ currentLocale === 'zh' 
                  ? `实时校验中... (${currentErrorCount} 个错误)` 
                  : `Real-time validation... (${currentErrorCount} errors)` }}
              </span>
            </div>
            <ul class="errors">
              <li v-for="(e, idx) in displayedErrors" :key="idx" @click="gotoError(e.path)" class="error-item">
                <span class="path">{{ e.path || (currentLocale === 'zh' ? '(根)' : '(root)') }}</span>
                <span class="msg">{{ e.message }}</span>
              </li>
              <li v-if="displayedErrors.length === 0" class="no-errors">
                {{ currentLocale === 'zh' ? '没有错误' : 'No errors' }}
              </li>
            </ul>
          </div>
          
          <div v-show="activeTab === 'diff'" class="tab-content">
            <div v-if="configDiff.length > 0" class="diff-summary">
              <div class="diff-stats">
                <span class="stat-item added">
                  <strong>{{ diffStats.added }}</strong> {{ currentLocale === 'zh' ? '新增' : 'Added' }}
                </span>
                <span class="stat-item removed">
                  <strong>{{ diffStats.removed }}</strong> {{ currentLocale === 'zh' ? '删除' : 'Removed' }}
                </span>
                <span class="stat-item modified">
                  <strong>{{ diffStats.modified }}</strong> {{ currentLocale === 'zh' ? '修改' : 'Modified' }}
                </span>
              </div>
            </div>
            <div class="diff-list">
              <div v-for="(diff, idx) in configDiff.slice(0, 50)" :key="idx" class="diff-item" :class="[diff.type, diff.severity || 'minor']">
                <div class="diff-header">
                  <div class="diff-path">{{ diff.path }}</div>
                  <span v-if="diff.severity === 'major'" class="diff-badge major">
                    {{ currentLocale === 'zh' ? '重要' : 'Major' }}
                  </span>
                </div>
                <div v-if="diff.type === 'modified'" class="diff-body">
                  <div class="diff-change">
                    <span class="diff-label">{{ currentLocale === 'zh' ? '旧值' : 'Old' }}:</span>
                    <span class="diff-value">{{ formatDiffValue(diff.oldValue) }}</span>
                  </div>
                  <div class="diff-change">
                    <span class="diff-label">{{ currentLocale === 'zh' ? '新值' : 'New' }}:</span>
                    <span class="diff-value">{{ formatDiffValue(diff.newValue) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="configDiff.length === 0" class="no-diff">
                {{ currentLocale === 'zh' ? '没有修改' : 'No changes' }}
              </div>
              <div v-if="configDiff.length > 50" class="diff-more">
                {{ currentLocale === 'zh' ? `还有 ${configDiff.length - 50} 个修改...` : `${configDiff.length - 50} more changes...` }}
              </div>
            </div>
          </div>
          
          <div v-show="activeTab === 'preflight'" class="tab-content">
            <button @click="runPreflight" class="validate-btn">{{ currentLocale === 'zh' ? '重新检查' : 'Re-check' }}</button>
            <div class="preflight-list">
              <div v-for="(issue, idx) in preflightIssues" :key="idx" class="preflight-item" :class="getIssueLevelClass(issue.level)" @click="gotoError(issue.path)">
                <div class="issue-header">
                  <span class="issue-level">{{ issue.level.toUpperCase() }}</span>
                  <span class="issue-path">{{ issue.path || (currentLocale === 'zh' ? '(根)' : '(root)') }}</span>
                </div>
                <div class="issue-message">{{ issue.message }}</div>
                <div v-if="issue.fix" class="issue-fix">
                  <span class="fix-label">{{ currentLocale === 'zh' ? '建议修复' : 'Suggested fix' }}:</span>
                  <span class="fix-text">{{ issue.fix }}</span>
                </div>
              </div>
              <div v-if="preflightIssues.length === 0" class="no-issues">
                {{ currentLocale === 'zh' ? '没有发现问题' : 'No issues found' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile: 表单抽屉导航 -->
    <div v-if="isMobile && mode === 'form' && showMobileSidebar" class="drawer-overlay" @click="showMobileSidebar = false">
      <div class="drawer" @click.stop>
        <div class="drawer-header">
          <h3>{{ currentLocale === 'zh' ? '表单选择' : 'Form Selection' }}</h3>
          <button @click="showMobileSidebar = false" class="close-btn">×</button>
        </div>
        <nav class="form-nav">
          <button :class="{ active: activeForm === 'log' }" @click="activeForm = 'log'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '日志' : 'Log' }}
          </button>
          <button :class="{ active: activeForm === 'dns' }" @click="activeForm = 'dns'; showMobileSidebar = false">
            {{ t.dns.title }}
          </button>
          <button :class="{ active: activeForm === 'ntp' }" @click="activeForm = 'ntp'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? 'NTP' : 'NTP' }}
          </button>
          <button :class="{ active: activeForm === 'certificate' }" @click="activeForm = 'certificate'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '证书' : 'Certificate' }}
          </button>
          <button :class="{ active: activeForm === 'endpoints' }" @click="activeForm = 'endpoints'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '端点' : 'Endpoints' }}
          </button>
          <button :class="{ active: activeForm === 'inbounds' }" @click="activeForm = 'inbounds'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '入站' : 'Inbounds' }}
          </button>
          <button :class="{ active: activeForm === 'outbounds' }" @click="activeForm = 'outbounds'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '出站' : 'Outbounds' }}
          </button>
          <button :class="{ active: activeForm === 'route' }" @click="activeForm = 'route'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '路由' : 'Route' }}
          </button>
          <button :class="{ active: activeForm === 'services' }" @click="activeForm = 'services'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '服务' : 'Services' }}
          </button>
          <button :class="{ active: activeForm === 'experimental' }" @click="activeForm = 'experimental'; showMobileSidebar = false">
            {{ currentLocale === 'zh' ? '实验' : 'Experimental' }}
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-layout { 
  display: flex; 
  flex-direction: column; 
  height: 100vh; 
  width: 100vw;
  overflow: hidden; /* 确保外层无滚动条 */
  position: relative;
}
.mode-switcher { 
  display: flex; 
  gap: 8px; 
  padding: 12px 16px; 
  border-bottom: 1px solid var(--border, #e5e7eb); 
  flex-shrink: 0; 
  background: var(--bg-app, #ffffff);
}
.mode-switcher button { 
  padding: 8px 20px; 
  background: transparent; 
  border: 1px solid var(--border, #e5e7eb); 
  border-radius: 6px;
  cursor: pointer; 
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
  transition: all 0.2s ease;
  min-width: 80px;
}
.mode-switcher button:hover { 
  background: var(--bg-hover, #f5f5f5); 
  border-color: var(--border-hover, #d1d5db);
  transform: translateY(-1px);
}
.mode-switcher button.active { 
  background: var(--brand, #3b82f6); 
  color: white; 
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}
.mode-switcher button.active:hover {
  background: var(--brand-hover, #2563eb);
  border-color: var(--brand-hover, #2563eb);
  transform: translateY(-1px);
}
.body { 
  flex: 1; 
  display: flex; 
  min-height: 0; 
  overflow: hidden; /* 确保 body 无滚动条 */
}
.sidebar { 
  width: 180px; 
  border-right: 1px solid var(--border, #e5e7eb); 
  padding: 8px; 
  overflow-y: auto; 
  overflow-x: hidden;
  flex-shrink: 0; /* 侧边栏不收缩 */
}
.form-nav { display: flex; flex-direction: column; gap: 4px; }
.form-nav button { padding: 8px 12px; text-align: left; background: transparent; border: none; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
.form-nav button:hover { background: var(--bg-panel, #f5f5f5); }
.form-nav button.active { background: var(--brand, #3b82f6); color: white; }
.left { 
  flex: 1; 
  padding: 8px; 
  min-width: 0; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; /* 确保左侧容器无滚动条 */
}
.json-editor-wrapper { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  border: 1px solid var(--border, #e5e7eb); 
  border-radius: 6px; 
  overflow: hidden; 
  min-height: 0; /* 允许 flex 子项收缩 */
}
.json-editor-wrapper:not(:visible) {
  display: none !important; /* v-show 隐藏时不占空间 */
}
.json-editor-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--bg-app, #f5f5f5); border-bottom: 1px solid var(--border, #e5e7eb); }
.toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #666); }
.toolbar-actions { display: flex; align-items: center; gap: 6px; }
.toolbar-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 12px; background: var(--bg-panel, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 4px; cursor: pointer; transition: all 0.2s; color: var(--text-primary, #333); }
.toolbar-btn:hover { background: var(--bg-hover, #f0f0f0); border-color: var(--brand, #3b82f6); color: var(--brand, #3b82f6); }
.toolbar-btn.small { padding: 4px 8px; min-width: 28px; justify-content: center; }
.toolbar-icon { font-size: 14px; line-height: 1; }
.toolbar-divider { width: 1px; height: 20px; background: var(--border, #e5e7eb); margin: 0 4px; }
.form-container { flex: 1; overflow-y: auto; overflow-x: hidden; }
.form-container:not(:visible) {
  display: none !important; /* v-show 隐藏时不占空间 */
}
.placeholder { padding: 40px; text-align: center; color: var(--text-secondary, #64748b); }
.right { 
  width: 320px; 
  border-left: 1px solid var(--border, #e5e7eb); 
  padding: 8px; 
  overflow: hidden; /* 外层容器无滚动条 */
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许 flex 子项收缩 */
}
.summary { font-weight: 600; margin-bottom: 8px; }
.errors { margin: 8px 0 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.error-item { 
  padding: 12px; 
  border-radius: 6px; 
  cursor: pointer; 
  transition: all 0.2s ease; 
  line-height: 1.6; 
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 3px solid #ef4444;
}
.error-item:hover { 
  background: #fee2e2; 
  border-color: #fca5a5;
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.path { 
  display: block;
  color: #64748b; 
  margin-bottom: 6px; 
  font-family: ui-monospace, monospace; 
  font-size: 12px; 
  font-weight: 600;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  word-break: break-all;
}
.msg { 
  color: #dc2626; 
  font-size: 13px; 
  line-height: 1.6;
  font-weight: 500;
}
.panel { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
  min-height: 0; /* 允许 flex 子项收缩 */
}
.tabs { 
  display: flex; 
  gap: 4px; 
  padding: 8px; 
  border-bottom: 1px solid var(--border, #e5e7eb); 
  flex-shrink: 0; /* 标签栏不收缩 */
}
.tabs button { padding: 6px 12px; border: none; background: transparent; cursor: pointer; font-size: 12px; border-radius: 4px; }
.tabs button:hover { background: var(--bg-app, #f5f5f5); }
.tabs button.active { background: var(--brand, #3b82f6); color: white; }
.tab-content { 
  flex: 1; 
  overflow-y: auto; 
  overflow-x: hidden; 
  padding: 12px; 
  min-height: 0; /* 允许滚动 */
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}
.tab-content::-webkit-scrollbar {
  width: 8px;
}
.tab-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
.tab-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.tab-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.validate-btn { width: 100%; padding: 8px; margin-bottom: 12px; background: var(--brand, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer; }
.validate-btn:hover { background: var(--brand-hover, #2563eb); }
.validation-status { 
  padding: 10px 12px; 
  margin-bottom: 12px; 
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
  border-radius: 6px; 
  border: 1px solid #bae6fd;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.validation-status .status-text { 
  font-size: 13px; 
  color: #0369a1;
  font-weight: 500;
}
.no-errors, .no-diff { padding: 24px; text-align: center; color: var(--text-secondary, #666); font-size: 13px; }
.diff-summary { 
  padding: 12px; 
  margin-bottom: 12px; 
  background: var(--bg-hover, #f5f5f5); 
  border-radius: 6px; 
  border: 1px solid var(--border, #e5e7eb);
}
.diff-stats { 
  display: flex; 
  gap: 16px; 
  align-items: center; 
  flex-wrap: wrap;
}
.stat-item { 
  font-size: 12px; 
  color: var(--text-secondary, #666);
  display: flex;
  align-items: center;
  gap: 4px;
}
.stat-item strong { 
  font-size: 14px; 
  font-weight: 700;
}
.stat-item.added strong { color: #22c55e; }
.stat-item.removed strong { color: #ef4444; }
.stat-item.modified strong { color: #fbbf24; }
.diff-list { display: flex; flex-direction: column; gap: 12px; }
.diff-item { padding: 10px; border-radius: 4px; border-left: 3px solid; transition: all 0.2s; }
.diff-item.added { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
.diff-item.removed { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
.diff-item.modified { background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; }
.diff-item.major { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.diff-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 8px; 
  margin-bottom: 6px; 
}
.diff-path { font-size: 12px; font-weight: 600; color: var(--text-primary, #1f2328); word-break: break-all; flex: 1; }
.diff-badge { 
  font-size: 10px; 
  font-weight: 600; 
  padding: 2px 6px; 
  border-radius: 3px; 
  text-transform: uppercase;
}
.diff-badge.major { 
  background: rgba(239, 68, 68, 0.2); 
  color: #dc2626; 
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.diff-values { display: flex; flex-direction: column; gap: 6px; }
.diff-old, .diff-new { display: flex; flex-direction: column; gap: 4px; }
.diff-label { font-size: 11px; font-weight: 500; color: var(--text-secondary, #666); }
.diff-value { font-size: 12px; color: var(--text-primary, #1f2328); word-break: break-word; max-height: 100px; overflow: auto; padding: 4px 8px; background: var(--bg-app, #f5f5f5); border-radius: 3px; white-space: pre-wrap; font-family: monospace; }
.diff-more { padding: 12px; text-align: center; color: var(--text-secondary, #666); font-size: 12px; }
.preflight-list { display: flex; flex-direction: column; gap: 12px; }
.preflight-item { padding: 12px; border-radius: 6px; border-left: 3px solid; cursor: pointer; transition: all 0.2s; }
.preflight-item:hover { transform: translateX(2px); }
.preflight-item.issue-error { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
.preflight-item.issue-warning { background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; }
.preflight-item.issue-info { background: rgba(14, 165, 233, 0.1); border-color: #0ea5e9; }
.issue-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.issue-level { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; }
.issue-error .issue-level { background: #ef4444; color: white; }
.issue-warning .issue-level { background: #fbbf24; color: white; }
.issue-info .issue-level { background: #0ea5e9; color: white; }
.issue-path { font-size: 12px; font-family: monospace; color: var(--text-secondary, #666); }
.issue-message { font-size: 13px; color: var(--text-primary, #1f2328); margin-bottom: 6px; font-weight: 500; }
.issue-fix { font-size: 12px; color: var(--text-secondary, #666); padding-top: 6px; border-top: 1px solid var(--border-light, #eee); }
.fix-label { font-weight: 600; margin-right: 6px; }
.fix-text { font-style: italic; }
.no-issues { padding: 24px; text-align: center; color: var(--text-secondary, #666); font-size: 13px; }

/* Mobile 布局样式 */
@media (max-width: 767px) {
  /* 移动端单栏布局 */
  .mobile-layout .body {
    flex-direction: column;
  }
  
  .mobile-layout .sidebar {
    display: none !important;
  }
  
  .mobile-layout .left {
    width: 100%;
    padding: 4px;
    padding-bottom: 60px; /* 默认为底部标签栏预留空间 */
  }
  
  /* 竖屏表单模式：隐藏底部标签栏，移除额外 padding */
  .form-mode-portrait .left {
    padding-bottom: 4px;
  }
  
  /* 移动端抽屉按钮 */
  .mobile-sidebar-toggle {
    width: 100%;
    margin: 8px;
    padding: 12px 16px;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 8px;
    background: var(--brand, #3b82f6);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .mobile-sidebar-toggle:hover {
    background: var(--brand-hover, #2563eb);
  }
  
  /* 底部标签栏 */
  .mobile-tabs {
    display: flex;
    gap: 4px;
    padding: 12px 8px;
    border-top: 1px solid var(--border);
    background: var(--bg-panel);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .mobile-tabs button {
    flex: 1;
    padding: 12px 8px;
    text-align: center;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s;
  }
  
  .mobile-tabs button.active {
    background: var(--brand);
    color: white;
  }
  
  /* 全屏面板遮罩 */
  .mobile-panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 200;
    display: flex;
    align-items: flex-end;
  }
  
  .mobile-panel {
    width: 100%;
    max-height: 80vh;
    background: var(--bg-panel);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .mobile-panel .panel {
    height: auto;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .mobile-panel .tabs {
    flex-shrink: 0;
  }
  
  .mobile-panel .tab-content {
    flex: 1;
    overflow-y: auto;
  }
  
  /* 抽屉遮罩 */
  .drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 150;
  }
  
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 80vw;
    background: var(--bg-panel);
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  
  .drawer-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .drawer .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    font-size: 28px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }
  
  .drawer .close-btn:hover {
    background: var(--bg-hover);
  }
  
  .drawer .form-nav {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
  }
  
  /* Topbar 优化 */
  .mobile-layout .topbar {
    padding: 8px 12px;
  }
  
  .mobile-layout .topbar-left {
    overflow-x: auto;
    flex-wrap: nowrap;
    gap: 6px;
  }
  
  .mobile-layout .topbar-left button {
    font-size: 12px;
    padding: 6px 10px;
    white-space: nowrap;
  }
  
  /* 模式切换器优化 */
  .mode-switcher {
    padding: 8px 12px;
  }
  
  .mode-switcher button {
    font-size: 13px;
    padding: 8px 16px;
    min-width: 70px;
  }
}
</style>
