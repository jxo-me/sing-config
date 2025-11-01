import { ref, computed } from 'vue';
import { validateConfig, ValidationResult } from '../lib/validation';

export const currentConfig = ref<Record<string, unknown>>({});
export const originalConfig = ref<Record<string, unknown>>({});
export const isDirty = ref(false);
export const lastValidation = ref<ValidationResult>({ valid: true, errors: [] });
export const lastSavedPath = ref<string | null>(null);
export const lastOpenedPath = ref<string | null>(null);

export const errorCount = computed(() => lastValidation.value.errors.length);

export async function setConfig(newConfig: Record<string, unknown>) {
  currentConfig.value = newConfig;
  isDirty.value = true;
  await runValidation();
}

export function setOriginalConfig(config: Record<string, unknown>) {
  originalConfig.value = JSON.parse(JSON.stringify(config)); // 深拷贝
  isDirty.value = false;
}

export async function runValidation() {
  lastValidation.value = await validateConfig(currentConfig.value);
}

/**
 * 从文本加载配置（仅用于打开文件等明确操作）
 * 会更新原始配置作为基准点
 */
export function loadFromText(text: string) {
  const parsed = JSON.parse(text);
  isDirty.value = false; // 加载时重置脏标记
  setOriginalConfig(parsed); // 保存原始配置作为差异计算的基准点
  return setConfig(parsed);
}

/**
 * 仅同步编辑器内容到配置，不更新原始配置
 * 用于 JSON 模式下的实时编辑同步
 */
export function syncEditorContentToConfig(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    currentConfig.value = parsed;
    isDirty.value = true;
    // 异步运行校验，不阻塞
    runValidation().catch(() => {
      // 忽略校验错误，编辑器会自己处理
    });
    return true;
  } catch (e) {
    // JSON 解析错误，返回 false，但不抛出异常
    // 允许用户继续输入
    return false;
  }
}

export function toPrettyJson(): string {
  return JSON.stringify(currentConfig.value, null, 2);
}

export function toCompactJson(): string {
  return JSON.stringify(currentConfig.value);
}

export function setLastSavedPath(path: string | null) {
  lastSavedPath.value = path;
  isDirty.value = false;
  // 保存后更新原始配置
  setOriginalConfig(currentConfig.value);
}

export interface DiffItem {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'modified' | 'added' | 'removed';
  severity?: 'minor' | 'major' | 'critical';
  category?: 'addition' | 'deletion' | 'modification' | 'reorder';
}

/**
 * 计算配置差异
 * 返回差异列表，包含级别分类和类型信息
 */
export function getConfigDiff(): DiffItem[] {
  const diffs: DiffItem[] = [];
  
  /**
   * 比较数组，识别新增、删除和修改的元素
   * 使用基于内容的匹配算法，避免索引变化导致的误判
   * 参考 Git diff 算法：匹配相同/相似的元素，只标记真正的变更
   */
  function compareArrays(oldArr: any[], newArr: any[], path: string): DiffItem[] {
    const diffs: DiffItem[] = [];
    
    // 如果数组完全相等，直接返回
    if (JSON.stringify(oldArr) === JSON.stringify(newArr)) {
      return diffs;
    }
    
    // 使用基于内容的匹配算法
    // 第一步：找到匹配的元素对（相同的元素）
    const matches = findMatchingElements(oldArr, newArr);
    
    // 第二步：处理匹配的元素（可能是修改）
    for (const match of matches) {
      if (match.oldIndex !== -1 && match.newIndex !== -1) {
        const oldItem = oldArr[match.oldIndex];
        const newItem = newArr[match.newIndex];
        const itemPath = `${path}[${match.newIndex}]`;
        
        // 检查是否真的修改了
        if (Array.isArray(oldItem) && Array.isArray(newItem)) {
          // 嵌套数组递归比较
          const nestedDiffs = compareArrays(oldItem, newItem, itemPath);
          diffs.push(...nestedDiffs);
        } else if (typeof oldItem === 'object' && oldItem !== null && typeof newItem === 'object' && newItem !== null) {
          // 嵌套对象递归比较
          const nestedDiffs = compareObjectsInternal(oldItem, newItem, itemPath);
          if (nestedDiffs.length > 0) {
            diffs.push(...nestedDiffs);
          }
        } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          // 值修改
          diffs.push(classifyDiff({
            path: itemPath,
            oldValue: oldItem,
            newValue: newItem,
            type: 'modified',
            category: 'modification'
          }));
        }
      }
    }
    
    // 第三步：处理未匹配的旧元素（删除）
    const matchedOldIndices = new Set(matches.filter(m => m.oldIndex !== -1).map(m => m.oldIndex));
    for (let i = 0; i < oldArr.length; i++) {
      if (!matchedOldIndices.has(i)) {
        diffs.push(classifyDiff({
          path: `${path}[${i}]`,
          oldValue: oldArr[i],
          newValue: undefined,
          type: 'removed',
          category: 'deletion'
        }));
      }
    }
    
    // 第四步：处理未匹配的新元素（新增）
    const matchedNewIndices = new Set(matches.filter(m => m.newIndex !== -1).map(m => m.newIndex));
    for (let i = 0; i < newArr.length; i++) {
      if (!matchedNewIndices.has(i)) {
        diffs.push(classifyDiff({
          path: `${path}[${i}]`,
          oldValue: undefined,
          newValue: newArr[i],
          type: 'added',
          category: 'addition'
        }));
      }
    }
    
    return diffs;
  }
  
  /**
   * 找到两个数组中匹配的元素
   * 返回匹配对数组，每个匹配包含 { oldIndex, newIndex }
   * 使用启发式算法：优先匹配相同的内容
   */
  function findMatchingElements(oldArr: any[], newArr: any[]): Array<{ oldIndex: number; newIndex: number }> {
    const matches: Array<{ oldIndex: number; newIndex: number }> = [];
    const usedOldIndices = new Set<number>();
    const usedNewIndices = new Set<number>();
    
    // 第一步：精确匹配（JSON 字符串完全相同）
    for (let i = 0; i < oldArr.length; i++) {
      if (usedOldIndices.has(i)) continue;
      
      const oldStr = JSON.stringify(oldArr[i]);
      for (let j = 0; j < newArr.length; j++) {
        if (usedNewIndices.has(j)) continue;
        
        const newStr = JSON.stringify(newArr[j]);
        if (oldStr === newStr) {
          matches.push({ oldIndex: i, newIndex: j });
          usedOldIndices.add(i);
          usedNewIndices.add(j);
          break;
        }
      }
    }
    
    // 第二步：相似匹配（对象结构相似，尝试匹配）
    // 对于对象类型，如果主要属性相同，认为是同一个元素
    for (let i = 0; i < oldArr.length; i++) {
      if (usedOldIndices.has(i)) continue;
      
      const oldItem = oldArr[i];
      if (typeof oldItem !== 'object' || oldItem === null || Array.isArray(oldItem)) {
        continue; // 只匹配对象类型
      }
      
      // 尝试找到最相似的新元素
      let bestMatch: { index: number; similarity: number } | null = null;
      
      for (let j = 0; j < newArr.length; j++) {
        if (usedNewIndices.has(j)) continue;
        
        const newItem = newArr[j];
        if (typeof newItem !== 'object' || newItem === null || Array.isArray(newItem)) {
          continue;
        }
        
        // 计算相似度：检查有多少相同的键和值
        const similarity = calculateObjectSimilarity(oldItem, newItem);
        if (similarity > 0.5 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { index: j, similarity };
        }
      }
      
      if (bestMatch) {
        matches.push({ oldIndex: i, newIndex: bestMatch.index });
        usedOldIndices.add(i);
        usedNewIndices.add(bestMatch.index);
      }
    }
    
    return matches;
  }
  
  /**
   * 计算两个对象的相似度（0-1）
   */
  function calculateObjectSimilarity(obj1: any, obj2: any): number {
    const keys1 = new Set(Object.keys(obj1));
    const keys2 = new Set(Object.keys(obj2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    if (allKeys.size === 0) return 1;
    
    let matchCount = 0;
    let totalKeys = allKeys.size;
    
    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];
      
      if (!(key in obj1) || !(key in obj2)) {
        // 键只在一个对象中存在
        continue;
      }
      
      // 如果值相同或相似
      if (JSON.stringify(val1) === JSON.stringify(val2)) {
        matchCount++;
      } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        // 递归计算嵌套对象的相似度
        const nestedSimilarity = calculateObjectSimilarity(val1, val2);
        matchCount += nestedSimilarity;
      }
    }
    
    return totalKeys > 0 ? matchCount / totalKeys : 0;
  }
  
  /**
   * 内部对象比较函数，返回差异数组（用于数组元素中的对象比较）
   */
  function compareObjectsInternal(oldObj: any, newObj: any, path: string = ''): DiffItem[] {
    const internalDiffs: DiffItem[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];
      
      if (!(key in oldObj)) {
        internalDiffs.push(classifyDiff({
          path: currentPath,
          oldValue: undefined,
          newValue: newVal,
          type: 'added',
          category: 'addition'
        }));
      } else if (!(key in newObj)) {
        internalDiffs.push(classifyDiff({
          path: currentPath,
          oldValue: oldVal,
          newValue: undefined,
          type: 'removed',
          category: 'deletion'
        }));
      } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        const arrayDiffs = compareArrays(oldVal, newVal, currentPath);
        internalDiffs.push(...arrayDiffs);
      } else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
        const nestedDiffs = compareObjectsInternal(oldVal, newVal, currentPath);
        internalDiffs.push(...nestedDiffs);
      } else if (oldVal !== newVal) {
        internalDiffs.push(classifyDiff({
          path: currentPath,
          oldValue: oldVal,
          newValue: newVal,
          type: 'modified',
          category: 'modification'
        }));
      }
    }
    
    return internalDiffs;
  }
  
  /**
   * 对象比较函数，直接修改 diffs 数组（用于顶层比较）
   */
  function compareObjects(oldObj: any, newObj: any, path: string = '') {
    const objectDiffs = compareObjectsInternal(oldObj, newObj, path);
    diffs.push(...objectDiffs);
  }
  
  compareObjects(originalConfig.value, currentConfig.value);
  return diffs;
}

/**
 * 对差异进行分类和级别评估
 * 参考行业最佳实践：根据影响范围和大小评估重要性
 */
function classifyDiff(diff: DiffItem): DiffItem {
  if (diff.type === 'removed') {
    // 删除操作通常比较重要
    diff.severity = 'major';
    return diff;
  }
  
  if (diff.type === 'added') {
    const newValStr = JSON.stringify(diff.newValue || '');
    // 大对象或数组的添加视为重要变更
    if (newValStr.length > 500) {
      diff.severity = 'major';
    } else if (newValStr.length > 100) {
      diff.severity = 'minor';
    } else {
      diff.severity = 'minor';
    }
    return diff;
  }
  
  if (diff.type === 'modified') {
    const oldValStr = JSON.stringify(diff.oldValue || '');
    const newValStr = JSON.stringify(diff.newValue || '');
    const sizeChange = Math.abs(oldValStr.length - newValStr.length);
    
    // 根据变更大小评估
    if (sizeChange > 1000 || (diff.category === 'reorder' && oldValStr.length > 500)) {
      diff.severity = 'major';
    } else if (sizeChange > 100) {
      diff.severity = 'minor';
    } else {
      diff.severity = 'minor';
    }
    
    return diff;
  }
  
  return diff;
}

export const configDiff = computed(() => getConfigDiff());

export function setLastOpenedPath(path: string | null) {
  lastOpenedPath.value = path;
}

