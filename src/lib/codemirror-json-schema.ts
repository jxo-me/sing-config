import { Extension } from '@codemirror/state';
import { linter, Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { loadSchema } from './schema';
import { validateConfig } from './validation';

let schemaValidator: ((json: unknown) => Promise<{ path: string; message: string }[]>) | null = null;

// 多语言错误消息映射
const errorMessageMap: Record<string, { zh: string; en: string }> = {
  'must have required property': {
    zh: '缺少必需属性',
    en: 'must have required property',
  },
  'must NOT have additional properties': {
    zh: '不允许有额外属性',
    en: 'must NOT have additional properties',
  },
  'must be equal to constant': {
    zh: '必须等于常量',
    en: 'must be equal to constant',
  },
  'must be equal to one of the allowed values': {
    zh: '必须是允许的值之一',
    en: 'must be equal to one of the allowed values',
  },
  'must be': {
    zh: '必须是',
    en: 'must be',
  },
  'Invalid JSON': {
    zh: '无效的 JSON',
    en: 'Invalid JSON',
  },
};

// 获取当前语言设置（从 localStorage 或默认）
export function getCurrentLocale(): 'zh' | 'en' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale');
    if (stored === 'zh' || stored === 'en') {
      return stored;
    }
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

// 本地化错误消息
export function localizeErrorMessage(message: string): string {
  const locale = getCurrentLocale();
  if (locale === 'zh') {
    for (const [key, translations] of Object.entries(errorMessageMap)) {
      if (message.includes(key)) {
        // 尝试提取具体的值
        const match = message.match(new RegExp(`must be equal to constant "?([^"]+)"?`));
        if (match && key === 'must be equal to constant') {
          return `${translations.zh} "${match[1]}"`;
        }
        
        // 提取属性名
        const propMatch = message.match(/required property '([^']+)'/);
        if (propMatch && key === 'must have required property') {
          return `${translations.zh} "${propMatch[1]}"`;
        }
        
        const addPropMatch = message.match(/additional property '([^']+)'/);
        if (addPropMatch && key === 'must NOT have additional properties') {
          return `${translations.zh} "${addPropMatch[1]}"`;
        }
        
        // 类型错误
        const typeMatch = message.match(/must be (string|number|integer|boolean|object|array)/);
        if (typeMatch && key === 'must be') {
          const typeNames: Record<string, string> = {
            string: '字符串',
            number: '数字',
            integer: '整数',
            boolean: '布尔值',
            object: '对象',
            array: '数组',
          };
          return `${translations.zh}${typeNames[typeMatch[1]] || typeMatch[1]}`;
        }
        
        return translations.zh;
      }
    }
  }
  return message;
}

async function getValidator() {
  if (!schemaValidator) {
    await loadSchema(); // 预加载 schema
    schemaValidator = async (json: unknown) => {
      const result = await validateConfig(json);
      return result.errors;
    };
  }
  return schemaValidator;
}

function jsonSchemaLinter(): Extension {
  return linter(async (view: EditorView): Promise<Diagnostic[]> => {
    const source = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];
    
    // 先检查 JSON 语法错误
    let json: unknown;
    try {
      json = JSON.parse(source);
    } catch (e: any) {
      const match = e.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const clampedPos = Math.min(pos, source.length);
        const from = clampedPos;
        diagnostics.push({
          from,
          to: Math.min(clampedPos + 1, source.length),
          severity: 'error' as const,
          message: e.message,
        });
      } else {
        // 如果没有位置信息，在文档开头显示错误
        diagnostics.push({
          from: 0,
          to: Math.min(source.length, 50),
          severity: 'error' as const,
          message: localizeErrorMessage(e.message || 'Invalid JSON'),
        });
      }
      return diagnostics;
    }
    
    // 如果 JSON 有效，进行 Schema 验证
    try {
      const validator = await getValidator();
      const errors = await validator(json);
      
      // 将路径错误转换为行号位置
      for (const error of errors) {
        const path = error.path.replace(/^\//, '').replace(/\//g, '.').split('.');
        
        // 尝试在文档中找到错误位置
        let errorPos = 0;
        let searchKey = '';
        try {
          let current: any = json;
          for (const key of path) {
            if (key === '') continue;
            if (current && typeof current === 'object' && key in current) {
              current = current[key];
            } else {
              break;
            }
          }
          
          // 搜索 key 在文本中的位置
          searchKey = path[path.length - 1] || '';
          if (searchKey) {
            const pattern = new RegExp(`["']?${searchKey.replace(/[\[\]]/g, '\\$&')}["']?\\s*:`, 'i');
            const match = source.match(pattern);
            if (match && match.index !== undefined) {
              errorPos = match.index;
            }
          }
        } catch {
          // 如果无法定位，使用文档开头
        }
        
        const from = errorPos > 0 ? errorPos : 0;
        const to = Math.min(from + Math.max(searchKey.length, 10), view.state.doc.length);
        
        const localizedMessage = localizeErrorMessage(error.message);
        diagnostics.push({
          from,
          to,
          severity: 'error' as const,
          message: error.path ? `${error.path}: ${localizedMessage}` : localizedMessage,
        });
      }
    } catch (e: any) {
      // Schema 验证出错，但不阻止编辑
      console.warn('Schema validation error:', e);
    }
    
    return diagnostics;
  });
}

export function jsonSchema() {
  return jsonSchemaLinter();
}

