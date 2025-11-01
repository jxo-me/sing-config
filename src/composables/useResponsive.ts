import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 响应式布局检测 Composable
 * 提供移动端、平板、桌面端的断点检测
 */
export function useResponsive() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(true);
  
  /**
   * 检测当前屏幕尺寸并更新状态
   */
  function checkBreakpoint() {
    const width = window.innerWidth;
    isMobile.value = width < 768;
    isTablet.value = width >= 768 && width < 1024;
    isDesktop.value = width >= 1024;
  }
  
  onMounted(() => {
    // 初始检测
    checkBreakpoint();
    // 监听窗口大小变化
    window.addEventListener('resize', checkBreakpoint);
  });
  
  onBeforeUnmount(() => {
    // 清理事件监听器
    window.removeEventListener('resize', checkBreakpoint);
  });
  
  return {
    isMobile,
    isTablet,
    isDesktop
  };
}

