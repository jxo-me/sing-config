# Material Design 3 主题系统

基于 [Material Design 3](https://m3.material.io/) 设计规范的两套主题方案。

## 主题方案

### 1. Material Light Theme (浅色主题)
- **主色**: Purple 40 (#6750A4)
- **背景**: Surface container lowest (#FFFBFE)
- **文字**: On surface (#1C1B1F)
- **特点**: 清爽明亮，适合日间使用

### 2. Material Dark Theme (深色主题)
- **主色**: Purple 80 (#D0BCFF)
- **背景**: Surface dim (#1C1B1F)
- **文字**: On surface (#E6E1E5)
- **特点**: 柔和护眼，适合夜间使用

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

### 在 JavaScript/TypeScript 中切换主题

```typescript
import { setTheme, getCurrentTheme } from '@/lib/theme';

// 切换到浅色主题
setTheme('material-light');

// 切换到深色主题
setTheme('material-dark');

// 获取当前主题
const currentTheme = getCurrentTheme();
```

### 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCurrentTheme, setTheme, watchSystemTheme, type Theme } from '@/lib/theme';

const currentTheme = ref<Theme>(getCurrentTheme());

function toggleTheme() {
  const newTheme = currentTheme.value === 'material-light' 
    ? 'material-dark' 
    : 'material-light';
  setTheme(newTheme);
  currentTheme.value = newTheme;
}

onMounted(() => {
  // 监听系统主题变化
  watchSystemTheme((theme) => {
    currentTheme.value = theme;
  });
});
</script>

<template>
  <button @click="toggleTheme">
    当前主题: {{ currentTheme === 'material-light' ? '浅色' : '深色' }}
  </button>
</template>
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

