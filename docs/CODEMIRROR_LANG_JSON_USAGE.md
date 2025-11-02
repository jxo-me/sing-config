# @codemirror/lang-json 库使用说明

## 📚 库的作用

`@codemirror/lang-json` 是 CodeMirror 6 的官方 JSON 语言支持包，为编辑器提供 JSON 语言的**核心功能支持**。

## 🎯 核心功能

### 1. **语法解析器（Parser）**
- 使用 Lezer 解析器解析 JSON 语法结构
- 构建抽象语法树（AST），识别：
  - 对象（`{}`）
  - 数组（`[]`）
  - 键值对（property）
  - 字符串、数字、布尔值、null
  - 注释（在某些配置下）

### 2. **语法高亮标签定义**
虽然不直接提供颜色，但定义了**语义标签**（tags），供 `HighlightStyle` 使用：

```typescript
import { tags as t } from '@lezer/highlight';

// json() 扩展提供的标签：
t.string        // 字符串值
t.number        // 数字值
t.bool          // 布尔值（true/false）
t.null          // null 值
t.propertyName  // 对象属性名（键）
t.punctuation   // 标点符号（{}, [], :, ,）
t.bracket       // 括号
t.separator     // 分隔符
```

### 3. **语言服务器支持**
- 提供语言上下文信息
- 支持代码折叠（fold）
- 支持括号匹配
- 支持缩进计算

## 🔧 默认行为

### ✅ 默认启用的功能

1. **语法解析**
   - 自动识别 JSON 结构
   - 构建语法树供其他扩展使用

2. **语义标签**
   - 为不同类型的 JSON 元素标记语义标签
   - 这些标签可以被 `syntaxHighlighting()` 使用

3. **折叠支持**
   - 对象和数组可以折叠/展开
   - 需要配合 `foldGutter()` 扩展使用

4. **括号匹配**
   - 自动识别匹配的括号对
   - 需要配合 `bracketMatching()` 扩展使用

### ❌ 默认**不**提供的功能

1. **语法高亮颜色**
   - `json()` 只提供标签，不提供颜色
   - 需要配合 `syntaxHighlighting()` + `HighlightStyle` 使用

2. **语法验证**
   - 不进行 JSON 格式验证
   - 不检测语法错误
   - 需要配合 `codemirror-json-schema` 或其他验证工具

3. **自动补全**
   - 不提供自动补全功能
   - 需要配合 `@codemirror/autocomplete` 和自定义补全逻辑

4. **格式化**
   - 不提供自动格式化功能
   - 不自动缩进

5. **错误标记**
   - 不显示语法错误标记
   - 需要配合 `@codemirror/lint` 使用

## 📝 在项目中的使用

### 当前使用位置

**文件**: `src/components/JsonEditor.vue`

```typescript
import { json } from '@codemirror/lang-json';

// 在 buildExtensions() 中使用
extensions.push(json()); // JSON 语言支持（包含语法高亮）
```

### 与其他扩展的配合

1. **语法高亮**（必需配合使用）:
   ```typescript
   import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
   import { tags as t } from '@lezer/highlight';
   
   // 必须在使用 json() 后应用语法高亮样式
   const style = HighlightStyle.define([
     { tag: t.string, color: '#0ea5e9' },
     { tag: t.propertyName, color: '#10b981', fontWeight: 'bold' },
     // ... 其他标签
   ]);
   
   extensions.push(
     json(),                    // 1. 先添加 JSON 语言支持
     syntaxHighlighting(style)  // 2. 再应用高亮样式
   );
   ```

2. **代码折叠**:
   ```typescript
   import { foldGutter } from '@codemirror/language';
   
   extensions.push(
     json(),        // JSON 语言支持（提供折叠信息）
     foldGutter()   // 折叠图标显示
   );
   ```

3. **括号匹配**:
   ```typescript
   import { bracketMatching } from '@codemirror/language';
   
   extensions.push(
     json(),            // JSON 语言支持（提供括号信息）
     bracketMatching()  // 括号匹配高亮
   );
   ```

4. **Schema 验证**（项目中的实现）:
   ```typescript
   import { jsonSchemaLinter } from 'codemirror-json-schema';
   
   extensions.push(
     json(),              // JSON 语言支持（提供语法树）
     linter(jsonSchemaLinter(...))  // Schema 验证（基于语法树）
   );
   ```

## ⚙️ 配置选项

`json()` 函数可以接受配置选项：

```typescript
import { json } from '@codemirror/lang-json';

// 默认配置
json()

// 自定义配置（示例）
json({
  // 可以配置解析器选项（如果有的话）
})
```

**注意**：在 CodeMirror 6.0.2 版本中，`json()` 函数通常不接受参数，使用默认配置即可。

## 🆚 与其他 JSON 相关扩展的区别

| 扩展 | 作用 | 是否必需 |
|------|------|---------|
| `@codemirror/lang-json` | JSON 语法解析、标签定义 | ✅ **必需** |
| `syntaxHighlighting()` | 语法高亮颜色样式 | ✅ 必需（显示颜色） |
| `codemirror-json-schema` | Schema 验证、错误标记 | ⚪ 可选 |
| `@codemirror/autocomplete` | 自动补全框架 | ⚪ 可选 |
| `bracketMatching()` | 括号匹配高亮 | ⚪ 可选 |
| `foldGutter()` | 代码折叠图标 | ⚪ 可选 |

## 🎨 项目中的完整配置

在 `JsonEditor.vue` 中的完整使用：

```typescript
async function buildExtensions(): Promise<Extension[]> {
  const extensions: Extension[] = [];
  
  // ... 其他扩展 ...
  
  // JSON 语言支持（必需，提供语法解析）
  extensions.push(json());
  
  // 语法高亮（必需，显示颜色）
  extensions.push(...createSyntaxHighlighting({
    theme: settings.theme,
    enabled: settings.syntaxHighlightingEnabled,
  }));
  
  // Schema 验证（可选）
  if (settings.enableSchemaValidation) {
    extensions.push(...await createJsonSchemaExtension({...}));
  }
  
  // 代码折叠（可选）
  if (settings.enableFoldGutter) {
    extensions.push(foldGutter());
  }
  
  // 括号匹配（可选）
  if (settings.enableBracketMatching) {
    extensions.push(bracketMatching());
  }
  
  return extensions;
}
```

## 🔍 关键理解

### `json()` 的作用

1. **基础支持**：提供 JSON 语言的语法解析能力
2. **语义标记**：为代码元素打上语义标签
3. **语言上下文**：使其他扩展能够理解 JSON 结构

### 为什么不能移除 `json()`

如果移除 `json()` 扩展：
- ❌ 没有语法解析器，编辑器无法理解 JSON 结构
- ❌ 无法应用语法高亮（因为没有标签）
- ❌ 无法进行 Schema 验证（因为没有语法树）
- ❌ 无法进行代码折叠
- ❌ 无法进行括号匹配
- ❌ 自动补全无法理解上下文

### 与自定义语法高亮的关系

项目中使用 `createSyntaxHighlighting()` 自定义了语法高亮：

```typescript
// src/lib/editor-themes.ts
export function createSyntaxHighlighting(config) {
  return [
    syntaxHighlighting(HighlightStyle.define([
      { tag: t.string, color: themeConfig.colors.string },
      { tag: t.propertyName, color: themeConfig.colors.propertyName },
      // ... 使用 json() 提供的标签
    ]))
  ];
}
```

**工作流程**：
1. `json()` 解析 JSON，标记为 `t.string`, `t.propertyName` 等标签
2. `syntaxHighlighting()` + `HighlightStyle` 将这些标签映射到颜色
3. 编辑器显示彩色代码

## 📚 参考资源

- [CodeMirror 6 官方文档](https://codemirror.net/docs/)
- [@codemirror/lang-json 源码](https://github.com/codemirror/lang-json)
- [Lezer 解析器文档](https://lezer.codemirror.net/)

## ✅ 总结

`@codemirror/lang-json` 的 `json()` 函数是 JSON 编辑器的**基础依赖**：

- ✅ 提供语法解析（必需）
- ✅ 提供语义标签（必需）
- ✅ 提供语言上下文（必需）
- ❌ 不提供颜色样式（需要配合 `syntaxHighlighting`）
- ❌ 不提供验证功能（需要配合其他扩展）
- ❌ 不提供自动补全（需要自定义实现）

**简单理解**：`json()` = JSON 的"理解器"，告诉编辑器"这是 JSON"，其他功能都需要在此基础上扩展。

