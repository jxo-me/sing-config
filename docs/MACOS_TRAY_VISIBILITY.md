# macOS 托盘图标显示问题排查指南

## 如何在 macOS 上查看托盘图标

macOS 系统托盘图标显示在**屏幕顶部的菜单栏最右侧**（状态栏）。

### 查看步骤

1. **查看菜单栏右侧**
   - 位于屏幕顶部右侧，时间/日期显示旁边
   - 图标会从左到右依次排列

2. **如果看不到图标**
   - 查看是否有“显示更多”按钮（通常是省略号 `…` 或箭头）
   - 点击它展开隐藏的图标

3. **检查系统设置**
   - 打开“系统设置”（System Settings）
   - 前往“桌面与程序坞”（Desktop & Dock）
   - 确保“自动隐藏和显示菜单栏”未启用

## 可能的显示延迟

- **应用启动后**：托盘图标可能需要几秒钟才会出现
- **初次运行**：macOS 可能需要权限确认

## 调试方法

### 1. 检查应用是否正在运行

```bash
ps aux | grep sing-config | grep -v grep
```

### 2. 查看应用控制台输出

```bash
# 查看是否有托盘相关的错误或警告
cd /Users/mickey/dev/rust/sing-config
pnpm tauri dev
```

### 3. 检查图标文件

```bash
ls -lh src-tauri/icons/icon.png
file src-tauri/icons/icon.png
```

预期输出：
```
src-tauri/icons/icon.png: PNG image data, 512 x 512, 8-bit/color RGBA, non-interlaced
```

## 当前实现

- **图标路径**：`src-tauri/icons/icon.png` (512x512 PNG)
- **加载方式**：使用 `include_bytes!` 嵌入到二进制文件
- **图标创建**：`Image::new_owned(bytes, 512, 512)`

## 常见问题

### 问题 1：图标不显示

**可能原因**：
- 应用未运行
- 图标文件损坏或格式不正确
- macOS 菜单栏空间不足

**解决方法**：
1. 确认应用正在运行
2. 检查菜单栏是否有足够空间
3. 查看控制台是否有错误信息

### 问题 2：图标显示不正确

**可能原因**：
- 图标尺寸过大或过小
- 图标格式不支持

**解决方法**：
1. 使用 512x512 或 1024x1024 PNG
2. 确保是 RGBA 格式

### 问题 3：应用崩溃

**可能原因**：
- `icon.png` 文件未找到
- 图标数据损坏

**解决方法**：
```bash
# 重新生成或下载图标文件
cd src-tauri/icons
# 确保 icon.png 存在且有效
```

## 测试步骤

1. 启动应用
```bash
cd /Users/mickey/dev/rust/sing-config
pnpm tauri dev
```

2. 观察控制台输出
   - 查找 "Failed to build system tray" 错误
   - 查找 "TrayIcon" 相关的日志

3. 查看菜单栏
   - 等待 3-5 秒让图标出现
   - 尝试点击图标（左键/右键）

4. 测试功能
   - 左键点击：切换窗口显示/隐藏
   - 右键点击：显示菜单

## 下一步

如果仍然无法看到托盘图标：

1. **检查编译日志**：确认没有编译错误
2. **检查运行日志**：查看是否有运行时错误
3. **尝试重新构建**：
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   pnpm tauri build
   ```

4. **查看 Tauri 文档**：[System Tray Guide](https://v2.tauri.app/learn/system-tray)

