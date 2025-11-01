import { Draft07 } from 'json-schema-library';
import { loadSchema } from './schema';
import type { JsonError } from 'json-schema-library';
import { createFormatError, getCurrentLocale } from './codemirror-json-schema';

let validatorInstance: Draft07 | null = null;

async function getValidator(): Promise<Draft07> {
  if (validatorInstance) return validatorInstance;
  
  const schema = await loadSchema();
  const validator = new Draft07(schema as any);
  validatorInstance = validator;
  return validatorInstance;
}

export type ValidationResult = {
  valid: boolean;
  errors: { path: string; message: string }[];
};

// 错误优先级：优先级越高，越应该显示
const ERROR_PRIORITY: Record<string, number> = {
  'required': 10,           // 缺少必需字段 - 最高优先级
  'type': 9,               // 类型错误
  'const': 8,              // 常量值错误（如 type 字段）
  'enum': 7,               // 枚举值错误
  'additionalProperties': 6, // 额外属性错误 - 较低优先级（oneOf 会大量产生）
  'oneOf': 5,              // oneOf 匹配失败 - 最低优先级（会重复多次）
  'anyOf': 5,
  'allOf': 5,
};

// 错误去重和优化
function deduplicateErrors(errors: Array<{ path: string; message: string; keyword: string }>): Array<{ path: string; message: string }> {
  // 按路径分组
  const errorsByPath = new Map<string, Array<{ path: string; message: string; keyword: string }>>();
  
  for (const err of errors) {
    const key = err.path;
    if (!errorsByPath.has(key)) {
      errorsByPath.set(key, []);
    }
    errorsByPath.get(key)!.push(err);
  }
  
  const result: Array<{ path: string; message: string }> = [];
  
  // 对每个路径的错误进行优化
  for (const [path, pathErrors] of errorsByPath.entries()) {
    // 如果只有一个错误，直接添加
    if (pathErrors.length === 1) {
      result.push({ path: pathErrors[0].path, message: pathErrors[0].message });
      continue;
    }
    
    // 多个错误时，按优先级排序，取最重要的
    pathErrors.sort((a, b) => {
      const priorityA = ERROR_PRIORITY[a.keyword] || 0;
      const priorityB = ERROR_PRIORITY[b.keyword] || 0;
      return priorityB - priorityA; // 降序
    });
    
    // 检查是否有 oneOf/anyOf 错误（通常会重复多次）
    const oneOfErrors = pathErrors.filter(e => e.keyword === 'oneOf' || e.keyword === 'anyOf');
    const otherErrors = pathErrors.filter(e => e.keyword !== 'oneOf' && e.keyword !== 'anyOf');
    
    if (otherErrors.length > 0) {
      // 如果有非 oneOf 错误，优先显示这些
      // 只显示前 3 个最重要的错误，避免信息过载
      const topErrors = otherErrors.slice(0, 3);
      if (topErrors.length === 1) {
        result.push({ path: topErrors[0].path, message: topErrors[0].message });
      } else {
        // 多个错误时，合并消息
        const messages = topErrors.map(e => e.message).join('; ');
        const locale = getCurrentLocale();
        result.push({ 
          path: path, 
          message: locale === 'zh'
            ? `多项错误: ${messages}${otherErrors.length > 3 ? ` (还有 ${otherErrors.length - 3} 个错误)` : ''}`
            : `Multiple errors: ${messages}${otherErrors.length > 3 ? ` (${otherErrors.length - 3} more)` : ''}`
        });
      }
    } else if (oneOfErrors.length > 0) {
      // 只有 oneOf 错误时，说明所有选项都不匹配
      // 检查是否是 type 字段的问题
      const typeErrors = pathErrors.filter(e => 
        (e.keyword === 'const' && e.message.includes('type')) || 
        e.path.endsWith('/type')
      );
      
      if (typeErrors.length > 0) {
        // 如果有 type 相关错误，优先显示
        result.push({ path: typeErrors[0].path, message: typeErrors[0].message });
      } else {
        // 否则显示一个汇总消息
        const locale = getCurrentLocale();
        result.push({ 
          path: path, 
          message: locale === 'zh'
            ? `不符合任何有效的配置选项。请检查 type 字段和必需的属性。`
            : `Does not match any valid configuration options. Please check the type field and required properties.`
        });
      }
    }
  }
  
  return result;
}

function formatError(err: JsonError): { path: string; message: string; keyword: string } {
  // JsonError 结构：{ type, name, code, message, data?: { pointer, ... } }
  const path = (err.data?.pointer as string) || '';
  // 使用统一的错误格式化函数，支持多语言
  const formatErrorFn = createFormatError();
  const message = formatErrorFn(err);
  // 使用 code 或 name 作为 keyword（例如 'required', 'type', 'enum' 等）
  const keyword = err.code || err.name || err.type || '';
  
  return {
    path: String(path),
    message: String(message),
    keyword: String(keyword),
  };
}

export async function validateConfig(config: unknown): Promise<ValidationResult> {
  try {
    const validator = await getValidator();
    
    // validate 方法直接返回错误数组
    const errors: JsonError[] = validator.validate(config);
    
    // 确保 errors 是数组
    if (!Array.isArray(errors)) {
      console.warn('validate returned non-array:', errors);
      return {
        valid: false,
        errors: [{
          path: '',
          message: 'Validation returned invalid result',
        }],
      };
    }
    
    // 格式化错误
    const formattedErrors = errors.map(formatError);
    
    // 去重和优化错误
    const deduplicatedErrors = deduplicateErrors(formattedErrors);
    
    return {
      valid: errors.length === 0,
      errors: deduplicatedErrors,
    };
  } catch (e: any) {
    // 验证过程出错
    console.error('Validation error:', e);
    return {
      valid: false,
      errors: [{
        path: '',
        message: e.message || 'Validation failed',
      }],
    };
  }
}
