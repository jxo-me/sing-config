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
    appearance: '外观',
    display: '显示选项',
    advanced: '高级选项',
    reset: '重置所有',
    save: '保存',
    cancel: '取消',
    title: '编辑器设置',
    description: '配置编辑器的自动化功能行为',
    applyOnChange: '更改后立即应用',
    autocompleteSchemaFilePathHint: '留空则使用 Schema 校验的路径',
  },
  en: {
    formatting: 'Formatting',
    validation: 'Validation',
    autocomplete: 'Autocomplete',
    editing: 'Editing Assistance',
    appearance: 'Appearance',
    display: 'Display Options',
    advanced: 'Advanced Options',
    reset: 'Reset All',
    save: 'Save',
    cancel: 'Cancel',
    title: 'Editor Settings',
    description: 'Configure editor automation features',
    applyOnChange: 'Apply on change',
    autocompleteSchemaFilePathHint: 'Leave empty to use Schema validation path',
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
      schemaFilePath: 'Schema 文件路径',
      enableFormatDetection: '格式检测',
      showAutoRepairButton: '显示自动修复按钮',
      enableAutocomplete: '启用自动补全',
      autocompleteActivateOnTyping: '输入时自动触发',
      autocompleteDelay: '补全延迟（毫秒）',
      autocompleteSchemaFilePath: '自动补全 Schema 文件路径',
      autoFormatOnLoad: '加载时格式化',
      autoFormatOnSave: '保存时格式化',
      autoFormatOnModeSwitch: '切换模式时格式化',
      autoCloseBrackets: '自动闭合括号',
      autoHighlightSelectionMatches: '高亮匹配项',
      enableLineNumbers: '显示行号',
      enableFoldGutter: '启用代码折叠',
      enableBracketMatching: '启用括号匹配',
      theme: '主题',
      syntaxHighlightingEnabled: '语法高亮',
      lineHeight: '行高',
      fontSize: '字体大小',
      fontFamily: '字体族',
      wordWrap: '自动折行',
      showWhitespace: '显示空白字符',
      tabSize: 'Tab 键空格数',
      renderLineHighlight: '行高亮显示',
      showRuler: '显示标尺',
      rulerPosition: '标尺位置',
    },
    en: {
      autoIndent: 'Auto Indent',
      indentSize: 'Indent Size (spaces)',
      enableSchemaValidation: 'Schema Validation',
      schemaValidationDelay: 'Validation Delay (ms)',
      schemaFilePath: 'Schema File Path',
      enableFormatDetection: 'Format Detection',
      showAutoRepairButton: 'Show Auto Repair Button',
      enableAutocomplete: 'Enable Autocomplete',
      autocompleteActivateOnTyping: 'Activate on Typing',
      autocompleteDelay: 'Autocomplete Delay (ms)',
      autocompleteSchemaFilePath: 'Autocomplete Schema File Path',
      autoFormatOnLoad: 'Format on Load',
      autoFormatOnSave: 'Format on Save',
      autoFormatOnModeSwitch: 'Format on Mode Switch',
      autoCloseBrackets: 'Auto Close Brackets',
      autoHighlightSelectionMatches: 'Highlight Matches',
      enableLineNumbers: 'Line Numbers',
      enableFoldGutter: 'Code Folding',
      enableBracketMatching: 'Bracket Matching',
      theme: 'Theme',
      syntaxHighlightingEnabled: 'Syntax Highlighting',
      lineHeight: 'Line Height',
      fontSize: 'Font Size',
      fontFamily: 'Font Family',
      wordWrap: 'Word Wrap',
      showWhitespace: 'Show Whitespace',
      tabSize: 'Tab Size',
      renderLineHighlight: 'Line Highlight',
      showRuler: 'Show Ruler',
      rulerPosition: 'Ruler Position',
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
      schemaFilePath: 'Schema 文件的 URL 或本地路径',
      enableFormatDetection: '检测无效的 JSON 格式',
      showAutoRepairButton: '在检测到格式错误时显示修复按钮',
      enableAutocomplete: '启用 JSON Schema 驱动的自动补全',
      autocompleteActivateOnTyping: '输入任意字符时自动弹出补全',
      autocompleteDelay: '自动补全弹出的延迟时间',
      autocompleteSchemaFilePath: '自动补全使用的 Schema 文件路径（留空则使用 Schema 校验的路径）',
      autoFormatOnLoad: '打开文件时自动格式化',
      autoFormatOnSave: '保存文件时自动格式化',
      autoFormatOnModeSwitch: '在 JSON 和表单模式间切换时格式化',
      autoCloseBrackets: '输入 { [ " 时自动闭合',
      autoHighlightSelectionMatches: '选中文本时高亮所有匹配项',
      enableLineNumbers: '在编辑器左侧显示行号',
      enableFoldGutter: '启用代码折叠功能',
      enableBracketMatching: '高亮匹配的括号',
      theme: '选择编辑器主题（浅色/深色/自动）',
      syntaxHighlightingEnabled: '为代码添加语法高亮',
      lineHeight: '设置文本行高倍数',
      fontSize: '设置编辑器字体大小',
      fontFamily: '设置编辑器字体族',
      wordWrap: '超过行宽时自动换行',
      showWhitespace: '显示空格和制表符字符',
      tabSize: 'Tab 键的空格数',
      renderLineHighlight: '行高亮显示方式',
      showRuler: '显示垂直标尺线',
      rulerPosition: '标尺线的列位置',
    },
    en: {
      autoIndent: 'Automatically insert indent when pressing Enter',
      indentSize: 'Number of spaces per indent level',
      enableSchemaValidation: 'Enable real-time JSON Schema validation',
      schemaValidationDelay: 'Delay before validation starts after typing',
      schemaFilePath: 'URL or local path to Schema file',
      enableFormatDetection: 'Detect invalid JSON format',
      showAutoRepairButton: 'Show repair button when format errors detected',
      enableAutocomplete: 'Enable JSON Schema-driven autocomplete',
      autocompleteActivateOnTyping: 'Automatically show autocomplete on typing',
      autocompleteDelay: 'Delay before autocomplete appears',
      autocompleteSchemaFilePath: 'Schema file path for autocomplete (leave empty to use Schema validation path)',
      autoFormatOnLoad: 'Format file when loading',
      autoFormatOnSave: 'Format file when saving',
      autoFormatOnModeSwitch: 'Format when switching between JSON and form modes',
      autoCloseBrackets: 'Automatically close brackets when typing { [ "',
      autoHighlightSelectionMatches: 'Highlight all matches of selected text',
      enableLineNumbers: 'Show line numbers on the left',
      enableFoldGutter: 'Enable code folding functionality',
      enableBracketMatching: 'Highlight matching brackets',
      theme: 'Choose editor theme (light/dark/auto)',
      syntaxHighlightingEnabled: 'Add syntax highlighting to code',
      lineHeight: 'Set text line height multiplier',
      fontSize: 'Set editor font size',
      fontFamily: 'Set editor font family',
      wordWrap: 'Wrap text automatically when exceeding line width',
      showWhitespace: 'Show whitespace and tab characters',
      tabSize: 'Number of spaces for Tab key',
      renderLineHighlight: 'Line highlight rendering mode',
      showRuler: 'Show vertical ruler line',
      rulerPosition: 'Column position of ruler line',
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
              
              <label v-if="tempSettings.enableSchemaValidation" class="setting-item">
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('schemaFilePath') }}</div>
                  <div class="setting-desc">{{ descriptionFor('schemaFilePath') }}</div>
                </div>
                <input
                  type="text"
                  v-model="tempSettings.schemaFilePath"
                  class="font-input schema-input"
                  placeholder="/schema.json"
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
              
              <label v-if="tempSettings.enableAutocomplete" class="setting-item">
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('autocompleteSchemaFilePath') }}</div>
                  <div class="setting-desc">{{ descriptionFor('autocompleteSchemaFilePath') }}</div>
                  <div class="setting-hint">
                    {{ t.autocompleteSchemaFilePathHint }}
                  </div>
                </div>
                <input
                  type="text"
                  v-model="tempSettings.autocompleteSchemaFilePath"
                  placeholder="/schema.json"
                  class="font-input schema-input"
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
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableLineNumbers" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableLineNumbers') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableLineNumbers') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableFoldGutter" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableFoldGutter') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableFoldGutter') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.enableBracketMatching" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('enableBracketMatching') }}</div>
                  <div class="setting-desc">{{ descriptionFor('enableBracketMatching') }}</div>
                </div>
              </label>
            </div>
          </details>

          <!-- 外观 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">🎨</span>
              <span class="category-title">{{ t.appearance }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item">
                <span class="setting-name">{{ labelFor('theme') }}</span>
                <select v-model="tempSettings.theme" class="theme-select">
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="auto">跟随系统</option>
                </select>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.syntaxHighlightingEnabled" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('syntaxHighlightingEnabled') }}</div>
                  <div class="setting-desc">{{ descriptionFor('syntaxHighlightingEnabled') }}</div>
                </div>
              </label>
            </div>
          </details>

          <!-- 显示选项 -->
          <details class="settings-category" open>
            <summary class="category-header">
              <span class="category-icon">👁️</span>
              <span class="category-title">{{ t.display }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('fontSize') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.fontSize"
                  min="10"
                  max="24"
                  step="1"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.fontSize"
                  min="10"
                  max="24"
                  class="indent-input"
                />
              </label>
              
              <label class="setting-item">
                <span class="setting-name">{{ labelFor('fontFamily') }}</span>
                <input
                  type="text"
                  v-model="tempSettings.fontFamily"
                  class="font-input"
                  placeholder="Menlo, Monaco, monospace"
                />
              </label>
              
              <label class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('lineHeight') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.lineHeight"
                  min="1"
                  max="3"
                  step="0.1"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.lineHeight"
                  min="1"
                  max="3"
                  step="0.1"
                  class="indent-input"
                />
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.wordWrap" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('wordWrap') }}</div>
                  <div class="setting-desc">{{ descriptionFor('wordWrap') }}</div>
                </div>
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.showWhitespace" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('showWhitespace') }}</div>
                  <div class="setting-desc">{{ descriptionFor('showWhitespace') }}</div>
                </div>
              </label>
            </div>
          </details>

          <!-- 高级选项 -->
          <details class="settings-category">
            <summary class="category-header">
              <span class="category-icon">⚙️</span>
              <span class="category-title">{{ t.advanced }}</span>
            </summary>
            <div class="category-content">
              <label class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('tabSize') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.tabSize"
                  min="1"
                  max="8"
                  step="1"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.tabSize"
                  min="1"
                  max="8"
                  class="indent-input"
                />
              </label>
              
              <label class="setting-item">
                <input type="checkbox" v-model="tempSettings.showRuler" />
                <div class="setting-label">
                  <div class="setting-name">{{ labelFor('showRuler') }}</div>
                  <div class="setting-desc">{{ descriptionFor('showRuler') }}</div>
                </div>
              </label>
              
              <label v-if="tempSettings.showRuler" class="setting-item indent-setting">
                <span class="setting-name">{{ labelFor('rulerPosition') }}</span>
                <input
                  type="range"
                  v-model.number="tempSettings.rulerPosition"
                  min="40"
                  max="200"
                  step="5"
                  class="indent-slider"
                />
                <input
                  type="number"
                  v-model.number="tempSettings.rulerPosition"
                  min="40"
                  max="200"
                  class="indent-input"
                />
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
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-modal {
  background: var(--bg-panel, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: linear-gradient(to bottom, rgba(249, 250, 251, 0.5), transparent);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #1f2328);
  letter-spacing: -0.3px;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s ease;
  font-weight: 300;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  transform: scale(1.1);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: var(--bg-panel, #fff);
}

.settings-description {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
  padding: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: linear-gradient(to right, rgba(59, 130, 246, 0.03), transparent);
  border-left: 3px solid var(--brand, #3b82f6);
  border-radius: 6px;
}

.settings-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-category {
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: var(--bg-panel, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.settings-category:hover {
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(to right, var(--bg-app, #f9fafb), transparent);
  font-weight: 600;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
}

.category-header:hover {
  background: linear-gradient(to right, var(--bg-hover, #f3f4f6), transparent);
}

.category-icon {
  font-size: 22px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
}

.category-title {
  font-size: 16px;
  color: var(--text-primary, #1f2328);
  letter-spacing: -0.2px;
}

.category-content {
  padding: 12px 20px 20px;
  background: var(--bg-panel, #fff);
  border-top: 1px solid var(--border-lighter, #f3f4f6);
}

.setting-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-lighter, #f3f4f6);
  transition: background 0.2s ease, padding-left 0.2s ease;
  border-radius: 6px;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
  overflow: hidden;
}

.setting-item:hover {
  background: rgba(59, 130, 246, 0.02);
  padding-left: 12px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-top: 3px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--brand, #3b82f6);
  border-radius: 4px;
}

.setting-label {
  flex: 1;
  min-width: 0;
  margin-right: 16px;
}

.setting-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
  margin-bottom: 6px;
  letter-spacing: -0.1px;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
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
  height: 6px;
  border-radius: 3px;
  accent-color: var(--brand, #3b82f6);
}

.indent-input {
  width: 90px;
  padding: 6px 10px;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--bg-panel, #fff);
}

.indent-input:focus {
  outline: none;
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.theme-select, .font-input {
  min-width: 200px;
  max-width: 280px;
  padding: 8px 12px;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #1f2328);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.theme-select:hover, .font-input:hover {
  border-color: #cbd5e1;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.05);
}

.theme-select:focus, .font-input:focus {
  outline: none;
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  background: #fefefe;
}

.setting-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
  font-style: italic;
}

.schema-input {
  min-width: 200px;
  max-width: 280px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: linear-gradient(to bottom, transparent, var(--bg-app, #f9fafb));
  gap: 12px;
}

.footer-spacer {
  flex: 1;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.2px;
  min-width: 100px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand, #3b82f6), #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #1f2328);
  border: 1.5px solid var(--border, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.btn-secondary:hover {
  background: var(--bg-app, #f5f5f5);
  border-color: var(--brand, #3b82f6);
  color: var(--brand, #3b82f6);
  transform: translateY(-1px);
}

.modal-body {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.modal-body::-webkit-scrollbar {
  width: 10px;
}

.modal-body::-webkit-scrollbar-track {
  background: var(--bg-app, #f9fafb);
  border-radius: 5px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
  border-radius: 5px;
  border: 2px solid var(--bg-app, #f9fafb);
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #94a3b8, #64748b);
}
</style>
