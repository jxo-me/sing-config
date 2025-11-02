# JSON 编辑模式事件与交互逻辑深度分析

## 概述

详细分析当前 JSON 编辑模式的事件流、格式化逻辑和校验机制，并提供优化方案避免自动格式化与手动编辑的冲突。

---

## 当前事件流分析

### 1. 编辑器层面 (`src/components/JsonEditor.vue`)

#### 事件类型

1. **文档变更事件** (`EditorView.updateListener`)
   ```typescript
   EditorView.updateListener.of((update) => {
     if (update.docChanged) {
       window.clearTimeout(changeTimer);
       changeTimer = window.setTimeout(() => {
         const content = editor?.state.doc.toString() || '';
         emit('update:modelValue', content);
       }, 300);
     }
   })
   ```
   - **触发时机**: 用户输入、粘贴、删除
   - **延迟**: 300ms 防抖
   - **作用**: 将编辑器内容同步到父组件

2. **JSON Schema 验证** (`jsonSchemaSync()`)
   ```typescript
   jsonSchemaSync() // JSON Schema 验证（实时）
   ```
   - **触发时机**: 文档变更后
   - **作用**: 实时检测 JSON 语法和 Schema 错误
   - **输出**: `editorErrors` 和 `editorValidationState`
   - **优先级**: JSON 格式错误 > Schema 校验错误

3. **自动补全** (`jsonSchemaAutocompleteExtension()`)
   - **触发时机**: 用户输入触发时
   - **作用**: 根据 Schema 提供智能补全

4. **自动缩进** (`indentOnInput()`)
   - **触发时机**: 按回车时
   - **作用**: 自动插入 2 空格缩进

5. **闭合括号** (`closeBrackets()`)
   - **触发时机**: 输入 `{`, `[`, `"` 时
   - **作用**: 自动闭合括号和引号

### 2. 父组件层面 (`src/pages/Editor.vue`)

#### 事件处理

1. **onInput 函数**
   ```typescript
   async function onInput(val: string) {
     isUserEditing = true; // 标记为用户编辑
     window.clearTimeout(timer);
     timer = window.setTimeout(async () => {
       syncEditorContentToConfig(val);
       isUserEditing = false; // 编辑完成
     }, 300);
   }
   ```
   - **触发时机**: JsonEditor 发出 `update:modelValue` 事件
   - **延迟**: 300ms 防抖
   - **作用**: 同步到 `currentConfig`

2. **右侧栏错误显示**
   - **触发时机**: `editorErrors` 更新时
   - **作用**: 实时显示错误列表

3. **自动修复按钮**
   - **触发时机**: `needsRepair` 为 true
   - **作用**: 显示"自动修复"按钮

### 3. 快捷键与菜单

#### 快捷键
- `Ctrl+F`: 搜索
- `Ctrl+H`: 替换
- `Ctrl+A`: 全选
- `Ctrl+C/V/X/Z/Y`: 复制/粘贴/剪切/撤销/重做
- `Tab`: 缩进
- `Shift+Tab`: 取消缩进

#### 右键菜单 (`src/lib/codemirror-context-menu.ts`)
1. **格式化** (`format`)
   ```typescript
   const formattedText = toPrettyJson();
   await loadFromText(formattedText);
   ```
   - **作用**: 美化 JSON（2 空格缩进）
   - **触发**: 右键菜单或快捷键

2. **压缩** (`compact`)
   ```typescript
   const compactText = toCompactJson();
   await loadFromText(compactText);
   ```
   - **作用**: 压缩为单行 JSON

3. **清空**
   - **作用**: 清空编辑器

4. **复制/粘贴/剪切**
   - **作用**: 剪贴板操作

---

## 关键发现：没有自动格式化

### ✅ 已经正确实现

**当前设计已避免了自动格式化的问题：**

1. **手动格式化**
   - 用户需要主动点击"格式化"按钮
   - 通过右键菜单或快捷键触发

2. **实时校验**
   - JSON 编辑时只进行**验证**，不格式化
   - 错误实时显示在右侧栏

3. **防抖机制**
   - 300ms 防抖避免频繁更新
   - `isUserEditing` 标记避免冲突

4. **智能提示**
   - 无效 JSON 显示"自动修复"按钮
   - 有效 JSON 显示错误列表

### ❌ 潜在的冲突场景

虽然当前没有自动格式化，但以下场景仍需注意：

#### 场景 1：间接格式化

**问题**: 右键菜单"格式化"会触发 `loadFromText`，可能导致光标位置丢失。

**影响**: 
- 用户体验：光标跳到文档开头
- 用户体验：丢失当前编辑位置

#### 场景 2：模式切换

**问题**: 表单模式 → JSON 模式切换会重新格式化。

**代码**:
```typescript
// watch(currentConfig, () => {
//   text.value = toPrettyJson();
// });
```

**状态**: ✅ 已注释掉，不会触发

#### 场景 3：文件加载

**问题**: 打开文件时 `loadFromText` 会格式化。

**影响**: 
- 如果原文件格式混乱，会被强制格式化

---

## 设计方案：选择性格式化

### 需求

1. 手动编辑时不自动格式化
2. 提供明确的格式化入口
3. 支持格式化前预览
4. 保留用户编辑的位置

### 方案 A：智能格式化开关 ⭐⭐⭐⭐⭐

#### 设计要点

1. 添加格式化选项（设置中）
   - "自动格式化（文件加载时）"
   - "自动格式化（保存时）"
   - "自动格式化（切换模式时）"

2. 默认行为
   - 加载时不自动格式化
   - 保存时不自动格式化
   - 手动格式化保留光标位置

3. 实现

```typescript
// src/stores/settings.ts
export const settings = reactive({
  autoFormatOnLoad: false,      // 文件加载时自动格式化
  autoFormatOnSave: false,      // 保存时自动格式化
  autoFormatOnModeSwitch: false // 模式切换时自动格式化
});
```

```typescript
// src/pages/Editor.vue
async function onOpen() {
  // ... 读取文件
  const content = await readTextFile(path);
  
  // 如果开启自动格式化
  if (settings.autoFormatOnLoad) {
    await loadFromText(content);
  } else {
    // 直接设置文本，不触发格式化
    text.value = content;
    // 但仍需要解析到 config
    try {
      const parsed = JSON.parse(content);
      currentConfig.value = parsed;
    } catch {
      // 保持原文
    }
  }
}
```

**优点**:
- 用户可控
- 默认不自动格式化
- 兼容现有流程

**缺点**:
- 需新增设置 UI

### 方案 B：格式化前确认对话框 ⭐⭐⭐⭐

#### 设计要点

1. 格式化前提示
   - 如果内容被修改，弹出确认
   - "确定要格式化当前 JSON 吗？"

2. 实现

```typescript
async function handleFormat() {
  if (isDirty.value) {
    const confirmed = await message(
      currentLocale.value === 'zh'
        ? '格式化会重新整理您的 JSON。确定继续吗？'
        : 'Formatting will reorganize your JSON. Continue?',
      { kind: 'question', title: '确认格式化' }
    );
    if (!confirmed) return;
  }
  
  // 保存光标位置
  const pos = jsonEditorRef.value?.getScrollPosition();
  
  // 格式化
  const formatted = JSON.stringify(currentConfig.value, null, 2);
  text.value = formatted;
  await loadFromText(formatted);
  
  // 恢复光标位置（如果可能）
  if (pos) {
    await nextTick();
    jsonEditorRef.value?.setScrollPosition(pos.scrollTop, pos.scrollLeft);
  }
}
```

**优点**:
- 明确的操作提示
- 用户可控
- 无需新增 UI

**缺点**:
- 频繁操作会打断

### 方案 C：格式化预览（Diff 视图） ⭐⭐⭐

#### 设计要点

1. 预览变更
   - 点击格式化时显示 Diff
   - 用户可确认或取消

2. 实现
- 对比前后内容
- 高亮差异
- 按钮：应用/取消

**优点**:
- 变更可见
- 防止误操作

**缺点**:
- 实现成本较高
- 小改动过于繁琐

---

## 推荐实现方案

### 组合方案：A + B

核心策略:
1. 默认不自动格式化
2. 可选开启 3 种自动格式化
3. 手动格式化前提示（内容已修改时）

### 实现步骤

#### Step 1: 创建设置 Store

```typescript
// src/stores/settings.ts
import { reactive } from 'vue';

export const settings = reactive({
  autoFormatOnLoad: false,
  autoFormatOnSave: false,
  autoFormatOnModeSwitch: false,
});

// 从 localStorage 加载
const saved = localStorage.getItem('editor-settings');
if (saved) {
  Object.assign(settings, JSON.parse(saved));
}

// 保存到 localStorage
export function saveSettings() {
  localStorage.setItem('editor-settings', JSON.stringify(settings));
}
```

#### Step 2: 优化格式化函数

```typescript
// src/pages/Editor.vue
async function handleFormat() {
  try {
    // 检查是否需要确认
    const needsConfirm = isDirty.value && hasManualChanges(text.value);
    
    if (needsConfirm && currentLocale.value === 'zh') {
      const msg = await message(
        '格式化会重新整理您的 JSON。确定继续吗？',
        { kind: 'question', title: '确认格式化' }
      );
      if (!msg) return;
    }
    
    // 保存光标位置
    const scrollPos = jsonEditorRef.value?.getScrollPosition();
    
    // 格式化
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text.value || '{}');
    } catch {
      parsed = currentConfig.value || {};
    }
    
    const formatted = JSON.stringify(parsed, null, 2);
    text.value = formatted;
    await loadFromText(formatted);
    
    // 恢复滚动位置
    await nextTick();
    if (scrollPos) {
      jsonEditorRef.value?.setScrollPosition(scrollPos.scrollTop, scrollPos.scrollLeft);
    }
  } catch (err) {
    console.error('Failed to format JSON:', err);
  }
}

// 检测是否有手动修改
function hasManualChanges(text: string): boolean {
  const formatted = JSON.stringify(currentConfig.value, null, 2);
  // 简单检测：如果差异超过格式化带来的差异，认为有手动修改
  return text !== formatted;
}
```

#### Step 3: 添加设置 UI

```vue
<!-- src/components/EditorSettings.vue -->
<template>
  <div class="editor-settings">
    <h3>{{ currentLocale === 'zh' ? '编辑器设置' : 'Editor Settings' }}</h3>
    
    <div class="setting-item">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.autoFormatOnLoad"
          @change="saveSettings"
        />
        <span>{{ currentLocale === 'zh' ? '文件加载时自动格式化' : 'Auto format on file load' }}</span>
      </label>
    </div>
    
    <div class="setting-item">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.autoFormatOnSave"
          @change="saveSettings"
        />
        <span>{{ currentLocale === 'zh' ? '保存时自动格式化' : 'Auto format on save' }}</span>
      </label>
    </div>
    
    <div class="setting-item">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.autoFormatOnModeSwitch"
          @change="saveSettings"
        />
        <span>{{ currentLocale === 'zh' ? '模式切换时自动格式化' : 'Auto format on mode switch' }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { settings, saveSettings } from '../stores/settings';
import { useI18n } from '../i18n';

const { currentLocale } = useI18n();
</script>
```

---

## 当前状态总结

### ✅ 已正确实现

1. **无自动格式化**
   - 手动编辑时不会触发
   - 模式切换不会触发

2. **实时校验** ⭐⭐⭐⭐⭐
   - **JSON 格式校验优先**：先确保 JSON 语法有效
   - Schema 验证次之：JSON 有效后才进行 Schema 校验
   - 错误实时提示

3. **智能修复** ⭐⭐⭐⭐⭐
   - 检测无效 JSON（`needsRepair` 计算属性）
   - 提供"自动修复"按钮
   - **优先级修复**：致命错误（未闭合字符串/括号）优先处理

4. **防抖机制**
   - 300ms 防抖避免频繁更新
   - 避免性能问题

### ⚠️ 可优化点

1. **光标位置丢失**
   - 格式化后光标跳到开头
   - 需要保存并恢复位置

2. **缺少用户选择**
   - 无"自动格式化"开关
   - 无法个性化配置

3. **缺少确认机制**
   - 格式化前未提示
   - 可能误操作

---

## 结论

### 当前设计已很好 ⭐⭐⭐⭐⭐

**当前实现避免了最关键的冲突：手动编辑时不会自动格式化。**

### 优先级策略 ✅

**已实现：**
- ✅ JSON 格式校验 > Schema 校验
- ✅ 致命错误优先修复（未闭合字符串/括号）
- ✅ 手动编辑不触发格式化
- ✅ 实时错误提示

**优化建议（可选）：**

**优先级 1（推荐）:**
- 保存并恢复格式化后的光标位置

**优先级 2（可选）:**
- 添加"自动格式化"设置选项
- 手动格式化前提示

**优先级 3（高级）:**
- 格式化预览（Diff 视图）
- 部分格式化（选中区域）

---

## 参考资料

- [CodeMirror 6 Events](https://codemirror.net/docs/ref/#view.EditorView.updateListener)
- [svelte-jsoneditor - No auto-format](https://github.com/josdejong/svelte-jsoneditor)

---

## 更新日志

### 2024-12-19 - v1.1

**关键优化：**
- ✅ 明确 JSON 格式校验 > Schema 校验的优先级
- ✅ 实时校验和智能修复的优先级策略
- ✅ 优先级修复：致命错误优先

**文档生成时间**: 2024-12-19

