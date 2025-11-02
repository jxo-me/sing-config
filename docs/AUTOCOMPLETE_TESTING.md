# JSON Schema 自动补全测试指南

## 当前触发机制

基于 `activateOnTyping: true` 配置，自动补全会在以下情况触发：

### 0. 手动触发快捷键

**触发方式**：
- **Ctrl+Space（Win/Linux）** 或 **Cmd+Space（macOS）**
- **Tab 键**（当有补全选项时）
- **Enter 键**（确认选择）

**适用场景**：
- 在任意位置强制显示补全
- 补全未被自动触发时使用

### 1. 属性名补全触发时机

以下情况会触发属性名自动补全：

1. **在空对象内**：输入 `{` 后按任意字符
2. **在逗号后**：输入 `,` 后按任意字符
3. **在引号内开始**：输入 `"` 后按任意字符
4. **已有部分输入**：按任意字符匹配现有属性名

**关键正则匹配**：
```typescript
/[{,]\s*"?$/  // 匹配：{ 或 , 之后的空格和可选引号
```

**示例场景**：
- `{` → 显示所有属性
- `{d` → 显示 `dns`, `disable_cache` 等
- `{,` → 显示所有属性
- `{, ` → 显示所有属性
- `{"` → 显示所有属性
- `{"d` → 显示 `dns` 等

### 2. 属性值补全触发时机

以下情况会触发属性值自动补全：

1. **在冒号后**：输入 `:` 后按任意字符
2. **在字符串值位置**：在 `"` 内的值输入
3. **在非字符串值位置**：布尔、数字、null 等

**关键正则匹配**：
```typescript
/:\s*$/  // 匹配：冒号后的空格
```

**示例场景**：
- `"dns": ` → 显示对象属性
- `"dns": {` → 显示对象补全
- `"enable": ` → 显示布尔值 `true`, `false`
- `"log_level": "` → 显示枚举值

## 测试步骤

### 测试环境准备

1. **启动开发服务器**：
```bash
cd /Users/mickey/dev/rust/sing-config
npm run dev
# 或
pnpm tauri dev
```

2. **打开编辑器**：访问应用中的 JSON 编辑模式

3. **清空编辑器**：确保从一个干净状态开始测试

### 测试用例 0：手动触发快捷键

**步骤**：
1. 在编辑器中任意位置按 **Ctrl+Space**（或 Cmd+Space）
2. 观察是否弹出补全列表

**预期结果**：
- 立即显示当前位置可用的补全选项
- 显示所有可用属性名或值

### 测试用例 1：属性名补全 - 空对象

**步骤**：
1. 输入 `{`
2. 观察是否自动弹出补全列表
3. 输入字符 `d` 查看过滤结果
4. 使用 `↑↓` 选择，按 `Enter` 或 `Tab` 确认

**预期结果**：
- 立即显示 `$schema`, `certificate`, `dns`, `endpoints` 等属性
- 输入 `d` 后只显示 `dns` 等以 `d` 开头的属性
- 确认后自动插入 `"dns": {}`（包含默认值）

### 测试用例 2：属性名补全 - 逗号后

**步骤**：
1. 输入 `{"dns": {},`
2. 观察是否自动弹出补全列表
3. 输入字符 `e`

**预期结果**：
- 显示 `endpoints`, `experimental` 等
- 确认后自动插入 `"endpoints": []`

### 测试用例 3：属性名补全 - 引号内

**步骤**：
1. 输入 `{"`
2. 观察是否自动弹出补全列表
3. 输入字符 `d`

**预期结果**：
- 显示所有属性
- 输入 `d` 后只显示 `dns` 等
- 不会插入额外的引号（避免重复）

### 测试用例 4：属性值补全 - 冒号后对象

**步骤**：
1. 输入 `"dns":`
2. 输入空格或 `{`
3. 观察是否弹出补全列表

**预期结果**：
- 显示对象的子属性补全
- 自动插入 `{` 和对象结构

### 测试用例 5：属性值补全 - 枚举值

**步骤**：
1. 输入 `"log": {"level": "`
2. 观察是否弹出补全列表

**预期结果**：
- 显示枚举值：`"debug"`, `"info"`, `"warn"`, `"error"`
- 选择后自动插入，不重复引号

### 测试用例 6：属性值补全 - 布尔值

**步骤**：
1. 输入 `"enable": `
2. 观察是否弹出补全列表

**预期结果**：
- 显示 `true`, `false`
- 选择后直接插入布尔值

### 测试用例 7：值补全 - 空值

**步骤**：
1. 输入 `"optional": `
2. 观察是否弹出补全列表

**预期结果**：
- 显示 `null`
- 选择后插入 `null`

### 测试用例 8：默认值插入

**步骤**：
1. 输入 `{`
2. 选择 `"dns"` 属性
3. 观察是否自动插入默认值

**预期结果**：
- 字符串类型：插入 `""`
- 数字类型：插入 `0`
- 布尔类型：插入 `false`
- 对象类型：插入 `{}`
- 数组类型：插入 `[]`
- 枚举类型：插入第一个枚举值

### 测试用例 9：智能引号处理

**步骤**：
1. 在 `{"dns": {"enable": |}}` 中光标在 `|` 处
2. 选择补全项

**预期结果**：
- 不插入重复引号
- 正确识别已在引号内

### 测试用例 10：嵌套对象补全

**步骤**：
1. 输入完整的根对象部分：
   ```
   {
     "dns": {
       |
     }
   }
   ```
2. 在光标处输入

**预期结果**：
- 显示 DNS 对象的子属性
- 正确识别嵌套路径

## 预期行为总结

### ✅ 应该触发补全的情况

1. ✅ 在对象内输入任意字符（`{c` 显示匹配的属性）
2. ✅ 在逗号后输入任意字符（`,e` 显示匹配的属性）
3. ✅ 在冒号后输入（`: {` 显示对象属性）
4. ✅ 在引号内输入任意字符（`"d` 显示匹配的属性）
5. ✅ 按 `Ctrl+Space` 手动触发

### ❌ 不应该触发补全的情况

1. ❌ 在注释内
2. ❌ 在无效 JSON 结构的死胡同中
3. ❌ 在数值中间
4. ❌ 在转义字符内

## 调试技巧

### 1. 查看补全日志

在浏览器控制台查看补全触发日志：

```javascript
// 在 src/lib/json-schema-autocomplete.ts 中添加
console.log('Autocomplete triggered at position:', context.pos);
console.log('Context:', {
  path,
  currentSchema,
  isPropertyName: isPropertyNameContext(context),
  isValue: isValueContext(context)
});
```

### 2. 检查语法树

```javascript
import { syntaxTree } from '@codemirror/language';

const tree = syntaxTree(context.state);
const node = tree.resolve(context.pos, 1);
console.log('Current node:', node.name, node);
```

### 3. 验证正则匹配

测试正则表达式是否正确：

```javascript
// 属性名检测
console.log(beforeCursor.match(/[{,]\s*"?$/));

// 值补全检测
console.log(beforeCursor.match(/:\s*$/));
```

## 常见问题排查

### 问题 1：补全不出现

**可能原因**：
1. `activateOnTyping: true` 被其他配置覆盖
2. 上下文判断失败
3. Schema 未加载完成

**解决方案**：
- 检查控制台是否有错误
- 验证 Schema 是否正确加载
- 确认语法树解析正常

### 问题 2：补全重复引号

**可能原因**：
- 字符串检测逻辑错误
- `createPropertyApply` 或 `createValueApply` 判断不准确

**解决方案**：
- 使用语法树判断（已实现）
- 检查 `isInString` 变量是否正确

### 问题 3：补全延迟过高

**可能原因**：
- `activateOnTypingDelay` 设置过大
- Schema 加载过慢

**解决方案**：
- 确保 `activateOnTypingDelay: 0`
- 优化 Schema 缓存

## 相关文件

- `src/lib/json-schema-autocomplete.ts` - 自动补全主逻辑
- `src/lib/codemirror-json-schema.ts` - Schema 验证与缓存
- `src/components/JsonEditor.vue` - 编辑器组件
- `src/pages/Editor.vue` - 主页面

## 参考

- [CodeMirror Autocomplete 文档](https://codemirror.net/6/docs/ref/#autocomplete)
- [VSCode IntelliSense 指南](https://code.visualstudio.com/docs/editor/intellisense)
