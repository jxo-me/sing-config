import { reactive, watch } from 'vue';

/**
 * 编辑器自动化功能设置
 */
export interface EditorSettings {
  // === 核心编辑功能 ===
  
  // 自动缩进相关
  autoIndent: boolean; // 启用自动缩进（indentOnInput）
  indentSize: number; // 缩进大小（空格数）
  
  // 自动补全
  enableAutocomplete: boolean; // 启用自动补全
  autocompleteActivateOnTyping: boolean; // 自动补全：输入时自动触发
  autocompleteDelay: number; // 自动补全延迟（毫秒）
  autocompleteSchemaFilePath: string; // 自动补全 Schema 文件路径（默认使用 schemaFilePath）
  
  // JSON Schema 校验
  enableSchemaValidation: boolean; // 启用 Schema 验证
  schemaValidationDelay: number; // Schema 校验延迟（毫秒）
  schemaFilePath: string; // Schema 文件路径（URL 或本地路径）
  
  // 格式检测和修复
  enableFormatDetection: boolean; // 启用 JSON 格式检测（isValidJson）
  showAutoRepairButton: boolean; // 显示自动修复按钮
  
  // 自动格式化
  autoFormatOnLoad: boolean; // 加载文件时自动格式化
  autoFormatOnSave: boolean; // 保存文件时自动格式化
  autoFormatOnModeSwitch: boolean; // 切换模式时自动格式化
  
  // === 编辑辅助 ===
  
  autoCloseBrackets: boolean; // 自动闭合括号
  autoHighlightSelectionMatches: boolean; // 高亮选中文本的匹配项
  enableLineNumbers: boolean; // 显示行号
  enableFoldGutter: boolean; // 启用代码折叠
  enableBracketMatching: boolean; // 启用括号匹配
  
  // === 主题配置 ===
  
  theme: 'light' | 'dark' | 'auto'; // 主题选择
  syntaxHighlightingEnabled: boolean; // 启用语法高亮
  
  // === 显示选项 ===
  
  lineHeight: number; // 行高倍数
  fontSize: number; // 字体大小（px）
  fontFamily: string; // 字体族
  wordWrap: boolean; // 自动折行
  showWhitespace: boolean; // 显示空白字符
  
  // === 高级选项 ===
  
  tabSize: number; // Tab 键空格数
  renderLineHighlight: 'none' | 'gutter' | 'line' | 'all'; // 行高亮显示方式
  showRuler: boolean; // 显示标尺
  rulerPosition: number; // 标尺位置（列数）
}

const STORAGE_KEY = 'sing-config-editor-settings';
const SETTINGS_VERSION_KEY = 'sing-config-editor-settings-version';
const CURRENT_SETTINGS_VERSION = 1;

// 默认设置：所有自动化功能默认关闭（除了基础辅助功能）
export const defaultSettings: EditorSettings = {
  // 核心编辑功能
  autoIndent: false,
  indentSize: 2,
  enableAutocomplete: true,
  autocompleteActivateOnTyping: true,
  autocompleteDelay: 0,
  autocompleteSchemaFilePath: '', // 空字符串表示使用 schemaFilePath
  enableSchemaValidation: false,
  schemaValidationDelay: 800,
  schemaFilePath: '/schema.json',
  enableFormatDetection: false,
  showAutoRepairButton: false,
  autoFormatOnLoad: false,
  autoFormatOnSave: false,
  autoFormatOnModeSwitch: false,
  
  // 编辑辅助
  autoCloseBrackets: true,
  autoHighlightSelectionMatches: true,
  enableLineNumbers: true,
  enableFoldGutter: true,
  enableBracketMatching: true,
  
  // 主题配置
  theme: 'light',
  syntaxHighlightingEnabled: true,
  
  // 显示选项
  lineHeight: 1.6,
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  wordWrap: true,
  showWhitespace: false,
  
  // 高级选项
  tabSize: 2,
  renderLineHighlight: 'line',
  showRuler: false,
  rulerPosition: 80,
};

// 创建响应式设置对象
export const settings = reactive<EditorSettings>({ ...defaultSettings });

/**
 * 迁移旧版设置到新版本
 */
function migrateSettings(parsed: Partial<EditorSettings>): Partial<EditorSettings> {
  const migrated = { ...parsed };
  
  // 版本 0 → 1: 添加新配置项
  // 新配置项会自动填充默认值，无需特殊处理
  // 如需版本特定迁移，在此添加逻辑
  
  return migrated;
}

/**
 * 验证设置值的合法性
 */
function validateSettings(parsed: Partial<EditorSettings>): Partial<EditorSettings> {
  // 直接返回对象，由 Object.assign 处理合并
  // 如果需要更严格的验证，可以在此添加
  return parsed;
}

// 从 localStorage 加载设置
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(SETTINGS_VERSION_KEY);
    
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<EditorSettings>;
      
      // 检查版本
      const version = savedVersion ? parseInt(savedVersion, 10) : 0;
      let settingsToApply = parsed;
      
      // 版本迁移
      if (version < CURRENT_SETTINGS_VERSION) {
        console.log(`Migrating settings from version ${version} to ${CURRENT_SETTINGS_VERSION}`);
        settingsToApply = migrateSettings(parsed);
      }
      
      // 验证设置
      settingsToApply = validateSettings(settingsToApply);
      
      // 合并默认值和应用设置
      Object.assign(settings, defaultSettings, settingsToApply);
      
      // 保存版本号
      localStorage.setItem(SETTINGS_VERSION_KEY, String(CURRENT_SETTINGS_VERSION));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    // 加载失败时使用默认设置
    Object.assign(settings, defaultSettings);
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

/**
 * 获取自动补全使用的 Schema 文件路径
 * 如果 autocompleteSchemaFilePath 为空，则使用 schemaFilePath
 */
export function getAutocompleteSchemaPath(): string {
  return settings.autocompleteSchemaFilePath || settings.schemaFilePath;
}

