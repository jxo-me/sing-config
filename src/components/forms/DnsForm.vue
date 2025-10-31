<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { t, currentLocale } = useI18n();
const dns = computed(() => currentConfig.value.dns as Record<string, unknown> | undefined || {});
const servers = computed(() => (dns.value.servers as Array<Record<string, unknown>>) || []);
const rules = computed(() => (dns.value.rules as Array<Record<string, unknown>>) || []);
const expandedRules = ref<Set<number>>(new Set());

async function updateServer(idx: number, field: string, value: unknown) {
  const newServers = [...servers.value];
  newServers[idx] = { ...newServers[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, servers: newServers },
  });
}

async function addServer() {
  const newServers = [...servers.value, { type: 'local', tag: 'local' }];
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, servers: newServers },
  });
}

async function removeServer(idx: number) {
  const newServers = servers.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, servers: newServers },
  });
}

async function updateDnsField(field: string, value: unknown) {
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, [field]: value },
  });
}

const final = computed(() => (dns.value.final as string) || '');
const strategy = computed(() => (dns.value.strategy as string) || '');
const disableCache = computed(() => (dns.value.disable_cache as boolean) || false);
const disableExpire = computed(() => (dns.value.disable_expire as boolean) || false);
const independentCache = computed(() => (dns.value.independent_cache as boolean) || false);
const cacheCapacity = computed(() => (dns.value.cache_capacity as number) || 0);
const reverseMapping = computed(() => (dns.value.reverse_mapping as boolean) || false);
const clientSubnet = computed(() => (dns.value.client_subnet as string) || '');

function toggleDnsRule(idx: number) {
  if (expandedRules.value.has(idx)) {
    expandedRules.value.delete(idx);
  } else {
    expandedRules.value.add(idx);
  }
}

async function addDnsRule() {
  const newRules = [...rules.value, {
    server: [],
    disable_cache: false,
  }];
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, rules: newRules },
  });
}

async function removeDnsRule(idx: number) {
  const newRules = rules.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, rules: newRules },
  });
}

async function updateDnsRule(idx: number, field: string, value: unknown) {
  const newRules = [...rules.value];
  newRules[idx] = { ...newRules[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    dns: { ...dns.value, rules: newRules },
  });
}
</script>

<template>
  <div class="dns-form">
    <h3>{{ t.dns.title }}</h3>
    <div class="servers">
      <div v-for="(s, idx) in servers" :key="idx" class="server-item">
        <label :title="t.fields.type.description">{{ t.fields.type.label }}</label>
        <select :value="s.type" @change="updateServer(idx, 'type', ($event.target as HTMLSelectElement).value)">
          <option value="local">{{ t.dns.server.types.local }}</option>
          <option value="tcp">{{ t.dns.server.types.tcp }}</option>
          <option value="udp">{{ t.dns.server.types.udp }}</option>
          <option value="tls">{{ t.dns.server.types.tls }}</option>
          <option value="https">{{ t.dns.server.types.https }}</option>
          <option value="quic">{{ t.dns.server.types.quic }}</option>
          <option value="h3">{{ t.dns.server.types.h3 }}</option>
          <option value="hosts">{{ t.dns.server.types.hosts }}</option>
          <option value="dhcp">{{ t.dns.server.types.dhcp }}</option>
          <option value="fakeip">{{ t.dns.server.types.fakeip }}</option>
          <option value="tailscale">{{ t.dns.server.types.tailscale }}</option>
          <option value="resolved">{{ t.dns.server.types.resolved }}</option>
        </select>
        <label :title="t.fields.tag.description">{{ t.fields.tag.label }}</label>
        <input :value="s.tag" @input="updateServer(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
        <button @click="removeServer(idx)">{{ t.dns.server.remove }}</button>
      </div>
      <button @click="addServer">{{ t.dns.server.add }}</button>
    </div>
    <div class="global-settings">
      <h4>{{ t.dns.title }} - {{ currentLocale === 'zh' ? '全局设置' : 'Global Settings' }}</h4>
      <div class="field-group">
        <label :title="currentLocale === 'zh' ? '默认 DNS 服务器的标签' : 'Default DNS server tag'">{{ t.dns.final }}</label>
        <input :value="final" @input="updateDnsField('final', ($event.target as HTMLInputElement).value)" type="text" placeholder="server-tag" />
      </div>
      <div class="field-group">
        <label>{{ t.dns.strategy }}</label>
        <select :value="strategy" @change="updateDnsField('strategy', ($event.target as HTMLSelectElement).value)">
          <option value="">{{ currentLocale === 'zh' ? '默认' : 'Default' }}</option>
          <option value="prefer_ipv4">{{ t.dns.strategies.prefer_ipv4 }}</option>
          <option value="prefer_ipv6">{{ t.dns.strategies.prefer_ipv6 }}</option>
          <option value="ipv4_only">{{ t.dns.strategies.ipv4_only }}</option>
          <option value="ipv6_only">{{ t.dns.strategies.ipv6_only }}</option>
        </select>
      </div>
      <div class="field-group checkbox">
        <label>
          <input type="checkbox" :checked="disableCache" @change="updateDnsField('disable_cache', ($event.target as HTMLInputElement).checked)" />
          {{ t.dns.disableCache }}
        </label>
      </div>
      <div class="field-group checkbox">
        <label>
          <input type="checkbox" :checked="disableExpire" @change="updateDnsField('disable_expire', ($event.target as HTMLInputElement).checked)" />
          {{ t.dns.disableExpire }}
        </label>
      </div>
      <div class="field-group checkbox">
        <label>
          <input type="checkbox" :checked="independentCache" @change="updateDnsField('independent_cache', ($event.target as HTMLInputElement).checked)" />
          {{ t.dns.independentCache }}
        </label>
      </div>
      <div class="field-group">
        <label>{{ t.dns.cacheCapacity }}</label>
        <input :value="cacheCapacity" @input="updateDnsField('cache_capacity', Number(($event.target as HTMLInputElement).value) || 0)" type="number" min="0" />
      </div>
      <div class="field-group checkbox">
        <label>
          <input type="checkbox" :checked="reverseMapping" @change="updateDnsField('reverse_mapping', ($event.target as HTMLInputElement).checked)" />
          {{ t.dns.reverseMapping }}
        </label>
      </div>
      <div class="field-group">
        <label>{{ t.dns.clientSubnet }}</label>
        <input :value="clientSubnet" @input="updateDnsField('client_subnet', ($event.target as HTMLInputElement).value)" type="text" placeholder="0.0.0.0/0" />
      </div>
    </div>
    
    <!-- DNS Rules -->
    <div class="dns-rules-section">
      <h4>{{ t.dns.rules }}</h4>
      <div class="rules-list">
        <div v-for="(rule, idx) in rules" :key="idx" class="rule-item">
          <div class="rule-header" @click="toggleDnsRule(idx)">
            <div class="rule-header-main">
              <span class="expand-icon" :class="{ expanded: expandedRules.has(idx) }">▶</span>
              <span class="rule-summary">
                {{ currentLocale === 'zh' ? 'DNS 规则' : 'DNS Rule' }} {{ idx + 1 }}
                <template v-if="Array.isArray(rule.server) && rule.server.length > 0">
                  → {{ rule.server.join(', ') }}
                </template>
              </span>
            </div>
            <div class="rule-header-actions" @click.stop>
              <button @click="removeDnsRule(idx)">{{ t.dns.server.remove }}</button>
            </div>
          </div>
          <div v-show="expandedRules.has(idx)" class="rule-fields">
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '服务器' : 'Servers' }}</h5>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? 'DNS 服务器标签' : 'DNS Server Tags' }}</label>
                <input :value="Array.isArray(rule.server) ? rule.server.join(',') : rule.server" @input="updateDnsRule(idx, 'server', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="dns1,dns2" />
              </div>
              <div class="field-group checkbox">
                <label>
                  <input type="checkbox" :checked="!!rule.disable_cache" @change="updateDnsRule(idx, 'disable_cache', ($event.target as HTMLInputElement).checked)" />
                  {{ currentLocale === 'zh' ? '禁用缓存' : 'Disable Cache' }}
                </label>
              </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '域名匹配' : 'Domain Matching' }}</h5>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '完整域名' : 'Domain' }}</label>
                <input :value="Array.isArray(rule.domain) ? rule.domain.join(',') : rule.domain" @input="updateDnsRule(idx, 'domain', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="example.com" />
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '域名后缀' : 'Domain Suffix' }}</label>
                <input :value="Array.isArray(rule.domain_suffix) ? rule.domain_suffix.join(',') : rule.domain_suffix" @input="updateDnsRule(idx, 'domain_suffix', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder=".cn,.com" />
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '域名关键字' : 'Domain Keyword' }}</label>
                <input :value="Array.isArray(rule.domain_keyword) ? rule.domain_keyword.join(',') : rule.domain_keyword" @input="updateDnsRule(idx, 'domain_keyword', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="test,example" />
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '域名正则' : 'Domain Regex' }}</label>
                <input :value="Array.isArray(rule.domain_regex) ? rule.domain_regex.join(',') : rule.domain_regex" @input="updateDnsRule(idx, 'domain_regex', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="^stun\\..+" />
              </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '其他匹配条件' : 'Other Matching' }}</h5>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '查询类型' : 'Query Type' }}</label>
                <input :value="Array.isArray(rule.query_type) ? rule.query_type.join(',') : rule.query_type" @input="updateDnsRule(idx, 'query_type', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="A,AAAA,HTTPS" />
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '网络协议' : 'Network' }}</label>
                <select :value="rule.network || ''" @change="updateDnsRule(idx, 'network', ($event.target as HTMLSelectElement).value || undefined)">
                  <option value="">All</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                </select>
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? 'IP 版本' : 'IP Version' }}</label>
                <select :value="rule.ip_version || ''" @change="updateDnsRule(idx, 'ip_version', ($event.target as HTMLSelectElement).value || undefined)">
                  <option value="">All</option>
                  <option value="4">IPv4</option>
                  <option value="6">IPv6</option>
                </select>
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '入站标签' : 'Inbound Tag' }}</label>
                <input :value="Array.isArray(rule.inbound) ? rule.inbound.join(',') : rule.inbound" @input="updateDnsRule(idx, 'inbound', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="mixed-in" />
              </div>
            </div>
          </div>
        </div>
        <button @click="addDnsRule" class="add-btn">{{ currentLocale === 'zh' ? '添加 DNS 规则' : 'Add DNS Rule' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dns-form { padding: 16px; }
.servers { display: grid; gap: 12px; margin-top: 12px; }
.server-item { display: grid; grid-template-columns: auto 1fr auto 1fr auto; gap: 8px; align-items: center; padding: 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; }
.global-settings { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border, #e5e7eb); }
.global-settings h4 { margin: 0 0 16px 0; font-size: 16px; }
.dns-rules-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border, #e5e7eb); }
.dns-rules-section h4 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }
.rules-list { display: grid; gap: 16px; margin-top: 12px; }
.rule-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
.rule-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.rule-header:hover { background: var(--bg-hover, #e5e5e5); }
.rule-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.rule-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.rule-summary { font-weight: 500; font-size: 14px; }
.rule-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light, #eee); }
.field-group-section:last-child { border-bottom: none; margin-bottom: 0; }
.field-group-section h5 { margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
input[type="text"], input[type="number"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, input[type="number"]:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
input[type="checkbox"] { cursor: pointer; }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
</style>
