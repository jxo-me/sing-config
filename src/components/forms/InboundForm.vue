<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';
import TlsBlock from './blocks/TlsBlock.vue';
import MultiplexBlock from './blocks/MultiplexBlock.vue';
import TransportBlock from './blocks/TransportBlock.vue';

const { t, currentLocale } = useI18n();
const expandedInbounds = ref<Set<number>>(new Set());

function toggleInbound(idx: number) {
  if (expandedInbounds.value.has(idx)) {
    expandedInbounds.value.delete(idx);
  } else {
    expandedInbounds.value.add(idx);
  }
}
const inbounds = computed(() => (currentConfig.value.inbounds as Array<Record<string, unknown>>) || []);

async function addInbound() {
  const newInbounds = [...inbounds.value, {
    type: 'socks',
    tag: 'socks-in',
    listen: '127.0.0.1',
    listen_port: 1080,
  }];
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function removeInbound(idx: number) {
  const newInbounds = inbounds.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function cloneInbound(idx: number) {
  const inbound = inbounds.value[idx];
  const cloned = JSON.parse(JSON.stringify(inbound)); // 深拷贝
  cloned.tag = `${cloned.tag || 'inbound'}-copy`;
  const newInbounds = [...inbounds.value];
  newInbounds.splice(idx + 1, 0, cloned); // 插入到原配置后面
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function updateInbound(idx: number, field: string, value: unknown) {
  const newInbounds = [...inbounds.value];
  newInbounds[idx] = { ...newInbounds[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function updateInboundNested(idx: number, parentField: string, value: unknown) {
  const newInbounds = [...inbounds.value];
  const inbound = { ...newInbounds[idx] };
  if (value === undefined || (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
    delete inbound[parentField];
  } else {
    inbound[parentField] = value;
  }
  newInbounds[idx] = inbound;
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function updateInboundUser(idx: number, userIdx: number, field: string, value: unknown) {
  const newInbounds = [...inbounds.value];
  const inbound = { ...newInbounds[idx] };
  const users = [...((inbound.users as Array<Record<string, unknown>>) || [])];
  users[userIdx] = { ...users[userIdx], [field]: value };
  inbound.users = users;
  newInbounds[idx] = inbound;
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function addInboundUser(idx: number, type: string) {
  const newInbounds = [...inbounds.value];
  const inbound = { ...newInbounds[idx] };
  const users = [...((inbound.users as Array<Record<string, unknown>>) || [])];
  
  if (type === 'vmess') {
    users.push({ uuid: '', alterId: 0 });
  } else if (type === 'vless') {
    users.push({ uuid: '' });
  } else if (type === 'trojan') {
    users.push({ password: '' });
  }
  
  inbound.users = users;
  newInbounds[idx] = inbound;
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

async function removeInboundUser(idx: number, userIdx: number) {
  const newInbounds = [...inbounds.value];
  const inbound = { ...newInbounds[idx] };
  const users = ((inbound.users as Array<Record<string, unknown>>) || []).filter((_, i) => i !== userIdx);
  inbound.users = users.length > 0 ? users : undefined;
  newInbounds[idx] = inbound;
  await setConfig({
    ...currentConfig.value,
    inbounds: newInbounds,
  });
}

</script>

<template>
  <div class="inbound-form">
    <h3>{{ t.inbound.title }}</h3>
    <div class="inbounds-list">
      <div v-for="(inbound, idx) in inbounds" :key="idx" class="inbound-item">
        <div class="inbound-header" @click="toggleInbound(idx)">
          <div class="inbound-header-main">
            <span class="expand-icon" :class="{ expanded: expandedInbounds.has(idx) }">▶</span>
            <span class="inbound-summary">
              {{ inbound.tag || (currentLocale === 'zh' ? '入站' : 'Inbound') }} {{ idx + 1 }} ({{ t.inbound.types[inbound.type as keyof typeof t.inbound.types] || inbound.type }})
            </span>
          </div>
          <div class="inbound-header-actions" @click.stop>
            <label>{{ t.inbound.type }}</label>
            <select :value="inbound.type" @change="updateInbound(idx, 'type', ($event.target as HTMLSelectElement).value)">
              <option value="socks">{{ t.inbound.types.socks }}</option>
              <option value="http">{{ t.inbound.types.http }}</option>
              <option value="mixed">{{ t.inbound.types.mixed }}</option>
              <option value="shadowsocks">{{ t.inbound.types.shadowsocks }}</option>
              <option value="vmess">{{ t.inbound.types.vmess }}</option>
              <option value="vless">{{ t.inbound.types.vless }}</option>
              <option value="trojan">{{ t.inbound.types.trojan }}</option>
              <option value="tuic">{{ t.inbound.types.tuic }}</option>
            </select>
            <label>{{ t.inbound.tag }}</label>
            <input :value="inbound.tag" @input="updateInbound(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
            <button @click="cloneInbound(idx)" :title="currentLocale === 'zh' ? '克隆' : 'Clone'">📋</button>
            <button @click="removeInbound(idx)">{{ t.inbound.remove }}</button>
          </div>
        </div>
        <div v-show="expandedInbounds.has(idx)" class="inbound-fields">
          <div class="field-group">
            <div>
              <label>{{ t.inbound.listen }}</label>
              <input :value="inbound.listen || '127.0.0.1'" @input="updateInbound(idx, 'listen', ($event.target as HTMLInputElement).value)" type="text" />
            </div>
            <div>
              <label>{{ t.inbound.listenPort }}</label>
              <input :value="inbound.listen_port || 1080" @input="updateInbound(idx, 'listen_port', Number(($event.target as HTMLInputElement).value) || 0)" type="number" min="1" max="65535" />
            </div>
          </div>
          <template v-if="inbound.type === 'shadowsocks'">
            <div class="field-group">
              <label>{{ t.inbound.shadowsocks.method }}</label>
              <select :value="inbound.method" @change="updateInbound(idx, 'method', ($event.target as HTMLSelectElement).value)">
                <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                <option value="aes-128-gcm">aes-128-gcm</option>
                <option value="aes-256-gcm">aes-256-gcm</option>
                <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.inbound.shadowsocks.password }}</label>
              <input :value="inbound.password" @input="updateInbound(idx, 'password', ($event.target as HTMLInputElement).value)" type="password" />
            </div>
          </template>
          <template v-if="inbound.type === 'vmess'">
            <div class="users-section">
              <h4>{{ t.inbound.vmess.users }}</h4>
              <div v-for="(user, uIdx) in (inbound.users as Array<Record<string, unknown>> || [])" :key="uIdx" class="user-item">
                <div class="field-group">
                  <label>{{ t.inbound.user.name }}</label>
                  <input :value="user.name" @input="updateInboundUser(idx, uIdx, 'name', ($event.target as HTMLInputElement).value)" type="text" />
                </div>
                <div class="field-group">
                  <label>{{ t.inbound.user.uuid }}</label>
                  <input :value="user.uuid" @input="updateInboundUser(idx, uIdx, 'uuid', ($event.target as HTMLInputElement).value)" type="text" placeholder="00000000-0000-0000-0000-000000000000" />
                </div>
                <div class="field-group">
                  <label>Alter ID</label>
                  <input :value="user.alterId || 0" @input="updateInboundUser(idx, uIdx, 'alterId', Number(($event.target as HTMLInputElement).value) || 0)" type="number" min="0" />
                </div>
                <button @click="removeInboundUser(idx, uIdx)">{{ t.inbound.remove }}</button>
              </div>
              <button @click="addInboundUser(idx, 'vmess')" class="add-btn-small">{{ currentLocale === 'zh' ? '添加用户' : 'Add User' }}</button>
            </div>
          </template>
          <template v-if="inbound.type === 'vless'">
            <div class="users-section">
              <h4>{{ t.inbound.vless.users }}</h4>
              <div v-for="(user, uIdx) in (inbound.users as Array<Record<string, unknown>> || [])" :key="uIdx" class="user-item">
                <div class="field-group">
                  <label>{{ t.inbound.user.uuid }}</label>
                  <input :value="user.uuid" @input="updateInboundUser(idx, uIdx, 'uuid', ($event.target as HTMLInputElement).value)" type="text" placeholder="00000000-0000-0000-0000-000000000000" />
                </div>
                <div class="field-group">
                  <label>Flow</label>
                  <input :value="user.flow" @input="updateInboundUser(idx, uIdx, 'flow', ($event.target as HTMLInputElement).value)" type="text" placeholder="xtls-rprx-vision" />
                </div>
                <button @click="removeInboundUser(idx, uIdx)">{{ t.inbound.remove }}</button>
              </div>
              <button @click="addInboundUser(idx, 'vless')" class="add-btn-small">{{ currentLocale === 'zh' ? '添加用户' : 'Add User' }}</button>
            </div>
          </template>
          <template v-if="inbound.type === 'trojan'">
            <div class="users-section">
              <h4>{{ t.inbound.trojan.users }}</h4>
              <div v-for="(user, uIdx) in (inbound.users as Array<Record<string, unknown>> || [])" :key="uIdx" class="user-item">
                <div class="field-group">
                  <label>{{ t.inbound.user.password }}</label>
                  <input :value="user.password" @input="updateInboundUser(idx, uIdx, 'password', ($event.target as HTMLInputElement).value)" type="password" />
                </div>
                <div class="field-group">
                  <label>{{ t.inbound.user.name }}</label>
                  <input :value="user.name" @input="updateInboundUser(idx, uIdx, 'name', ($event.target as HTMLInputElement).value)" type="text" />
                </div>
                <button @click="removeInboundUser(idx, uIdx)">{{ t.inbound.remove }}</button>
              </div>
              <button @click="addInboundUser(idx, 'trojan')" class="add-btn-small">{{ currentLocale === 'zh' ? '添加用户' : 'Add User' }}</button>
            </div>
          </template>
          <template v-if="inbound.type === 'vmess' || inbound.type === 'vless' || inbound.type === 'trojan' || inbound.type === 'http' || inbound.type === 'mixed'">
            <div class="advanced-section">
              <TlsBlock :model-value="inbound.tls as Record<string, unknown>" mode="inbound" @update:modelValue="updateInboundNested(idx, 'tls', $event)" />
            </div>
          </template>
          <template v-if="inbound.type === 'vmess' || inbound.type === 'vless' || inbound.type === 'trojan' || inbound.type === 'shadowsocks'">
            <div class="advanced-section">
              <MultiplexBlock :model-value="inbound.multiplex as Record<string, unknown>" mode="inbound" @update:modelValue="updateInboundNested(idx, 'multiplex', $event)" />
            </div>
          </template>
          <template v-if="inbound.type === 'vmess' || inbound.type === 'vless' || inbound.type === 'trojan'">
            <div class="advanced-section">
              <TransportBlock :model-value="inbound.transport as Record<string, unknown>" @update:modelValue="updateInboundNested(idx, 'transport', $event)" />
            </div>
          </template>
        </div>
      </div>
      <button @click="addInbound" class="add-btn">{{ t.inbound.add }}</button>
    </div>
  </div>
</template>

<style scoped>
.inbound-form { padding: 16px; }
.inbounds-list { display: grid; gap: 16px; margin-top: 12px; }
.inbound-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
.inbound-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.inbound-header:hover { background: var(--bg-hover, #e5e5e5); }
.inbound-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.inbound-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.inbound-summary { font-weight: 500; font-size: 14px; }
.inbound-fields { display: flex; flex-direction: column; gap: 12px; }
.inbound-fields > .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.advanced-section { margin-top: 8px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label { font-size: 13px; font-weight: 500; }
input[type="text"], input[type="number"], input[type="password"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
.users-section { margin-top: 12px; padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; }
.users-section h4 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
.user-item { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: end; margin-bottom: 8px; padding: 8px; background: var(--bg-app, #f5f5f5); border-radius: 4px; }
.add-btn-small { padding: 4px 8px; font-size: 12px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn-small:hover { background: var(--brand-hover, #2563eb); }

/* 移动端优化 */
@media (max-width: 767px) {
  .inbound-header-actions,
  .outbound-header-actions,
  .service-header-actions,
  .endpoint-header-actions {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  
  .inbound-header,
  .outbound-header,
  .service-header,
  .endpoint-header {
    flex-direction: column !important;
    align-items: stretch !important;
  }
  
  .inbound-header-actions,
  .outbound-header-actions,
  .service-header-actions,
  .endpoint-header-actions {
    width: 100% !important;
  }
  
  .inbound-header-actions > label,
  .outbound-header-actions > label,
  .service-header-actions > label,
  .endpoint-header-actions > label {
    font-size: 11px !important;
  }
  
  .inbound-header-actions > select,
  .inbound-header-actions > input,
  .outbound-header-actions > select,
  .outbound-header-actions > input,
  .service-header-actions > select,
  .service-header-actions > input,
  .endpoint-header-actions > select,
  .endpoint-header-actions > input {
    font-size: 12px !important;
  }
  
  .inbound-header-actions > button,
  .outbound-header-actions > button,
  .service-header-actions > button,
  .endpoint-header-actions > button {
    flex: 1;
    min-width: 80px;
  }
  
  .inbound-fields > .field-group,
  .outbound-fields > .field-group {
    grid-template-columns: 1fr !important;
  }
  
  .user-item {
    grid-template-columns: 1fr !important;
  }
  
  .user-item button {
    width: 100%;
  }
}
</style>

