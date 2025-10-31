<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  modelValue: Record<string, unknown> | undefined;
  mode: 'inbound' | 'outbound';
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, unknown> | undefined): void }>();

const { currentLocale } = useI18n();
const tls = computed({
  get: () => props.modelValue || {},
  set: (v) => emit('update:modelValue', Object.keys(v).length > 0 ? v : undefined),
});

const enabled = computed({
  get: () => (tls.value.enabled as boolean) || false,
  set: (v) => {
    if (!v) {
      emit('update:modelValue', undefined);
    } else {
      emit('update:modelValue', { ...tls.value, enabled: true });
    }
  },
});

function updateField(field: string, value: unknown) {
  emit('update:modelValue', { ...tls.value, [field]: value });
}
</script>

<template>
  <div class="tls-block" v-if="enabled || tls">
    <div class="block-header">
      <label>
        <input type="checkbox" :checked="enabled" @change="enabled = ($event.target as HTMLInputElement).checked" />
        TLS
      </label>
    </div>
    <div v-if="enabled" class="block-content">
      <div class="field-group">
        <label v-if="mode === 'outbound'">{{ currentLocale === 'zh' ? '禁用 SNI' : 'Disable SNI' }}</label>
        <input v-if="mode === 'outbound'" type="checkbox" :checked="!!tls.disable_sni" @change="updateField('disable_sni', ($event.target as HTMLInputElement).checked)" />
      </div>
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '服务器名称' : 'Server Name' }}</label>
        <input type="text" :value="tls.server_name" @input="updateField('server_name', ($event.target as HTMLInputElement).value)" placeholder="example.com" />
      </div>
      <div class="field-group" v-if="mode === 'outbound'">
        <label>{{ currentLocale === 'zh' ? '不安全模式' : 'Insecure' }}</label>
        <input type="checkbox" :checked="!!tls.insecure" @change="updateField('insecure', ($event.target as HTMLInputElement).checked)" />
      </div>
      <div class="field-group">
        <label>ALPN</label>
        <input type="text" :value="Array.isArray(tls.alpn) ? tls.alpn.join(',') : tls.alpn" @input="updateField('alpn', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" placeholder="h2,http/1.1" />
      </div>
      <div class="field-group" v-if="mode === 'inbound'">
        <label>{{ currentLocale === 'zh' ? '证书路径' : 'Certificate Path' }}</label>
        <input type="text" :value="tls.certificate_path" @input="updateField('certificate_path', ($event.target as HTMLInputElement).value)" placeholder="./cert.pem" />
      </div>
      <div class="field-group" v-if="mode === 'inbound'">
        <label>{{ currentLocale === 'zh' ? '私钥路径' : 'Key Path' }}</label>
        <input type="text" :value="tls.key_path" @input="updateField('key_path', ($event.target as HTMLInputElement).value)" placeholder="./key.pem" />
      </div>
      <div class="field-group" v-if="mode === 'outbound'">
        <label>{{ currentLocale === 'zh' ? 'TLS 分片' : 'TLS Fragment' }}</label>
        <input type="checkbox" :checked="!!tls.fragment" @change="updateField('fragment', ($event.target as HTMLInputElement).checked)" />
      </div>
      <div class="field-group" v-if="mode === 'outbound' && tls.utls">
        <label>uTLS</label>
        <select :value="(tls.utls as any)?.fingerprint" @change="updateField('utls', { enabled: true, fingerprint: ($event.target as HTMLSelectElement).value })">
          <option value="chrome">chrome</option>
          <option value="firefox">firefox</option>
          <option value="safari">safari</option>
          <option value="random">random</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tls-block { margin-top: 16px; padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; }
.block-header { margin-bottom: 12px; }
.block-header label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; }
.block-content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-group label { font-size: 12px; }
input[type="text"], select { padding: 4px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="checkbox"] { cursor: pointer; }
</style>

