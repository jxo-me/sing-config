import { EditorView } from '@codemirror/view';

/**
 * 编辑器主题配置接口
 */
export interface EditorThemeConfig {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showWhitespace: boolean;
}

/**
 * 创建编辑器主题扩展
 */
export function createEditorTheme(config: EditorThemeConfig) {
  return [
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-content': {
        fontSize: `${config.fontSize}px`,
        fontFamily: config.fontFamily,
        lineHeight: `${config.lineHeight}`,
        padding: '12px',
      },
      '.cm-line': {
        lineHeight: `${config.lineHeight}`,
        padding: '0 4px',
      },
      // 根据 showWhitespace 控制空白字符显示
      ...(config.showWhitespace && {
        '.cm-whitespace': {
          color: 'rgba(107, 114, 128, 0.3)',
        },
      }),
    }),
  ];
}

