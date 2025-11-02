# 自动补全问题排查指南

## 问题症状

配置了 Schema 文件路径（如 `/schema.json`）后，JSON 编辑时没有自动补全提示。

## 排查步骤

### 1. 检查控制台日志

打开浏览器开发者工具（F12），切换到 Console 标签页，查找以 `[Autocomplete]` 开头的日志。

#### 扩展创建日志

当编辑器初始化时，应该看到：
```
[Autocomplete] 扩展创建完成，配置: {
  enabled: true,
  activateOnTyping: true,
  delay: 0,
  schemaPath: "/schema.json",
  currentSchemaPath: "/schema.json"
}
```

**检查点：**
- `enabled` 是否为 `true`？
- `schemaPath` 是否正确（应该是你配置的路径）？

#### Schema 加载日志

当自动补全触发时，应该看到：
```
[Autocomplete] getSchema 调用: {
  schemaPath: "/schema.json",
  currentSchemaPath: "/schema.json",
  resolvedPath: "/schema.json"
}
[Autocomplete] 开始加载 Schema: /schema.json
[Autocomplete] Schema 加载成功: ["type", "properties", ...]
```

**检查点：**
- `resolvedPath` 是否与配置的路径一致？
- 是否有 `Schema 加载失败` 错误？

#### 上下文判断日志

当在编辑器中输入时，应该看到：
```
[Autocomplete] 上下文判断: {
  jsonPath: [...],
  isProperty: true/false,
  isValue: true/false,
  hasCurrentSchema: true
}
```

**检查点：**
- `hasCurrentSchema` 是否为 `true`？
- `isProperty` 或 `isValue` 是否为 `true`？

### 2. 常见问题及解决方案

#### 问题 1: Schema 加载失败

**日志表现：**
```
[Autocomplete] Schema 加载失败: Error: 加载 schema 失败: 404
[Autocomplete] Schema 路径: /schema.json
```

**可能原因：**
- Schema 文件不存在或路径不正确
- 文件路径需要是相对于项目根目录的路径（如 `/schema.json`）或完整 URL

**解决方案：**
1. 检查 `public` 目录下是否有 `schema.json` 文件
2. 如果是本地开发，确认路径是 `/schema.json`（以 `/` 开头）
3. 检查浏览器 Network 标签，确认文件请求是否成功

#### 问题 2: 路径配置未生效

**日志表现：**
```
[Autocomplete] getSchema 调用: {
  schemaPath: undefined,
  currentSchemaPath: undefined,
  resolvedPath: "/schema.json"
}
```

**可能原因：**
- 配置未正确保存
- 编辑器重建时未传递路径

**解决方案：**
1. 检查 `EditorSettings.vue` 中的配置是否保存
2. 检查 `getAutocompleteSchemaPath()` 返回值
3. 确认 `settings.autocompleteSchemaFilePath` 或 `settings.schemaFilePath` 的值

#### 问题 3: 上下文判断失败

**日志表现：**
```
[Autocomplete] 上下文判断: {
  jsonPath: [],
  isProperty: false,
  isValue: false,
  hasCurrentSchema: true
}
```

**可能原因：**
- 光标位置不在有效的 JSON 属性名或值位置
- JSON 格式不正确

**解决方案：**
1. 确保光标在以下位置之一：
   - 对象属性名位置：`{ |` 或 `{, |` 或 `{"|`
   - 对象属性值位置：`"key": |`
2. 确保 JSON 格式正确（可以使用自动修复功能）

#### 问题 4: 无补全项

**日志表现：**
```
[Autocomplete] 找到 0 个属性补全项
[Autocomplete] 无补全项返回
```

**可能原因：**
- Schema 中没有定义 `properties`
- 当前路径下的 Schema 没有可补全的属性

**解决方案：**
1. 检查 Schema 文件结构，确认有 `properties` 定义
2. 确认当前编辑位置的 Schema 路径是否正确

### 3. 手动验证步骤

1. **验证 Schema 文件可访问：**
   - 在浏览器中直接访问：`http://localhost:5173/schema.json`（端口号根据实际情况）
   - 应该能看到 JSON 内容

2. **验证编辑器设置：**
   - 打开编辑器设置
   - 确认"启用自动补全"已开启
   - 确认"输入时自动触发"已开启
   - 确认 Schema 文件路径已正确配置

3. **验证编辑位置：**
   - 在空 JSON 对象中：`{ |}`
   - 在属性值位置：`{"key": |}`
   - 应该在这些位置触发自动补全

### 4. 临时调试代码

如果需要更详细的调试信息，可以在控制台运行：

```javascript
// 检查当前设置
console.log('Autocomplete enabled:', settings.enableAutocomplete);
console.log('Schema path:', settings.schemaFilePath);
console.log('Autocomplete schema path:', settings.autocompleteSchemaFilePath);

// 检查 Schema 加载
fetch('/schema.json')
  .then(r => r.json())
  .then(schema => console.log('Schema loaded:', Object.keys(schema)))
  .catch(err => console.error('Schema load error:', err));
```

### 5. 清理缓存

如果怀疑缓存问题，可以：

1. 清除浏览器缓存
2. 重启开发服务器
3. 或者在代码中调用 `clearAutocompleteSchemaCache()`（需要开发环境）

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整日志（特别是 `[Autocomplete]` 开头的）
2. Schema 文件路径和内容（如果是敏感信息，可以提供部分）
3. 触发自动补全时的编辑器内容和光标位置
4. 浏览器和操作系统版本

