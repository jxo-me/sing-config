<script setup lang="ts">
import { computed } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { t, currentLocale } = useI18n();

const log = computed(() => currentConfig.value.log as Record<string, unknown> | undefined || {});

async function updateLogField(field: string, value: unknown) {
  await setConfig({
    ...currentConfig.value,
    log: { ...log.value, [field]: value },
  });
}
</script>

<template>
  <div class="log-form">
    <h3>{{ currentLocale === 'zh' ? '日志配置' : 'Log Configuration' }}</h3>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '日志级别' : 'Log Level' }}</label>
      <select :value="log.level || 'info'" @change="updateLogField('level', ($event.target as HTMLSelectElement).value)">
        <option value="trace">{{ currentLocale === 'zh' ? 'Trace - 跟踪' : 'Trace' }}</option>
        <option value="debug">{{ currentLocale === 'zh' ? 'Debug - 调试' : 'Debug' }}</option>
        <option value="info">{{ currentLocale === 'zh' ? 'Info - 信息' : 'Info' }}</option>
        <option value="warn">{{ currentLocale === 'zh' ? 'Warn - 警告' : 'Warn' }}</option>
        <option value="error">{{ currentLocale === 'zh' ? 'Error - 错误' : 'Error' }}</option>
        <option value="fatal">{{ currentLocale === 'zh' ? 'Fatal - 致命' : 'Fatal' }}</option>
        <option value="panic">{{ currentLocale === 'zh' ? 'Panic - 崩溃' : 'Panic' }}</option>
        <option value="">{{ currentLocale === 'zh' ? '默认 (Info)' : 'Default (Info)' }}</option>
      </select>
      <p class="field-hint">{{ currentLocale === 'zh' ? '设置日志输出级别，级别越高输出的日志越少' : 'Set log output level, higher level means less log output' }}</p>
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '日志输出路径' : 'Log Output Path' }}</label>
      <input
        :value="log.output || ''"
        @input="updateLogField('output', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="currentLocale === 'zh' ? '留空则输出到标准输出 (stdout)' : 'Leave empty for stdout'"
      />
      <p class="field-hint">{{ currentLocale === 'zh' ? '文件路径，如: ./sing-box.log' : 'File path, e.g.: ./sing-box.log' }}</p>
    </div>
    
    <div class="field-group checkbox">
      <label>
        <input
          type="checkbox"
          :checked="log.timestamp || false"
          @change="updateLogField('timestamp', ($event.target as HTMLInputElement).checked)"
        />
        {{ currentLocale === 'zh' ? '包含时间戳' : 'Include Timestamp' }}
      </label>
    </div>
    
    <div class="field-group checkbox">
      <label>
        <input
          type="checkbox"
          :checked="log.disable_colors || false"
          @change="updateLogField('disable_colors', ($event.target as HTMLInputElement).checked)"
        />
        {{ currentLocale === 'zh' ? '禁用颜色' : 'Disable Colors' }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.log-form { padding: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.field-hint { font-size: 12px; color: var(--text-secondary, #666); margin: 0; }
input[type="text"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
input[type="checkbox"] { cursor: pointer; }
</style>

