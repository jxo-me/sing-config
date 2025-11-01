# Material Design 3 主题配色方案指南

基于 [Material Design 3 (M3)](https://m3.material.io/) 设计规范的主题系统。

## 主题概览

### Material Light Theme (浅色主题)
**适用场景**: 日间使用，明亮环境
- **主色调**: Purple 40 (#6750A4) - 优雅的紫色
- **背景**: 白色系 (#FFFBFE)
- **文字**: 深色系 (#1C1B1F)
- **风格**: 清爽、现代、专业

### Material Dark Theme (深色主题)
**适用场景**: 夜间使用，低光环境
- **主色调**: Purple 80 (#D0BCFF) - 柔和的紫色
- **背景**: 深色系 (#1C1B1F)
- **文字**: 浅色系 (#E6E1E5)
- **风格**: 护眼、舒适、现代

## 颜色系统详解

### 1. Primary Colors (主色系统)

Material Design 3 使用 **tonal palettes**（色调调色板），每个颜色有从 0-100 的色调值。

#### Light Theme 主色
```css
--brand: #6750A4        /* Primary 40 - 主色 */
--brand-hover: #7C4DFF  /* Primary 50 - 悬停状态 */
--brand-light: #EADDFF /* Primary 90 - 浅色变体 */
--brand-dark: #21005D  /* Primary 10 - 深色变体 */
```

#### Dark Theme 主色
```css
--brand: #D0BCFF        /* Primary 80 - 主色（在暗色背景下更亮） */
--brand-hover: #EADDFF  /* Primary 90 - 悬停状态 */
--brand-light: #FEF7FF  /* Primary 99 - 最浅色 */
--brand-dark: #6750A4   /* Primary 40 - 深色变体 */
```

### 2. Surface Colors (表面色系统)

Material Design 3 定义了多个表面层级，用于创建视觉深度。

#### Light Theme 表面色
```css
--bg-app: #FFFBFE       /* Surface container lowest - 应用背景 */
--bg-panel: #FFFFFF     /* Surface - 面板背景 */
--bg-hover: #F7F2FA     /* Surface container - 悬停背景 */
--bg-active: #ECE6F0    /* Surface container high - 激活背景 */
```

#### Dark Theme 表面色
```css
--bg-app: #1C1B1F       /* Surface dim - 应用背景 */
--bg-panel: #211F26     /* Surface - 面板背景 */
--bg-hover: #2A2830     /* Surface container - 悬停背景 */
--bg-active: #38343E    /* Surface container high - 激活背景 */
```

### 3. Text Colors (文字颜色系统)

文字颜色需要与背景有足够的对比度，确保可读性。

#### Light Theme 文字色
```css
--text-primary: #1C1B1F   /* On surface - 主要文字（对比度 15.8:1） */
--text-secondary: #49454F /* On surface variant - 次要文字（对比度 7.2:1） */
--text-disabled: #CAC4D0  /* On surface disabled - 禁用文字（对比度 2.9:1） */
--text-on-brand: #FFFFFF  /* On primary - 主色上的文字 */
```

#### Dark Theme 文字色
```css
--text-primary: #E6E1E5   /* On surface - 主要文字（对比度 15.8:1） */
--text-secondary: #CAC4D0 /* On surface variant - 次要文字（对比度 7.2:1） */
--text-disabled: #938F99  /* On surface disabled - 禁用文字（对比度 2.9:1） */
--text-on-brand: #381E72  /* On primary - 主色上的文字（暗色文字在亮色背景上） */
```

### 4. Semantic Colors (语义颜色)

用于表达状态和含义的颜色。

#### Error (错误)
- **Light**: #BA1A1A (错误色) + #F9DEDC (错误容器)
- **Dark**: #F2B8B5 (错误色) + #8C1D18 (错误容器)

#### Success (成功)
- **Light**: #006E1C (成功色) + #9CF683 (成功容器)
- **Dark**: #5EE37F (成功色) + #005E1A (成功容器)

#### Warning (警告)
- **Light**: #7C5800 (警告色) + #FFE08A (警告容器)
- **Dark**: #FFD54F (警告色) + #5C4000 (警告容器)

#### Info (信息)
- **Light**: #0057D2 (信息色) + #DAE2FF (信息容器)
- **Dark**: #90CAF9 (信息色) + #003258 (信息容器)

### 5. State Colors (状态颜色)

用于交互反馈的状态颜色。

```css
--state-hover: rgba(103, 80, 164, 0.08)  /* 悬停叠加层 */
--state-pressed: rgba(103, 80, 164, 0.12) /* 按下叠加层 */
--state-focus: rgba(103, 80, 164, 0.12)   /* 聚焦环 */
```

## Material Design 3 设计原则

### 1. 动态颜色 (Dynamic Color)
- 支持基于用户壁纸颜色的自动生成
- 确保所有颜色组合符合 WCAG AA 可访问性标准

### 2. 对比度要求
- **大文本**: 至少 3:1
- **正常文本**: 至少 4.5:1
- **UI 组件**: 至少 3:1

### 3. 视觉层次
- 使用表面层级创建深度
- 清晰的视觉层次结构
- 一致的间距和圆角

### 4. 交互反馈
- 清晰的悬停状态
- 明确的激活状态
- 平滑的过渡动画

## 使用示例

### 按钮样式
```css
.primary-button {
  background: var(--brand);
  color: var(--text-on-brand);
  border-radius: 20px; /* Material Design 3 使用更大的圆角 */
  padding: 10px 24px;
  transition: all 0.2s ease;
}

.primary-button:hover {
  background: var(--brand-hover);
  box-shadow: var(--shadow-md);
}
```

### 卡片样式
```css
.card {
  background: var(--bg-panel);
  border-radius: 12px; /* Material Design 3 卡片圆角 */
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.card:hover {
  background: var(--bg-hover);
  box-shadow: var(--shadow-md);
}
```

### 输入框样式
```css
.input {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 12px 16px;
}

.input:focus {
  border-color: var(--brand);
  outline: 2px solid var(--state-focus);
}
```

## 主题切换

主题切换通过 `data-theme` 属性实现：

```typescript
import { setTheme, getCurrentTheme } from '@/lib/theme';

// 切换到浅色主题
setTheme('material-light');

// 切换到深色主题
setTheme('material-dark');
```

主题会自动保存到 `localStorage`，并在应用重启后恢复。

## 参考资源

- [Material Design 3 官方文档](https://m3.material.io/)
- [Material Design 颜色系统](https://m3.material.io/styles/color/the-color-system/overview)
- [Material You 动态颜色](https://m3.material.io/styles/color/dynamic-color/overview)
- [Material Design 可访问性指南](https://m3.material.io/foundations/accessible-design/overview)

