# Android 布局优化方案

## 当前问题分析

根据 Android 模拟器截图，识别出以下主要布局问题：

### 1. 三栏布局在小屏幕上的问题
```
当前桌面布局：
[Topbar] - 7个操作按钮 + 语言选择
[Mode Switcher] - JSON / Form 切换
[Sidebar | Main Content | Right Panel]
        180px    flex:1       320px
```

**Android 上的问题：**
- 三栏并排导致单个区域过窄
- 左侧"编辑区"几乎不可见（仅有1和2的行号）
- 右侧错误面板占据了大部分屏幕空间
- Topbar 按钮太多，在小屏幕上显示不完整
- 无法充分利用垂直空间

### 2. 具体问题点

#### Topbar 区域
- **问题**：按钮过多（Open, Load Example, Wizard, Templates, Save, Save As），在手机上挤压
- **影响**：按钮文本可能被截断，需要横向滚动才能看到所有按钮

#### 主内容区域
- **问题**：三栏布局在 ~411px 宽度下，每栏约 100px 宽，根本无法编辑
- **影响**：用户体验极差，无法进行有效编辑

#### 错误面板
- **问题**：176 个错误在小屏幕上滚动困难
- **影响**：用户难以快速定位和解决问题

## 优化方案

### 方案 1：响应式布局 - 小屏折叠侧边栏（推荐）

**核心思路：**
- 小屏幕（< 768px）时自动折叠为单栏
- 使用底部标签栏替代固定侧边栏
- Topbar 简化为图标按钮或下拉菜单

**实现：**

```vue
<template>
  <div class="editor-layout" :class="{ 'mobile-layout': isMobile }">
    <Topbar ref="topbarRef" />
    <div class="mode-switcher">
      <button :class="{ active: mode === 'json' }" @click="mode = 'json'">{{ t.common.json }}</button>
      <button :class="{ active: mode === 'form' }" @click="mode = 'form'">{{ t.common.form }}</button>
    </div>
    
    <!-- Mobile: 底部标签栏 -->
    <div v-if="isMobile" class="mobile-tabs">
      <button 
        v-for="tab in ['errors', 'diff', 'preflight']" 
        :key="tab"
        :class="{ active: activeTab === tab }" 
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>
    
    <div class="body">
      <!-- Desktop: 固定侧边栏 -->
      <div v-show="mode === 'form' && !isMobile" class="sidebar">
        <nav class="form-nav">
          <!-- 侧边栏导航 -->
        </nav>
      </div>
      
      <!-- Main content -->
      <div class="left">
        <!-- JSON 编辑器或表单 -->
      </div>
      
      <!-- Desktop: 固定右侧面板 -->
      <div v-if="!isMobile" class="right">
        <!-- 错误/差异面板 -->
      </div>
    </div>
    
    <!-- Mobile: 全屏错误面板 -->
    <div v-if="isMobile && showErrorPanel" class="mobile-panel-overlay" @click="showErrorPanel = false">
      <div class="mobile-panel" @click.stop>
        <div class="panel">
          <!-- 错误/差异面板内容 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
/* 默认桌面布局 */
.editor-layout {
  /* 保持现有样式 */
}

/* Mobile 布局 */
.editor-layout.mobile-layout .body {
  flex-direction: column;
}

.editor-layout.mobile-layout .sidebar {
  display: none;
}

.editor-layout.mobile-layout .right {
  display: none;
}

.editor-layout.mobile-layout .left {
  width: 100%;
}

/* Mobile Topbar - 水平滚动 */
.editor-layout.mobile-layout .topbar-left {
  overflow-x: auto;
  flex-wrap: nowrap;
}

/* Mobile 底部标签栏 */
.mobile-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.mobile-tabs button {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.mobile-tabs button.active {
  background: var(--brand);
  color: white;
}

/* Mobile 全屏面板 */
.mobile-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.mobile-panel {
  width: 100%;
  max-height: 80vh;
  background: var(--bg-panel);
  border-radius: 16px 16px 0 0;
}

.mobile-panel .panel {
  height: auto;
  max-height: 80vh;
  overflow: auto;
}
</style>
```

### 方案 2：Topbar 优化 - 移动端使用汉堡菜单

**实现：**

```vue
<template>
  <div class="topbar">
    <!-- Mobile: 汉堡菜单 -->
    <button v-if="isMobile" class="menu-btn" @click="showMobileMenu = true">
      ☰
    </button>
    
    <div v-if="!isMobile" class="topbar-left">
      <!-- 桌面端按钮 -->
    </div>
    
    <div class="topbar-right">
      <select class="language-select">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </div>
    
    <!-- Mobile: 下拉菜单 -->
    <div v-if="showMobileMenu && isMobile" class="mobile-menu-overlay" @click="showMobileMenu = false">
      <div class="mobile-menu" @click.stop>
        <button @click="onOpen">Open</button>
        <button @click="onLoadExample">Load Example</button>
        <button @click="showWizard = true">Wizard</button>
        <button @click="showTemplates = true">Templates</button>
        <button @click="onSave">Save</button>
        <button @click="onSaveAs">Save As</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-btn {
  display: none;
}

@media (max-width: 768px) {
  .topbar-left {
    display: none;
  }
  
  .menu-btn {
    display: block;
    padding: 8px 12px;
    font-size: 20px;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .mobile-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }
  
  .mobile-menu {
    background: var(--bg-panel);
    width: 250px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  }
  
  .mobile-menu button {
    width: 100%;
    text-align: left;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-panel);
    cursor: pointer;
  }
}
</style>
```

### 方案 3：表单模式侧边栏优化 - 移动端使用抽屉

**实现：**

```vue
<template>
  <!-- Mobile: 抽屉式侧边栏 -->
  <button v-if="isMobile && mode === 'form'" class="sidebar-toggle" @click="showSidebar = true">
    {{ currentForm }}
  </button>
  
  <!-- Desktop: 固定侧边栏 -->
  <div v-show="mode === 'form' && !isMobile" class="sidebar">
    <!-- 现有侧边栏内容 -->
  </div>
  
  <!-- Mobile: 抽屉侧边栏 -->
  <div v-if="isMobile && mode === 'form' && showSidebar" class="drawer-overlay" @click="showSidebar = false">
    <div class="drawer" @click.stop>
      <nav class="form-nav">
        <button 
          v-for="form in formTypes" 
          :key="form.id"
          :class="{ active: activeForm === form.id }" 
          @click="activeForm = form.id; showSidebar = false"
        >
          {{ form.label }}
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.sidebar-toggle {
  display: none;
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 150;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  background: var(--bg-panel);
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .sidebar-toggle {
    display: block;
    padding: 8px 16px;
    margin: 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-panel);
  }
}
</style>
```

## 完整实现建议

### 步骤 1：创建响应式检测 Composable

**文件：`src/composables/useResponsive.ts`**

```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useResponsive() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(true);
  
  function checkBreakpoint() {
    const width = window.innerWidth;
    isMobile.value = width < 768;
    isTablet.value = width >= 768 && width < 1024;
    isDesktop.value = width >= 1024;
  }
  
  onMounted(() => {
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
  });
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', checkBreakpoint);
  });
  
  return {
    isMobile,
    isTablet,
    isDesktop
  };
}
```

### 步骤 2：优化 Topbar 组件

**修改：`src/components/Topbar.vue`**

- 添加移动端检测
- 实现汉堡菜单
- 精简移动端按钮布局

### 步骤 3：优化 Editor 布局

**修改：`src/pages/Editor.vue`**

- 添加响应式断点检测
- 实现移动端标签栏
- 实现全屏面板
- 优化错误列表显示

### 步骤 4：优化表单侧边栏

**修改：`src/pages/Editor.vue`**

- 移动端使用抽屉导航
- 桌面端保持固定侧边栏

## 最佳实践

### 1. 移动优先设计
- 先设计移动端布局
- 逐步增强到桌面端

### 2. 触摸友好
- 按钮最小 44x44px
- 增加触摸反馈
- 支持手势操作

### 3. 性能优化
- 延迟加载移动端组件
- 虚拟滚动长列表
- 节流 resize 事件

### 4. 内容优先
- 移动端隐藏次要功能
- 核心功能始终可访问
- 优雅降级

## 实施优先级

1. **P0 - 紧急**：移除侧边栏，单栏布局
2. **P1 - 重要**：Topbar 汉堡菜单
3. **P2 - 优化**：底部标签栏
4. **P3 - 增强**：手势操作和动画

## 测试检查点

- [ ] 小屏幕（375px, 411px）布局正常
- [ ] 按钮可点击，无遮挡
- [ ] 错误列表可滚动
- [ ] JSON 编辑器可正常编辑
- [ ] 表单切换流畅
- [ ] 响应式断点切换正确

