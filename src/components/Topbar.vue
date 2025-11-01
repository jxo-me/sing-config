<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { loadFromText, toPrettyJson, runValidation, lastValidation, setLastSavedPath, setLastOpenedPath, lastSavedPath, lastOpenedPath, setConfig, setOriginalConfig } from '../stores/config';
import { useI18n } from '../i18n';
import { getCurrentTheme, setTheme, watchSystemTheme, type Theme } from '../lib/theme';
import TemplateLibrary from './TemplateLibrary.vue';
import SetupWizard from './SetupWizard.vue';

const { t, currentLocale, setLocale } = useI18n();

// 主题管理
const currentTheme = ref<Theme>(getCurrentTheme());

function toggleTheme() {
  const newTheme = currentTheme.value === 'material-light' 
    ? 'material-dark' 
    : 'material-light';
  setTheme(newTheme);
  currentTheme.value = newTheme;
}

onMounted(() => {
  // 监听主题变更事件（跨组件同步）
  window.addEventListener('theme-change', ((e: CustomEvent<Theme>) => {
    currentTheme.value = e.detail;
  }) as EventListener);
  
  // 监听系统主题变化（仅在未手动设置时）
  watchSystemTheme((theme) => {
    currentTheme.value = theme;
  });
});

const saving = ref(false);
const showTemplates = ref(false);
const showWizard = ref(false);
const opening = ref(false); // 防止重复打开

async function onNew() {
  // 重置配置为空对象
  const emptyConfig = {};
  await setConfig(emptyConfig);
  setOriginalConfig(emptyConfig);
  setLastSavedPath(null);
  setLastOpenedPath(null);
}

async function onOpen() {
  // 如果已经在打开文件，直接返回，防止重复调用
  if (opening.value) {
    return;
  }
  
  opening.value = true;
  try {
    const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path || Array.isArray(path)) {
      opening.value = false;
      return;
    }
    const content = await readTextFile(path as string);
    await loadFromText(content);
    // 打开新文件时，清除之前的保存路径（因为这是新打开的文件）
    setLastSavedPath(null);
    setLastOpenedPath(path as string);
  } catch (error) {
    console.error('Failed to open file:', error);
  } finally {
    opening.value = false;
  }
}

async function onLoadExample() {
  try {
    const resp = await fetch('/config.full.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(String(resp.status));
    const text = await resp.text();
    await loadFromText(text);
    // 加载示例时，清除文件路径
    setLastSavedPath(null);
    setLastOpenedPath(null);
  } catch (e) {
    await message(
      currentLocale.value === 'zh' 
        ? '无法加载示例文件，请确保其位于 public/ 目录下命名为 config.full.example.json'
        : 'Failed to load example file. Please ensure it exists in public/ directory as config.full.example.json',
      { kind: 'error', title: currentLocale.value === 'zh' ? '加载示例失败' : 'Load Example Failed' }
    );
  }
}

async function onSave() {
  await runValidation();
  if (!lastValidation.value.valid) {
    const count = lastValidation.value.errors.length;
    await message(
      currentLocale.value === 'zh'
        ? `存在 ${count} 个校验错误，请先修复后再保存。`
        : `There are ${count} validation errors. Please fix them before saving.`,
      { kind: 'error', title: currentLocale.value === 'zh' ? '保存被阻止' : 'Save Blocked' }
    );
    return;
  }
  const text = toPrettyJson();
  
  // 如果有保存路径，直接保存；否则弹出对话框
  let path: string | null = null;
  if (lastSavedPath.value) {
    path = lastSavedPath.value;
  } else {
    const savedPath = await save({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!savedPath) return;
    path = savedPath as string;
  }
  
  saving.value = true;
  try {
    await writeTextFile(path, text);
    setLastSavedPath(path);
    // 保存后，更新打开路径（如果保存的是当前打开的文件）
    if (!lastOpenedPath.value || lastOpenedPath.value === path) {
      setLastOpenedPath(path);
    }
    await message(
      currentLocale.value === 'zh' ? '保存成功' : 'Saved successfully',
      { kind: 'info', title: currentLocale.value === 'zh' ? '保存' : 'Save' }
    );
  } catch (e) {
    await message(
      currentLocale.value === 'zh' ? `保存失败: ${e}` : `Save failed: ${e}`,
      { kind: 'error', title: currentLocale.value === 'zh' ? '保存失败' : 'Save Failed' }
    );
  } finally {
    saving.value = false;
  }
}

async function onSaveAs() {
  await runValidation();
  if (!lastValidation.value.valid) {
    const count = lastValidation.value.errors.length;
    await message(
      currentLocale.value === 'zh'
        ? `存在 ${count} 个校验错误，请先修复后再保存。`
        : `There are ${count} validation errors. Please fix them before saving.`,
      { kind: 'error', title: currentLocale.value === 'zh' ? '保存被阻止' : 'Save Blocked' }
    );
    return;
  }
  const text = toPrettyJson();
  const savedPath = await save({ filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (!savedPath) return;
  const path = savedPath as string;
  
  saving.value = true;
  try {
    await writeTextFile(path, text);
    setLastSavedPath(path);
    // 另存为后，更新打开路径
    setLastOpenedPath(path);
    await message(
      currentLocale.value === 'zh' ? '保存成功' : 'Saved successfully',
      { kind: 'info', title: currentLocale.value === 'zh' ? '保存' : 'Save' }
    );
  } catch (e) {
    await message(
      currentLocale.value === 'zh' ? `保存失败: ${e}` : `Save failed: ${e}`,
      { kind: 'error', title: currentLocale.value === 'zh' ? '保存失败' : 'Save Failed' }
    );
  } finally {
    saving.value = false;
  }
}

defineExpose({
  onNew,
  onSave,
  onSaveAs,
  onOpen,
  onLoadExample,
  showWizard: () => { showWizard.value = true; },
  showTemplates: () => { showTemplates.value = true; },
  isOpening: () => opening.value, // 暴露 opening 状态，用于防重复调用
});
</script>

<template>
  <div class="topbar">
    <div class="topbar-left">
      <button @click="onOpen">{{ t.common.open }}</button>
      <button @click="onLoadExample">{{ t.common.loadExample }}</button>
      <button @click="showWizard = true">{{ currentLocale === 'zh' ? '向导' : 'Wizard' }}</button>
      <button @click="showTemplates = true">{{ currentLocale === 'zh' ? '模板' : 'Templates' }}</button>
      <button @click="onSave" :disabled="saving">{{ t.common.save }}</button>
      <button @click="onSaveAs" :disabled="saving">{{ currentLocale === 'zh' ? '另存为' : 'Save As' }}</button>
    </div>
    <div class="topbar-right">
      <button 
        @click="toggleTheme" 
        class="theme-toggle"
        :title="currentLocale === 'zh' 
          ? (currentTheme === 'material-light' ? '切换到深色主题' : '切换到浅色主题')
          : (currentTheme === 'material-light' ? 'Switch to dark theme' : 'Switch to light theme')"
      >
        <span v-if="currentTheme === 'material-light'">🌙</span>
        <span v-else>☀️</span>
      </button>
      <select :value="currentLocale" @change="setLocale(($event.target as HTMLSelectElement).value as 'zh' | 'en')" class="language-select">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
      <span v-if="lastSavedPath" class="saved-path">{{ currentLocale === 'zh' ? '已保存: ' : 'Saved: ' }}{{ lastSavedPath }}</span>
    </div>
    
    <!-- Setup Wizard Modal -->
    <div v-if="showWizard" class="modal-overlay" @click="showWizard = false">
      <div class="modal-content wizard-modal" @click.stop>
        <SetupWizard @close="showWizard = false" />
      </div>
    </div>
    
    <!-- Template Library Modal -->
    <div v-if="showTemplates" class="modal-overlay" @click="showTemplates = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ currentLocale === 'zh' ? '配置模板库' : 'Template Library' }}</h3>
          <button @click="showTemplates = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <TemplateLibrary />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: var(--bg-panel, #fff);
  flex-shrink: 0; /* Topbar 不收缩 */
}
.topbar-left {
  display: flex;
  gap: 8px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.theme-toggle {
  padding: 6px 10px;
  cursor: pointer;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  background: var(--bg-panel, #fff);
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s ease;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-toggle:hover {
  background: var(--bg-hover, #f5f5f5);
  border-color: var(--brand, #3b82f6);
  transform: scale(1.05);
}
.language-select {
  padding: 4px 8px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #1f2328);
  font-size: 12px;
  cursor: pointer;
  margin-right: 12px;
}
.language-select:hover {
  background: var(--bg-app, #f5f5f5);
}
.language-select:focus {
  outline: none;
  border-color: var(--brand, #3b82f6);
}
/* 下拉选项样式 */
.language-select option {
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #1f2328);
  padding: 8px 12px;
}
.language-select option:checked {
  background: var(--brand, #3b82f6);
  color: white;
}
.saved-path {
  font-size: 12px;
  color: var(--text-secondary, #666);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
button {
  padding: 6px 12px;
  cursor: pointer;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  background: var(--bg-panel, #fff);
  font-size: 13px;
}
button:hover:not(:disabled) {
  background: var(--bg-app, #f5f5f5);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--bg-panel, #fff);
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
}
.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: var(--bg-app, #f5f5f5);
}
.modal-body {
  flex: 1;
  overflow: auto;
  padding: 0;
}
.wizard-modal {
  max-width: 700px;
  height: 600px;
}
</style>
