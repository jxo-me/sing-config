import { Extension } from '@codemirror/state';
import { linter, Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { loadSchema } from './schema';
import { validateConfig } from './validation';

let schemaValidator: ((json: unknown) => Promise<{ path: string; message: string }[]>) | null = null;

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
        diagnostics.push({
          from: clampedPos,
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
          message: e.message || 'Invalid JSON',
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
        
        diagnostics.push({
          from,
          to,
          severity: 'error' as const,
          message: `${error.path}: ${error.message}`,
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

