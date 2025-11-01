import { Draft07 } from 'json-schema-library';
import { loadSchema } from './schema';
import type { JsonError } from 'json-schema-library';
import { createFormatError } from './codemirror-json-schema';

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

function formatError(err: JsonError): { path: string; message: string } {
  // JsonError 结构：{ type, name, code, message, data?: { pointer, ... } }
  // 处理路径：统一格式为 /path/to/field（去掉 # 前缀）
  let errorPath = '';
  if (err.data?.pointer && err.data.pointer !== '#') {
    errorPath = err.data.pointer.startsWith('#') ? err.data.pointer.slice(1) : err.data.pointer;
  } else if (err.data?.property) {
    errorPath = `/${err.data.property}`;
  }
  
  // 使用统一的错误格式化函数，支持多语言
  const formatErrorFn = createFormatError();
  const message = formatErrorFn(err);
  
  return {
    path: String(errorPath),
    message: String(message),
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
    
    // 格式化错误（与 JSON 模式保持一致，不进行合并）
    const formattedErrors = errors.map(formatError);
    
    // 简化为仅返回格式化的错误，不进行合并（与 JSON 模式一致）
    return {
      valid: errors.length === 0,
      errors: formattedErrors,
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
