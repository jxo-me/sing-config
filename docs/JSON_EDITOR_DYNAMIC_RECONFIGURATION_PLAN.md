# JsonEditor 动态响应设置 - 完整重构方案

## 📊 现状分析

### 当前问题

1. **扩展配置固化**：编辑器扩展在 `onMounted` 一次性配置，无法动态响应设置变化
2. **设置无法即时生效**：需要刷新页面才能应用新设置
3. **扩展重构困难**：部分扩展（如 autocomplete、schema）使用内部 Promise 缓存，难以动态重新创建
4. **主题配置缺失**：语法高亮样式硬编码在组件中，无法配置
5. **缺少配置中心**：配置项分散在各个文件中

### 已有基础

✅ **已完成**：
- Settings Store（`src/stores/settings.ts`）
- Settings UI（`src/components/EditorSettings.vue`）
- JsonEditor 初步接入设置（条件扩展）
- Editor.vue 接入 needsRepair

⚠️ **待完善**：
- 动态响应设置变化
- 延迟配置（schema、autocomplete）
- 主题系统
- 格式化相关配置

---

## 🎯 设计目标

### 核心需求

1. **实时响应**：设置变化立即生效，无需刷新
2. **完整配置**：所有扩展支持配置化
3. **性能优化**：合理使用缓存，避免重复初始化
4. **主题系统**：支持多主题切换
5. **优雅降级**：设置缺失时使用合理默认值

### 技术约束

- CodeMirror 6 扩展系统
- Extension 不可变，需要重新创建
- 某些扩展（linter、autocomplete）有内部状态
- Vue 3 reactive 响应式系统
- localStorage 持久化

---

## 📋 完整配置项清单

### 扩展 Settings 接口

```typescript
export interface EditorSettings {
  // === 核心编辑功能 ===
  
  // 自动缩进
  autoIndent: boolean;
  indentSize: number;
  
  // 自动补全
  enableAutocomplete: boolean;
  autocompleteActivateOnTyping: boolean;
  autocompleteDelay: number;
  
  // Schema 校验
  enableSchemaValidation: boolean;
  schemaValidationDelay: number;
  
  // 格式检测
  enableFormatDetection: boolean;
  showAutoRepairButton: boolean;
  
  // 自动格式化
  autoFormatOnLoad: boolean;
  autoFormatOnSave: boolean;
  autoFormatOnModeSwitch: boolean;
  
  // === 编辑辅助 ===
  
  autoCloseBrackets: boolean;
  autoHighlightSelectionMatches: boolean;
  enableLineNumbers: boolean; // 新
  enableFoldGutter: boolean; // 新
  enableBracketMatching: boolean; // 新
  
  // === 主题配置（新）===
  
  theme: 'light' | 'dark' | 'auto'; // 新
  syntaxHighlightingEnabled: boolean; // 新
  
  // === 显示选项（新）===
  
  lineHeight: number; // 新：行高倍数
  fontSize: number; // 新：字体大小
  fontFamily: string; // 新：字体族
  wordWrap: boolean; // 新：自动折行
  showWhitespace: boolean; // 新：显示空白字符
  
  // === 高级选项（新）===
  
  tabSize: number; // 新：Tab 键空格数
  renderLineHighlight: 'none' | 'gutter' | 'line' | 'all'; // 新
  showRuler: boolean; // 新：显示标尺
  rulerPosition: number; // 新：标尺位置
}
```

---

## 🏗️ 分步实现方案

### 阶段 1：扩展 Settings Store（1-2 小时）

**目标**：添加所有新配置项，保持向后兼容

**步骤**：

1. **扩展接口和默认值**
   ```typescript
   // src/stores/settings.ts
   export const defaultSettings: EditorSettings = {
     // ... 现有配置
     
     // 新增：编辑辅助
     enableLineNumbers: true,
     enableFoldGutter: true,
     enableBracketMatching: true,
     
     // 新增：主题
     theme: 'light',
     syntaxHighlightingEnabled: true,
     
     // 新增：显示选项
     lineHeight: 1.6,
     fontSize: 14,
     fontFamily: 'Menlo, Monaco, "Courier New", monospace',
     wordWrap: true,
     showWhitespace: false,
     
     // 新增：高级选项
     tabSize: 2,
     renderLineHighlight: 'line',
     showRuler: false,
     rulerPosition: 80,
   };
   ```

2. **添加迁移逻辑**
   - localStorage 版本检测
   - 自动合并新配置项

3. **添加校验逻辑**
   - 配置值合法性检查
   - 自动修正非法值

**验收标准**：
- ✅ Settings Store 有完整类型定义
- ✅ 默认值合理
- ✅ 向后兼容旧配置

---

### 阶段 2：重构扩展创建函数（2-3 小时）

**目标**：使扩展函数接受配置参数，移除内部全局状态

**涉及文件**：
- `src/lib/json-schema-autocomplete.ts`
- `src/lib/codemirror-json-schema.ts`
- `src/components/JsonEditor.vue`

#### 2.1 重构 Autocomplete 扩展

**问题**：当前使用硬编码配置

**解决方案**：

```typescript
// src/lib/json-schema-autocomplete.ts

export interface AutocompleteConfig {
  enabled: boolean;
  activateOnTyping: boolean;
  delay: number;
}

const defaultAutocompleteConfig: AutocompleteConfig = {
  enabled: true,
  activateOnTyping: true,
  delay: 0,
};

export function createJsonSchemaAutocompleteExtension(config: AutocompleteConfig = defaultAutocompleteConfig) {
  if (!config.enabled) {
    return []; // 返回空扩展
  }
  
  return autocompletion({
    activateOnTyping: config.activateOnTyping,
    activateOnTypingDelay: config.delay,
    override: [
      async (context: CompletionContext) => {
        return await jsonSchemaAutocomplete(context);
      },
    ],
  });
}

// 保持向后兼容的默认导出
export function jsonSchemaAutocompleteExtension() {
  return createJsonSchemaAutocompleteExtension();
}
```

#### 2.2 重构 Schema Validation 扩展

**问题**：linter 延迟硬编码

**解决方案**：

```typescript
// src/lib/codemirror-json-schema.ts

export interface SchemaValidationConfig {
  enabled: boolean;
  delay: number;
}

const defaultSchemaConfig: SchemaValidationConfig = {
  enabled: false,
  delay: 800,
};

export async function createJsonSchemaExtension(config: SchemaValidationConfig = defaultSchemaConfig): Promise<Extension[]> {
  if (!config.enabled) {
    return [];
  }
  
  if (schemaExtensionPromise) {
    return schemaExtensionPromise;
  }
  
  schemaExtensionPromise = (async () => {
    const schema = await getSchema();
    const options: JSONValidationOptions = {
      formatError: createFormatError(),
    };
    
    return [
      ...stateExtensions(schema),
      linter(createWrappedLinter(options), {
        needsRefresh: needsRefreshWithLocale,
        delay: config.delay, // 使用配置
      }),
    ];
  })();
  
  return schemaExtensionPromise;
}

// 保持向后兼容
export async function jsonSchema(): Promise<Extension[]> {
  return createJsonSchemaExtension({ enabled: true, delay: 800 });
}

export function jsonSchemaSync(): Extension[] {
  return [];
}
```

#### 2.3 创建主题系统

**新文件**：`src/lib/editor-themes.ts`

```typescript
import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  name: Theme;
  colors: {
    string: string;
    number: string;
    bool: string;
    null: string;
    propertyName: string;
    punctuation: string;
    bracket: string;
    separator: string;
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      string: '#0ea5e9',
      number: '#8b5cf6',
      bool: '#f59e0b',
      null: '#ef4444',
      propertyName: '#10b981',
      punctuation: '#6b7280',
      bracket: '#6b7280',
      separator: '#6b7280',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      string: '#60a5fa',
      number: '#a78bfa',
      bool: '#fbbf24',
      null: '#f87171',
      propertyName: '#34d399',
      punctuation: '#9ca3af',
      bracket: '#9ca3af',
      separator: '#9ca3af',
    },
  },
  auto: themes.light, // 暂用 light，后续实现系统主题检测
};

export function createSyntaxHighlighting(config: { theme: Theme; enabled: boolean }) {
  if (!config.enabled) {
    return [];
  }
  
  const themeConfig = themes[config.theme];
  return [
    syntaxHighlighting(HighlightStyle.define([
      { tag: t.string, color: themeConfig.colors.string },
      { tag: t.number, color: themeConfig.colors.number },
      { tag: t.bool, color: themeConfig.colors.bool },
      { tag: t.null, color: themeConfig.colors.null },
      { tag: t.propertyName, color: themeConfig.colors.propertyName, fontWeight: 'bold' },
      { tag: t.punctuation, color: themeConfig.colors.punctuation },
      { tag: t.bracket, color: themeConfig.colors.bracket },
      { tag: t.separator, color: themeConfig.colors.separator },
    ])),
  ];
}
```

#### 2.4 创建编辑器主题扩展

**新增**：`src/lib/editor-custom-theme.ts`

```typescript
import { EditorView } from '@codemirror/view';

export interface EditorThemeConfig {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showWhitespace: boolean;
}

export function createEditorTheme(config: EditorThemeConfig): Extension[] {
  return [
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-content': {
        fontSize: `${config.fontSize}px`,
        fontFamily: config.fontFamily,
        lineHeight: `${config.lineHeight}`,
      },
      '.cm-line': {
        padding: '0 4px',
      },
      // 根据 showWhitespace 控制空白字符显示
      ...(config.showWhitespace && {
        '.cm-whitespace': { 
          color: 'rgba(0, 0, 0, 0.2)',
        },
      }),
    }),
  ];
}
```

**验收标准**：
- ✅ 所有扩展函数支持配置参数
- ✅ 保持向后兼容
- ✅ 可以禁用功能（返回空数组）
- ✅ 无全局状态泄漏

---

### 阶段 3：JsonEditor 动态重构（3-4 小时）

**目标**：实现扩展的实时重载机制

#### 3.1 创建扩展构建函数

**方案 A：完全重建（简单但性能差）**

```typescript
// src/components/JsonEditor.vue

function buildExtensions(settings: EditorSettings): Extension[] {
  const extensions: Extension[] = [];
  
  // 基础功能
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
  
  // 语言支持
  extensions.push(json());
  
  // 主题
  if (settings.syntaxHighlightingEnabled) {
    extensions.push(...createSyntaxHighlighting({ 
      theme: settings.theme, 
      enabled: true 
    }));
  }
  
  // 编辑器主题
  extensions.push(...createEditorTheme({
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    lineHeight: settings.lineHeight,
    showWhitespace: settings.showWhitespace,
  }));
  
  // 快捷键
  extensions.push(history());
  extensions.push(keymap.of([indentWithTab, ...defaultKeymap, ...searchKeymap]));
  
  // UI
  extensions.push(contextMenu());
  
  if (settings.wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }
  
  // 监听器
  extensions.push(EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => {
        const content = editor?.state.doc.toString() || '';
        emit('update:modelValue', content);
      }, 300);
    }
  }));
  
  return extensions;
}
```

**方案 B：StateEffect 动态更新（复杂但性能好）**

```typescript
// 定义扩展 ID
const ExtensionId = {
  SYNTAX_HIGHLIGHT: 'syntax-highlight',
  AUTOAUTOCOMPLETE: 'autocomplete',
  VALIDATION: 'validation',
  INDENT: 'indent',
} as const;

function buildConfigurableExtensions(settings: EditorSettings): Extension[] {
  const extensions: Extension[] = [];
  
  // 语法高亮
  const syntaxHighlightExt = settings.syntaxHighlightingEnabled
    ? createSyntaxHighlighting({ theme: settings.theme, enabled: true })
    : [];
  
  // 自动补全
  const autocompleteExt = createJsonSchemaAutocompleteExtension({
    enabled: settings.enableAutocomplete,
    activateOnTyping: settings.autocompleteActivateOnTyping,
    delay: settings.autocompleteDelay,
  });
  
  // Schema 校验（异步，需要特殊处理）
  // 注意：这个需要异步加载，所以不能在这里直接添加
  
  extensions.push(...syntaxHighlightExt, ...autocompleteExt);
  
  return extensions;
}

async function asyncLoadExtensions(settings: EditorSettings): Promise<Extension[]> {
  const extensions: Extension[] = [];
  
  if (settings.enableSchemaValidation) {
    const schemaExt = await createJsonSchemaExtension({
      enabled: true,
      delay: settings.schemaValidationDelay,
    });
    extensions.push(...schemaExt);
  }
  
  return extensions;
}
```

#### 3.2 监听设置变化并重载

**关键挑战**：CodeMirror 扩展一旦创建无法修改，必须重建编辑器

**解决方案**：使用 `watch` 监听设置变化，触发编辑器重建

```typescript
// src/components/JsonEditor.vue

// 添加重建标志
const needsReconfiguration = ref(false);
let pendingReconfiguration: number | undefined;

// 监听所有设置变化
watch(
  () => settings,
  () => {
    // 防抖：300ms 内的多次变化只触发一次重建
    clearTimeout(pendingReconfiguration);
    pendingReconfiguration = window.setTimeout(() => {
      reconfigureEditor();
    }, 300);
  },
  { deep: true }
);

async function reconfigureEditor() {
  if (!editor || !container.value) return;
  
  console.log('Reconfiguring editor with new settings...');
  
  // 保存当前状态
  const currentContent = editor.state.doc.toString();
  const currentSelection = editor.state.selection.main.head;
  const scrollPos = jsonEditorRef.value?.getScrollPosition();
  
  // 重建扩展
  const baseExtensions = buildExtensions(settings);
  const asyncExtensions = await asyncLoadExtensions(settings);
  const allExtensions = [...baseExtensions, ...asyncExtensions];
  
  // 创建新状态
  const newState = EditorState.create({
    doc: currentContent,
    extensions: allExtensions,
    selection: { anchor: currentSelection },
  });
  
  // 应用新状态
  editor.setState(newState);
  
  // 恢复滚动位置
  if (scrollPos) {
    await nextTick();
    jsonEditorRef.value?.setScrollPosition(scrollPos.scrollTop, scrollPos.scrollLeft);
  }
  
  editor.requestMeasure();
  console.log('Editor reconfigured successfully');
}
```

#### 3.3 优化性能

**问题**：每次设置变化重建编辑器导致性能问题

**优化策略**：

1. **防抖**：300ms 内的多次变化只触发一次重建
2. **按需重建**：只重建受影响的扩展
3. **缓存共享状态**：Schema 和语法树缓存复用

```typescript
// 细粒度变更检测
watch(
  () => ({
    autoIndent: settings.autoIndent,
    indentSize: settings.indentSize,
    enableAutocomplete: settings.enableAutocomplete,
    autocompleteDelay: settings.autocompleteDelay,
    theme: settings.theme,
    fontSize: settings.fontSize,
  }),
  async (newVal, oldVal) => {
    // 检查哪些配置变了
    const changed = Object.keys(newVal).filter(
      key => newVal[key] !== oldVal[key]
    );
    
    if (changed.length === 0) return;
    
    console.log('Settings changed:', changed);
    await reconfigureEditor();
  },
  { deep: true }
);
```

**验收标准**：
- ✅ 设置变化立即生效
- ✅ 重建不丢失光标和滚动位置
- ✅ 性能可接受（重建 < 100ms）
- ✅ 无内存泄漏

---

### 阶段 4：扩展 Settings UI（2-3 小时）

**目标**：添加新配置项到设置界面

#### 4.1 添加主题选择器

```vue
<!-- src/components/EditorSettings.vue -->

<details class="settings-category" open>
  <summary class="category-header">
    <span class="category-icon">🎨</span>
    <span class="category-title">外观</span>
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
    
    <label class="setting-item">
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
  </div>
</details>
```

#### 4.2 添加显示选项

```vue
<details class="settings-category" open>
  <summary class="category-header">
    <span class="category-icon">👁️</span>
    <span class="category-title">显示选项</span>
  </summary>
  <div class="category-content">
    <label class="setting-item">
      <input type="checkbox" v-model="tempSettings.enableLineNumbers" />
      <div class="setting-label">
        <div class="setting-name">{{ labelFor('enableLineNumbers') }}</div>
      </div>
    </label>
    
    <label class="setting-item">
      <input type="checkbox" v-model="tempSettings.enableFoldGutter" />
      <div class="setting-label">
        <div class="setting-name">{{ labelFor('enableFoldGutter') }}</div>
      </div>
    </label>
    
    <label class="setting-item">
      <input type="checkbox" v-model="tempSettings.wordWrap" />
      <div class="setting-label">
        <div class="setting-name">{{ labelFor('wordWrap') }}</div>
      </div>
    </label>
  </div>
</details>
```

**验收标准**：
- ✅ 所有新配置项都有 UI
- ✅ 交互流畅
- ✅ 描述清晰
- ✅ 验证生效

---

### 阶段 5：扩展配置通知机制（1-2 小时）

**目标**：解决异步扩展（Schema、Autocomplete）的动态重载

#### 5.1 添加配置变更检测

```typescript
// src/lib/codemirror-json-schema.ts

let lastConfig: SchemaValidationConfig | null = null;
let schemaExtensionCache: Extension[] = [];

export async function createJsonSchemaExtension(config: SchemaValidationConfig): Promise<Extension[]> {
  // 如果配置相同，返回缓存
  if (lastConfig && 
      lastConfig.enabled === config.enabled &&
      lastConfig.delay === config.delay) {
    return schemaExtensionCache;
  }
  
  if (!config.enabled) {
    lastConfig = config;
    schemaExtensionCache = [];
    return [];
  }
  
  const schema = await getSchema();
  const options: JSONValidationOptions = {
    formatError: createFormatError(),
  };
  
  lastConfig = config;
  schemaExtensionCache = [
    ...stateExtensions(schema),
    linter(createWrappedLinter(options), {
      needsRefresh: needsRefreshWithLocale,
      delay: config.delay,
    }),
  ];
  
  return schemaExtensionCache;
}
```

#### 5.2 清理 Promise 缓存

```typescript
export function clearSchemaExtensionCache() {
  schemaExtensionPromise = null;
  lastConfig = null;
  schemaExtensionCache = [];
}
```

**验收标准**：
- ✅ 配置不变时不重复创建扩展
- ✅ 配置变化时正确更新
- ✅ 内存使用合理

---

### 阶段 6：格式化功能接入（2-3 小时）

**目标**：实现 autoFormatOnLoad/Save/ModeSwitch

#### 6.1 在 Topbar 中实现加载格式化

```typescript
// src/components/Topbar.vue
import { settings } from '../stores/settings';

async function onOpen() {
  // ... 现有代码
  const content = await readTextFile(path as string);
  
  // 根据设置决定是否格式化
  if (settings.autoFormatOnLoad) {
    try {
      const parsed = JSON.parse(content);
      await loadFromText(JSON.stringify(parsed, null, 2));
    } catch {
      await loadFromText(content);
    }
  } else {
    await loadFromText(content);
  }
}
```

#### 6.2 实现保存格式化

```typescript
async function onSave() {
  // ... 现有验证代码
  
  let text = toPrettyJson();
  
  // 根据设置决定是否格式化
  if (settings.autoFormatOnSave) {
    // 已经是格式化的，无需额外操作
  } else {
    text = JSON.stringify(currentConfig.value);
  }
  
  // ... 保存逻辑
}
```

#### 6.3 在 Editor.vue 实现模式切换格式化

```typescript
// src/pages/Editor.vue

watch(mode, async (newMode, oldMode) => {
  if (settings.autoFormatOnModeSwitch && newMode === 'json') {
    const formatted = toPrettyJson();
    text.value = formatted;
    await loadFromText(formatted);
  }
});
```

**验收标准**：
- ✅ 三种格式化场景都工作
- ✅ 设置即时生效
- ✅ 不丢失数据

---

### 阶段 7：测试与优化（2-3 小时）

#### 7.1 功能测试清单

- [ ] 所有设置开关测试
- [ ] 主题切换测试
- [ ] 字体大小变化测试
- [ ] 延迟参数验证
- [ ] 格式化自动触发测试
- [ ] 性能基准测试

#### 7.2 边界情况测试

- [ ] 快速切换设置
- [ ] 设置值为边界值
- [ ] 网络问题导致 Schema 加载失败
- [ ] 内存泄漏测试

#### 7.3 用户体验测试

- [ ] 重建时无闪烁
- [ ] 光标位置正确保留
- [ ] 滚动位置正确保留
- [ ] 输入无延迟感

---

## 📦 新文件清单

### 需要创建的文件

1. `src/lib/editor-themes.ts` - 主题系统
2. `src/lib/editor-custom-theme.ts` - 编辑器主题
3. `src/lib/editor-extensions-factory.ts` - 扩展工厂（可选）

### 需要修改的文件

1. `src/stores/settings.ts` - 扩展接口
2. `src/lib/json-schema-autocomplete.ts` - 添加配置参数
3. `src/lib/codemirror-json-schema.ts` - 添加配置参数
4. `src/components/JsonEditor.vue` - 动态重构
5. `src/components/EditorSettings.vue` - 添加新配置 UI
6. `src/components/Topbar.vue` - 格式化逻辑
7. `src/pages/Editor.vue` - 模式切换格式化

---

## ⚠️ 风险与缓解

### 风险 1：性能问题

**风险**：频繁重建编辑器导致卡顿

**缓解**：
- 防抖延迟
- 按需重建
- 虚拟滚动优化

### 风险 2：状态丢失

**风险**：重建时丢失用户输入

**缓解**：
- 保存文档内容
- 保存光标位置
- 保存滚动位置
- 快速重建（< 100ms）

### 风险 3：扩展冲突

**风险**：某些扩展组合可能冲突

**缓解**：
- 充分测试
- 提供预设配置
- 错误恢复机制

### 风险 4：向后兼容

**风险**：旧配置格式升级失败

**缓解**：
- 版本检测
- 自动迁移
- 降级策略

---

## 🚀 实施建议

### 优先级排序

1. **P0（必须）**：设置基础功能 - autoIndent, autocomplete, validation
2. **P1（重要）**：动态响应机制
3. **P2（增强）**：主题系统
4. **P3（优化）**：高级显示选项
5. **P4（完善）**：格式化自动触发

### 实施顺序

**迭代 1（本周）**：
- 阶段 1：扩展 Settings
- 阶段 2：重构扩展函数
- 阶段 3：基本动态响应

**迭代 2（下周）**：
- 阶段 4：扩展 UI
- 阶段 5：优化性能
- 阶段 6：格式化功能

**迭代 3（后续）**：
- 阶段 7：全面测试
- 性能优化
- 文档完善

---

## 📚 参考资源

- [CodeMirror 6 State Effects](https://codemirror.net/docs/ref/#state.StateEffect)
- [Extension Reconfiguration](https://discuss.codemirror.net/t/how-to-reconfigure-extensions-dynamically/3834)
- [EditorState.reconfigure](https://codemirror.net/docs/ref/#state.EditorState.reconfigure)

---

## ✅ 验收标准总结

### 功能完整性

- ✅ 所有 20+ 配置项可用
- ✅ 设置即时生效
- ✅ 配置持久化
- ✅ 向后兼容

### 性能指标

- ✅ 设置切换 < 100ms
- ✅ 无明显卡顿
- ✅ 内存使用稳定

### 用户体验

- ✅ 设置界面友好
- ✅ 重建无闪烁
- ✅ 状态正确保留
- ✅ 文档清晰

### 代码质量

- ✅ 类型安全
- ✅ 无 linter 错误
- ✅ 代码可维护
- ✅ 充分测试

---

## 📝 后续优化

### 短期优化

- 添加更多主题
- 性能监控
- 错误日志

### 中期优化

- 预设配置
- 导入导出配置
- 快捷键自定义

### 长期规划

- 插件系统
- 主题市场
- 协作功能

