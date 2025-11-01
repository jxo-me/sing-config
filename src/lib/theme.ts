/**
 * Material Design 3 主题管理系统
 * 基于 Material Design 3 设计规范
 * 参考：https://m3.material.io/
 */

/**
 * 初始化主题
 * 固定使用浅色主题
 */
export function initTheme(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // 设置 data-theme 属性到根元素，固定为浅色主题
  document.documentElement.setAttribute('data-theme', 'material-light');
  
  // 清理可能存在的旧主题设置
  localStorage.removeItem('app-theme');
}
