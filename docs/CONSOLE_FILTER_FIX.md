# 控制台日志被过滤问题 - 立即修复

## 🔴 问题诊断

从您的截图可以看到：

**控制台显示：**
```
There are unread messages that have been filtered Clear Filters
```

这说明：**日志确实存在，但是被过滤掉了！**

## ✅ 立即修复步骤

### 方法 1: 清除过滤器（推荐）

1. **点击控制台中的 "Clear Filters" 按钮**
2. 或者在控制台输入框中删除任何过滤文本
3. 日志应该立即显示出来

### 方法 2: 切换到正确的标签

当前您选中的是 **"Evaluations"** 标签，这只会显示评估结果。

请切换到：
- **"All"** - 显示所有消息（推荐）
- **"Logs"** - 显示所有 console.log 输出
- **"Errors"** - 显示错误
- **"Warnings"** - 显示警告

### 方法 3: 检查过滤器设置

1. 查看控制台右上角的过滤器图标
2. 确保以下选项都已启用：
   - ✅ All
   - ✅ Errors  
   - ✅ Warnings
   - ✅ Logs
   - ✅ Info
   - ✅ Debug

3. 清除所有文本过滤器（如果有）

## 🎯 验证修复

清除过滤器后，您应该立即看到：

```
[Settings] 设置模块已加载
[Settings] enableAutocomplete 默认值: true
[JsonEditor] 组件初始化开始
[JsonEditor] onMounted 被调用
[Autocomplete] createJsonSchemaAutocompleteExtension 被调用
...
```

## 💡 为什么会出现这个问题？

CodeMirror 和开发工具可能会：
- 将某些日志标记为"评估"而非"日志"
- 自动过滤掉大量重复日志
- 根据日志级别自动隐藏某些消息

## 🔍 如果清除过滤器后仍然没有日志

1. **完全刷新页面**（Ctrl+Shift+R 或 Cmd+Shift+R）
2. **检查控制台级别设置**：
   - 点击控制台设置图标（齿轮⚙️）
   - 确保 "Verbose" 级别已启用
3. **手动测试**：
   ```javascript
   console.log('[TEST] 这条日志应该能看到');
   ```

## 📝 常见控制台过滤器位置

不同的浏览器/工具位置可能不同：

- **Chrome DevTools**: 控制台输入框右侧的过滤器图标
- **Firefox DevTools**: 控制台顶部的过滤器标签
- **VSCode 调试控制台**: 右上角的过滤器按钮

请先点击 **"Clear Filters"** 或切换到 **"All"** 标签，日志应该会立即显示！

