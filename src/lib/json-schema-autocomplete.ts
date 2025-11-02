import { CompletionContext, CompletionResult, Completion, autocompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { loadSchema } from './schema';
import { getCurrentLocale } from './codemirror-json-schema';

type JsonSchema = Record<string, unknown>;

let cachedSchema: JsonSchema | null = null;
let schemaLoadPromise: Promise<JsonSchema> | null = null;

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

// 根据类型获取默认值
function getDefaultValueByType(type: string): string {
  switch (type) {
    case 'string':
      return '""'; // 空字符串
    case 'number':
      return '0'; // 数字 0
    case 'integer':
      return '0'; // 整数 0
    case 'boolean':
      return 'false'; // 布尔值 false
    case 'null':
      return 'null'; // null
    case 'array':
      return '[]'; // 空数组
    case 'object':
      return '{}'; // 空对象
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
    
    // 如果提供了 schema，自动插入默认值
    if (propSchema && rootSchema) {
      const defaultValue = getDefaultValue(propSchema, rootSchema);
      // 在冒号后插入默认值（如果不是空对象/空数组的话）
      if (defaultValue !== '{}' && defaultValue !== '[]') {
        insertText += `: ${defaultValue}`;
      }
    }
    
    // 插入文本
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
    });
  };
}

// 创建智能值补全应用函数
function createValueApply(valueStr: string, isString: boolean): (view: any, _completion: any, from: number, to: number) => void {
  return (view, _completion, from, to) => {
    const state = view.state;
    
    let insertText: string;
    
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
        // 如果已在字符串内，移除 valueStr 中的引号
        insertText = valueStr.replace(/^"|"$/g, '');
      } else {
        // 如果不在字符串内，直接使用 JSON.stringify 的结果（已包含引号）
        insertText = valueStr;
      }
    } else {
      // 非字符串值：直接插入（如 true, false, null, 数字）
      insertText = valueStr;
    }
    
    // 插入文本
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
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
  
  // 枚举值
  if (schema.enum && Array.isArray(schema.enum)) {
    for (const enumValue of schema.enum) {
      const valueStr = typeof enumValue === 'string' ? JSON.stringify(enumValue) : String(enumValue);
      const isString = typeof enumValue === 'string';
      completions.push({
        label: valueStr,
        type: 'value',
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
  if (schema.type === 'boolean') {
    completions.push({ 
      label: 'true', 
      type: 'value',
      apply: createValueApply('true', false),
    });
    completions.push({ 
      label: 'false', 
      type: 'value',
      apply: createValueApply('false', false),
    });
  }
  
  // null 值
  if (schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'))) {
    completions.push({ 
      label: 'null', 
      type: 'value',
      apply: createValueApply('null', false),
    });
  }
  
  return completions;
}

// 判断当前是否在属性名位置
function isPropertyNameContext(context: CompletionContext): boolean {
  const tree = syntaxTree(context.state);
  const pos = context.pos;
  const node: ReturnType<typeof tree.resolve> = tree.resolve(pos, 1);
  
  if (!node) return false;
  
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
  if (node.name === 'JsonObject' || node.parent?.name === 'JsonObject') {
    const before = context.state.sliceDoc(Math.max(0, pos - 20), pos);
    // 检查是否在 { 之后或 , 之后
    if (before.match(/[{,]\s*$/)) {
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
  
  if (!node) return false;
  
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
  
  return false;
}

// JSON Schema 自动补全
export async function jsonSchemaAutocomplete(context: CompletionContext): Promise<CompletionResult | null> {
  // 确保 schema 已加载
  if (!cachedSchema) {
    try {
      await getSchema();
    } catch {
      return null;
    }
  }
  
  if (!cachedSchema) {
    return null;
  }
  
  const path = getJsonPath(context.state, context.pos);
  const currentSchema = resolveSchemaPath(cachedSchema, path, cachedSchema);
  
  if (!currentSchema) {
    return null;
  }
  
  // 判断是在属性名位置还是值位置
  if (isPropertyNameContext(context)) {
    // 属性名补全
    // 需要找到父级 schema
    const parentPath = path.slice(0, -1);
    const parentSchema = parentPath.length > 0 
      ? resolveSchemaPath(cachedSchema, parentPath, cachedSchema) 
      : cachedSchema;
    
    if (parentSchema) {
      const completions = getPropertyCompletions(parentSchema, context, cachedSchema);
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
  } else if (isValueContext(context)) {
    // 值补全
    const completions = getValueCompletions(currentSchema, context);
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
  
  return null;
}

// 导出自动补全扩展
export function jsonSchemaAutocompleteExtension() {
  return autocompletion({
    override: [
      async (context: CompletionContext) => {
        return await jsonSchemaAutocomplete(context);
      },
    ],
  });
}

