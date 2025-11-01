# 差异功能深度分析与改进方案

## 问题分析

### 当前实现逻辑

1. **差异计算** (`src/stores/config.ts`)
   - `getConfigDiff()` 比较 `originalConfig` 和 `currentConfig`
   - `configDiff` 是 computed，实时计算差异

2. **原始配置更新时机**
   - `loadFromText()`: 打开文件时
   - `setLastSavedPath()`: 保存文件后
   - `onNew()`: 新建文件时
   - **问题**：`onInput()` 在 JSON 模式下也会调用 `loadFromText()`

3. **问题根源** (`src/pages/Editor.vue:107-118`)
   ```typescript
   async function onInput(val: string) {
     isUserEditing = true;
     window.clearTimeout(timer);
     timer = window.setTimeout(async () => {
       try {
         await loadFromText(val);  // ❌ 这里会重置 originalConfig！
         isUserEditing = false;
       } catch (e) {
         isUserEditing = false;
       }
     }, 300);
   }
   ```

4. **问题流程**
   - 用户添加/删除内容 → `currentConfig` 改变
   - 差异显示：1 个差异
   - 300ms 后，`onInput` 防抖触发 → 调用 `loadFromText`
   - `loadFromText` 调用 `setOriginalConfig(parsed)` → **重置原始配置**
   - 差异消失：从 1 变成 0

## 行业最佳实践参考

### 1. Git 版本控制系统
- **基准点固定**：HEAD 不会因工作区变化而改变
- **只有明确操作才更新基准点**：commit、checkout、merge
- **差异计算**：始终相对于固定的基准点

### 2. VSCode 编辑器
- **原始文件状态**：打开文件时确定，不会自动更新
- **脏标记**：文件有未保存修改时显示 `*`
- **差异视图**：相对于打开时的状态

### 3. Google Docs / Notion
- **版本历史**：每个保存点是独立的版本
- **差异跟踪**：相对于明确的保存点
- **不会自动更新原始版本**

## 改进方案

### 方案 1：分离同步逻辑（推荐）

**核心思想**：分离"加载文件"和"同步编辑器内容"的逻辑

```typescript
// 新增：仅同步编辑器内容，不更新原始配置
function syncEditorContentToConfig(text: string) {
  try {
    const parsed = JSON.parse(text);
    currentConfig.value = parsed;
    isDirty.value = true;
    runValidation();
  } catch (e) {
    // 忽略解析错误，等待用户继续输入
  }
}

// 修改：onInput 使用新的同步函数
async function onInput(val: string) {
  isUserEditing = true;
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    syncEditorContentToConfig(val);  // ✅ 只同步，不重置原始配置
    isUserEditing = false;
  }, 300);
}

// loadFromText 保持原样：只在明确"加载文件"时调用
```

### 方案 2：快照机制（增强版）

**核心思想**：原始配置是稳定的快照，只在明确操作时更新

```typescript
// 快照管理
let snapshotId = 0;
const configSnapshots = new Map<number, Record<string, unknown>>();

function createSnapshot(config: Record<string, unknown>): number {
  snapshotId++;
  configSnapshots.set(snapshotId, JSON.parse(JSON.stringify(config)));
  return snapshotId;
}

function getSnapshot(snapshotId: number) {
  return configSnapshots.get(snapshotId);
}

// 差异计算基于快照
function getConfigDiff(snapshotId: number) {
  const snapshot = getSnapshot(snapshotId);
  // 比较快照和当前配置
}
```

### 方案 3：差异级别分类（用户体验增强）

**核心思想**：根据差异大小和类型，提供更好的用户体验

```typescript
interface DiffItem {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'modified' | 'added' | 'removed';
  severity: 'minor' | 'major' | 'critical';
  category: 'addition' | 'deletion' | 'modification' | 'reorder';
}

function classifyDiff(diff: DiffItem): DiffItem {
  // 根据差异大小分类
  const oldSize = JSON.stringify(diff.oldValue).length;
  const newSize = JSON.stringify(diff.newValue).length;
  const sizeChange = Math.abs(oldSize - newSize);
  
  if (diff.type === 'added' && sizeChange > 1000) {
    diff.severity = 'major';
    diff.category = 'addition';
  } else if (diff.type === 'removed') {
    diff.severity = 'major';
    diff.category = 'deletion';
  } else if (sizeChange > 500) {
    diff.severity = 'major';
  } else {
    diff.severity = 'minor';
  }
  
  return diff;
}
```

## 实现优先级

1. **P0（必须）**：修复差异消失问题
   - 分离 `loadFromText` 和编辑器内容同步
   - 确保原始配置只在明确操作时更新

2. **P1（重要）**：增强差异展示
   - 差异分组（按类型、路径层级）
   - 差异过滤（只显示主要变化）
   - 差异统计（总数、按类型分类）

3. **P2（优化）**：用户体验优化
   - 差异高亮定位
   - 批量操作（接受/拒绝所有）
   - 差异导出

## 参考规范

- **Git 工作流**：工作区 → 暂存区 → 提交
- **VSCode 差异视图**：左侧原始，右侧修改
- **Material Design**：变更应该有明确的视觉反馈
- **WCAG 可访问性**：差异应该有足够的对比度和清晰的标签

