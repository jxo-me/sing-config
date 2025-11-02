import { Extension } from '@codemirror/state';
import { linter, type Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { ref } from 'vue';
import { jsonSchemaLinter, stateExtensions, handleRefresh, type JSONValidationOptions } from 'codemirror-json-schema';
import { loadSchema } from './schema';
import type { JsonSchema } from './schema';

// 导出的编辑器错误状态 - 供右侧面板使用
export const editorErrors = ref<Array<{ 
  path: string; 
  message: string;
  line?: number;  // 错误所在行号（如果有）
  from?: number;   // 错误开始位置（如果有）
  to?: number;     // 错误结束位置（如果有）
}>>([]);
export const editorValidationState = ref<{
  valid: boolean;
  errorCount: number;
  lastValidated: number; // 时间戳
}>({
  valid: true,
  errorCount: 0,
  lastValidated: 0,
});

// 多语言错误消息映射（扩展以支持 json-schema-library 的错误）
const errorMessageMap: Record<string, { zh: string; en: string }> = {
  'must have required property': {
    zh: '缺少必需属性',
    en: 'must have required property',
  },
  'required property': {
    zh: '必需属性',
    en: 'required property',
  },
  'must NOT have additional properties': {
    zh: '不允许有额外属性',
    en: 'must NOT have additional properties',
  },
  'additional property': {
    zh: '额外属性',
    en: 'additional property',
  },
  'must be equal to constant': {
    zh: '必须等于常量',
    en: 'must be equal to constant',
  },
  'must be equal to one of the allowed values': {
    zh: '必须是允许的值之一',
    en: 'must be equal to one of the allowed values',
  },
  'must match one of the schemas': {
    zh: '必须匹配其中一个模式',
    en: 'must match one of the schemas',
  },
  'must match all schemas': {
    zh: '必须匹配所有模式',
    en: 'must match all schemas',
  },
  'must match pattern': {
    zh: '必须匹配模式',
    en: 'must match pattern',
  },
  'must be': {
    zh: '必须是',
    en: 'must be',
  },
  'type': {
    zh: '类型错误',
    en: 'type error',
  },
  'Invalid JSON': {
    zh: '无效的 JSON',
    en: 'Invalid JSON',
  },
  'invalid type': {
    zh: '无效的类型',
    en: 'invalid type',
  },
  'Expected': {
    zh: '期望',
    en: 'Expected',
  },
  'but received': {
    zh: '但收到',
    en: 'but received',
  },
  'expected': {
    zh: '期望',
    en: 'expected',
  },
  'received': {
    zh: '收到',
    en: 'received',
  },
  'should be': {
    zh: '应该是',
    en: 'should be',
  },
  'minLength': {
    zh: '最小长度',
    en: 'minLength',
  },
  'maxLength': {
    zh: '最大长度',
    en: 'maxLength',
  },
  'minimum': {
    zh: '最小值',
    en: 'minimum',
  },
  'maximum': {
    zh: '最大值',
    en: 'maximum',
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

// 本地化错误消息（改进以支持更多错误类型，保留详细信息）
export function localizeErrorMessage(message: string): string {
  const locale = getCurrentLocale();
  
  // 处理 "Expected value at X to be Y, but value given is Z" 格式（json-schema-library 的详细格式）
  const expectedValueAtMatch = message.match(/Expected\s+value\s+at.*to\s+be\s+["'`]([^"'`\s]+)["'`].*but\s+value\s+given\s+is\s+["'`]([^"'`\s]+)["'`]/i);
  if (expectedValueAtMatch) {
    const expectedValue = expectedValueAtMatch[1];
    const actualValue = expectedValueAtMatch[2];
    return locale === 'zh' 
      ? `期望值应为 "${expectedValue}"，但实际值为 "${actualValue}"`
      : `Expected value to be "${expectedValue}", but value given is "${actualValue}"`;
  }
  
  // 处理 "Additional property X in Y" 格式（多语言）
  const additionalPropMatch = message.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?\s+in\s+([a-zA-Z0-9_$\.\[\]]+)/i);
  if (additionalPropMatch) {
    const propName = additionalPropMatch[1];
    const path = additionalPropMatch[2];
    if (message.toLowerCase().includes('is not allowed')) {
      return locale === 'zh' 
        ? `不允许有额外属性 "${propName}" (位于 ${path})`
        : `Additional property "${propName}" in ${path} is not allowed`;
    }
    return locale === 'zh' 
      ? `额外属性 "${propName}" (位于 ${path})`
      : `Additional property "${propName}" in ${path}`;
  }
  
  // 处理不带路径的 "Additional property X"
  const additionalPropMatch2 = message.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?/i);
  if (additionalPropMatch2) {
    const propName = additionalPropMatch2[1];
    if (message.toLowerCase().includes('is not allowed')) {
      return locale === 'zh' 
        ? `不允许有额外属性 "${propName}"`
        : `Additional property "${propName}" is not allowed`;
    }
    return locale === 'zh' 
      ? `额外属性 "${propName}"`
      : `Additional property "${propName}"`;
  }
  
  // 处理 "Expected X but received Y" 格式（多语言）
  const expectedMatch = message.match(/Expected\s+["'`]?([^"'`\s]+)["'`]?\s+but\s+received\s+["'`]?([^"'`\s]+)["'`]?/i);
  if (expectedMatch) {
    const typeNames: Record<string, { zh: string; en: string }> = {
      string: { zh: '字符串', en: 'string' },
      number: { zh: '数字', en: 'number' },
      integer: { zh: '整数', en: 'integer' },
      boolean: { zh: '布尔值', en: 'boolean' },
      object: { zh: '对象', en: 'object' },
      array: { zh: '数组', en: 'array' },
      null: { zh: '空值', en: 'null' },
    };
    const expectedTypeInfo = typeNames[expectedMatch[1].toLowerCase()];
    const receivedTypeInfo = typeNames[expectedMatch[2].toLowerCase()];
    const expectedType = expectedTypeInfo 
      ? (locale === 'zh' ? expectedTypeInfo.zh : expectedTypeInfo.en)
      : expectedMatch[1];
    const receivedType = receivedTypeInfo 
      ? (locale === 'zh' ? receivedTypeInfo.zh : receivedTypeInfo.en)
      : expectedMatch[2];
    return locale === 'zh' 
      ? `期望 ${expectedType}，但收到 ${receivedType}`
      : `Expected ${expectedType}, but received ${receivedType}`;
  }
  
  // 处理小写的 "expected type but received type" 格式
  const expectedLowerMatch = message.match(/expected\s+["'`]?([^"'`\s]+)["'`]?\s+but\s+received\s+["'`]?([^"'`\s]+)["'`]?/i);
  if (expectedLowerMatch) {
    const typeNames: Record<string, { zh: string; en: string }> = {
      string: { zh: '字符串', en: 'string' },
      number: { zh: '数字', en: 'number' },
      integer: { zh: '整数', en: 'integer' },
      boolean: { zh: '布尔值', en: 'boolean' },
      object: { zh: '对象', en: 'object' },
      array: { zh: '数组', en: 'array' },
      null: { zh: '空值', en: 'null' },
    };
    const expectedTypeInfo = typeNames[expectedLowerMatch[1].toLowerCase()];
    const receivedTypeInfo = typeNames[expectedLowerMatch[2].toLowerCase()];
    const expectedType = expectedTypeInfo 
      ? (locale === 'zh' ? expectedTypeInfo.zh : expectedTypeInfo.en)
      : expectedLowerMatch[1];
    const receivedType = receivedTypeInfo 
      ? (locale === 'zh' ? receivedTypeInfo.zh : receivedTypeInfo.en)
      : expectedLowerMatch[2];
    return locale === 'zh' 
      ? `期望 ${expectedType}，但收到 ${receivedType}`
      : `Expected ${expectedType}, but received ${receivedType}`;
  }
  
  // 类型名称映射（多语言）
  const typeNames: Record<string, { zh: string; en: string }> = {
    string: { zh: '字符串', en: 'string' },
    number: { zh: '数字', en: 'number' },
    integer: { zh: '整数', en: 'integer' },
    boolean: { zh: '布尔值', en: 'boolean' },
    object: { zh: '对象', en: 'object' },
    array: { zh: '数组', en: 'array' },
    null: { zh: '空值', en: 'null' },
  };
  
  // 处理单独的 "Expected" 消息（多语言）
  if (message.toLowerCase().includes('expected') && !message.toLowerCase().includes('but received')) {
    // 尝试从消息中提取期望的类型
    const expectedTypeMatch = message.match(/Expected\s+["'`]([^"'`\s]+)["'`]/i) || 
                               message.match(/expected\s+["'`]([^"'`\s]+)["'`]/i) ||
                               message.match(/Expected\s+([a-zA-Z]+)/i) ||
                               message.match(/expected\s+([a-zA-Z]+)/i);
    
    if (expectedTypeMatch) {
      const expectedType = expectedTypeMatch[1];
      const typeInfo = typeNames[expectedType.toLowerCase()];
      const typeName = typeInfo 
        ? (locale === 'zh' ? typeInfo.zh : typeInfo.en)
        : expectedType;
      return locale === 'zh' 
        ? `期望 ${typeName}`
        : `Expected ${typeName}`;
    }
    
    // 如果只是 "Expected" 或 "expected"，返回通用消息
    if (message.trim().toLowerCase() === 'expected' || message.trim().toLowerCase() === '期望') {
      return locale === 'zh' 
        ? '期望值不符合要求'
        : 'Expected value does not meet requirements';
    }
  }
  
  if (locale === 'zh') {
    
    // 按优先级排序（更具体的错误模式优先）
    const sortedKeys = Object.keys(errorMessageMap).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      // 跳过 "Expected" 和 "expected" 关键词，因为我们已经在上面处理了
      if (key.toLowerCase() === 'expected') {
        continue;
      }
      
      if (message.toLowerCase().includes(key.toLowerCase())) {
        const translations = errorMessageMap[key];
        
        // 提取具体的值（常量值）
        const constMatch = message.match(/constant\s+["']([^"']+)["']/i);
        if (constMatch) {
          return `${translations.zh} "${constMatch[1]}"`;
        }
        
        // 处理其他 property 相关消息
        const propMatch = message.match(/property\s+["']([^"']+)["']/i);
        if (propMatch && (key.includes('required') || key.includes('additional'))) {
          return `${translations.zh} "${propMatch[1]}"`;
        }
        
        // 提取类型信息
        const typeMatch = message.match(/type\s+["']?([^"'\s,]+)["']?/i);
        if (typeMatch && key.includes('type')) {
          const typeNames: Record<string, string> = {
            string: '字符串',
            number: '数字',
            integer: '整数',
            boolean: '布尔值',
            object: '对象',
            array: '数组',
            null: '空值',
          };
          const typeName = typeNames[typeMatch[1].toLowerCase()] || typeMatch[1];
          return `${translations.zh}: ${typeName}`;
        }
        
        // 提取数值限制
        const minMaxMatch = message.match(/(min|max)(?:imum|Length)?\s+(\d+)/i);
        if (minMaxMatch) {
          const limit = minMaxMatch[2];
          const limitType = minMaxMatch[1].toLowerCase() === 'min' ? '最小值' : '最大值';
          return `${translations.zh}: ${limitType} ${limit}`;
        }
        
        // 默认返回翻译
        return translations.zh;
      }
    }
    
    // 匹配 "should be type" 格式
    const shouldBeMatch = message.match(/should\s+be\s+["'`]?([^"'`\s,]+)["'`]?/i);
    if (shouldBeMatch) {
      const typeInfo = typeNames[shouldBeMatch[1].toLowerCase()];
      const type = typeInfo 
        ? (locale === 'zh' ? typeInfo.zh : typeInfo.en)
        : shouldBeMatch[1];
      return locale === 'zh' 
        ? `应该是 ${type}`
        : `Should be ${type}`;
    }
    
    // 如果没有匹配到，尝试通用类型匹配
    const typeMatch = message.match(/must be (string|number|integer|boolean|object|array)/i);
    if (typeMatch) {
      const typeInfo = typeNames[typeMatch[1].toLowerCase()];
      const type = typeInfo 
        ? (locale === 'zh' ? typeInfo.zh : typeInfo.en)
        : typeMatch[1];
      return locale === 'zh' 
        ? `必须是 ${type}`
        : `Must be ${type}`;
    }
  }
  
  // 英文环境：使用 errorMessageMap 进行翻译
  if (locale === 'en') {
    const sortedKeys = Object.keys(errorMessageMap).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      if (key.toLowerCase() === 'expected') {
        continue;
      }
      
      if (message.toLowerCase().includes(key.toLowerCase())) {
        const translations = errorMessageMap[key];
        
        // 提取具体的值（常量值）
        const constMatch = message.match(/constant\s+["']([^"']+)["']/i);
        if (constMatch) {
          return `${translations.en} "${constMatch[1]}"`;
        }
        
        // 处理其他 property 相关消息
        const propMatch = message.match(/property\s+["']([^"']+)["']/i);
        if (propMatch && (key.includes('required') || key.includes('additional'))) {
          return `${translations.en} "${propMatch[1]}"`;
        }
        
        // 提取类型信息
        const typeMatch = message.match(/type\s+["']?([^"'\s,]+)["']?/i);
        if (typeMatch && key.includes('type')) {
          const typeInfo = typeNames[typeMatch[1].toLowerCase()];
          const typeName = typeInfo?.en || typeMatch[1];
          return `${translations.en}: ${typeName}`;
        }
        
        // 提取数值限制
        const minMaxMatch = message.match(/(min|max)(?:imum|Length)?\s+(\d+)/i);
        if (minMaxMatch) {
          const limit = minMaxMatch[2];
          const limitType = minMaxMatch[1].toLowerCase() === 'min' ? 'minimum' : 'maximum';
          return `${translations.en}: ${limitType} ${limit}`;
        }
        
        // 默认返回翻译
        return translations.en;
      }
    }
  }
  
  // 如果都没有匹配到，返回原消息
  return message;
}

let cachedSchema: JsonSchema | null = null;
let schemaLoadPromise: Promise<JsonSchema> | null = null;

// 初始化 schema
async function getSchema(): Promise<JsonSchema> {
  if (cachedSchema) return cachedSchema;
  if (!schemaLoadPromise) {
    schemaLoadPromise = loadSchema();
    cachedSchema = await schemaLoadPromise;
    schemaLoadPromise = null;
  } else {
    cachedSchema = await schemaLoadPromise;
  }
  return cachedSchema;
}

// 自定义错误格式化函数（支持多语言）
export function createFormatError(): (error: any) => string {
  return (error: any) => {
    const locale = getCurrentLocale();
    // 优先从错误对象的数据中提取完整信息
    const errorData = error.data || {};
    const message = error.message || error.text || String(error);
    
    // 类型名称映射（多语言）
    const typeNames: Record<string, { zh: string; en: string }> = {
      string: { zh: '字符串', en: 'string' },
      number: { zh: '数字', en: 'number' },
      integer: { zh: '整数', en: 'integer' },
      boolean: { zh: '布尔值', en: 'boolean' },
      object: { zh: '对象', en: 'object' },
      array: { zh: '数组', en: 'array' },
      null: { zh: '空值', en: 'null' },
    };
    
    // 如果有完整的错误数据，构建更详细的消息
    if (errorData.expected !== undefined || errorData.received !== undefined || errorData.value !== undefined) {
      const expected = errorData.expected;
      const received = errorData.received || errorData.value; // json-schema-library 使用 value 而不是 received
      
      if (expected && received) {
        // 处理数组类型的 expected（如 ["string", "number"]）
        let expectedStr: string;
        if (Array.isArray(expected)) {
          expectedStr = locale === 'zh' 
            ? expected.map(t => typeNames[t]?.zh || t).join(' 或 ')
            : expected.map(t => typeNames[t]?.en || t).join(' or ');
        } else {
          const expectedTypeInfo = typeNames[String(expected).toLowerCase()];
          expectedStr = expectedTypeInfo 
            ? (locale === 'zh' ? expectedTypeInfo.zh : expectedTypeInfo.en)
            : String(expected);
        }
        
        const receivedTypeInfo = typeNames[String(received).toLowerCase()];
        const receivedStr = receivedTypeInfo 
          ? (locale === 'zh' ? receivedTypeInfo.zh : receivedTypeInfo.en)
          : String(received);
        
        return locale === 'zh' 
          ? `期望 ${expectedStr}，但收到 ${receivedStr}`
          : `Expected ${expectedStr}, but received ${receivedStr}`;
      } else if (expected) {
        let expectedStr: string;
        if (Array.isArray(expected)) {
          expectedStr = locale === 'zh' 
            ? expected.map(t => typeNames[t]?.zh || t).join(' 或 ')
            : expected.map(t => typeNames[t]?.en || t).join(' or ');
        } else {
          const expectedTypeInfo = typeNames[String(expected).toLowerCase()];
          expectedStr = expectedTypeInfo 
            ? (locale === 'zh' ? expectedTypeInfo.zh : expectedTypeInfo.en)
            : String(expected);
        }
        
        return locale === 'zh' 
          ? `期望 ${expectedStr}`
          : `Expected ${expectedStr}`;
      }
    }
    
    // 如果消息中包含 "Expected" 但格式不完整，尝试从消息中提取
    if (message.includes('Expected') && !message.includes('but received')) {
      // 尝试匹配 "Expected `type`" 格式
      const expectedOnlyMatch = message.match(/Expected\s+["'`]([^"'`\s]+)["'`]/i) || 
                                message.match(/Expected\s+([a-zA-Z]+)/i);
      if (expectedOnlyMatch) {
        const expectedType = expectedOnlyMatch[1];
        const typeInfo = typeNames[expectedType.toLowerCase()];
        const typeName = typeInfo 
          ? (locale === 'zh' ? typeInfo.zh : typeInfo.en)
          : expectedType;
        return locale === 'zh' 
          ? `期望 ${typeName}`
          : `Expected ${typeName}`;
      }
    }
    
    return localizeErrorMessage(message);
  };
}

// 包装 jsonSchemaLinter，提取错误供右侧面板使用
// 同时进行独立验证以获取完整路径信息
function createWrappedLinter(options: JSONValidationOptions) {
  const baseLinter = jsonSchemaLinter(options);
  
  return (view: EditorView): Diagnostic[] => {
    const diagnostics = baseLinter(view);
    
    // 就地本地化诊断消息（用于鼠标悬停的气泡提示）
    const formatError = createFormatError();
    for (const diag of diagnostics) {
      // 尝试从诊断中提取原始错误对象并重新格式化
      // codemirror-json-schema 可能在诊断的某个字段中保存了原始错误
      const originalError = (diag as any).originalError;
      if (originalError) {
        diag.message = formatError(originalError);
      } else {
        // 否则使用本地化现有消息
        diag.message = localizeErrorMessage(diag.message);
      }
      
      // 重要：重写 renderMessage 以使用本地化后的消息
      // CodeMirror 使用 renderMessage 渲染气泡，而不是直接使用 message 字段
      const localizedMsg = diag.message;
      diag.renderMessage = () => {
        const dom = document.createElement('div');
        dom.textContent = localizedMsg;
        // 添加样式类，与右侧栏保持一致
        dom.style.cssText = 'color: #dc2626; font-size: 13px; line-height: 1.6; font-weight: 500;';
        return dom;
      };
    }
    
    // 立即使用本地化后的诊断同步更新 editorErrors（解决语言切换延迟问题）
    const immediateErrors = diagnostics
      .filter((d) => d.severity === 'error')
      .map((d) => {
        const message = d.message || '';
        let path = '';
        
        // 尝试从消息中提取路径
        const fullAdditionalMatch = message.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?\s+in\s+([a-zA-Z0-9_$\.\[\]]+)/i);
        if (fullAdditionalMatch) {
          const dotPath = fullAdditionalMatch[2];
          path = '/' + dotPath.replace(/\./g, '/').replace(/\[(\d+)\]/g, '/$1');
        }
        
        const from = d.from ?? undefined;
        let line: number | undefined;
        if (from !== undefined) {
          try {
            const lineObj = view.state.doc.lineAt(from);
            line = lineObj.number;
          } catch {}
        }
        
        return {
          path,
          message: d.message, // 已经本地化了
          line,
          from,
          to: d.to ?? undefined,
        };
      });
    
    editorErrors.value = immediateErrors;
    editorValidationState.value = {
      valid: immediateErrors.length === 0,
      errorCount: immediateErrors.length,
      lastValidated: Date.now(),
    };
    
    // 同时进行独立验证以获取完整的路径信息（异步执行，不阻塞诊断返回）
    // 使用独立验证的结果更新 editorErrors（异步更新会覆盖同步版本）
    (async () => {
      try {
        const source = view.state.doc.toString();
        const json = JSON.parse(source);
        const schema = await getSchema();
        
        // 使用 json-schema-library 直接验证以获取完整错误信息
        const { Draft07 } = await import('json-schema-library');
        const validator = new Draft07(schema as any);
        const rawErrors = validator.validate(json);
        
        // 提取路径和消息，与诊断匹配
        const validationErrors = rawErrors.map((err: any) => {
          // 从错误数据中获取路径（getErrorPath 的逻辑）
          let errorPath = '';
          if (err.data?.pointer && err.data.pointer !== '#') {
            errorPath = err.data.pointer.startsWith('#') ? err.data.pointer.slice(1) : err.data.pointer;
          } else if (err.data?.property) {
            errorPath = `/${err.data.property}`;
          }
          
          // 格式化错误消息（使用我们自定义的格式化）
          const errorMessage = createFormatError()(err);
          
          return {
            path: errorPath,
            message: errorMessage,
            originalMessage: err.message || String(err),
            error: err,
          };
        });
        
        // 使用 json-source-map 精确计算路径对应的位置
        // codemirror-json-schema 提供了 parseJSONDocumentState 函数来获取指针映射
        let parsedResult: { data: unknown; pointers: Map<string, any> } | null = null;
        try {
          // 使用 parseJSONDocumentState 来获取指针映射
          const parserModule = await import('codemirror-json-schema');
          const { parseJSONDocumentState } = parserModule as any;
          
          if (parseJSONDocumentState) {
            parsedResult = parseJSONDocumentState(view.state);
          }
        } catch (e) {
          // 如果导入失败，继续使用诊断匹配
          console.warn('Failed to parse JSON document state:', e);
        }
        
        // 直接使用验证错误的结果（包含完整路径信息）
        // 同时使用 json-source-map 计算精确位置
        const matchedErrors = validationErrors.map((ve) => {
          let from: number | undefined = undefined;
          let to: number | undefined = undefined;
          let line: number | undefined = undefined;
          
          // 策略1：使用 json-source-map 精确计算位置
          if (ve.path && parsedResult?.pointers) {
            try {
              // 确保路径格式正确（以 / 开头）
              const pointerPath = ve.path.startsWith('/') ? ve.path : '/' + ve.path;
              const pointer = parsedResult.pointers.get(pointerPath);
              
              if (pointer) {
                // 根据错误类型选择位置（属性错误使用 keyFrom/keyTo，值错误使用 valueFrom/valueTo）
                const isKeyError = ve.error?.name && ['NoAdditionalPropertiesError', 'RequiredPropertyError', 'InvalidPropertyNameError', 'ForbiddenPropertyError'].includes(ve.error.name);
                
                if (isKeyError) {
                  from = pointer.keyFrom;
                  to = pointer.keyTo;
                } else {
                  from = pointer.valueFrom;
                  to = pointer.valueTo;
                }
                
                // 计算行号
                if (from !== undefined) {
                  try {
                    const lineObj = view.state.doc.lineAt(from);
                    line = lineObj.number;
                  } catch {
                    // 忽略
                  }
                }
              }
            } catch (e) {
              // json-source-map 计算失败，继续使用诊断匹配
            }
          }
          
          // 策略2：如果 json-source-map 没有找到位置，尝试匹配诊断
          if (from === undefined || to === undefined) {
            // 尝试找到对应的诊断（通过位置或消息匹配）
            const matchingDiagnostic = diagnostics.find(d => {
              if (d.severity !== 'error') return false;
              
              // 通过路径匹配：检查诊断的位置是否与错误路径相关
              // 首先尝试精确消息匹配
              const vePropMatch = ve.originalMessage.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?/i);
              const veProp = vePropMatch?.[1];
              const dPropMatch = d.message.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?/i);
              const dProp = dPropMatch?.[1];
              
              if (veProp && dProp && veProp.toLowerCase() === dProp.toLowerCase()) {
                return true;
              }
              
              // 通过类型错误匹配
              const veTypeMatch = ve.originalMessage.match(/Expected\s+["'`]?([^"'`\s]+)["'`]?/i);
              const dTypeMatch = d.message.match(/Expected\s+["'`]?([^"'`\s]+)["'`]?/i);
              if (veTypeMatch && dTypeMatch && 
                  veTypeMatch[1].toLowerCase() === dTypeMatch[1].toLowerCase()) {
                return true;
              }
              
              // 通过错误代码匹配
              if (ve.error?.code && ve.error.code === (d as any).errorCode) {
                return true;
              }
              
              // 通过路径匹配：如果诊断也包含路径信息
              if (ve.path && (d as any).path && ve.path === (d as any).path) {
                return true;
              }
              
              return false;
            });
            
            // 从匹配的诊断中获取位置信息
            if (matchingDiagnostic) {
              from = matchingDiagnostic.from ?? undefined;
              to = matchingDiagnostic.to ?? undefined;
              
              if (from !== undefined) {
                try {
                  const lineObj = view.state.doc.lineAt(from);
                  line = lineObj.number;
                } catch {
                  // 如果无法获取行号，忽略
                }
              }
            }
          }
          
          return {
            path: ve.path,
            // 存储已格式化的消息（已本地化）
            message: ve.message,
            line,
            from,
            to,
          };
        });
        
        // 更新全局错误状态
        editorErrors.value = matchedErrors;
        editorValidationState.value = {
          valid: matchedErrors.length === 0,
          errorCount: matchedErrors.length,
          lastValidated: Date.now(),
        };
      } catch (e) {
        // JSON 解析失败或其他错误，使用诊断作为后备
        const fallbackErrors = diagnostics
          .filter((d) => d.severity === 'error')
          .map((d) => {
            const message = d.message || '';
            let path = '';
            
            // 尝试从消息中提取路径
            const fullAdditionalMatch = message.match(/Additional\s+property\s+["']?([^"'\s.]+)["']?\s+in\s+([a-zA-Z0-9_$\.\[\]]+)/i);
            if (fullAdditionalMatch) {
              const dotPath = fullAdditionalMatch[2];
              path = '/' + dotPath.replace(/\./g, '/').replace(/\[(\d+)\]/g, '/$1');
            }
            
            const from = d.from ?? undefined;
            let line: number | undefined;
            if (from !== undefined) {
              try {
                const lineObj = view.state.doc.lineAt(from);
                line = lineObj.number;
              } catch {}
            }
            
            return {
              path,
              message: localizeErrorMessage(message),
              line,
              from,
              to: d.to ?? undefined,
            };
          });
        
        editorErrors.value = fallbackErrors;
        editorValidationState.value = {
          valid: fallbackErrors.length === 0,
          errorCount: fallbackErrors.length,
          lastValidated: Date.now(),
        };
      }
    })();
    
    // 立即返回诊断（不等待异步验证完成）
    // 异步验证会在后台更新 editorErrors
    return diagnostics;
  };
}

/**
 * Schema 校验配置接口
 */
export interface SchemaValidationConfig {
  enabled: boolean; // 是否启用 Schema 校验
  delay: number; // 延迟时间（毫秒）
}

/**
 * 默认 Schema 校验配置
 */
const defaultSchemaConfig: SchemaValidationConfig = {
  enabled: false,
  delay: 800,
};

// 创建 JSON Schema 扩展（使用 codemirror-json-schema 官方包）
let schemaExtensionPromise: Promise<Extension[]> | null = null;
let lastConfig: SchemaValidationConfig | null = null;
let lastLocale: 'zh' | 'en' = getCurrentLocale();

// 自定义 needsRefresh 函数，检测语言变化
function needsRefreshWithLocale(vu: ViewUpdate): boolean {
  const currentLocale = getCurrentLocale();
  const localeChanged = lastLocale !== currentLocale;
  if (localeChanged) {
    lastLocale = currentLocale;
  }
  // 如果语言变化，立即刷新
  if (localeChanged) {
    return true;
  }
  // 对于文档变更，延迟刷新（通过 delay 选项控制）
  // handleRefresh 会检查文档是否变更，如果变更则返回 true
  // 但我们通过 delay 延迟实际执行，避免与手动编辑冲突
  return handleRefresh(vu);
}

/**
 * 创建 Schema 校验扩展（支持配置）
 */
export async function createJsonSchemaExtension(config: SchemaValidationConfig = defaultSchemaConfig): Promise<Extension[]> {
  // 如果禁用，返回空扩展
  if (!config.enabled) {
    return [];
  }
  
  // 如果配置相同且已有 Promise，返回缓存的扩展
  if (lastConfig && 
      lastConfig.enabled === config.enabled &&
      lastConfig.delay === config.delay &&
      schemaExtensionPromise) {
    return schemaExtensionPromise;
  }
  
  // 更新最后使用的配置
  lastConfig = config;
  
  // 创建新的 Promise
  schemaExtensionPromise = (async () => {
    const schema = await getSchema();
    const options: JSONValidationOptions = {
      formatError: createFormatError(),
    };
    
    return [
      // 设置 schema 状态
      ...stateExtensions(schema),
      // 添加 linter（包装以提取错误）
      linter(createWrappedLinter(options), {
        needsRefresh: needsRefreshWithLocale,
        delay: config.delay, // 使用配置的延迟时间
      }),
    ];
  })();
  
  return schemaExtensionPromise;
}

/**
 * 导出 Schema 校验扩展（向后兼容的默认导出）
 */
export async function jsonSchema(): Promise<Extension[]> {
  return createJsonSchemaExtension({ enabled: true, delay: 800 });
}

/**
 * 同步版本：返回占位扩展（用于初始化，实际会在异步加载后应用）
 */
export function jsonSchemaSync(): Extension[] {
  // 先返回空扩展，然后在后台加载并更新
  return [];
}

/**
 * 清理 Schema 扩展缓存（用于配置变化时的重建）
 */
export function clearSchemaExtensionCache() {
  schemaExtensionPromise = null;
  lastConfig = null;
}
