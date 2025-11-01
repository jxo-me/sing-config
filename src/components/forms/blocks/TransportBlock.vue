<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  modelValue: Record<string, unknown> | undefined;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, unknown> | undefined): void }>();

const { currentLocale } = useI18n();
const transport = computed({
  get: () => props.modelValue || {},
  set: (v) => emit('update:modelValue', Object.keys(v).length > 0 ? v : undefined),
});

const enabled = computed({
  get: () => !!props.modelValue,
  set: (v) => {
    if (!v) {
      emit('update:modelValue', undefined);
    } else {
      emit('update:modelValue', { type: transport.value.type || 'ws' });
    }
  },
});

const transportType = computed({
  get: () => (transport.value.type as string) || 'ws',
  set: (v) => emit('update:modelValue', { ...transport.value, type: v }),
});

function updateField(field: string, value: unknown) {
  emit('update:modelValue', { ...transport.value, [field]: value });
}
</script>

<template>
  <div class="transport-block" v-if="enabled || transport">
    <div class="block-header">
      <label>
        <input type="checkbox" :checked="enabled" @change="enabled = ($event.target as HTMLInputElement).checked" />
        {{ currentLocale === 'zh' ? '传输层' : 'Transport' }}
      </label>
    </div>
    <div v-if="enabled" class="block-content">
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '类型' : 'Type' }}</label>
        <select :value="transportType" @change="transportType = ($event.target as HTMLSelectElement).value">
          <option value="ws">WebSocket</option>
          <option value="http">HTTP</option>
          <option value="grpc">gRPC</option>
          <option value="quic">QUIC</option>
          <option value="httpupgrade">HTTPUpgrade</option>
        </select>
      </div>
      <template v-if="transportType === 'ws'">
        <div class="field-group">
          <label>Path</label>
          <input type="text" :value="transport.path" @input="updateField('path', ($event.target as HTMLInputElement).value)" placeholder="/path" />
        </div>
        <div class="field-group">
          <label>{{ currentLocale === 'zh' ? '最大早期数据' : 'Max Early Data' }}</label>
          <input type="number" :value="transport.max_early_data || 0" @input="updateField('max_early_data', Number(($event.target as HTMLInputElement).value) || 0)" min="0" />
        </div>
      </template>
      <template v-if="transportType === 'http'">
        <div class="field-group">
          <label>Host</label>
          <input type="text" :value="Array.isArray(transport.host) ? transport.host.join(',') : transport.host" @input="updateField('host', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" placeholder="example.com" />
        </div>
        <div class="field-group">
          <label>Path</label>
          <input type="text" :value="transport.path" @input="updateField('path', ($event.target as HTMLInputElement).value)" placeholder="/path" />
        </div>
        <div class="field-group">
          <label>Method</label>
          <input type="text" :value="transport.method" @input="updateField('method', ($event.target as HTMLInputElement).value)" placeholder="GET" />
        </div>
      </template>
      <template v-if="transportType === 'grpc'">
        <div class="field-group">
          <label>{{ currentLocale === 'zh' ? '服务名称' : 'Service Name' }}</label>
          <input type="text" :value="transport.service_name" @input="updateField('service_name', ($event.target as HTMLInputElement).value)" placeholder="TunService" />
        </div>
      </template>
      <template v-if="transportType === 'httpupgrade'">
        <div class="field-group">
          <label>Host</label>
          <input type="text" :value="transport.host" @input="updateField('host', ($event.target as HTMLInputElement).value)" placeholder="example.com" />
        </div>
        <div class="field-group">
          <label>Path</label>
          <input type="text" :value="transport.path" @input="updateField('path', ($event.target as HTMLInputElement).value)" placeholder="/path" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.transport-block { margin-top: 16px; padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; }
.block-header { margin-bottom: 12px; }
.block-header label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; }
.block-content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-group label { font-size: 12px; }
input[type="text"], input[type="number"], select { padding: 4px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="checkbox"] { cursor: pointer; }

/* 移动端优化 */
@media (max-width: 767px) {
  .block-content {
    grid-template-columns: 1fr !important;
  }
}
</style>

