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
   */
  function compareArrays(oldArr: any[], newArr: any[], path: string): DiffItem[] {
    const diffs: DiffItem[] = [];
    
    // 如果数组完全相等，直接返回
    if (JSON.stringify(oldArr) === JSON.stringify(newArr)) {
      return diffs;
    }
    
    // 使用索引比较：识别新增、删除和修改
    const maxLength = Math.max(oldArr.length, newArr.length);
    
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${path}[${i}]`;
      const oldItem = oldArr[i];
      const newItem = newArr[i];
      
      if (i >= oldArr.length) {
        // 新增的元素
        diffs.push(classifyDiff({
          path: itemPath,
          oldValue: undefined,
          newValue: newItem,
          type: 'added',
          category: 'addition'
        }));
      } else if (i >= newArr.length) {
        // 删除的元素
        diffs.push(classifyDiff({
          path: itemPath,
          oldValue: oldItem,
          newValue: undefined,
          type: 'removed',
          category: 'deletion'
        }));
      } else {
        // 检查元素是否修改
        if (Array.isArray(oldItem) && Array.isArray(newItem)) {
          // 嵌套数组递归比较
          const nestedDiffs = compareArrays(oldItem, newItem, itemPath);
          diffs.push(...nestedDiffs);
        } else if (typeof oldItem === 'object' && oldItem !== null && typeof newItem === 'object' && newItem !== null) {
          // 嵌套对象递归比较 - 使用内部比较函数收集差异
          const nestedDiffs = compareObjectsInternal(oldItem, newItem, itemPath);
          diffs.push(...nestedDiffs);
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
    
    return diffs;
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

