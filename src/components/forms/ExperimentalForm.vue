<script setup lang="ts">
import { computed } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { currentLocale } = useI18n();

const experimental = computed(() => currentConfig.value.experimental as Record<string, unknown> | undefined || {});

async function updateExperimentalField(field: string, value: unknown) {
  await setConfig({
    ...currentConfig.value,
    experimental: { ...experimental.value, [field]: value },
  });
}
</script>

<template>
  <div class="experimental-form">
    <h3>{{ currentLocale === 'zh' ? '实验性配置' : 'Experimental Configuration' }}</h3>
    
    <div class="warning-box">
      <strong>⚠️ {{ currentLocale === 'zh' ? '警告' : 'Warning' }}</strong>
      <p>{{ currentLocale === 'zh' ? '实验性功能可能不稳定，使用前请仔细阅读文档。' : 'Experimental features may be unstable. Please read the documentation carefully before use.' }}</p>
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '缓存文件路径' : 'Cache File Path' }}</label>
      <input
        :value="experimental.cache_file || ''"
        @input="updateExperimentalField('cache_file', ($event.target as HTMLInputElement).value || undefined)"
        type="text"
        placeholder="./cache.json"
      />
      <p class="field-hint">{{ currentLocale === 'zh' ? '用于缓存某些数据的文件路径' : 'File path for caching certain data' }}</p>
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? 'Clash API 端口' : 'Clash API Port' }}</label>
      <input
        :value="experimental.clash_api_port || ''"
        @input="updateExperimentalField('clash_api_port', Number(($event.target as HTMLInputElement).value) || undefined)"
        type="number"
        min="1"
        max="65535"
        placeholder="9090"
      />
      <p class="field-hint">{{ currentLocale === 'zh' ? '启用 Clash 兼容 API 的端口' : 'Port for Clash compatible API' }}</p>
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? 'Clash API 监听地址' : 'Clash API Listen' }}</label>
      <input
        :value="experimental.clash_api_listen || ''"
        @input="updateExperimentalField('clash_api_listen', ($event.target as HTMLInputElement).value || undefined)"
        type="text"
        placeholder="127.0.0.1"
      />
    </div>
    
    <div class="field-group checkbox">
      <label>
        <input
          type="checkbox"
          :checked="!!experimental.clash_api_external_ui"
          @change="updateExperimentalField('clash_api_external_ui', ($event.target as HTMLInputElement).checked)"
        />
        {{ currentLocale === 'zh' ? '外部 UI 支持' : 'External UI Support' }}
      </label>
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '外部 UI 路径' : 'External UI Path' }}</label>
      <input
        :value="experimental.clash_api_external_ui_path || ''"
        @input="updateExperimentalField('clash_api_external_ui_path', ($event.target as HTMLInputElement).value || undefined)"
        type="text"
        placeholder="./ui"
      />
    </div>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '外部 UI URL' : 'External UI URL' }}</label>
      <input
        :value="experimental.clash_api_external_ui_url || ''"
        @input="updateExperimentalField('clash_api_external_ui_url', ($event.target as HTMLInputElement).value || undefined)"
        type="text"
        placeholder="https://example.com/ui"
      />
    </div>
  </div>
</template>

<style scoped>
.experimental-form { padding: 16px; }
.warning-box { padding: 12px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; border-radius: 4px; margin-bottom: 20px; }
.warning-box strong { display: block; margin-bottom: 6px; color: #92400e; }
.warning-box p { margin: 0; font-size: 13px; color: var(--text-secondary, #666); }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.field-hint { font-size: 12px; color: var(--text-secondary, #666); margin: 0; }
input[type="text"], input[type="number"] { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, input[type="number"]:focus { outline: none; border-color: var(--brand, #3b82f6); }
input[type="checkbox"] { cursor: pointer; }
</style>

