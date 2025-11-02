<script setup lang="ts">
import { ref, computed } from 'vue';
import { settings, resetSettings, type EditorSettings } from '../stores/settings';
import { useI18n } from '../i18n';

const { currentLocale } = useI18n();

const showDialog = ref(false);
const tempSettings = ref<EditorSettings>({ ...settings });

const categoryLabels = {
  zh: {
    formatting: '格式化',
    validation: '校验',
    autocomplete: '自动补全',
    editing: '编辑辅助',
    reset: '重置所有',
    save: '保存',
    cancel: '取消',
    title: '编辑器设置',
    description: '配置编辑器的自动化功能行为',
    applyOnChange: '更改后立即应用',
  },
  en: {
    formatting: 'Formatting',
    validation: 'Validation',
    autocomplete: 'Autocomplete',
    editing: 'Editing Assistance',
    reset: 'Reset All',
    save: 'Save',
    cancel: 'Cancel',
    title: 'Editor Settings',
    description: 'Configure editor automation features',
    applyOnChange: 'Apply on change',
  },
};

const t = computed(() => categoryLabels[currentLocale.value]);

const labelFor = (key: keyof EditorSettings) => {
  const labels = {
    zh: {
      autoIndent: '自动缩进',
      indentSize: '缩进大小（空格）',
      enableSchemaValidation: 'Schema 校验',
      schemaValidationDelay: '校验延迟（毫秒）',
      enableFormatDetection: '格式检测',
      showAutoRepairButton: '显示自动修复按钮',
      enableAutocomplete: '启用自动补全',
      autocompleteActivateOnTyping: '输入时自动触发',
      autocompleteDelay: '补全延迟（毫秒）',
      autoFormatOnLoad: '加载时格式化',
      autoFormatOnSave: '保存时格式化',
      autoFormatOnModeSwitch: '切换模式时格式化',
      autoCloseBrackets: '自动闭合括号',
      autoHighlightSelectionMatches: '高亮匹配项',
    },
    en: {
      autoIndent: 'Auto Indent',
      indentSize: 'Indent Size (spaces)',
      enableSchemaValidation: 'Schema Validation',
      schemaValidationDelay: 'Validation Delay (ms)',
      enableFormatDetection: 'Format Detection',
      showAutoRepairButton: 'Show Auto Repair Button',
      enableAutocomplete: 'Enable Autocomplete',
      autocompleteActivateOnTyping: 'Activate on Typing',
      autocompleteDelay: 'Autocomplete Delay (ms)',
      autoFormatOnLoad: 'Format on Load',
      autoFormatOnSave: 'Format on Save',
      autoFormatOnModeSwitch: 'Format on Mode Switch',
      autoCloseBrackets: 'Auto Close Brackets',
      autoHighlightSelectionMatches: 'Highlight Matches',
    },
  };
  return labels[currentLocale.value][key];
};

const descriptionFor = (key: keyof EditorSettings) => {
  const descriptions = {
    zh: {
      autoIndent: '输入时自动插入缩进（按回车时）',
      indentSize: '每个缩进级别的空格数',
      enableSchemaValidation: '启用 JSON Schema 实时校验',
      schemaValidationDelay: '输入后延迟多久开始校验',
      enableFormatDetection: '检测无效的 JSON 格式',
      showAutoRepairButton: '在检测到格式错误时显示修复按钮',
      enableAutocomplete: '启用 JSON Schema 驱动的自动补全',
      autocompleteActivateOnTyping: '输入任意字符时自动弹出补全',
      autocompleteDelay: '自动补全弹出的延迟时间',
      autoFormatOnLoad: '打开文件时自动格式化',
      autoFormatOnSave: '保存文件时自动格式化',
      autoFormatOnModeSwitch: '在 JSON 和表单模式间切换时格式化',
      autoCloseBrackets: '输入 { [ " 时自动闭合',
      autoHighlightSelectionMatches: '选中文本时高亮所有匹配项',
    },
    en: {
      autoIndent: 'Automatically insert indent when pressing Enter',
      indentSize: 'Number of spaces per indent level',
      enableSchemaValidation: 'Enable real-time JSON Schema validation',
      schemaValidationDelay: 'Delay before validation starts after typing',
      enableFormatDetection: 'Detect invalid JSON format',
      showAutoRepairButton: 'Show repair button when format errors detected',
      enableAutocomplete: 'Enable JSON Schema-driven autocomplete',
      autocompleteActivateOnTyping: 'Automatically show autocomplete on typing',
      autocompleteDelay: 'Delay before autocomplete appears',
      autoFormatOnLoad: 'Format file when loading',
      autoFormatOnSave: 'Format file when saving',
      autoFormatOnModeSwitch: 'Format when switching between JSON and form modes',
      autoCloseBrackets: 'Automatically close brackets when typing { [ "',
      autoHighlightSelectionMatches: 'Highlight all matches of selected text',
    },
  };
  return descriptions[currentLocale.value][key];
};

function openDialog() {
  tempSettings.value = { ...settings };
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
}

function saveSettings() {
  Object.assign(settings, tempSettings.value);
  closeDialog();
}

function handleReset() {
  resetSettings();
  tempSettings.value = { ...settings };
  closeDialog();
}

defineExpose({
  open: openDialog,
});
</script>

<template>
  <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
    <div class="modal-content settings-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ t.title }}</h3>
        <button @click="closeDialog" class="close-btn">×</button>
      </div>
      
      <div class="modal-body">
        <div class="settings-description">{{ t.description }}</div>
        
        <div class="settings-categories">
          <!-- 格式化 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">📝</span>
              <span class="category-title">{{ t.formatting }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoIndent" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoIndent') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoIndent') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.autoIndent" class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('indentSize') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.indentSize"
                  min="1"
                  max="8"
                  step="1"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.indentSize"
                  min="1"
                  max="8"
                  class="indent-input"
                />
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoFormatOnLoad" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoFormatOnLoad') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoFormatOnLoad') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoFormatOnSave" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoFormatOnSave') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoFormatOnSave') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoFormatOnModeSwitch" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoFormatOnModeSwitch') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoFormatOnModeSwitch') }}</div>
                </div>
              </label>
            </div>
          </details>

          <!-- 校验 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">✓</span>
              <span class="category-title">{{ t.validation }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableSchemaValidation" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableSchemaValidation') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableSchemaValidation') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.enableSchemaValidation" class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('schemaValidationDelay') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.schemaValidationDelay"
                  min="0"
                  max="3000"
                  step="100"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.schemaValidationDelay"
                  min="0"
                  max="3000"
                  class="indent-input"
                />
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableFormatDetection" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableFormatDetection') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableFormatDetection') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.enableFormatDetection" class="setting-item">
                <input type="checkbox" v-model="tempSettings.showAutoRepairButton" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('showAutoRepairButton') }}</div>
                  <div class="setting-desc">{{ descriptionFor('showAutoRepairButton') }}</div>
                </div>
              </label>
            </div>
          </details>

          <!-- 自动补全 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">⚡</span>
              <span class="category-title">{{ t.autocomplete }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableAutocomplete" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableAutocomplete') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableAutocomplete') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.enableAutocomplete" class="setting-item">
                <input type="checkbox" v-model="tempSettings.autocompleteActivateOnTyping" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autocompleteActivateOnTyping') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autocompleteActivateOnTyping') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.enableAutocomplete && tempSettings.autocompleteActivateOnTyping" class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('autocompleteDelay') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.autocompleteDelay"
                  min="0"
                  max="1000"
                  step="50"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.autocompleteDelay"
                  min="0"
                  max="1000"
                  class="indent-input"
                />
              </label>
            </div>
          </details>

          <!-- 编辑辅助 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">🔧</span>
              <span class="category-title">{{ t.editing }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoCloseBrackets" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoCloseBrackets') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoCloseBrackets') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.autoHighlightSelectionMatches" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autoHighlightSelectionMatches') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autoHighlightSelectionMatches') }}</div>
                </div>
              </label>
            </div>
          </details>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleReset">{{ t.reset }}</button>
        <div class="footer-spacer"></div>
        <button class="btn btn-secondary" @click="closeDialog">{{ t.cancel }}</button>
        <button class="btn btn-primary" @click="saveSettings">{{ t.save }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.settings-modal {
  background: var(--bg-panel, #fff);
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
}

.close-btn {
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
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-app, #f5f5f5);
  color: var(--text-primary, #1f2328);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.settings-description {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.settings-categories {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-category {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.settings-category:hover {
  border-color: var(--brand, #3b82f6);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  background: var(--bg-app, #f9fafb);
  font-weight: 600;
  transition: background 0.2s;
}

.category-header:hover {
  background: var(--bg-hover, #f3f4f6);
}

.category-icon {
  font-size: 20px;
}

.category-title {
  font-size: 15px;
  color: var(--text-primary, #1f2328);
}

.category-content {
  padding: 8px 16px 16px;
  background: var(--bg-panel, #fff);
}

.setting-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-lighter, #f3f4f6);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.setting-label {
  flex: 1;
}

.setting-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2328);
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
}

.indent-setting {
  margin-left: 32px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.indent-setting .setting-name {
  min-width: 160px;
  margin-bottom: 0;
}

.indent-slider {
  flex: 1;
  cursor: pointer;
}

.indent-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--bg-app, #f9fafb);
}

.footer-spacer {
  flex: 1;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--brand, #3b82f6);
  color: white;
}

.btn-primary:hover {
  background: var(--brand-hover, #2563eb);
}

.btn-secondary {
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #1f2328);
  border: 1px solid var(--border, #e5e7eb);
}

.btn-secondary:hover {
  background: var(--bg-app, #f5f5f5);
}

.modal-body {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
