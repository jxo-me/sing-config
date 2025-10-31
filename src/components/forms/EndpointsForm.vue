<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { currentLocale } = useI18n();
const expandedEndpoints = ref<Set<number>>(new Set());

const endpoints = computed(() => (currentConfig.value.endpoints as Array<Record<string, unknown>>) || []);

function toggleEndpoint(idx: number) {
  if (expandedEndpoints.value.has(idx)) {
    expandedEndpoints.value.delete(idx);
  } else {
    expandedEndpoints.value.add(idx);
  }
}

async function addEndpoint() {
  const newEndpoints = [...endpoints.value, {
    type: 'tailscale',
    tag: 'tailscale-endpoint',
    state_directory: './ts-state',
  }];
  await setConfig({
    ...currentConfig.value,
    endpoints: newEndpoints,
  });
}

async function removeEndpoint(idx: number) {
  const newEndpoints = endpoints.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    endpoints: newEndpoints,
  });
}

async function updateEndpoint(idx: number, field: string, value: unknown) {
  const newEndpoints = [...endpoints.value];
  newEndpoints[idx] = { ...newEndpoints[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    endpoints: newEndpoints,
  });
}
</script>

<template>
  <div class="endpoints-form">
    <h3>{{ currentLocale === 'zh' ? '端点配置' : 'Endpoints Configuration' }}</h3>
    
    <div class="endpoints-list">
      <div v-for="(endpoint, idx) in endpoints" :key="idx" class="endpoint-item">
        <div class="endpoint-header" @click="toggleEndpoint(idx)">
          <div class="endpoint-header-main">
            <span class="expand-icon" :class="{ expanded: expandedEndpoints.has(idx) }">▶</span>
            <span class="endpoint-summary">
              {{ endpoint.tag || (currentLocale === 'zh' ? '端点' : 'Endpoint') }} {{ idx + 1 }} ({{ endpoint.type || 'tailscale' }})
            </span>
          </div>
          <div class="endpoint-header-actions" @click.stop>
            <label>{{ currentLocale === 'zh' ? '类型' : 'Type' }}</label>
            <select :value="endpoint.type || 'tailscale'" @change="updateEndpoint(idx, 'type', ($event.target as HTMLSelectElement).value)">
              <option value="tailscale">Tailscale</option>
            </select>
            <label>{{ currentLocale === 'zh' ? '标签' : 'Tag' }}</label>
            <input :value="endpoint.tag" @input="updateEndpoint(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
            <button @click="removeEndpoint(idx)">{{ currentLocale === 'zh' ? '删除' : 'Remove' }}</button>
          </div>
        </div>
        
        <div v-show="expandedEndpoints.has(idx)" class="endpoint-fields">
          <template v-if="endpoint.type === 'tailscale'">
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '状态目录' : 'State Directory' }}</label>
              <input
                :value="endpoint.state_directory || './ts-state'"
                @input="updateEndpoint(idx, 'state_directory', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="./ts-state"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '认证密钥' : 'Auth Key' }}</label>
              <input
                :value="endpoint.auth_key || ''"
                @input="updateEndpoint(idx, 'auth_key', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="tskey-..."
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '控制平面 URL' : 'Control URL' }}</label>
              <input
                :value="endpoint.control_url || 'https://controlplane.tailscale.com'"
                @input="updateEndpoint(idx, 'control_url', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="https://controlplane.tailscale.com"
              />
            </div>
            <div class="field-group checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="!!endpoint.ephemeral"
                  @change="updateEndpoint(idx, 'ephemeral', ($event.target as HTMLInputElement).checked)"
                />
                {{ currentLocale === 'zh' ? '临时节点' : 'Ephemeral' }}
              </label>
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '主机名' : 'Hostname' }}</label>
              <input
                :value="endpoint.hostname || ''"
                @input="updateEndpoint(idx, 'hostname', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="singbox-node"
              />
            </div>
            <div class="field-group checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="!!endpoint.accept_routes"
                  @change="updateEndpoint(idx, 'accept_routes', ($event.target as HTMLInputElement).checked)"
                />
                {{ currentLocale === 'zh' ? '接受路由' : 'Accept Routes' }}
              </label>
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '出站标签' : 'Detour Tag' }}</label>
              <input
                :value="endpoint.detour || ''"
                @input="updateEndpoint(idx, 'detour', ($event.target as HTMLInputElement).value || undefined)"
                type="text"
                placeholder="direct"
              />
            </div>
          </template>
        </div>
      </div>
      <button @click="addEndpoint" class="add-btn">{{ currentLocale === 'zh' ? '添加端点' : 'Add Endpoint' }}</button>
    </div>
  </div>
</template>

<style scoped>
.endpoints-form { padding: 16px; }
.endpoints-list { display: grid; gap: 16px; margin-top: 12px; }
.endpoint-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background-color: var(--bg-panel, #ffffff); }
.endpoint-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.endpoint-header:hover { background: var(--bg-hover, #e5e5e5); }
.endpoint-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.endpoint-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.endpoint-summary { font-weight: 500; font-size: 14px; }
.endpoint-fields { display: flex; flex-direction: column; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
input[type="text"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
input[type="checkbox"] { cursor: pointer; }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
</style>

