# Material Design 3 主题系统

基于 [Material Design 3](https://m3.material.io/) 设计规范的主题方案。

## 主题方案

### Material Light Theme (浅色主题) - Hostinger 风格
- **主色**: Hostinger Purple (#673AB7) - 鲜艳的紫色，参考 Hostinger 品牌色
- **背景**: Surface container lowest (#FFFBFE)
- **文字**: On surface (#1C1B1F)
- **特点**: 清爽明亮，充满活力，适合日间使用

## 颜色系统

### Primary Colors (主色)
- `--brand`: 主色，用于按钮、链接等主要交互元素
- `--brand-hover`: 主色悬停状态
- `--brand-light`: 主色浅色变体
- `--brand-dark`: 主色深色变体

### Surface Colors (表面色)
- `--bg-app`: 应用背景色
- `--bg-panel`: 面板背景色
- `--bg-hover`: 悬停背景色
- `--bg-active`: 激活背景色

### Text Colors (文字颜色)
- `--text-primary`: 主要文字颜色
- `--text-secondary`: 次要文字颜色
- `--text-disabled`: 禁用文字颜色
- `--text-on-brand`: 主色上的文字颜色

### Semantic Colors (语义颜色)
- `--error`: 错误色
- `--success`: 成功色
- `--warning`: 警告色
- `--info`: 信息色

## 使用方法

### 在代码中使用主题变量

```css
.my-component {
  background: var(--bg-panel);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.my-button {
  background: var(--brand);
  color: var(--text-on-brand);
}

.my-button:hover {
  background: var(--brand-hover);
}
```

### 初始化主题

主题会在应用启动时自动初始化，固定使用浅色主题。

```typescript
import { initTheme } from '@/lib/theme';

// 在 main.ts 中初始化（已自动完成）
initTheme();
```

## Material Design 3 设计原则

1. **动态颜色**: 支持基于壁纸的动态颜色生成
2. **可访问性**: 确保足够的对比度，符合 WCAG 标准
3. **状态层次**: 清晰的视觉层次和状态反馈
4. **一致性**: 统一的颜色使用规范

## 参考资源

- [Material Design 3 官方网站](https://m3.material.io/)
- [Material Design 颜色系统](https://m3.material.io/styles/color/the-color-system/overview)
- [Material You 动态颜色](https://m3.material.io/styles/color/dynamic-color/overview)

