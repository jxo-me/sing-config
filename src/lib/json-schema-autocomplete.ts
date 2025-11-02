import { CompletionContext, CompletionResult, Completion, autocompletion, startCompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { loadSchema, setSchemaFilePath } from './schema';
import { getCurrentLocale } from './codemirror-json-schema';

type JsonSchema = Record<string, unknown>;

let cachedSchema: JsonSchema | null = null;
let schemaLoadPromise: Promise<JsonSchema> | null = null;
let lastSchemaPath: string | null = null;
let currentSchemaPath: string | undefined = undefined;

async function getSchema(schemaPath?: string): Promise<JsonSchema> {
  // 使用传入的路径，或使用当前设置的路径
  const path = schemaPath || currentSchemaPath || '/schema.json';
  
  console.log('[Autocomplete] getSchema 调用:', { schemaPath, currentSchemaPath, resolvedPath: path });
  
  // 如果路径变化，清除缓存并重新加载
  if (path && path !== lastSchemaPath) {
    console.log('[Autocomplete] 路径变化，清除缓存:', { oldPath: lastSchemaPath, newPath: path });
    cachedSchema = null;
    schemaLoadPromise = null;
    lastSchemaPath = path;
    setSchemaFilePath(path);
  }
  
  if (cachedSchema) {
    console.log('[Autocomplete] 使用缓存的 Schema');
    return cachedSchema;
  }
  
  if (!schemaLoadPromise) {
    console.log('[Autocomplete] 开始加载 Schema:', path);
    schemaLoadPromise = loadSchema(path)
      .then(schema => {
        console.log('[Autocomplete] Schema 加载成功:', Object.keys(schema).slice(0, 5));
        return schema;
      })
      .catch(error => {
        console.error('[Autocomplete] Schema 加载失败:', error);
        throw error;
      });
    cachedSchema = await schemaLoadPromise;
    schemaLoadPromise = null;
  } else {
    console.log('[Autocomplete] 等待已有的 Schema 加载 Promise');
    cachedSchema = await schemaLoadPromise;
  }
  return cachedSchema;
}

// 解析 $ref 引用
function resolveRef(_schema: JsonSchema, ref: string, rootSchema: JsonSchema): JsonSchema | null {
  if (!ref.startsWith('#/')) return null;
  
  const path = ref.slice(2).split('/');
  let current: JsonSchema = rootSchema;
  
  for (const segment of path) {
    if (segment === '') continue;
    const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    
    if (current && typeof current === 'object') {
      if (decoded in current) {
        current = current[decoded] as JsonSchema;
        
        // 如果遇到另一个 $ref，继续解析
        if (typeof current === 'object' && current.$ref && typeof current.$ref === 'string') {
          current = resolveRef(current, current.$ref as string, rootSchema) || current;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  return current;
}

// 从 JSON Schema 路径解析当前上下文
function resolveSchemaPath(schema: JsonSchema, path: string[], rootSchema: JsonSchema = schema): JsonSchema | null {
  let current: JsonSchema = schema;
  
  for (const key of path) {
    if (key === '' || key === '$schema') continue;
    
    // 处理 $ref
    if (current.$ref && typeof current.$ref === 'string') {
      current = resolveRef(current, current.$ref, rootSchema) || current;
    }
    
    // 处理数组索引（如 "0", "1"）
    if (key.match(/^\d+$/)) {
      const idx = parseInt(key, 10);
      // 如果当前 schema 有 items，使用 items
      if (current.items) {
        if (Array.isArray(current.items)) {
          let itemSchema = (current.items[idx] || current.items[0] || {}) as JsonSchema;
          if (itemSchema.$ref) {
            itemSchema = resolveRef(itemSchema, itemSchema.$ref as string, rootSchema) || itemSchema;
          }
          current = itemSchema;
        } else {
          let itemSchema = current.items as JsonSchema;
          if (itemSchema.$ref) {
            itemSchema = resolveRef(itemSchema, itemSchema.$ref as string, rootSchema) || itemSchema;
          }
          current = itemSchema;
        }
        continue;
      }
      return null;
    }
    
    // 处理对象属性
    if (current.properties && typeof current.properties === 'object') {
      const props = current.properties as Record<string, JsonSchema>;
      if (key in props) {
        let propSchema = props[key];
        if (propSchema.$ref) {
          propSchema = resolveRef(propSchema, propSchema.$ref as string, rootSchema) || propSchema;
        }
        current = propSchema;
        continue;
      }
    }
    
    // 处理 oneOf/anyOf/allOf
    if (current.oneOf && Array.isArray(current.oneOf)) {
      // 尝试在 oneOf 中找到包含该属性的 schema
      for (const variant of current.oneOf) {
        let variantSchema = variant as JsonSchema;
        if (variantSchema.$ref) {
          variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
        }
        if (variantSchema.properties && typeof variantSchema.properties === 'object') {
          const props = variantSchema.properties as Record<string, JsonSchema>;
          if (key in props) {
            current = props[key];
            if (current.$ref) {
              current = resolveRef(current, current.$ref as string, rootSchema) || current;
            }
            break;
          }
        }
      }
      continue;
    }
    
    if (current.anyOf && Array.isArray(current.anyOf)) {
      for (const variant of current.anyOf) {
        let variantSchema = variant as JsonSchema;
        if (variantSchema.$ref) {
          variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
        }
        if (variantSchema.properties && typeof variantSchema.properties === 'object') {
          const props = variantSchema.properties as Record<string, JsonSchema>;
          if (key in props) {
            current = props[key];
            if (current.$ref) {
              current = resolveRef(current, current.$ref as string, rootSchema) || current;
            }
            break;
          }
        }
      }
      continue;
    }
    
    if (current.allOf && Array.isArray(current.allOf)) {
      // allOf 需要合并所有 schema
      const merged: JsonSchema = { properties: {} };
      for (const variant of current.allOf) {
        let variantSchema = variant as JsonSchema;
        if (variantSchema.$ref) {
          variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
        }
        if (variantSchema.properties && typeof variantSchema.properties === 'object') {
          Object.assign(merged.properties as Record<string, unknown>, variantSchema.properties);
        }
      }
      const props = merged.properties as Record<string, JsonSchema>;
      if (key in props) {
        current = props[key];
        if (current.$ref) {
          current = resolveRef(current, current.$ref as string, rootSchema) || current;
        }
        continue;
      }
    }
    
    // 如果是根级别的属性，直接查找
    if (current === schema && current.properties && typeof current.properties === 'object') {
      const props = current.properties as Record<string, JsonSchema>;
      if (key in props) {
        current = props[key];
        if (current.$ref) {
          current = resolveRef(current, current.$ref as string, rootSchema) || current;
        }
        continue;
      }
    }
    
    return null;
  }
  
  return current;
}

// 获取当前位置的 JSON 路径
function getJsonPath(state: CompletionContext['state'], pos: number): string[] {
  const tree = syntaxTree(state);
  const path: string[] = [];
  let current: ReturnType<typeof tree.resolve> = tree.resolve(pos, 1);
  
  // 向上遍历语法树，构建路径
  while (current) {
    const name = current.name;
    
    if (name === 'Property') {
      // 获取属性名
      const propertyNameNode = current.getChild('PropertyName');
      if (propertyNameNode) {
        const nameText = state.sliceDoc(propertyNameNode.from, propertyNameNode.to);
        // 去除引号
        const cleanName = nameText.replace(/^["']|["']$/g, '');
        path.unshift(cleanName);
      }
    } else if (name === 'JsonArray') {
      // 处理数组，需要计算索引
      const parent = current.parent;
      if (parent && parent.name === 'Property') {
        // 这是一个数组属性
        const propertyNameNode = parent.getChild('PropertyName');
        if (propertyNameNode) {
          const nameText = state.sliceDoc(propertyNameNode.from, propertyNameNode.to);
          const cleanName = nameText.replace(/^["']|["']$/g, '');
          path.unshift(cleanName);
        }
      }
      // 计算当前索引
      let index = 0;
      let sibling = current.firstChild;
      while (sibling && sibling.to < pos) {
        if (sibling.name === 'JsonText' || sibling.name === 'JsonObject' || sibling.name === 'JsonArray') {
          index++;
        }
        sibling = sibling.nextSibling;
      }
      if (index > 0) {
        path.unshift(String(index - 1));
      }
    }
    
    const parent = current.parent;
    if (!parent) break;
    current = parent;
  }
  
  return path;
}

// 根据 schema 获取默认值
function getDefaultValue(schema: JsonSchema, rootSchema: JsonSchema): string {
  // 处理 $ref
  let currentSchema = schema;
  if (schema.$ref && typeof schema.$ref === 'string') {
    currentSchema = resolveRef(schema, schema.$ref, rootSchema) || schema;
  }
  
  // 检查是否有默认值
  if (currentSchema.default !== undefined) {
    return JSON.stringify(currentSchema.default);
  }
  
  // 检查枚举值，使用第一个作为默认值
  if (currentSchema.enum && Array.isArray(currentSchema.enum) && currentSchema.enum.length > 0) {
    return JSON.stringify(currentSchema.enum[0]);
  }
  
  // 根据类型提供默认值
  const type = currentSchema.type;
  if (Array.isArray(type)) {
    // 如果是类型数组，使用第一个类型
    if (type.length > 0 && typeof type[0] === 'string') {
      return getDefaultValueByType(type[0]);
    }
  } else if (typeof type === 'string') {
    return getDefaultValueByType(type);
  }
  
  // 处理 oneOf/anyOf/allOf - 使用第一个变体的默认值
  if (currentSchema.oneOf && Array.isArray(currentSchema.oneOf) && currentSchema.oneOf.length > 0) {
    const firstVariant = currentSchema.oneOf[0] as JsonSchema;
    if (firstVariant.$ref && typeof firstVariant.$ref === 'string') {
      const resolved = resolveRef(firstVariant, firstVariant.$ref, rootSchema);
      if (resolved && resolved.type) {
        if (Array.isArray(resolved.type) && resolved.type.length > 0 && typeof resolved.type[0] === 'string') {
          return getDefaultValueByType(resolved.type[0]);
        } else if (typeof resolved.type === 'string') {
          return getDefaultValueByType(resolved.type);
        }
      }
    }
    if (firstVariant.type) {
      if (Array.isArray(firstVariant.type) && firstVariant.type.length > 0 && typeof firstVariant.type[0] === 'string') {
        return getDefaultValueByType(firstVariant.type[0]);
      } else if (typeof firstVariant.type === 'string') {
        return getDefaultValueByType(firstVariant.type);
      }
    }
  }
  
  if (currentSchema.anyOf && Array.isArray(currentSchema.anyOf) && currentSchema.anyOf.length > 0) {
    const firstVariant = currentSchema.anyOf[0] as JsonSchema;
    if (firstVariant.$ref && typeof firstVariant.$ref === 'string') {
      const resolved = resolveRef(firstVariant, firstVariant.$ref, rootSchema);
      if (resolved && resolved.type) {
        if (Array.isArray(resolved.type) && resolved.type.length > 0 && typeof resolved.type[0] === 'string') {
          return getDefaultValueByType(resolved.type[0]);
        } else if (typeof resolved.type === 'string') {
          return getDefaultValueByType(resolved.type);
        }
      }
    }
    if (firstVariant.type) {
      if (Array.isArray(firstVariant.type) && firstVariant.type.length > 0 && typeof firstVariant.type[0] === 'string') {
        return getDefaultValueByType(firstVariant.type[0]);
      } else if (typeof firstVariant.type === 'string') {
        return getDefaultValueByType(firstVariant.type);
      }
    }
  }
  
  if (currentSchema.allOf && Array.isArray(currentSchema.allOf) && currentSchema.allOf.length > 0) {
    const firstVariant = currentSchema.allOf[0] as JsonSchema;
    if (firstVariant.$ref && typeof firstVariant.$ref === 'string') {
      const resolved = resolveRef(firstVariant, firstVariant.$ref, rootSchema);
      if (resolved && resolved.type) {
        if (Array.isArray(resolved.type) && resolved.type.length > 0 && typeof resolved.type[0] === 'string') {
          return getDefaultValueByType(resolved.type[0]);
        } else if (typeof resolved.type === 'string') {
          return getDefaultValueByType(resolved.type);
        }
      }
    }
    if (firstVariant.type) {
      if (Array.isArray(firstVariant.type) && firstVariant.type.length > 0 && typeof firstVariant.type[0] === 'string') {
        return getDefaultValueByType(firstVariant.type[0]);
      } else if (typeof firstVariant.type === 'string') {
        return getDefaultValueByType(firstVariant.type);
      }
    }
  }
  
  // 未知类型，返回 null
  return 'null';
}

// 根据类型获取默认值（测试用例 8）
function getDefaultValueByType(type: string): string {
  switch (type) {
    case 'string':
      return '""'; // 空字符串（测试用例 8：字符串类型：插入 ""）
    case 'number':
    case 'integer':
      return '0'; // 数字 0（测试用例 8：数字类型：插入 0）
    case 'boolean':
      return 'false'; // 布尔值 false（测试用例 8：布尔类型：插入 false）
    case 'null':
      return 'null'; // null（测试用例 8：null 类型）
    case 'array':
      return '[]'; // 空数组（测试用例 8：数组类型：插入 []）
    case 'object':
      return '{}'; // 空对象（测试用例 8：对象类型：插入 {}）
    default:
      return 'null'; // 未知类型默认 null
  }
}

// 创建智能属性名补全应用函数
function createPropertyApply(key: string, propSchema?: JsonSchema, rootSchema?: JsonSchema): (view: any, _completion: any, from: number, to: number) => void {
  return (view, _completion, from, to) => {
    const state = view.state;
    
    // 使用语法树判断是否在字符串内（更准确）
    const tree = syntaxTree(state);
    const node = tree.resolve(from, 1);
    let isInString = false;
    let current: ReturnType<typeof tree.resolve> = node;
    
    // 向上遍历语法树，检查是否在字符串节点内
    while (current) {
      if (current.name === 'String' || current.name === 'JsonString') {
        isInString = true;
        break;
      }
      const parent = current.parent;
      if (!parent) break;
      current = parent;
    }
    
    // 如果已在字符串内，只插入键名
    let insertText: string = isInString ? key : `"${key}"`;
    
    // 计算光标位置（默认在插入文本末尾）
    let cursorPosition = from + insertText.length;
    
    // 如果提供了 schema，自动插入默认值
    if (propSchema && rootSchema) {
      const defaultValue = getDefaultValue(propSchema, rootSchema);
      // 在冒号后插入默认值（如果不是空对象/空数组的话）
      if (defaultValue !== '{}' && defaultValue !== '[]') {
        insertText += `: ${defaultValue}`;
        
        // 优化光标位置：
        // - 如果是字符串类型（""），光标定位到两个引号中间
        // - 如果是其他类型，光标定位到值后面
        if (defaultValue === '""') {
          // 字符串类型：光标定位到两个引号中间
          // insertText 现在是 `"$schema": ""`
          // 需要找到最后一个 "" 的中间位置
          // 示例：`"$schema": ""`，索引：0123456789 012
          //                            " $ s c h e m a " :   " "
          // 最后两个引号在位置 11 和 12，光标应该在位置 12（第二个引号的位置）
          // 但更准确的是：找到冒号后的第一个引号位置 + 1（在引号中间）
          const colonIndex = insertText.indexOf(':');
          if (colonIndex >= 0) {
            // 找到冒号后的第一个引号（值的开始引号）
            const valueStartQuote = insertText.indexOf('"', colonIndex + 1);
            if (valueStartQuote >= 0) {
              // 光标应该在第一个引号后面（即 "" 中间）
              cursorPosition = from + valueStartQuote + 1;
              console.log('[Autocomplete] 字符串默认值，计算光标位置:', {
                insertText,
                colonIndex,
                valueStartQuote,
                cursorPosition,
                '期望位置': '在 "" 中间（第一个引号后面）',
              });
            } else {
              // 降级：使用最后一个引号前面
              cursorPosition = from + insertText.length - 1;
            }
          } else {
            // 降级：使用最后一个引号前面
            cursorPosition = from + insertText.length - 1;
          }
        } else if (defaultValue.startsWith('"') && defaultValue.endsWith('"') && defaultValue.length > 2) {
          // 带引号的字符串值（如枚举值），光标定位到引号中间
          const lastQuoteIndex = insertText.lastIndexOf('"');
          cursorPosition = from + lastQuoteIndex; // 在最后一个引号前面
        } else {
          // 其他类型（数字、布尔、null），光标定位到值后面
          cursorPosition = from + insertText.length;
        }
      }
    }
    
    // 插入文本
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: cursorPosition },
    });
    
    console.log('[Autocomplete] 属性插入完成:', {
      insertText,
      cursorPosition,
      from,
      to,
      '光标在引号内': insertText.includes('""') && cursorPosition === from + insertText.length - 1,
    });
  };
}

// 创建智能值补全应用函数
function createValueApply(valueStr: string, isString: boolean): (view: any, _completion: any, from: number, to: number) => void {
  return (view, _completion, from, to) => {
    const state = view.state;
    
    let insertText: string;
    let cursorPosition: number;
    
    if (isString) {
      // 字符串值：使用语法树判断是否已在字符串内
      const tree = syntaxTree(state);
      const node = tree.resolve(from, 1);
      let isInString = false;
      let current: ReturnType<typeof tree.resolve> = node;
      
      // 向上遍历语法树，检查是否在字符串节点内
      while (current) {
        if (current.name === 'String' || current.name === 'JsonString') {
          isInString = true;
          break;
        }
        const parent = current.parent;
        if (!parent) break;
        current = parent;
      }
      
      if (isInString) {
        // 测试用例 9：智能引号处理 - 已在字符串内，移除 valueStr 中的引号（避免重复）
        insertText = valueStr.replace(/^"|"$/g, '');
        // 光标定位到值后面（已在字符串内，不需要定位到引号中间）
        cursorPosition = from + insertText.length;
        console.log('[Autocomplete] 值插入：已在字符串内，移除引号避免重复:', {
          original: valueStr,
          insertText,
          isInString,
        });
      } else {
        // 如果不在字符串内，直接使用 JSON.stringify 的结果（已包含引号）
        insertText = valueStr;
        // 如果是空字符串 ""，光标定位到引号中间
        // 如果是其他字符串值（如枚举），光标也定位到引号中间，方便编辑（测试用例 5）
        if (insertText === '""' || (insertText.startsWith('"') && insertText.endsWith('"') && insertText.length > 2)) {
          cursorPosition = from + insertText.length - 1; // 在最后一个引号前面
        } else {
          cursorPosition = from + insertText.length;
        }
        console.log('[Autocomplete] 值插入：不在字符串内，保留引号:', {
          insertText,
          cursorPosition,
          isInString: false,
        });
      }
    } else {
      // 非字符串值：直接插入（如 true, false, null, 数字）
      insertText = valueStr;
      cursorPosition = from + insertText.length;
    }
    
    // 插入文本
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: cursorPosition },
    });
    
    console.log('[Autocomplete] 值插入完成:', {
      insertText,
      cursorPosition,
      from,
      to,
      isString,
      '光标在引号内': isString && insertText.includes('"') && cursorPosition === from + insertText.length - 1,
    });
  };
}

// 从 schema 获取属性名补全
function getPropertyCompletions(schema: JsonSchema, context: CompletionContext, rootSchema: JsonSchema = cachedSchema || {}): Completion[] {
  const completions: Completion[] = [];
  const locale = getCurrentLocale();
  
  // 处理 $ref
  if (schema.$ref && typeof schema.$ref === 'string') {
    schema = resolveRef(schema, schema.$ref, rootSchema) || schema;
  }
  
  // 处理 allOf - 合并所有属性
  if (schema.allOf && Array.isArray(schema.allOf)) {
    const merged: JsonSchema = { properties: {}, required: [] };
    for (const variant of schema.allOf) {
      let variantSchema = variant as JsonSchema;
      if (variantSchema.$ref) {
        variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
      }
      if (variantSchema.properties && typeof variantSchema.properties === 'object') {
        Object.assign((merged.properties as Record<string, unknown>) || {}, variantSchema.properties);
      }
      if (Array.isArray(variantSchema.required)) {
        (merged.required as string[]).push(...(variantSchema.required as string[]));
      }
    }
    schema = merged;
  }
  
  if (!schema.properties || typeof schema.properties !== 'object') {
    return completions;
  }
  
  const props = schema.properties as Record<string, JsonSchema>;
  const required = (Array.isArray(schema.required) ? schema.required : []) as string[];
  
  // 获取当前已存在的属性
  const existingProps = new Set<string>();
  const pos = context.pos;
  
  // 尝试解析当前行的对象
  try {
    const lineText = context.state.doc.lineAt(pos).text;
    const objectMatch = lineText.match(/\{([^}]*)\}/);
    if (objectMatch) {
      const propsText = objectMatch[1];
      const propMatches = propsText.matchAll(/"([^"]+)":/g);
      for (const m of propMatches) {
        existingProps.add(m[1]);
      }
    }
  } catch {
    // 忽略解析错误
  }
  
  // 生成属性名补全
  for (const [key, propSchema] of Object.entries(props)) {
    if (existingProps.has(key)) continue; // 跳过已存在的属性
    
    // 处理 $ref
    let resolvedSchema = propSchema;
    if (propSchema.$ref && typeof propSchema.$ref === 'string') {
      resolvedSchema = resolveRef(propSchema, propSchema.$ref, rootSchema) || propSchema;
    }
    
    const isRequired = required.includes(key);
    const description = (resolvedSchema.description as string) || '';
    const propType = resolvedSchema.type || (Array.isArray(resolvedSchema.type) ? resolvedSchema.type[0] : 'unknown');
    
    let label = `"${key}"`;
    let detail = '';
    
    if (locale === 'zh') {
      detail = propType === 'array' ? '数组' : 
               propType === 'object' ? '对象' : 
               propType === 'string' ? '字符串' : 
               propType === 'number' ? '数字' : 
               propType === 'boolean' ? '布尔值' : String(propType);
      if (isRequired) detail += ' (必需)';
      if (description) label += ` - ${description}`;
    } else {
      detail = String(propType);
      if (isRequired) detail += ' (required)';
      if (description) label += ` - ${description}`;
    }
    
    completions.push({
      label,
      type: 'property',
      detail,
      info: description || undefined,
      // 自定义应用逻辑：智能处理引号和默认值
      apply: createPropertyApply(key, resolvedSchema, rootSchema),
    });
  }
  
  // 处理 oneOf/anyOf - 合并所有变体的属性
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    for (const variant of schema.oneOf) {
      let variantSchema = variant as JsonSchema;
      if (variantSchema.$ref) {
        variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
      }
      if (variantSchema.properties && typeof variantSchema.properties === 'object') {
        const variantProps = variantSchema.properties as Record<string, JsonSchema>;
        const variantRequired = (Array.isArray(variantSchema.required) ? variantSchema.required : []) as string[];
        
        for (const [key, propSchema] of Object.entries(variantProps)) {
          if (existingProps.has(key)) continue;
          
          // 处理 $ref
          let resolvedSchema = propSchema;
          if (propSchema.$ref && typeof propSchema.$ref === 'string') {
            resolvedSchema = resolveRef(propSchema, propSchema.$ref, rootSchema) || propSchema;
          }
          
          const isRequired = variantRequired.includes(key);
          const description = (resolvedSchema.description as string) || '';
          const propType = resolvedSchema.type || 'unknown';
          
          let label = `"${key}"`;
          let detail = '';
          
          if (locale === 'zh') {
            detail = String(propType);
            if (isRequired) detail += ' (必需)';
            if (description) label += ` - ${description}`;
          } else {
            detail = String(propType);
            if (isRequired) detail += ' (required)';
            if (description) label += ` - ${description}`;
          }
          
          // 避免重复
          if (!completions.find(c => c.label === `"${key}"`)) {
            completions.push({
              label,
              type: 'property',
              detail,
              info: description || undefined,
              // 自定义应用逻辑：智能处理引号和默认值
              apply: createPropertyApply(key, resolvedSchema, rootSchema),
            });
          }
        }
      }
    }
  }
  
  // 处理 anyOf - 类似 oneOf
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    for (const variant of schema.anyOf) {
      let variantSchema = variant as JsonSchema;
      if (variantSchema.$ref) {
        variantSchema = resolveRef(variantSchema, variantSchema.$ref as string, rootSchema) || variantSchema;
      }
      if (variantSchema.properties && typeof variantSchema.properties === 'object') {
        const variantProps = variantSchema.properties as Record<string, JsonSchema>;
        const variantRequired = (Array.isArray(variantSchema.required) ? variantSchema.required : []) as string[];
        
        for (const [key, propSchema] of Object.entries(variantProps)) {
          if (existingProps.has(key)) continue;
          
          let resolvedSchema = propSchema;
          if (propSchema.$ref && typeof propSchema.$ref === 'string') {
            resolvedSchema = resolveRef(propSchema, propSchema.$ref, rootSchema) || propSchema;
          }
          
          const isRequired = variantRequired.includes(key);
          const description = (resolvedSchema.description as string) || '';
          const propType = resolvedSchema.type || 'unknown';
          
          let label = `"${key}"`;
          let detail = '';
          
          if (locale === 'zh') {
            detail = String(propType);
            if (isRequired) detail += ' (必需)';
            if (description) label += ` - ${description}`;
          } else {
            detail = String(propType);
            if (isRequired) detail += ' (required)';
            if (description) label += ` - ${description}`;
          }
          
          // 避免重复
          if (!completions.find(c => c.label === `"${key}"`)) {
            completions.push({
              label,
              type: 'property',
              detail,
              info: description || undefined,
              // 自定义应用逻辑：智能处理引号和默认值
              apply: createPropertyApply(key, resolvedSchema, rootSchema),
            });
          }
        }
      }
    }
  }
  
  return completions;
}

// 从 schema 获取值补全
function getValueCompletions(schema: JsonSchema, _context: CompletionContext): Completion[] {
  const completions: Completion[] = [];
  const locale = getCurrentLocale();
  
  // 枚举值（优先显示）
  if (schema.enum && Array.isArray(schema.enum)) {
    for (const enumValue of schema.enum) {
      const valueStr = typeof enumValue === 'string' ? JSON.stringify(enumValue) : String(enumValue);
      const isString = typeof enumValue === 'string';
      completions.push({
        label: valueStr,
        type: 'value',
        detail: locale === 'zh' ? `枚举值 (${completions.length + 1}/${schema.enum.length})` : `enum (${completions.length + 1}/${schema.enum.length})`,
        // 自定义应用逻辑：智能处理引号
        apply: createValueApply(valueStr, isString),
      });
    }
  }
  
  // 常量值
  if (schema.const !== undefined) {
    const constStr = typeof schema.const === 'string' ? JSON.stringify(schema.const) : String(schema.const);
    const isString = typeof schema.const === 'string';
    completions.push({
      label: constStr,
      type: 'value',
      detail: locale === 'zh' ? '常量值' : 'constant value',
      // 自定义应用逻辑：智能处理引号
      apply: createValueApply(constStr, isString),
    });
  }
  
  // 布尔值
  if (schema.type === 'boolean' || (Array.isArray(schema.type) && schema.type.includes('boolean'))) {
    completions.push({ 
      label: 'true', 
      type: 'value',
      detail: locale === 'zh' ? '布尔值' : 'boolean',
      apply: createValueApply('true', false),
    });
    completions.push({ 
      label: 'false', 
      type: 'value',
      detail: locale === 'zh' ? '布尔值' : 'boolean',
      apply: createValueApply('false', false),
    });
  }
  
  // null 值
  if (schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'))) {
    completions.push({ 
      label: 'null', 
      type: 'value',
      detail: locale === 'zh' ? '空值' : 'null',
      apply: createValueApply('null', false),
    });
  }
  
  // 对象类型：提供对象结构补全（测试用例 4）
  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, JsonSchema>;
      const propCount = Object.keys(props).length;
      
      // 创建一个对象补全项，可以选择展开为完整对象或只插入 {}
      completions.unshift({
        label: '{}',
        type: 'value',
        detail: locale === 'zh' ? `对象 (${propCount} 个属性)` : `object (${propCount} properties)`,
        apply: (view, _completion, from, to) => {
          // 插入空对象
          view.dispatch({
            changes: { from, to, insert: '{}' },
            selection: { anchor: from + 1 }, // 光标在 {} 中间
          });
        },
      });
    }
  }
  
  // 数组类型：提供数组结构补全
  if (schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    completions.unshift({
      label: '[]',
      type: 'value',
      detail: locale === 'zh' ? '数组' : 'array',
      apply: (view, _completion, from, to) => {
        // 插入空数组
        view.dispatch({
          changes: { from, to, insert: '[]' },
          selection: { anchor: from + 1 }, // 光标在 [] 中间
        });
      },
    });
  }
  
  return completions;
}

// 判断当前是否在属性名位置
function isPropertyNameContext(context: CompletionContext): boolean {
  const tree = syntaxTree(context.state);
  const pos = context.pos;
  const node: ReturnType<typeof tree.resolve> = tree.resolve(pos, 1);
  
  console.log('[Autocomplete] isPropertyNameContext 检查:', {
    pos,
    nodeName: node?.name,
    nodeType: node?.type?.name,
    docBefore: context.state.sliceDoc(Math.max(0, pos - 10), pos),
  });
  
  if (!node) {
    console.log('[Autocomplete] isPropertyNameContext: node 为空，检查文本匹配');
    // 即使语法树无法解析，也尝试基于文本判断
    const before = context.state.sliceDoc(Math.max(0, pos - 30), pos);
    const after = context.state.sliceDoc(pos, Math.min(context.state.doc.length, pos + 10));
    console.log('[Autocomplete] 文本检查:', { before, after });
    
    // 检查是否在 { 之后或 , 之后，准备输入属性名
    // 简化逻辑：检查是否以 { 或 , 开头（可能带空白和引号），后面跟非冒号字符
    // 允许的情况：
    // - { 或 {  或 {"  - 对象开始
    // - {xxx 或 {"xxx  - 属性名部分输入
    // - {xxx} 或 {"xxx"} - 属性名输入完成（但还没冒号）
    // - ,xxx 或 ,"xxx  - 逗号后的新属性
    
    // 方法1：简单的正则匹配
    if (before.match(/[{,]\s*"?[^:}]*$/)) {
      console.log('[Autocomplete] 文本匹配：在对象开始或逗号后');
      return true;
    }
    
    // 方法2：更精确的匹配 - 提取 { 或 , 后的内容
    const afterBraceOrComma = before.replace(/^.*([{,])/, '$1');
    if (afterBraceOrComma.startsWith('{') || afterBraceOrComma.startsWith(',')) {
      const content = afterBraceOrComma.substring(1).trim();
      // 检查是否有引号
      const hasQuote = content.startsWith('"') || content.startsWith("'");
      const actualContent = hasQuote ? content.substring(1) : content;
      
      // 如果没有冒号，说明还在输入属性名或值之前
      if (!actualContent.includes(':')) {
        console.log('[Autocomplete] 文本匹配：属性名部分输入，内容:', actualContent);
        return true;
      }
    }
    
    return false;
  }
  
  // 检查是否在属性名中或属性名之后
  let current: ReturnType<typeof tree.resolve> = node;
  while (current) {
    if (current.name === 'PropertyName') {
      return true;
    }
    if (current.name === 'Property') {
      // 在属性内，检查是否在属性名位置
      const propName = current.getChild('PropertyName');
      if (propName && pos >= propName.from && pos <= propName.to + 1) {
        return true;
      }
    }
    const parent = current.parent;
    if (!parent) break;
    current = parent;
  }
  
  // 检查是否在对象内部，准备输入属性名
  // 向上查找 JsonObject 节点
  let searchNode: ReturnType<typeof tree.resolve> = node;
  while (searchNode) {
    if (searchNode.name === 'JsonObject') {
      const before = context.state.sliceDoc(Math.max(0, pos - 20), pos);
      // 检查是否在 { 之后或 , 之后
      if (before.match(/[{,]\s*"?$/)) {
        console.log('[Autocomplete] 在 JsonObject 内，文本匹配成功');
        return true;
      }
      break;
    }
    if (!searchNode.parent) break;
    searchNode = searchNode.parent;
  }
  
  // 如果节点是 JsonText（无效 JSON），也尝试文本匹配
  if (node.name === 'JsonText') {
    console.log('[Autocomplete] 节点是 JsonText，进行文本匹配检查');
    const before = context.state.sliceDoc(Math.max(0, pos - 30), pos);
    const after = context.state.sliceDoc(pos, Math.min(context.state.doc.length, pos + 10));
    console.log('[Autocomplete] JsonText 文本检查:', { before, after });
    
    // 检查是否在 { 之后或 , 之后，准备输入属性名
    // 允许的情况：
    // 1. { 或 {  或 {"  - 对象开始
    // 2. {xxx 或 {"xxx  - 属性名部分输入（xxx 不能包含 :）
    // 3. {xxx} 或 {"xxx"} - 属性名输入完成（但还没冒号）
    // 4. ,xxx 或 ,"xxx  - 逗号后的新属性
    
    // 方法1：简单的正则匹配 - 检查是否以 { 或 , 开头，后面跟非冒号字符
    if (before.match(/[{,]\s*"?[^:}]*$/)) {
      console.log('[Autocomplete] JsonText 文本匹配：在对象开始或逗号后（正则1）');
      return true;
    }
    
    // 方法2：提取最后一个 { 或 , 后的内容
    const lastBraceIndex = Math.max(before.lastIndexOf('{'), before.lastIndexOf(','));
    if (lastBraceIndex >= 0) {
      const afterLastBrace = before.substring(lastBraceIndex + 1).trim();
      // 移除可能的引号
      const content = afterLastBrace.replace(/^["']|["']$/g, '');
      
      // 特殊情况处理：空对象 {} 但光标在外面
      // 允许触发补全，但会在补全时调整插入位置到 {} 内部
      if (content === '}' || content.trim() === '}') {
        // 检查是否是空对象 {}（光标在外面）
        const openIndex = before.lastIndexOf('{');
        const closeIndex = before.lastIndexOf('}');
        if (openIndex >= 0 && closeIndex > openIndex) {
          const betweenBraces = before.substring(openIndex + 1, closeIndex).trim();
          if (betweenBraces === '') {
            // 空对象 {}，光标在外面 - 允许补全，位置会在后面调整
            console.log('[Autocomplete] JsonText 特殊：空对象 {}，光标在外面，允许补全但会调整位置');
            return true;
          }
        }
        // 非空对象，光标在 } 后面，排除
        console.log('[Autocomplete] JsonText 排除：光标在 } 后面，不在对象内部');
        return false;
      }
      
      // 如果没有冒号，说明还在输入属性名
      if (!content.includes(':')) {
        console.log('[Autocomplete] JsonText 文本匹配：在对象开始或逗号后（方法2），内容:', content);
        return true;
      }
    }
    
    // 方法3：额外检查：如果光标正好在 { 或 , 后面（可能没有空格）
    // 测试用例 1, 2, 3：确保在这些情况下都能触发补全
    if (before.endsWith('{') || before.match(/[{,]\s*$/)) {
      console.log('[Autocomplete] JsonText 额外匹配：光标在 { 或 , 后面（测试用例 1, 2）');
      return true;
    }
    
    // 方法4：检查是否在引号内开始输入（测试用例 3）
    if (before.match(/["']$/)) {
      console.log('[Autocomplete] JsonText 额外匹配：在引号内开始（测试用例 3）');
      return true;
    }
  }
  
  return false;
}

// 判断当前是否在属性值位置
function isValueContext(context: CompletionContext): boolean {
  const tree = syntaxTree(context.state);
  const pos = context.pos;
  const node: ReturnType<typeof tree.resolve> = tree.resolve(pos, 1);
  
  console.log('[Autocomplete] isValueContext 检查:', {
    pos,
    nodeName: node?.name,
    docBefore: context.state.sliceDoc(Math.max(0, pos - 10), pos),
    docAfter: context.state.sliceDoc(pos, Math.min(context.state.doc.length, pos + 10)),
  });
  
  if (!node) {
    console.log('[Autocomplete] isValueContext: node 为空，检查文本匹配');
    // 即使语法树无法解析，也尝试基于文本判断
    const before = context.state.sliceDoc(Math.max(0, pos - 30), pos);
    console.log('[Autocomplete] 文本检查:', { before });
    
    // 检查是否在 : 之后（属性值位置）
    if (before.match(/:\s*"?\s*$/)) {
      console.log('[Autocomplete] 文本匹配：在冒号后（值位置）');
      return true;
    }
    return false;
  }
  
  let current: ReturnType<typeof tree.resolve> = node;
  while (current) {
    if (current.name === 'Property') {
      const propName = current.getChild('PropertyName');
      const colon = propName?.nextSibling;
      // 如果在冒号之后
      if (colon && pos > colon.to) {
        return true;
      }
    }
    const parent = current.parent;
    if (!parent) break;
    current = parent;
  }
  
  // 检查是否在对象属性值位置（冒号后，使用语法树判断）
  // 测试用例 4, 5, 6, 7：确保在冒号后能触发值补全
  const before = context.state.sliceDoc(Math.max(0, pos - 30), pos);
  const after = context.state.sliceDoc(pos, Math.min(context.state.doc.length, pos + 10));
  
  // 匹配冒号后的情况：: 或 :  或 :" 等
  if (before.match(/:\s*"?\s*$/)) {
    console.log('[Autocomplete] 文本匹配：在冒号后（测试用例 4, 5, 6, 7）');
    return true;
  }
  
  // 测试用例 4：在冒号后输入 { 也应该触发对象补全
  if (after.startsWith('{') && before.match(/:\s*$/)) {
    console.log('[Autocomplete] 文本匹配：在冒号后输入 {，触发对象补全（测试用例 4）');
    return true;
  }
  
  return false;
}

// JSON Schema 自动补全
export async function jsonSchemaAutocomplete(context: CompletionContext): Promise<CompletionResult | null> {
  // 确保 schema 已加载
  if (!cachedSchema) {
    try {
      // 使用当前设置的 schema 路径
      await getSchema(currentSchemaPath);
    } catch (error) {
      console.error('[Autocomplete] Schema 加载失败:', error);
      console.error('[Autocomplete] Schema 路径:', currentSchemaPath);
      return null;
    }
  }
  
  if (!cachedSchema) {
    console.warn('[Autocomplete] Schema 未加载，路径:', currentSchemaPath);
    return null;
  }
  
  // 测试用例 10：嵌套对象补全 - 获取当前位置的 JSON 路径
  const path = getJsonPath(context.state, context.pos);
  let currentSchema = resolveSchemaPath(cachedSchema, path, cachedSchema);
  
  // 如果路径为空或 schema 解析失败，使用根 schema（用于无效 JSON 的情况）
  if (!currentSchema && path.length === 0) {
    currentSchema = cachedSchema;
    console.log('[Autocomplete] 路径为空，使用根 Schema');
  }
  
  // 判断是在属性名位置还是值位置（即使 schema 为 null 也要判断）
  const isProperty = isPropertyNameContext(context);
  const isValue = isValueContext(context);
  
  console.log('[Autocomplete] 上下文判断:', {
    jsonPath: path, // 测试用例 10：嵌套路径，如 ["dns"]
    isProperty,
    isValue,
    hasCurrentSchema: !!currentSchema,
    pathLength: path.length,
    '路径详情': path.length > 0 ? `嵌套深度 ${path.length}` : '根对象',
  });
  
  if (isProperty) {
    // 属性名补全（测试用例 10：嵌套对象补全）
    // 需要找到父级 schema，用于确定当前对象有哪些可用属性
    let parentSchema: JsonSchema | null = null;
    
    if (path.length > 0) {
      // 测试用例 10：有嵌套路径，使用父级路径找到当前对象的 schema
      // 例如：path = ["dns"]，则需要获取 dns 对象的 properties
      const parentPath = path.slice(0, -1);
      const currentPathSchema = resolveSchemaPath(cachedSchema, parentPath, cachedSchema);
      
      // 获取当前对象的属性 schema（如果当前路径指向一个对象）
      const currentObjectSchema = resolveSchemaPath(cachedSchema, path, cachedSchema);
      
      // 如果当前路径指向一个对象，使用该对象的 properties
      // 否则使用父级 schema
      if (currentObjectSchema && 
          (currentObjectSchema.type === 'object' || 
           (Array.isArray(currentObjectSchema.type) && currentObjectSchema.type.includes('object')))) {
        parentSchema = currentObjectSchema;
        console.log('[Autocomplete] 测试用例 10：在嵌套对象内，使用当前对象的 Schema');
      } else {
        parentSchema = currentPathSchema || cachedSchema;
        console.log('[Autocomplete] 测试用例 10：使用父级路径的 Schema');
      }
    } else {
      // 路径为空，直接使用根 schema（在对象开始位置）
      parentSchema = cachedSchema;
      console.log('[Autocomplete] 路径为空，属性名补全使用根 Schema');
    }
    
    console.log('[Autocomplete] 属性名补全，父级 Schema:', {
      hasSchema: !!parentSchema,
      pathLength: path.length,
      '上下文': path.length > 0 ? '嵌套对象' : '根对象',
    });
    
    if (parentSchema) {
      const completions = getPropertyCompletions(parentSchema, context, cachedSchema);
      console.log('[Autocomplete] 找到', completions.length, '个属性补全项');
      if (completions.length > 0) {
        // 计算补全起始位置
        const line = context.state.doc.lineAt(context.pos);
        const lineText = line.text;
        const lineStart = line.from;
        const beforeCursor = lineText.substring(0, context.pos - lineStart);
        
        // 特殊处理：如果光标在 {} 后面，应该插入到 { 和 } 之间
        // 检查 beforeCursor 是否包含完整的 {}（光标在 } 后面）
        const openBraceIndex = beforeCursor.lastIndexOf('{');
        const closeBraceIndex = beforeCursor.lastIndexOf('}');
        
        // 如果找到 {}，且光标在 } 后面
        if (openBraceIndex >= 0 && closeBraceIndex > openBraceIndex && context.pos > lineStart + closeBraceIndex) {
          const betweenBraces = beforeCursor.substring(openBraceIndex + 1, closeBraceIndex).trim();
          // 如果 {} 之间是空的，则插入到 { 和 } 之间
          if (betweenBraces === '') {
            // from 在 { 后面，to 在 } 前面
            // CodeMirror 的范围是 [from, to)，所以 to = closeBraceIndex 不会包含 } 本身
            const from = lineStart + openBraceIndex + 1; // { 后面
            const to = lineStart + closeBraceIndex;      // } 前面（不包含 }）
            
            console.log('[Autocomplete] 空对象 {} 情况，调整插入位置到内部:', { 
              from, 
              to, 
              pos: context.pos, 
              beforeCursor,
              openBraceIndex,
              closeBraceIndex,
              lineStart,
              '替换范围': `${from} 到 ${to} (内容: "${lineText.substring(openBraceIndex + 1, closeBraceIndex)}")`
            });
            
            return {
              from,
              to,
              options: completions,
            };
          }
        }
        
        // 正常情况：匹配属性名部分
        const match = beforeCursor.match(/["']?([^"',}\]]*)$/);
        const from = match ? context.pos - match[1].length : context.pos;
        
        return {
          from,
          to: context.pos,
          options: completions,
        };
      }
    }
  } else if (isValue) {
    // 值补全
    console.log('[Autocomplete] 值补全，当前 Schema:', !!currentSchema);
    if (!currentSchema) {
      console.log('[Autocomplete] 值补全：当前 Schema 为 null，无法补全');
      return null;
    }
    const completions = getValueCompletions(currentSchema, context);
    console.log('[Autocomplete] 找到', completions.length, '个值补全项');
    if (completions.length > 0) {
      // 计算补全起始位置
      const line = context.state.doc.lineAt(context.pos);
      const beforeCursor = line.text.substring(0, context.pos - line.from);
      const match = beforeCursor.match(/["']?([^"',}\]]*)$/);
      const from = match ? context.pos - match[1].length : context.pos;
      
      return {
        from,
        to: context.pos,
        options: completions,
      };
    }
  }
  
  console.log('[Autocomplete] 无补全项返回');
  return null;
}

/**
 * 自动补全配置接口
 */
export interface AutocompleteConfig {
  enabled: boolean; // 是否启用自动补全
  activateOnTyping: boolean; // 输入时自动触发
  delay: number; // 延迟时间（毫秒）
  schemaPath?: string; // Schema 文件路径（可选）
}

/**
 * 默认自动补全配置
 */
const defaultAutocompleteConfig: AutocompleteConfig = {
  enabled: true,
  activateOnTyping: true,
  delay: 0,
  schemaPath: undefined,
};

/**
 * 创建自动补全扩展（支持配置）
 */
export function createJsonSchemaAutocompleteExtension(config: AutocompleteConfig = defaultAutocompleteConfig): Extension[] {
  console.log('[Autocomplete] createJsonSchemaAutocompleteExtension 被调用:', config);
  
  // 如果禁用，返回空扩展
  if (!config.enabled) {
    console.log('[Autocomplete] 扩展已禁用，返回空数组');
    return [];
  }
  
  // 更新当前使用的 schema 路径（即使为空字符串也要更新）
  if (config.schemaPath !== undefined) {
    const newPath = config.schemaPath || undefined; // 空字符串转为 undefined，使用默认路径
    currentSchemaPath = newPath;
    // 如果路径变化，清除缓存
    if (newPath !== lastSchemaPath) {
      cachedSchema = null;
      schemaLoadPromise = null;
      console.log('[Autocomplete] Schema 路径已更新:', newPath || '默认路径');
    }
  }
  
  console.log('[Autocomplete] 扩展创建完成，配置:', {
    enabled: config.enabled,
    activateOnTyping: config.activateOnTyping,
    delay: config.delay,
    schemaPath: config.schemaPath,
    currentSchemaPath,
  });
  
  const autocompleteExtension = autocompletion({
    activateOnTyping: config.activateOnTyping,
    activateOnTypingDelay: config.delay,
    override: [
      async (context: CompletionContext) => {
        console.log('[Autocomplete] override 函数被触发', {
          pos: context.pos,
          trigger: context.explicit,
          activateOnTyping: config.activateOnTyping,
          delay: config.delay,
        });
        const result = await jsonSchemaAutocomplete(context);
        console.log('[Autocomplete] override 函数返回:', result ? `${result.options.length} 个选项` : 'null');
        return result;
      },
    ],
  });
  
  console.log('[Autocomplete] 创建 autocompletion 扩展:', {
    activateOnTyping: config.activateOnTyping,
    delay: config.delay,
    extensionType: autocompleteExtension.constructor.name,
  });
  
  // 创建回车键触发补全的命令
  const enterAutocompleteCommand = (view: any) => {
    const state = view.state;
    const pos = state.selection.main.head;
    
    // 创建临时的 CompletionContext 来重用现有的上下文判断逻辑
    // 使用类型断言来创建最小化的 CompletionContext
    const tempContext = {
      state,
      pos,
      explicit: true, // 标记为显式触发
      matchBefore: '',
      tokenBefore: () => null,
      aborted: false,
      addEventListener: () => () => {},
    } as unknown as CompletionContext;
    
    // 使用已有的上下文判断函数
    const isProperty = isPropertyNameContext(tempContext);
    const isValue = isValueContext(tempContext);
    
    console.log('[Autocomplete] Enter 键按下，检查是否应该触发补全:', {
      pos,
      isProperty,
      isValue,
      '应该触发': isProperty || isValue,
    });
    
    // 如果满足属性名或属性值的上下文，触发补全
    if (isProperty || isValue) {
      console.log('[Autocomplete] Enter 键触发补全:', {
        isProperty,
        isValue,
        '触发原因': isProperty ? '属性名位置' : '属性值位置',
      });
      
      // 使用 CodeMirror 的 startCompletion 命令触发补全
      // 这会创建一个新的 CompletionContext 并调用 override 函数
      return startCompletion(view);
    }
    
    console.log('[Autocomplete] Enter 键：不满足补全条件，执行默认行为（插入换行）');
    // 返回 false 表示不处理，让默认的 Enter 行为执行（插入换行）
    return false;
  };
  
  // 创建 keymap 扩展，绑定 Enter 键
  const enterKeymapExtension = keymap.of([
    {
      key: 'Enter',
      run: enterAutocompleteCommand,
    },
  ]);
  
  return [autocompleteExtension, enterKeymapExtension];
}

/**
 * 导出自动补全扩展（向后兼容的默认导出）
 */
export function jsonSchemaAutocompleteExtension() {
  return createJsonSchemaAutocompleteExtension();
}

/**
 * 清理自动补全 Schema 缓存（用于配置变化时的重建）
 */
export function clearAutocompleteSchemaCache() {
  cachedSchema = null;
  schemaLoadPromise = null;
  lastSchemaPath = null;
  currentSchemaPath = undefined;
}

