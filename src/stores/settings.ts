import { reactive, watch } from 'vue';

/**
 * 编辑器自动化功能设置
 */
export interface EditorSettings {
  // 自动缩进相关
  autoIndent: boolean; // 启用自动缩进（indentOnInput）
  indentSize: number; // 缩进大小（空格数）
  
  // JSON Schema 校验
  enableSchemaValidation: boolean; // 启用 Schema 验证
  schemaValidationDelay: number; // Schema 校验延迟（毫秒）
  
  // JSON 格式检测和修复
  enableFormatDetection: boolean; // 启用 JSON 格式检测（isValidJson）
  showAutoRepairButton: boolean; // 显示自动修复按钮
  
  // 自动补全
  enableAutocomplete: boolean; // 启用自动补全
  autocompleteActivateOnTyping: boolean; // 自动补全：输入时自动触发
  autocompleteDelay: number; // 自动补全延迟（毫秒）
  
  // 自动格式化
  autoFormatOnLoad: boolean; // 加载文件时自动格式化
  autoFormatOnSave: boolean; // 保存文件时自动格式化
  autoFormatOnModeSwitch: boolean; // 切换模式时自动格式化
  
  // 其他自动化
  autoCloseBrackets: boolean; // 自动闭合括号
  autoHighlightSelectionMatches: boolean; // 高亮选中文本的匹配项
}

const STORAGE_KEY = 'sing-config-editor-settings';

// 默认设置：所有自动化功能默认关闭
export const defaultSettings: EditorSettings = {
  autoIndent: false,
  indentSize: 2,
  enableSchemaValidation: false,
  schemaValidationDelay: 800,
  enableFormatDetection: false,
  showAutoRepairButton: false,
  enableAutocomplete: true,
  autocompleteActivateOnTyping: true,
  autocompleteDelay: 0,
  autoFormatOnLoad: false,
  autoFormatOnSave: false,
  autoFormatOnModeSwitch: false,
  autoCloseBrackets: true,
  autoHighlightSelectionMatches: true,
};

// 创建响应式设置对象
export const settings = reactive<EditorSettings>({ ...defaultSettings });

// 从 localStorage 加载设置
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(settings, defaultSettings, parsed);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// 保存设置到 localStorage
function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// 监听设置变化，自动保存
watch(
  settings,
  () => {
    saveSettings();
  },
  { deep: true }
);

// 初始化：加载保存的设置
loadSettings();

// 重置所有设置为默认值
export function resetSettings() {
  Object.assign(settings, defaultSettings);
}

// 导出设置助手函数
export function setSetting<K extends keyof EditorSettings>(
  key: K,
  value: EditorSettings[K]
) {
  settings[key] = value;
}

export function getSetting<K extends keyof EditorSettings>(
  key: K
): EditorSettings[K] {
  return settings[key];
}

