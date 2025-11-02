import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * 主题配置
 */
export interface ThemeConfig {
  name: Theme;
  colors: {
    string: string;
    number: string;
    bool: string;
    null: string;
    propertyName: string;
    punctuation: string;
    bracket: string;
    separator: string;
  };
}

/**
 * 预定义主题
 */
export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      string: '#0ea5e9', // 蓝色
      number: '#8b5cf6', // 紫色
      bool: '#f59e0b', // 橙色
      null: '#ef4444', // 红色
      propertyName: '#10b981', // 绿色
      punctuation: '#6b7280', // 灰色
      bracket: '#6b7280', // 灰色
      separator: '#6b7280', // 灰色
    },
  },
  dark: {
    name: 'dark',
    colors: {
      string: '#60a5fa', // 亮蓝色
      number: '#a78bfa', // 亮紫色
      bool: '#fbbf24', // 亮橙色
      null: '#f87171', // 亮红色
      propertyName: '#34d399', // 亮绿色
      punctuation: '#9ca3af', // 亮灰色
      bracket: '#9ca3af', // 亮灰色
      separator: '#9ca3af', // 亮灰色
    },
  },
  auto: {
    name: 'auto',
    colors: {
      // 暂用 light 主题，后续实现系统主题检测
      string: '#0ea5e9',
      number: '#8b5cf6',
      bool: '#f59e0b',
      null: '#ef4444',
      propertyName: '#10b981',
      punctuation: '#6b7280',
      bracket: '#6b7280',
      separator: '#6b7280',
    },
  },
};

/**
 * 语法高亮配置接口
 */
export interface SyntaxHighlightingConfig {
  theme: Theme;
  enabled: boolean;
}

/**
 * 创建语法高亮扩展
 */
export function createSyntaxHighlighting(config: SyntaxHighlightingConfig) {
  if (!config.enabled) {
    return [];
  }
  
  const themeConfig = themes[config.theme];
  return [
    HighlightStyle.define([
      { tag: t.string, color: themeConfig.colors.string },
      { tag: t.number, color: themeConfig.colors.number },
      { tag: t.bool, color: themeConfig.colors.bool },
      { tag: t.null, color: themeConfig.colors.null },
      { tag: t.propertyName, color: themeConfig.colors.propertyName, fontWeight: 'bold' },
      { tag: t.punctuation, color: themeConfig.colors.punctuation },
      { tag: t.bracket, color: themeConfig.colors.bracket },
      { tag: t.separator, color: themeConfig.colors.separator },
    ]),
  ];
}

