# 自动补全测试注意事项

## 当前状态

已完全关闭以下功能，便于测试自动补全：
- ✅ JSON Schema 同步校验（jsonSchemaSync）
- ✅ JSON Schema 异步校验（jsonSchema）
- ✅ **自动缩进（indentOnInput）** - 解决图1→图2问题
- ✅ **JSON 格式检测（needsRepair）** - 解决图3错误提示问题
- ✅ 编辑器右侧错误面板
- ✅ 自动修复按钮
- ⚠️ **自动补全功能保持启用**

## 如何恢复

测试完成后，运行以下命令恢复：

```bash
git revert bb577a1 12d69b1
```

或手动恢复：

**src/components/JsonEditor.vue**:
1. 第 10 行：取消注释 `import { indentOnInput, indentUnit }`
2. 第 15 行：取消注释 `import { jsonSchema, jsonSchemaSync }`
3. 第 77-78 行：取消注释 `indentOnInput()` 和 `indentUnit.of('  ')`
4. 第 82 行：取消注释 `jsonSchemaSync()`
5. 第 4 行：添加 `StateEffect` 到导入
6. 第 180-184 行：取消注释 `await jsonSchema()` 相关代码

**src/pages/Editor.vue**:
1. 第 22 行：取消注释 `import { isValidJson }`
2. 第 167-171 行：恢复 `needsRepair` 原始逻辑

## 测试要点

### 应该测试的功能

1. **触发机制**
   - Ctrl/Cmd+Space 手动触发
   - 输入 `{` 后自动触发
   - 输入 `,` 后自动触发  
   - 输入 `:` 后自动触发
   - 输入任意字符匹配

2. **补全内容**
   - 属性名补全列表
   - 属性值补全列表
   - 默认值自动插入
   - 智能引号处理

3. **交互行为**
   - 方向键导航
   - Enter 确认
   - Tab 确认
   - Escape 关闭

### 不需要测试的功能

- Schema 校验错误提示
- 右侧错误面板
- 自动修复功能
- 实时验证
- **自动缩进（Enter 键）**
- **JSON 格式检测**

### 已修复的问题

- ✅ 图1→图2：输入 `{\n|\n}` 按回车不再自动缩进
- ✅ 图3错误提示：输入 `{d|}` 不再显示"检测到无效的 JSON 格式"

## 测试命令

```bash
# 启动开发服务器
npm run dev

# 或 Tauri 模式
pnpm tauri dev
```

## 问题记录

如发现问题，请记录：

```
### 问题 X：[简短描述]

**触发步骤**：
1. ...
2. ...

**预期结果**：
- ...

**实际结果**：
- ...

**截图**：[如有]
```

## 下一步

测试完成后：
1. 记录所有发现的问题
2. 运行 `git revert 12d69b1` 恢复校验
3. 根据问题修复自动补全逻辑
4. 重新测试（包含校验功能）
