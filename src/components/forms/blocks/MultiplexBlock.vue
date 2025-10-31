<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  modelValue: Record<string, unknown> | undefined;
  mode: 'inbound' | 'outbound';
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, unknown> | undefined): void }>();

const { t, currentLocale } = useI18n();
const multiplex = computed({
  get: () => props.modelValue || {},
  set: (v) => emit('update:modelValue', Object.keys(v).length > 0 ? v : undefined),
});

const enabled = computed({
  get: () => (multiplex.value.enabled as boolean) || false,
  set: (v) => {
    if (!v) {
      emit('update:modelValue', undefined);
    } else {
      emit('update:modelValue', { ...multiplex.value, enabled: true });
    }
  },
});

function updateField(field: string, value: unknown) {
  emit('update:modelValue', { ...multiplex.value, [field]: value });
}
</script>

<template>
  <div class="multiplex-block" v-if="enabled || multiplex">
    <div class="block-header">
      <label>
        <input type="checkbox" :checked="enabled" @change="enabled = ($event.target as HTMLInputElement).checked" />
        {{ currentLocale === 'zh' ? '多路复用' : 'Multiplex' }}
      </label>
    </div>
    <div v-if="enabled" class="block-content">
      <div class="field-group" v-if="mode === 'outbound'">
        <label>{{ currentLocale === 'zh' ? '协议' : 'Protocol' }}</label>
        <select :value="multiplex.protocol || 'h2mux'" @change="updateField('protocol', ($event.target as HTMLSelectElement).value)">
          <option value="smux">smux</option>
          <option value="yamux">yamux</option>
          <option value="h2mux">h2mux</option>
        </select>
      </div>
      <div class="field-group" v-if="mode === 'outbound'">
        <label>{{ currentLocale === 'zh' ? '最大连接数' : 'Max Connections' }}</label>
        <input type="number" :value="multiplex.max_connections || 4" @input="updateField('max_connections', Number(($event.target as HTMLInputElement).value) || 0)" min="0" />
      </div>
      <div class="field-group">
        <label>
          <input type="checkbox" :checked="multiplex.padding" @change="updateField('padding', ($event.target as HTMLInputElement).checked)" />
          {{ currentLocale === 'zh' ? '填充' : 'Padding' }}
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multiplex-block { margin-top: 16px; padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; }
.block-header { margin-bottom: 12px; }
.block-header label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; }
.block-content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-group label { font-size: 12px; }
input[type="text"], input[type="number"], select { padding: 4px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="checkbox"] { cursor: pointer; }
</style>

