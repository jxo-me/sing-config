# json-schema-library 库使用分析

## 概述

项目正在使用 `json-schema-library@^9.3.5` 库，用于独立进行 JSON Schema 验证，主要用于**表单模式**的验证和**右侧面板错误显示**。

## 使用场景

### 1. 核心验证功能

**文件**: `src/lib/validation.ts`

这是 `json-schema-library` 的主要使用位置：

```typescript
import { Draft07 } from 'json-schema-library';
import type { JsonError } from 'json-schema-library';

// 创建验证器实例
let validatorInstance: Draft07 | null = null;

async function getValidator(): Promise<Draft07> {
  if (validatorInstance) return validatorInstance;
  
  const schema = await loadSchema();
  const validator = new Draft07(schema as any);
  validatorInstance = validator;
  return validatorInstance;
}

// 验证配置
export async function validateConfig(config: unknown): Promise<ValidationResult> {
  const validator = await getValidator();
  const errors: JsonError[] = validator.validate(config);
  return {
    valid: errors.length === 0,
    errors: formattedErrors,
  };
}
```

**导出**：
- `validateConfig()`: 验证配置并返回结果
- `ValidationResult`: 验证结果类型

### 2. 在编辑器中的使用

**文件**: `src/lib/codemirror-json-schema.ts`

在 `createWrappedLinter` 函数中**动态导入** `json-schema-library`：

```typescript
// 动态导入 json-schema-library
const { Draft07 } = await import('json-schema-library');
const validator = new Draft07(schema as any);
const rawErrors = validator.validate(json);
```

**用途**：
- 为 JSON 模式提供**独立验证**以获取完整错误信息
- 补充 `codemirror-json-schema` 的诊断信息
- 用于右侧面板的错误显示

### 3. 在存储状态管理中的使用

**文件**: `src/stores/config.ts`

```typescript
import { validateConfig, ValidationResult } from '../lib/validation';

export const lastValidation = ref<ValidationResult>({ valid: true, errors: [] });

export async function runValidation() {
  lastValidation.value = await validateConfig(currentConfig.value);
}
```

**用途**：
- 表单模式的验证状态管理
- 保存前的验证检查
- 错误数量统计

### 4. 在编辑页面中的使用

**文件**: `src/pages/Editor.vue`

#### 表单模式验证

```typescript
async function validateNow() {
  if (mode.value === 'json') {
    // JSON 模式下，编辑器已经实时校验
    return;
  } else {
    // 表单模式下，需要独立校验
    await runValidation();
  }
}

const displayedErrors = computed(() => {
  if (mode.value === 'json') {
    return editorErrors.value;  // 编辑器错误
  } else {
    return lastValidation.value.errors;  // json-schema-library 验证结果
  }
});
```

#### 保存前验证

```typescript
// src/components/Topbar.vue
async function onSave() {
  await runValidation();  // 使用 json-schema-library 验证
  if (!lastValidation.value.valid) {
    // 阻止保存，显示错误
    return;
  }
  // 继续保存...
}
```

## 使用统计

### 直接导入（静态）

```typescript
import { Draft07 } from 'json-schema-library';
import type { JsonError } from 'json-schema-library';
```

**位置**：
- `src/lib/validation.ts` - 主要使用位置

### 动态导入

```typescript
const { Draft07 } = await import('json-schema-library');
```

**位置**：
- `src/lib/codemirror-json-schema.ts` - 辅助验证

### 函数调用

- `src/stores/config.ts` - `runValidation()` 调用
- `src/pages/Editor.vue` - `validateNow()`, `runValidation()` 调用
- `src/components/Topbar.vue` - `onSave()` 调用
- `src/lib/menu-handler.ts` - `tools_run_validation` 菜单项

## 双重验证机制

项目同时使用两个 JSON Schema 验证库：

### 1. codemirror-json-schema
- **用途**: 编辑器内实时验证
- **范围**: JSON 编辑模式
- **特性**: 集成 CodeMirror，实时诊断

### 2. json-schema-library
- **用途**: 独立验证，获取详细错误信息
- **范围**: 表单模式验证 + 编辑器辅助验证
- **特性**: 详细的错误信息，路径和消息提取

### 为什么需要两个库？

**JSON 模式**：
- 使用 `codemirror-json-schema` 进行编辑器内实时 lint
- 使用 `json-schema-library` 异步获取更详细的错误信息（用于右侧面板）

**表单模式**：
- 完全依赖 `json-schema-library` 进行验证
- 因为表单模式下没有编辑器实时验证

**保存前验证**：
- 使用 `json-schema-library` 进行最终验证
- 确保保存的数据符合 schema

## 是否可以移除？

### 不建议移除的原因

1. **表单模式必需**：
   - 表单模式完全依赖 `json-schema-library` 进行验证
   - JSON 模式的编辑器验证无法覆盖表单模式

2. **保存前验证必需**：
   - 所有保存操作都使用 `json-schema-library` 验证
   - 确保数据完整性

3. **详细错误信息**：
   - `json-schema-library` 提供更详细的错误信息
   - 包括完整的路径和数据指针

### 可能的优化

可以考虑移除 JSON 模式中的动态导入部分：

```typescript
// src/lib/codemirror-json-schema.ts 中的这段代码可以简化
const { Draft07 } = await import('json-schema-library');
```

**条件**：
- 如果 `codemirror-json-schema` 的 linter 诊断已经足够详细
- 不需要右侧面板显示更详细的错误

**影响**：
- JSON 模式的右侧面板可能显示较少的错误信息
- 但编辑器内的诊断仍然完整

## 结论

**`json-schema-library` 正在使用，且是核心功能依赖**

### ✅ 必需使用场景

1. **表单模式验证** - 完全依赖
2. **保存前验证** - 所有保存操作都使用
3. **错误统计** - 用于计算错误数量

### ⚠️ 可选使用场景

4. **JSON 模式辅助验证** - 用于增强右侧面板错误信息（可考虑移除动态导入）

### 建议

- **保留该库**：表单模式和保存验证必需
- **考虑优化**：如果 JSON 模式的右侧面板只需要基本错误信息，可以移除动态导入部分
- **双重验证并非冗余**：两种模式有不同的验证需求

## 相关文件

- `src/lib/validation.ts`: 主要使用位置
- `src/lib/codemirror-json-schema.ts`: 动态导入辅助验证
- `src/stores/config.ts`: 状态管理和验证调用
- `src/pages/Editor.vue`: 编辑页面集成
- `src/components/Topbar.vue`: 保存功能集成
- `src/lib/menu-handler.ts`: 菜单项触发验证

## 依赖关系图

```
json-schema-library@^9.3.5
├── Draft07 验证器
│   ├── validation.ts (核心验证)
│   └── codemirror-json-schema.ts (辅助验证)
├── JsonError 类型
│   └── validation.ts (错误格式化)
└── validate() 方法
    ├── stores/config.ts
    ├── pages/Editor.vue
    └── components/Topbar.vue
```

