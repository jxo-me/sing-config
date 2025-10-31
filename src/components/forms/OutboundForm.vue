<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';
import TlsBlock from './blocks/TlsBlock.vue';
import MultiplexBlock from './blocks/MultiplexBlock.vue';
import TransportBlock from './blocks/TransportBlock.vue';

const { t, currentLocale } = useI18n();
const expandedOutbounds = ref<Set<number>>(new Set());

function toggleOutbound(idx: number) {
  if (expandedOutbounds.value.has(idx)) {
    expandedOutbounds.value.delete(idx);
  } else {
    expandedOutbounds.value.add(idx);
  }
}
const outbounds = computed(() => (currentConfig.value.outbounds as Array<Record<string, unknown>>) || []);

async function addOutbound() {
  const newOutbounds = [...outbounds.value, {
    type: 'direct',
    tag: 'direct',
  }];
  await setConfig({
    ...currentConfig.value,
    outbounds: newOutbounds,
  });
}

async function removeOutbound(idx: number) {
  const newOutbounds = outbounds.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    outbounds: newOutbounds,
  });
}

async function cloneOutbound(idx: number) {
  const outbound = outbounds.value[idx];
  const cloned = JSON.parse(JSON.stringify(outbound)); // 深拷贝
  cloned.tag = `${cloned.tag || 'outbound'}-copy`;
  const newOutbounds = [...outbounds.value];
  newOutbounds.splice(idx + 1, 0, cloned); // 插入到原配置后面
  await setConfig({
    ...currentConfig.value,
    outbounds: newOutbounds,
  });
}

async function updateOutbound(idx: number, field: string, value: unknown) {
  const newOutbounds = [...outbounds.value];
  newOutbounds[idx] = { ...newOutbounds[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    outbounds: newOutbounds,
  });
}

async function updateOutboundNested(idx: number, parentField: string, value: unknown) {
  const newOutbounds = [...outbounds.value];
  const outbound = { ...newOutbounds[idx] };
  if (value === undefined || (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
    delete outbound[parentField];
  } else {
    outbound[parentField] = value;
  }
  newOutbounds[idx] = outbound;
  await setConfig({
    ...currentConfig.value,
    outbounds: newOutbounds,
  });
}

</script>

<template>
  <div class="outbound-form">
    <h3>{{ t.outbound.title }}</h3>
    <div class="outbounds-list">
      <div v-for="(outbound, idx) in outbounds" :key="idx" class="outbound-item">
        <div class="outbound-header" @click="toggleOutbound(idx)">
          <div class="outbound-header-main">
            <span class="expand-icon" :class="{ expanded: expandedOutbounds.has(idx) }">▶</span>
            <span class="outbound-summary">
              {{ outbound.tag || (currentLocale === 'zh' ? '出站' : 'Outbound') }} {{ idx + 1 }} ({{ t.outbound.types[outbound.type as keyof typeof t.outbound.types] || outbound.type }})
            </span>
          </div>
          <div class="outbound-header-actions" @click.stop>
            <label>{{ t.outbound.type }}</label>
            <select :value="outbound.type" @change="updateOutbound(idx, 'type', ($event.target as HTMLSelectElement).value)">
              <option value="direct">{{ t.outbound.types.direct }}</option>
              <option value="socks">{{ t.outbound.types.socks }}</option>
              <option value="http">{{ t.outbound.types.http }}</option>
              <option value="shadowsocks">{{ t.outbound.types.shadowsocks }}</option>
              <option value="vmess">{{ t.outbound.types.vmess }}</option>
              <option value="vless">{{ t.outbound.types.vless }}</option>
              <option value="trojan">{{ t.outbound.types.trojan }}</option>
              <option value="tuic">{{ t.outbound.types.tuic }}</option>
              <option value="selector">{{ t.outbound.types.selector }}</option>
              <option value="urltest">{{ t.outbound.types.urltest }}</option>
            </select>
            <label>{{ t.outbound.tag }}</label>
            <input :value="outbound.tag" @input="updateOutbound(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
            <button @click="cloneOutbound(idx)" :title="currentLocale === 'zh' ? '克隆' : 'Clone'">📋</button>
            <button @click="removeOutbound(idx)">{{ t.outbound.remove }}</button>
          </div>
        </div>
        <div v-show="expandedOutbounds.has(idx)" class="outbound-fields">
          <template v-if="outbound.type !== 'direct' && outbound.type !== 'selector' && outbound.type !== 'urltest'">
            <div class="field-group">
              <label>{{ t.outbound.server }}</label>
              <input :value="outbound.server" @input="updateOutbound(idx, 'server', ($event.target as HTMLInputElement).value)" type="text" placeholder="example.com" />
            </div>
            <div class="field-group">
              <label>{{ t.outbound.serverPort }}</label>
              <input :value="outbound.server_port" @input="updateOutbound(idx, 'server_port', Number(($event.target as HTMLInputElement).value) || 0)" type="number" min="1" max="65535" />
            </div>
          </template>
          <template v-if="outbound.type === 'shadowsocks'">
            <div class="field-group">
              <label>{{ t.inbound.shadowsocks.method }}</label>
              <select :value="outbound.method" @change="updateOutbound(idx, 'method', ($event.target as HTMLSelectElement).value)">
                <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                <option value="aes-128-gcm">aes-128-gcm</option>
                <option value="aes-256-gcm">aes-256-gcm</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.inbound.shadowsocks.password }}</label>
              <input :value="outbound.password" @input="updateOutbound(idx, 'password', ($event.target as HTMLInputElement).value)" type="password" />
            </div>
          </template>
          <template v-if="outbound.type === 'vmess'">
            <div class="field-group">
              <label>UUID</label>
              <input :value="outbound.uuid" @input="updateOutbound(idx, 'uuid', ($event.target as HTMLInputElement).value)" type="text" placeholder="00000000-0000-0000-0000-000000000000" />
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vmess.security }}</label>
              <select :value="outbound.security || 'auto'" @change="updateOutbound(idx, 'security', ($event.target as HTMLSelectElement).value)">
                <option value="auto">auto</option>
                <option value="none">none</option>
                <option value="zero">zero</option>
                <option value="aes-128-gcm">aes-128-gcm</option>
                <option value="chacha20-poly1305">chacha20-poly1305</option>
                <option value="aes-128-ctr">aes-128-ctr (Legacy)</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vmess.alterId }}</label>
              <input :value="outbound.alter_id || 0" @input="updateOutbound(idx, 'alter_id', Number(($event.target as HTMLInputElement).value) || 0)" type="number" min="0" />
            </div>
            <div class="field-group checkbox">
              <label>
                <input type="checkbox" :checked="!!outbound.global_padding" @change="updateOutbound(idx, 'global_padding', ($event.target as HTMLInputElement).checked)" />
                {{ t.outbound.vmess.globalPadding }}
              </label>
            </div>
            <div class="field-group checkbox">
              <label>
                <input type="checkbox" :checked="outbound.authenticated_length !== false" @change="updateOutbound(idx, 'authenticated_length', ($event.target as HTMLInputElement).checked)" />
                {{ t.outbound.vmess.authenticatedLength }}
              </label>
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vmess.network }}</label>
              <select :value="Array.isArray(outbound.network) ? outbound.network[0] : outbound.network || ''" @change="updateOutbound(idx, 'network', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">All (TCP + UDP)</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vmess.packetEncoding }}</label>
              <select :value="outbound.packet_encoding || ''" @change="updateOutbound(idx, 'packet_encoding', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">Disabled</option>
                <option value="packetaddr">packetaddr (v2ray 5+)</option>
                <option value="xudp">xudp (xray)</option>
              </select>
            </div>
          </template>
          <template v-if="outbound.type === 'vless'">
            <div class="field-group">
              <label>UUID</label>
              <input :value="outbound.uuid" @input="updateOutbound(idx, 'uuid', ($event.target as HTMLInputElement).value)" type="text" placeholder="00000000-0000-0000-0000-000000000000" />
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vless.flow }}</label>
              <select :value="outbound.flow || ''" @change="updateOutbound(idx, 'flow', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">None</option>
                <option value="xtls-rprx-vision">xtls-rprx-vision</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vless.network }}</label>
              <select :value="Array.isArray(outbound.network) ? outbound.network[0] : outbound.network || ''" @change="updateOutbound(idx, 'network', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">All (TCP + UDP)</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ t.outbound.vless.packetEncoding }}</label>
              <select :value="outbound.packet_encoding || 'xudp'" @change="updateOutbound(idx, 'packet_encoding', ($event.target as HTMLSelectElement).value)">
                <option value="">Disabled</option>
                <option value="packetaddr">packetaddr</option>
                <option value="xudp">xudp (Default)</option>
              </select>
            </div>
          </template>
          <template v-if="outbound.type === 'trojan'">
            <div class="field-group">
              <label>{{ t.inbound.user.password }}</label>
              <input :value="outbound.password" @input="updateOutbound(idx, 'password', ($event.target as HTMLInputElement).value)" type="password" />
            </div>
            <div class="field-group">
              <label>{{ t.outbound.trojan.network }}</label>
              <select :value="Array.isArray(outbound.network) ? outbound.network[0] : outbound.network || ''" @change="updateOutbound(idx, 'network', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">All (TCP + UDP)</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
          </template>
          <template v-if="outbound.type === 'vmess' || outbound.type === 'vless' || outbound.type === 'trojan'">
            <div class="advanced-section">
              <TlsBlock :model-value="outbound.tls as Record<string, unknown>" mode="outbound" @update:modelValue="updateOutboundNested(idx, 'tls', $event)" />
            </div>
          </template>
          <template v-if="outbound.type === 'vmess' || outbound.type === 'vless' || outbound.type === 'trojan' || outbound.type === 'shadowsocks'">
            <div class="advanced-section">
              <MultiplexBlock :model-value="outbound.multiplex as Record<string, unknown>" mode="outbound" @update:modelValue="updateOutboundNested(idx, 'multiplex', $event)" />
            </div>
          </template>
          <template v-if="outbound.type === 'vmess' || outbound.type === 'vless' || outbound.type === 'trojan'">
            <div class="advanced-section">
              <TransportBlock :model-value="outbound.transport as Record<string, unknown>" @update:modelValue="updateOutboundNested(idx, 'transport', $event)" />
            </div>
          </template>
        </div>
      </div>
      <button @click="addOutbound" class="add-btn">{{ t.outbound.add }}</button>
    </div>
  </div>
</template>

<style scoped>
.outbound-form { padding: 16px; }
.outbounds-list { display: grid; gap: 16px; margin-top: 12px; }
.outbound-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
.outbound-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.outbound-header:hover { background: var(--bg-hover, #e5e5e5); }
.outbound-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.outbound-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.outbound-summary { font-weight: 500; font-size: 14px; }
.outbound-fields { display: flex; flex-direction: column; gap: 12px; }
.outbound-fields > .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.advanced-section { margin-top: 8px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.field-group label { font-size: 13px; font-weight: 500; }
input[type="text"], input[type="number"], input[type="password"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
</style>

