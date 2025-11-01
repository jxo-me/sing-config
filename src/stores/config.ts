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
  
  function compareObjects(oldObj: any, newObj: any, path: string = '') {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];
      
      if (!(key in oldObj)) {
        // 新增的字段
        const diff: DiffItem = {
          path: currentPath,
          oldValue: undefined,
          newValue: newVal,
          type: 'added',
          category: 'addition'
        };
        diffs.push(classifyDiff(diff));
      } else if (!(key in newObj)) {
        // 删除的字段
        const diff: DiffItem = {
          path: currentPath,
          oldValue: oldVal,
          newValue: undefined,
          type: 'removed',
          category: 'deletion'
        };
        diffs.push(classifyDiff(diff));
      } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        // 数组比较
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          const diff: DiffItem = {
            path: currentPath,
            oldValue: oldVal,
            newValue: newVal,
            type: 'modified',
            category: oldVal.length !== newVal.length ? 'modification' : 'reorder'
          };
          diffs.push(classifyDiff(diff));
        }
      } else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
        // 递归比较对象
        compareObjects(oldVal, newVal, currentPath);
      } else if (oldVal !== newVal) {
        // 值已修改
        const diff: DiffItem = {
          path: currentPath,
          oldValue: oldVal,
          newValue: newVal,
          type: 'modified',
          category: 'modification'
        };
        diffs.push(classifyDiff(diff));
      }
    }
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
