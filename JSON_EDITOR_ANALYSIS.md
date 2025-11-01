# JSON 编辑器事件逻辑分析

## 当前事件链条

### 用户输入时的完整流程：

```
1. 用户在编辑器中输入
   ↓
2. JsonEditor.vue (88-96行) 
   EditorView.updateListener 监听编辑器变化
   ↓ (300ms 防抖)
3. emit('update:modelValue', content)
   ↓
4. Editor.vue (307行)
   v-model="text" 绑定 → text.value 更新
   ↓
5. Editor.vue (65-74行)
   @update:modelValue="onInput" 触发
   ↓ (300ms 防抖)
6. loadFromText(val)
   ↓
7. config.ts (28-32行)
   JSON.parse(text) → setConfig(parsed)
   ↓
8. config.ts (13-17行)
   currentConfig.value = newConfig
   ↓
9. Editor.vue (60-62行)
   watch(currentConfig) 触发
   ↓
10. text.value = toPrettyJson()
    JSON.stringify(currentConfig.value, null, 2) - 自动格式化！
    ↓
11. JsonEditor.vue (134-149行)
    watch(props.modelValue) 触发
    ↓
12. 编辑器内容被完全替换为格式化后的 JSON
    - 光标位置被重置
    - 用户正在输入的内容被打断
    - 无法正常编辑！
```

## 问题分析

### 🔴 核心问题：自动格式化导致的编辑冲突

**问题1：循环触发**
- 用户输入 → 解析JSON → 格式化JSON → 更新编辑器
- 这是一个单向的、自动的格式化流程，没有考虑用户正在编辑的情况

**问题2：光标位置丢失**
- 格式化后，光标被重置到文档末尾（Math.min(pos, length)）
- 用户在中间位置编辑时，格式化后光标跳到末尾

**问题3：实时格式化冲突**
- `toPrettyJson()` 使用 `JSON.stringify(..., null, 2)` 固定格式
- 每次 `currentConfig` 变化都会触发格式化
- 即使用户只是想输入一个字符，也会被完全替换

## 当前代码中的事件监听器

### 1. JsonEditor.vue 中的监听器：

```typescript
// 监听器1：编辑器内容变化 → 向上发送
EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    window.clearTimeout(changeTimer);
    changeTimer = window.setTimeout(() => {
      const content = editor?.state.doc.toString() || '';
      emit('update:modelValue', content);  // 300ms防抖
    }, 300);
  }
}),

// 监听器2：外部传入值变化 → 更新编辑器
watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== editor.state.doc.toString()) {
      const pos = editor.state.selection.main.head;
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: v ?? '',  // 完全替换内容
        },
        selection: { anchor: Math.min(pos, (v ?? '').length) },
      });
    }
  }
);
```

### 2. Editor.vue 中的监听器：

```typescript
// 监听器3：配置变化 → 格式化文本
watch(currentConfig, () => {
  text.value = toPrettyJson();  // 自动格式化！
});

// 监听器4：文本输入 → 解析配置
async function onInput(val: string) {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      await loadFromText(val);  // 解析并更新配置
    } catch (e) {
      // 忽略解析错误
    }
  }, 300);
}
```

## 逻辑冲突点

### 冲突1：双向绑定冲突
- **JsonEditor** 向上发送：`emit('update:modelValue')`
- **Editor** 向下传递：`v-model="text"`
- **Editor** 自动更新：`watch(currentConfig) → text.value = toPrettyJson()`

当用户输入时：
1. JsonEditor 发送新值
2. Editor 接收并解析
3. Editor 自动格式化并更新 text.value
4. JsonEditor 的 watch 检测到 props.modelValue 变化
5. 编辑器内容被替换，用户编辑被打断

### 冲突2：防抖时间重叠
- JsonEditor 防抖：300ms
- Editor.onInput 防抖：300ms
- 两次防抖叠加可能导致延迟更长，但无法解决格式化问题

### 冲突3：格式化时机不当
- 当前：配置变化就格式化（实时）
- 应该：只有在特定情况下才格式化（如保存、切换模式等）

## 解决方案

### 方案1：延迟格式化（推荐）
只在用户停止输入一段时间后才格式化

### 方案2：禁用自动格式化
移除 `watch(currentConfig)` 中的自动格式化

### 方案3：智能同步
检查是否是用户主动编辑，如果是则不格式化

