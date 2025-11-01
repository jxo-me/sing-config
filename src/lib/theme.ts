/**
 * Material Design 3 主题管理系统
 * 基于 Material Design 3 设计规范
 * 参考：https://m3.material.io/
 */

export type Theme = 'material-light' | 'material-dark';

const THEME_STORAGE_KEY = 'app-theme';

/**
 * 获取当前主题
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'material-light';
  }
  
  // 优先从 localStorage 读取
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  if (stored === 'material-light' || stored === 'material-dark') {
    return stored;
  }
  
  // 其次使用系统偏好
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'material-dark';
  }
  
  return 'material-light';
}

/**
 * 设置主题
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // 保存到 localStorage
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  
  // 设置 data-theme 属性到根元素
  document.documentElement.setAttribute('data-theme', theme);
  
  // 触发主题变更事件
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}

/**
 * 初始化主题
 */
export function initTheme(): Theme {
  const theme = getCurrentTheme();
  setTheme(theme);
  return theme;
}

/**
 * 监听系统主题变化
 */
export function watchSystemTheme(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    // 只有在没有手动设置主题时才跟随系统
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) {
      const theme = e.matches ? 'material-dark' : 'material-light';
      setTheme(theme);
      callback(theme);
    }
  };
  
  // 现代浏览器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  } else {
    // 兼容旧浏览器
    mediaQuery.addListener(handler);
    return () => {
      mediaQuery.removeListener(handler);
    };
  }
}

