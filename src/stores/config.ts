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

export function loadFromText(text: string) {
  const parsed = JSON.parse(text);
  isDirty.value = false; // 加载时重置脏标记
  setOriginalConfig(parsed); // 保存原始配置
  return setConfig(parsed);
}

export function toPrettyJson(): string {
  return JSON.stringify(currentConfig.value, null, 2);
}

export function setLastSavedPath(path: string | null) {
  lastSavedPath.value = path;
  isDirty.value = false;
  // 保存后更新原始配置
  setOriginalConfig(currentConfig.value);
}

export function getConfigDiff(): Array<{ path: string; oldValue: unknown; newValue: unknown; type: 'modified' | 'added' | 'removed' }> {
  const diffs: Array<{ path: string; oldValue: unknown; newValue: unknown; type: 'modified' | 'added' | 'removed' }> = [];
  
  function compareObjects(oldObj: any, newObj: any, path: string = '') {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];
      
      if (!(key in oldObj)) {
        // 新增的字段
        diffs.push({ path: currentPath, oldValue: undefined, newValue: newVal, type: 'added' });
      } else if (!(key in newObj)) {
        // 删除的字段
        diffs.push({ path: currentPath, oldValue: oldVal, newValue: undefined, type: 'removed' });
      } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        // 数组比较（简化版：只比较长度和基本类型元素）
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          diffs.push({ path: currentPath, oldValue: oldVal, newValue: newVal, type: 'modified' });
        }
      } else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
        // 递归比较对象
        compareObjects(oldVal, newVal, currentPath);
      } else if (oldVal !== newVal) {
        // 值已修改
        diffs.push({ path: currentPath, oldValue: oldVal, newValue: newVal, type: 'modified' });
      }
    }
  }
  
  compareObjects(originalConfig.value, currentConfig.value);
  return diffs;
}

export const configDiff = computed(() => getConfigDiff());

export function setLastOpenedPath(path: string | null) {
  lastOpenedPath.value = path;
}
