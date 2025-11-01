# codemirror-json-schema 库使用分析

## 概述

项目正在使用 `codemirror-json-schema@^0.8.1` 库，用于在 CodeMirror 编辑器中实现 JSON Schema 验证功能。

## 使用场景

### 1. 核心使用（直接导入）

**文件**: `src/lib/codemirror-json-schema.ts`

从 `codemirror-json-schema` 直接导入：
- **`jsonSchemaLinter`**: 创建 CodeMirror linter，进行 JSON Schema 验证
- **`stateExtensions`**: 设置 schema 状态扩展
- **`handleRefresh`**: 处理验证刷新逻辑
- **`JSONValidationOptions`**: 类型定义
- **`parseJSONDocumentState`**: 动态导入，用于获取 JSON 指针映射（可选）

```typescript
import { 
  jsonSchemaLinter, 
  stateExtensions, 
  handleRefresh, 
  type JSONValidationOptions 
} from 'codemirror-json-schema';

// 动态导入（可选功能）
const { parseJSONDocumentState } = await import('codemirror-json-schema');
```

### 2. 导出使用（通过封装）

**文件**: `src/components/JsonEditor.vue`, `src/pages/Editor.vue`

通过 `src/lib/codemirror-json-schema.ts` 导出：
- **`jsonSchema()`**: 异步 JSON Schema 扩展
- **`jsonSchemaSync()`**: 同步 JSON Schema 扩展
- **`editorErrors`**: 编辑器错误状态（供右侧面板使用）
- **`editorValidationState`**: 验证状态
- **`getCurrentLocale()`**: 当前语言

### 3. 工具函数导出

**文件**: `src/lib/validation.ts`

使用 `createFormatError()` 函数：
```typescript
import { createFormatError } from './codemirror-json-schema';
```

## 功能特性

### 1. JSON Schema 验证

使用 `jsonSchemaLinter` 创建 CodeMirror linter：
- 实时验证 JSON 文档
- 显示语法和 schema 错误
- 支持自定义错误格式化

```typescript
const baseLinter = jsonSchemaLinter(options);
```

### 2. Schema 状态管理

使用 `stateExtensions` 在编辑器状态中存储 schema：
- 避免重复加载 schema
- 支持动态 schema 更新

```typescript
...stateExtensions(schema)
```

### 3. 验证刷新机制

使用 `handleRefresh` 决定何时重新验证：
- 检测 schema 变化
- 与自定义逻辑（如语言切换）结合

```typescript
function needsRefreshWithLocale(vu: ViewUpdate): boolean {
  // 自定义逻辑
  const localeChanged = /* ... */;
  return localeChanged || handleRefresh(vu);
}
```

### 4. JSON 指针映射（可选）

动态导入 `parseJSONDocumentState` 获取精确位置：
- 计算错误在文档中的具体位置
- 用于右侧面板错误定位

```typescript
const parserModule = await import('codemirror-json-schema');
const { parseJSONDocumentState } = parserModule as any;
const parsedResult = parseJSONDocumentState(view.state);
```

## 依赖关系

```
codemirror-json-schema@^0.8.1
├── @codemirror/language@6.11.3
├── @codemirror/lint@6.9.1
├── @codemirror/state@6.5.2
├── @codemirror/view@6.38.6
└── @lezer/common@1.3.0
```

## 使用评估

### ✅ 正在使用

**必需功能**：
1. `jsonSchemaLinter`: 核心 linter 功能
2. `stateExtensions`: Schema 状态管理
3. `handleRefresh`: 验证刷新机制

**可选功能**：
4. `parseJSONDocumentState`: JSON 指针映射（用于错误定位）

### 替代方案评估

当前实现还使用了：
- **`json-schema-library`**: 独立的验证库，用于右侧面板错误显示

**两种验证库并用的原因**：
1. `codemirror-json-schema`: 提供 CodeMirror 集成，用于编辑器内的实时验证
2. `json-schema-library`: 提供独立的验证结果，用于提取详细错误信息和路径

### 优化建议

可以考虑：
1. **单一验证源**：只使用 `codemirror-json-schema`，从 linter 诊断中提取所有错误信息
2. **保留双验证**：如果需要更详细的错误信息，继续使用两个库

## 结论

**`codemirror-json-schema` 库正在使用，且是核心功能依赖**

- ✅ 必需：JSON Schema 验证、状态管理、刷新机制
- ✅ 推荐保留：该库提供了与 CodeMirror 的良好集成
- ⚠️ 可选：`parseJSONDocumentState` 功能用于增强错误定位

**建议**：
- 继续使用该库进行编辑器内的实时验证
- 考虑是否真的需要 `json-schema-library` 的双重验证
- 如果 `parseJSONDocumentState` 功能不稳定，可以移除该动态导入

## 相关文件

- `src/lib/codemirror-json-schema.ts`: 核心封装
- `src/components/JsonEditor.vue`: 编辑器组件
- `src/pages/Editor.vue`: 主编辑页面
- `src/lib/validation.ts`: 独立验证功能
- `src/lib/json-schema-autocomplete.ts`: 自动补全功能

