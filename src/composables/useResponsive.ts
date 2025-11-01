import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 响应式布局检测 Composable
 * 提供移动端、平板、桌面端的断点检测
 * 支持竖屏/横屏方向检测
 */
export function useResponsive() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(true);
  const isPortrait = ref(true); // 竖屏模式
  const isLandscape = ref(false); // 横屏模式
  
  /**
   * 检测当前屏幕尺寸并更新状态
   */
  function checkBreakpoint() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    isMobile.value = width < 768;
    isTablet.value = width >= 768 && width < 1024;
    isDesktop.value = width >= 1024;
    
    // 竖屏：高度 > 宽度
    // 横屏：宽度 > 高度
    isPortrait.value = height > width;
    isLandscape.value = width > height;
  }
  
  onMounted(() => {
    // 初始检测
    checkBreakpoint();
    // 监听窗口大小变化
    window.addEventListener('resize', checkBreakpoint);
    // 监听设备方向变化（移动设备）
    window.addEventListener('orientationchange', checkBreakpoint);
  });
  
  onBeforeUnmount(() => {
    // 清理事件监听器
    window.removeEventListener('resize', checkBreakpoint);
    window.removeEventListener('orientationchange', checkBreakpoint);
  });
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape
  };
}

