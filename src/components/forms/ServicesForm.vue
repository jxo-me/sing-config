<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { currentLocale } = useI18n();
const expandedServices = ref<Set<number>>(new Set());

const services = computed(() => (currentConfig.value.services as Array<Record<string, unknown>>) || []);

function toggleService(idx: number) {
  if (expandedServices.value.has(idx)) {
    expandedServices.value.delete(idx);
  } else {
    expandedServices.value.add(idx);
  }
}

async function addService() {
  const newServices = [...services.value, {
    type: 'derp',
    tag: 'derp-service',
  }];
  await setConfig({
    ...currentConfig.value,
    services: newServices,
  });
}

async function removeService(idx: number) {
  const newServices = services.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    services: newServices,
  });
}

async function updateService(idx: number, field: string, value: unknown) {
  const newServices = [...services.value];
  newServices[idx] = { ...newServices[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    services: newServices,
  });
}
</script>

<template>
  <div class="services-form">
    <h3>{{ currentLocale === 'zh' ? '服务配置' : 'Services Configuration' }}</h3>
    
    <div class="services-list">
      <div v-for="(service, idx) in services" :key="idx" class="service-item">
        <div class="service-header" @click="toggleService(idx)">
          <div class="service-header-main">
            <span class="expand-icon" :class="{ expanded: expandedServices.has(idx) }">▶</span>
            <span class="service-summary">
              {{ service.tag || (currentLocale === 'zh' ? '服务' : 'Service') }} {{ idx + 1 }} ({{ service.type || 'derp' }})
            </span>
          </div>
          <div class="service-header-actions" @click.stop>
            <label>{{ currentLocale === 'zh' ? '类型' : 'Type' }}</label>
            <select :value="service.type || 'derp'" @change="updateService(idx, 'type', ($event.target as HTMLSelectElement).value)">
              <option value="derp">DERP</option>
              <option value="resolved">Resolved</option>
              <option value="ssm-api">SSM API</option>
            </select>
            <label>{{ currentLocale === 'zh' ? '标签' : 'Tag' }}</label>
            <input :value="service.tag" @input="updateService(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
            <button @click="removeService(idx)">{{ currentLocale === 'zh' ? '删除' : 'Remove' }}</button>
          </div>
        </div>
        
        <div v-show="expandedServices.has(idx)" class="service-fields">
          <template v-if="service.type === 'derp'">
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '服务器列表' : 'Server List' }}</label>
              <textarea
                :value="Array.isArray(service.server_list) ? service.server_list.join('\n') : service.server_list || ''"
                @input="updateService(idx, 'server_list', ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean))"
                rows="3"
                placeholder="https://derp1.example.com"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'IPv4 地址' : 'IPv4 Address' }}</label>
              <input
                :value="service.ipv4 || ''"
                @input="updateService(idx, 'ipv4', ($event.target as HTMLInputElement).value || undefined)"
                type="text"
                placeholder="127.0.0.1"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'IPv6 地址' : 'IPv6 Address' }}</label>
              <input
                :value="service.ipv6 || ''"
                @input="updateService(idx, 'ipv6', ($event.target as HTMLInputElement).value || undefined)"
                type="text"
                placeholder="::1"
              />
            </div>
          </template>
          
          <template v-else-if="service.type === 'resolved'">
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'DNS 服务器' : 'DNS Servers' }}</label>
              <textarea
                :value="Array.isArray(service.servers) ? service.servers.join('\n') : service.servers || ''"
                @input="updateService(idx, 'servers', ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean))"
                rows="3"
                placeholder="8.8.8.8"
              />
            </div>
            <div class="field-group checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="service.set_mark || false"
                  @change="updateService(idx, 'set_mark', ($event.target as HTMLInputElement).checked)"
                />
                {{ currentLocale === 'zh' ? '设置标记' : 'Set Mark' }}
              </label>
            </div>
          </template>
          
          <template v-else-if="service.type === 'ssm-api'">
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'API 端点' : 'API Endpoint' }}</label>
              <input
                :value="service.api || ''"
                @input="updateService(idx, 'api', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="https://api.example.com"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '用户 ID' : 'User ID' }}</label>
              <input
                :value="service.user_id || ''"
                @input="updateService(idx, 'user_id', ($event.target as HTMLInputElement).value)"
                type="text"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '密钥' : 'Key' }}</label>
              <input
                :value="service.key || ''"
                @input="updateService(idx, 'key', ($event.target as HTMLInputElement).value)"
                type="password"
              />
            </div>
          </template>
        </div>
      </div>
      <button @click="addService" class="add-btn">{{ currentLocale === 'zh' ? '添加服务' : 'Add Service' }}</button>
    </div>
  </div>
</template>

<style scoped>
.services-form { padding: 16px; }
.services-list { display: grid; gap: 16px; margin-top: 12px; }
.service-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background-color: var(--bg-panel, #ffffff); }
.service-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.service-header:hover { background: var(--bg-hover, #e5e5e5); }
.service-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.service-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.service-summary { font-weight: 500; font-size: 14px; }
.service-fields { display: flex; flex-direction: column; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
input[type="text"], input[type="password"], textarea, select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, input[type="password"]:focus, textarea:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
textarea { font-family: monospace; resize: vertical; }
input[type="checkbox"] { cursor: pointer; }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
</style>

