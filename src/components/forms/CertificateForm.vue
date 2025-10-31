<script setup lang="ts">
import { computed } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { t, currentLocale } = useI18n();

const certificate = computed(() => currentConfig.value.certificate as Record<string, unknown> | undefined || {});
const paths = computed(() => {
  const certPaths = certificate.value.paths;
  if (Array.isArray(certPaths)) {
    return certPaths.join('\n');
  }
  return certPaths ? String(certPaths) : '';
});

async function updatePaths(value: string) {
  const pathArray = value.split('\n').map(p => p.trim()).filter(Boolean);
  await setConfig({
    ...currentConfig.value,
    certificate: { ...certificate.value, paths: pathArray.length > 0 ? pathArray : undefined },
  });
}
</script>

<template>
  <div class="certificate-form">
    <h3>{{ currentLocale === 'zh' ? '证书配置' : 'Certificate Configuration' }}</h3>
    
    <div class="field-group">
      <label>{{ currentLocale === 'zh' ? '证书路径' : 'Certificate Paths' }}</label>
      <textarea
        :value="paths"
        @input="updatePaths(($event.target as HTMLTextAreaElement).value)"
        rows="4"
        :placeholder="currentLocale === 'zh' ? '每行一个路径\n例如:\n./certificates\n./certs/tls.pem' : 'One path per line\nExample:\n./certificates\n./certs/tls.pem'"
      />
      <p class="field-hint">{{ currentLocale === 'zh' ? '证书文件或目录路径，每行一个' : 'Certificate file or directory paths, one per line' }}</p>
    </div>
  </div>
</template>

<style scoped>
.certificate-form { padding: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-hint { font-size: 12px; color: var(--text-secondary, #666); margin: 0; }
textarea { padding: 8px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; font-family: monospace; resize: vertical; }
textarea:focus { outline: none; border-color: var(--brand, #3b82f6); }
</style>

