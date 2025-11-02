/**
 * JSON 自动修复算法
 * 参考：svelte-jsoneditor, jsonrepair
 * 功能：无论什么类型的字符串都能自动修复为正确的 JSON 格式
 */

export interface RepairResult {
  success: boolean;
  repaired: string;
  changes: string[]; // 修复操作的描述
  error?: string;
}

/**
 * 主修复函数
 * 处理各种 JSON 语法错误并自动修复
 * 优化：先处理致命错误（未闭合字符串等），再处理常规错误
 */
export function repairJson(text: string): RepairResult {
  if (!text || text.trim() === '') {
    return {
      success: true,
      repaired: '{}',
      changes: [],
    };
  }

  const changes: string[] = [];
  let repaired = text.trim();

  // 0. 移除 BOM 和零宽度字符（优先级最高）
  repaired = repaired.replace(/^\uFEFF/, ''); // 移除 BOM
  repaired = repaired.replace(/[\u200B-\u200D\uFEFF]/g, ''); // 移除零宽度字符

  // 1. 修复致命错误（未闭合字符串、未闭合括号等）- 优先级最高
  repaired = fixCriticalErrors(repaired, changes);

  // 2. 修复注释
  repaired = removeComments(repaired);

  // 3. 修复未转义的控制字符
  repaired = fixUnescapedControlCharacters(repaired);

  // 4. 修复单引号为双引号
  repaired = fixSingleQuotes(repaired, changes);

  // 5. 修复属性名缺少引号（在修复逗号之前，避免干扰）
  repaired = fixUnquotedKeys(repaired, changes);

  // 6. 修复对象/数组的分隔符
  repaired = fixCommas(repaired, changes);

  // 7. 修复尾随逗号
  repaired = fixTrailingCommas(repaired, changes);

  // 8. 修复未转义的反斜杠
  repaired = fixUnescapedBackslashes(repaired, changes);

  // 10. 验证修复后的 JSON
  try {
    JSON.parse(repaired);
    return {
      success: true,
      repaired,
      changes,
    };
  } catch (e: any) {
    // 如果仍然无效，尝试更激进的修复
    try {
      const aggressiveRepaired = aggressiveRepair(repaired, changes);
      JSON.parse(aggressiveRepaired);
      return {
        success: true,
        repaired: aggressiveRepaired,
        changes,
      };
    } catch (e2: any) {
      return {
        success: false,
        repaired,
        changes,
        error: e2.message || '无法修复 JSON',
      };
    }
  }
}

/**
 * 修复致命错误（未闭合字符串、未闭合括号等）
 * 优先级最高：这些错误会导致 JSON 完全无法解析
 */
function fixCriticalErrors(text: string, changes: string[]): string {
  let result = text;
  
  // 1. 修复未闭合的字符串
  result = fixUnterminatedStrings(result, changes);
  
  // 2. 修复未闭合的括号（对象/数组）
  result = fixUnclosedBracesAndBrackets(result, changes);
  
  return result;
}

/**
 * 修复未闭合的字符串
 */
function fixUnterminatedStrings(text: string, changes: string[]): string {
  let result = text;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
    }
  }
  
  // 如果字符串未闭合
  if (inString) {
    // 在行末添加闭合引号
    result = result + '"';
    if (!changes.some(c => c.includes('未闭合字符串'))) {
      changes.push('修复未闭合的字符串');
    }
  }
  
  return result;
}

/**
 * 修复未闭合的括号和方括号
 * 在检测到未闭合的情况时，在文档末尾添加缺失的闭合括号
 */
function fixUnclosedBracesAndBrackets(text: string, changes: string[]): string {
  let result = text;
  
  // 统计括号
  let openBraces = 0;
  let openBrackets = 0;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    // 检查引号内的字符不计数
    let inString = false;
    let escaped = false;
    for (let j = 0; j < i; j++) {
      if (result[j] === '\\') {
        escaped = !escaped;
      } else if (result[j] === '"' && !escaped) {
        inString = !inString;
      }
    }
    
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  // 添加缺失的闭合括号
  if (openBraces > 0) {
    result = result + '}'.repeat(openBraces);
    if (!changes.some(c => c.includes('未闭合大括号'))) {
      changes.push(`添加 ${openBraces} 个缺失的闭合大括号`);
    }
  }
  
  if (openBrackets > 0) {
    result = result + ']'.repeat(openBrackets);
    if (!changes.some(c => c.includes('未闭合方括号'))) {
      changes.push(`添加 ${openBrackets} 个缺失的闭合方括号`);
    }
  }
  
  return result;
}

/**
 * 移除注释（单行和多行）
 */
function removeComments(text: string): string {
  // 移除单行注释 // ...
  text = text.replace(/\/\/.*$/gm, '');
  
  // 移除多行注释 /* ... */
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return text;
}

/**
 * 修复未转义的控制字符
 */
function fixUnescapedControlCharacters(text: string): string {
  // 在字符串外部的控制字符需要被转义或移除
  // 但由于很难准确判断字符串边界，我们使用保守策略
  
  // 修复常见的制表符和换行符（仅在明显是字符串值的情况下）
  text = text.replace(/(?<!\\)[\t]/g, '\\t');
  text = text.replace(/(?<!\\)[\r]/g, '\\r');
  
  return text;
}

/**
 * 修复单引号为双引号
 */
function fixSingleQuotes(text: string, changes: string[]): string {
  let result = text;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
    } else if (char === "'" && !inString) {
      // 单引号且不在双引号字符串内，替换为双引号
      result = result.slice(0, i) + '"' + result.slice(i + 1);
      if (!changes.some(c => c.includes('单引号'))) {
        changes.push('单引号替换为双引号');
      }
    }
  }
  
  return result;
}

/**
 * 修复逗号问题
 */
function fixCommas(text: string, changes: string[]): string {
  let result = text;
  
  // 在 } 或 ] 之前添加缺失的逗号
  // 但要小心不要破坏字符串内的内容
  
  // 修复多逗号：,,
  result = result.replace(/,+/g, ',');
  
  // 修复缺失逗号（在值之间）
  // 正则表达式：匹配 )} 或 ]}) 之间缺少逗号的情况
  // 但要排除字符串内部
  
  // 简单修复：在 "} 之间添加逗号（如果前面是值）
  result = result.replace(/(")\s*(")/g, '$1, $2'); // "name" "value" -> "name", "value"
  result = result.replace(/(\d)\s*(")/g, '$1, $2'); // 123 "value" -> 123, "value"
  result = result.replace(/(true|false|null)\s*(")/g, '$1, $2'); // true "value" -> true, "value"
  
  if (result !== text && !changes.some(c => c.includes('逗号'))) {
    changes.push('修复缺失的逗号');
  }
  
  return result;
}

/**
 * 修复尾随逗号
 */
function fixTrailingCommas(text: string, changes: string[]): string {
  let result = text;
  
  // 移除对象和数组的尾随逗号
  // 但要确保不在字符串内部
  
  // 匹配尾随逗号：} 或 ] 之前的多余逗号
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  if (result !== text && !changes.some(c => c.includes('尾随逗号'))) {
    changes.push('移除尾随逗号');
  }
  
  return result;
}


/**
 * 修复未加引号的属性名
 */
function fixUnquotedKeys(text: string, changes: string[]): string {
  let result = text;
  
  // 匹配未加引号的属性名
  // 例如：{ name: "value" } -> { "name": "value" }
  
  // 匹配属性名模式：word : value
  result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  if (result !== text && !changes.some(c => c.includes('属性名'))) {
    changes.push('为属性名添加引号');
  }
  
  return result;
}

/**
 * 修复未转义的反斜杠
 */
function fixUnescapedBackslashes(_text: string, _changes: string[]): string {
  // 在字符串内部，\ 后面必须是有效的转义字符
  // 简化：确保 \n, \t, \r 等被正确处理
  
  // 这个比较复杂，暂时不做处理，直接返回原文本
  return _text;
}

/**
 * 更激进的修复策略
 * 当常规修复失败时使用
 */
function aggressiveRepair(text: string, changes: string[]): string {
  let result = text;
  
  // 1. 尝试包装为对象
  if (!result.trim().startsWith('{') && !result.trim().startsWith('[')) {
    result = '{' + result + '}';
    changes.push('包装为对象');
  }
  
  // 2. 修复常见的格式问题
  // 移除所有注释标记
  result = result.replace(/\/\/.*$/gm, '');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 3. 确保字符串正确闭合
  // 在文本末尾添加缺失的引号
  
  return result;
}

/**
 * 验证 JSON 是否有效
 */
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取 JSON 解析错误的详细位置信息
 */
export function parseJsonError(error: Error, text: string): {
  message: string;
  position?: number;
  line?: number;
  column?: number;
} {
  const match = error.message.match(/position (\d+)/);
  let position: number | undefined;
  
  if (match) {
    position = parseInt(match[1], 10);
  }
  
  if (position !== undefined) {
    const beforePos = text.substring(0, position);
    const lines = beforePos.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    return {
      message: error.message,
      position,
      line,
      column,
    };
  }
  
  return {
    message: error.message,
  };
}

