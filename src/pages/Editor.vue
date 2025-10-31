<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
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
import { currentConfig, errorCount, lastValidation, toPrettyJson, loadFromText, runValidation, configDiff, isDirty } from '../stores/config';
import { useI18n } from '../i18n';
import { runPreflightCheck, type PreflightIssue } from '../lib/preflight';

const { t, currentLocale } = useI18n();

const preflightIssues = ref<PreflightIssue[]>([]);
const showPreflight = ref(false);
const topbarRef = ref<{ onSave: () => Promise<void>; onSaveAs: () => Promise<void>; onOpen: () => Promise<void>; onFormat: () => void } | null>(null);

const mode = ref<'json' | 'form'>('json');
const activeForm = ref<'log' | 'dns' | 'ntp' | 'certificate' | 'endpoints' | 'inbounds' | 'outbounds' | 'route' | 'services' | 'experimental'>('dns');
const activeTab = ref<'errors' | 'diff' | 'preflight'>('errors');
const text = ref(toPrettyJson());
const jsonEditorRef = ref<{ gotoLine: (line: number, column?: number) => void } | null>(null);

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

watch(currentConfig, () => {
  text.value = toPrettyJson();
});

let timer: number | undefined;
async function onInput(val: string) {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      await loadFromText(val);
    } catch (e) {
      // 忽略解析错误，等待用户继续输入
    }
  }, 300);
}

async function validateNow() {
  await runValidation();
}

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
  
  // Ctrl+O / Cmd+O: 打开
  if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
    event.preventDefault();
    if (topbarRef.value) {
      topbarRef.value.onOpen();
    }
    return;
  }
  
  // Ctrl+Shift+F / Cmd+Shift+F: 格式化
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
    event.preventDefault();
    if (topbarRef.value) {
      topbarRef.value.onFormat();
    }
    return;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcuts);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts);
});

function gotoError(path: string) {
  if (!jsonEditorRef.value || !path) return;
  mode.value = 'json'; // 切换到 JSON 模式
  
  try {
    const parsed = JSON.parse(text.value);
    const parts = path.split('/').filter(p => p && p !== '$schema');
    
    // 根据路径导航到 JSON 对象
    let current: any = parsed;
    let targetKey = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.match(/^\d+$/)) {
        const idx = parseInt(part, 10);
        if (Array.isArray(current) && current[idx] !== undefined) {
          current = current[idx];
          if (i === parts.length - 1) targetKey = `[${idx}]`;
        } else {
          break;
        }
      } else {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
          targetKey = part;
        } else {
          break;
        }
      }
    }
    
    // 在 JSON 文本中查找这个键的位置
    if (targetKey) {
      const lines = text.value.split('\n');
      const searchPattern = new RegExp(`["']?${targetKey.replace(/[\[\]]/g, '\\$&')}["']?\\s*:`, 'i');
      
      for (let i = 0; i < lines.length; i++) {
        if (searchPattern.test(lines[i])) {
          jsonEditorRef.value.gotoLine(i + 1);
          return;
        }
      }
      
      // 如果精确匹配失败，尝试简单包含匹配
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(targetKey)) {
          jsonEditorRef.value.gotoLine(i + 1);
          return;
        }
      }
    }
  } catch (e) {
    // JSON 解析失败，使用简单的文本搜索
    const parts = path.split('/').filter(p => p);
    if (parts.length > 0) {
      const searchKey = parts[parts.length - 1];
      const lines = text.value.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchKey)) {
          jsonEditorRef.value.gotoLine(i + 1);
          return;
        }
      }
    }
  }
}
</script>

<template>
  <div class="editor-layout">
    <Topbar ref="topbarRef" />
    <div class="mode-switcher">
      <button :class="{ active: mode === 'json' }" @click="mode = 'json'">{{ t.common.json }}</button>
      <button :class="{ active: mode === 'form' }" @click="mode = 'form'">{{ t.common.form }}</button>
    </div>
    <div class="body">
      <div v-if="mode === 'form'" class="sidebar">
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
        <JsonEditor v-if="mode === 'json'" ref="jsonEditorRef" v-model="text" @update:modelValue="onInput" />
        <div v-else class="form-container">
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
          <div class="right">
            <div class="panel">
              <div class="tabs">
                <button :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">
                  {{ t.common.errors }} ({{ errorCount }})
                </button>
                <button :class="{ active: activeTab === 'diff' }" @click="activeTab = 'diff'" v-if="isDirty">
                  {{ currentLocale === 'zh' ? '差异' : 'Diff' }} ({{ configDiff.length }})
                </button>
                <button :class="{ active: activeTab === 'preflight' }" @click="runPreflight">
                  {{ currentLocale === 'zh' ? '运行检查' : 'Preflight' }} ({{ preflightIssues.length }})
                </button>
              </div>
              
              <div v-show="activeTab === 'errors'" class="tab-content">
                <button @click="validateNow" class="validate-btn">{{ t.common.validate }}</button>
                <ul class="errors">
                  <li v-for="(e, idx) in lastValidation.errors" :key="idx" @click="gotoError(e.path)" class="error-item">
                    <span class="path">{{ e.path || '(root)' }}</span>
                    <span class="msg">{{ e.message }}</span>
                  </li>
                  <li v-if="lastValidation.errors.length === 0" class="no-errors">
                    {{ currentLocale === 'zh' ? '没有错误' : 'No errors' }}
                  </li>
                </ul>
              </div>
              
              <div v-show="activeTab === 'diff'" class="tab-content">
                <div class="diff-list">
                  <div v-for="(diff, idx) in configDiff.slice(0, 50)" :key="idx" class="diff-item" :class="diff.type">
                    <div class="diff-path">{{ diff.path }}</div>
                    <div class="diff-values">
                      <div v-if="diff.type === 'modified' || diff.type === 'removed'" class="diff-old">
                        <span class="diff-label">{{ currentLocale === 'zh' ? '旧值' : 'Old' }}:</span>
                        <span class="diff-value">{{ formatDiffValue(diff.oldValue) }}</span>
                      </div>
                      <div v-if="diff.type === 'modified' || diff.type === 'added'" class="diff-new">
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
                      <span class="issue-path">{{ issue.path || '(root)' }}</span>
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
  </div>
</template>

<style scoped>
.editor-layout { display: flex; flex-direction: column; height: 100vh; }
.mode-switcher { display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid var(--border, #e5e7eb); }
.mode-switcher button { padding: 4px 12px; background: transparent; border: 1px solid var(--border, #e5e7eb); cursor: pointer; }
.mode-switcher button.active { background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.body { flex: 1; display: flex; min-height: 0; }
.sidebar { width: 180px; border-right: 1px solid var(--border, #e5e7eb); padding: 8px; overflow-y: auto; }
.form-nav { display: flex; flex-direction: column; gap: 4px; }
.form-nav button { padding: 8px 12px; text-align: left; background: transparent; border: none; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
.form-nav button:hover { background: var(--bg-panel, #f5f5f5); }
.form-nav button.active { background: var(--brand, #3b82f6); color: white; }
.left { flex: 1; padding: 8px; min-width: 0; overflow: auto; }
.form-container { height: 100%; }
.placeholder { padding: 40px; text-align: center; color: var(--text-secondary, #64748b); }
.right { width: 320px; border-left: 1px solid var(--border, #e5e7eb); padding: 8px; overflow: auto; }
.summary { font-weight: 600; margin-bottom: 8px; }
.errors { margin: 8px 0 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.error-item { padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
.error-item:hover { background: var(--bg-app, #f5f5f5); }
.path { color: #64748b; margin-right: 6px; font-family: ui-monospace, monospace; font-size: 12px; }
.msg { color: #dc2626; }
.panel { display: flex; flex-direction: column; height: 100%; }
.tabs { display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid var(--border, #e5e7eb); }
.tabs button { padding: 6px 12px; border: none; background: transparent; cursor: pointer; font-size: 12px; border-radius: 4px; }
.tabs button:hover { background: var(--bg-app, #f5f5f5); }
.tabs button.active { background: var(--brand, #3b82f6); color: white; }
.tab-content { flex: 1; overflow: auto; padding: 12px; }
.validate-btn { width: 100%; padding: 8px; margin-bottom: 12px; background: var(--brand, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer; }
.validate-btn:hover { background: var(--brand-hover, #2563eb); }
.no-errors, .no-diff { padding: 24px; text-align: center; color: var(--text-secondary, #666); font-size: 13px; }
.diff-list { display: flex; flex-direction: column; gap: 12px; }
.diff-item { padding: 10px; border-radius: 4px; border-left: 3px solid; }
.diff-item.added { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
.diff-item.removed { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
.diff-item.modified { background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; }
.diff-path { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary, #1f2328); word-break: break-all; }
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
</style>
