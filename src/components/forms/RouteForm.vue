<script setup lang="ts">
import { computed, ref } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';
import LogicalRuleTree from './LogicalRuleTree.vue';

const { t, currentLocale } = useI18n();
const expandedRules = ref<Set<string>>(new Set());
const expandedRuleSets = ref<Set<number>>(new Set());

function toggleRule(path: string) {
  if (expandedRules.value.has(path)) {
    expandedRules.value.delete(path);
  } else {
    expandedRules.value.add(path);
  }
}

function isExpanded(path: string): boolean {
  return expandedRules.value.has(path);
}

function toggleRuleSet(idx: number) {
  if (expandedRuleSets.value.has(idx)) {
    expandedRuleSets.value.delete(idx);
  } else {
    expandedRuleSets.value.add(idx);
  }
}
const route = computed(() => currentConfig.value.route as Record<string, unknown> | undefined || {});
const rules = computed(() => (route.value.rules as Array<Record<string, unknown>>) || []);
const ruleSets = computed(() => (route.value.rule_set as Array<Record<string, unknown>>) || []);

const final = computed(() => (route.value.final as string) || '');

async function updateRouteField(field: string, value: unknown) {
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, [field]: value },
  });
}

async function addRule() {
  const newRules = [...rules.value, {
    type: 'default',
    action: 'route',
    outbound: 'direct',
  }];
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function addLogicalRule() {
  const newRules = [...rules.value, {
    type: 'logical',
    mode: 'and',
    rules: [],
    action: 'route',
    outbound: 'direct',
  }];
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function addSubRule(path: string, ruleType: 'default' | 'logical' = 'default') {
  const pathParts = path.split('.').map(Number);
  const newRules = JSON.parse(JSON.stringify(rules.value)); // 深拷贝
  
  let current: any = newRules;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const idx = pathParts[i];
    if (current[idx]?.type === 'logical') {
      current = current[idx].rules || [];
    } else {
      return; // 路径无效
    }
  }
  
  const parentIdx = pathParts[pathParts.length - 1];
  const parentRule = current[parentIdx];
  
  if (parentRule?.type === 'logical') {
    const subRules = parentRule.rules || [];
    if (ruleType === 'logical') {
      subRules.push({
        type: 'logical',
        mode: 'and',
        rules: [],
        action: 'route',
        outbound: 'direct',
      });
    } else {
      subRules.push({
        type: 'default',
        domain: 'example.com',
      });
    }
    parentRule.rules = subRules;
    await setConfig({
      ...currentConfig.value,
      route: { ...route.value, rules: newRules },
    });
  }
}

async function removeSubRule(path: string, subIdx: number) {
  const pathParts = path.split('.').map(Number);
  const newRules = JSON.parse(JSON.stringify(rules.value)); // 深拷贝
  
  let current: any = newRules;
  for (let i = 0; i < pathParts.length; i++) {
    const idx = pathParts[i];
    if (i === pathParts.length - 1) {
      // 到达目标规则
      if (current[idx]?.type === 'logical') {
        const subRules = current[idx].rules || [];
        subRules.splice(subIdx, 1);
        current[idx].rules = subRules;
      }
      break;
    } else {
      if (current[idx]?.type === 'logical') {
        current = current[idx].rules || [];
      } else {
        return; // 路径无效
      }
    }
  }
  
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function updateSubRule(path: string, subIdx: number, field: string, value: unknown) {
  const pathParts = path.split('.').map(Number);
  const newRules = JSON.parse(JSON.stringify(rules.value)); // 深拷贝
  
  let current: any = newRules;
  for (let i = 0; i < pathParts.length; i++) {
    const idx = pathParts[i];
    if (i === pathParts.length - 1) {
      // 到达目标规则
      if (current[idx]?.type === 'logical') {
        const subRules = [...(current[idx].rules || [])];
        subRules[subIdx] = { ...subRules[subIdx], [field]: value };
        current[idx].rules = subRules;
      }
      break;
    } else {
      if (current[idx]?.type === 'logical') {
        current = current[idx].rules || [];
      } else {
        return; // 路径无效
      }
    }
  }
  
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function removeRule(idx: number) {
  const newRules = rules.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function updateRule(idx: number, field: string, value: unknown) {
  const newRules = [...rules.value];
  newRules[idx] = { ...newRules[idx], [field]: value };
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rules: newRules },
  });
}

async function addRuleSet() {
  const newRuleSets = [...ruleSets.value, {
    type: 'inline',
    tag: 'inline-rules',
    format: 'source',
    rules: [],
  }];
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}

async function removeRuleSet(idx: number) {
  const newRuleSets = ruleSets.value.filter((_, i) => i !== idx);
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}

async function updateRuleSet(idx: number, field: string, value: unknown) {
  const newRuleSets = [...ruleSets.value];
  const ruleSet = { ...newRuleSets[idx] };
  
  // 如果改变类型，需要重置相关字段
  if (field === 'type') {
    if (value === 'inline') {
      ruleSet.rules = ruleSet.rules || [];
      delete ruleSet.format;
      delete ruleSet.path;
      delete ruleSet.url;
      delete ruleSet.download_detour;
      delete ruleSet.update_interval;
    } else if (value === 'local') {
      ruleSet.format = ruleSet.format || 'source';
      ruleSet.path = ruleSet.path || '';
      delete ruleSet.url;
      delete ruleSet.download_detour;
      delete ruleSet.update_interval;
      delete ruleSet.rules;
    } else if (value === 'remote') {
      ruleSet.format = ruleSet.format || 'source';
      ruleSet.url = ruleSet.url || '';
      delete ruleSet.path;
      delete ruleSet.rules;
    }
  }
  
  ruleSet[field] = value;
  newRuleSets[idx] = ruleSet;
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}

async function addInlineRule(ruleSetIdx: number) {
  const newRuleSets = [...ruleSets.value];
  const ruleSet = newRuleSets[ruleSetIdx];
  const inlineRules = (ruleSet.rules as Array<Record<string, unknown>>) || [];
  inlineRules.push({
    domain: 'example.com',
  });
  ruleSet.rules = inlineRules;
  newRuleSets[ruleSetIdx] = { ...ruleSet };
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}

async function removeInlineRule(ruleSetIdx: number, ruleIdx: number) {
  const newRuleSets = [...ruleSets.value];
  const ruleSet = newRuleSets[ruleSetIdx];
  const inlineRules = (ruleSet.rules as Array<Record<string, unknown>>) || [];
  inlineRules.splice(ruleIdx, 1);
  ruleSet.rules = inlineRules;
  newRuleSets[ruleSetIdx] = { ...ruleSet };
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}

async function updateInlineRule(ruleSetIdx: number, ruleIdx: number, field: string, value: unknown) {
  const newRuleSets = [...ruleSets.value];
  const ruleSet = newRuleSets[ruleSetIdx];
  const inlineRules = [...((ruleSet.rules as Array<Record<string, unknown>>) || [])];
  inlineRules[ruleIdx] = { ...inlineRules[ruleIdx], [field]: value };
  ruleSet.rules = inlineRules;
  newRuleSets[ruleSetIdx] = { ...ruleSet };
  await setConfig({
    ...currentConfig.value,
    route: { ...route.value, rule_set: newRuleSets },
  });
}
</script>

<template>
  <div class="route-form">
    <h3>{{ t.route.title }}</h3>
    
    <!-- Final Outbound -->
    <div class="section">
      <h4>{{ t.route.final }}</h4>
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '默认出站标签' : 'Default Outbound Tag' }}</label>
        <input :value="final" @input="updateRouteField('final', ($event.target as HTMLInputElement).value)" type="text" placeholder="outbound-tag" />
      </div>
    </div>

    <!-- Rules -->
    <div class="section">
      <h4>{{ t.route.rules }}</h4>
      <div class="rules-list">
        <div v-for="(rule, idx) in rules" :key="idx" class="rule-item">
          <div class="rule-header" @click="toggleRule(String(idx))">
            <div class="rule-header-main">
              <span class="expand-icon" :class="{ expanded: isExpanded(String(idx)) }">▶</span>
              <span class="rule-summary">
                {{ currentLocale === 'zh' ? '规则' : 'Rule' }} {{ idx + 1 }}: 
                {{ rule.action || 'route' }}
                <template v-if="rule.action === 'route' && rule.outbound"> → {{ rule.outbound }}</template>
              </span>
            </div>
            <div class="rule-header-actions" @click.stop>
              <label>{{ currentLocale === 'zh' ? '动作' : 'Action' }}</label>
              <select :value="rule.action || 'route'" @change="updateRule(idx, 'action', ($event.target as HTMLSelectElement).value)">
                <option value="route">{{ currentLocale === 'zh' ? '路由' : 'Route' }}</option>
                <option value="direct">{{ currentLocale === 'zh' ? '直连' : 'Direct' }}</option>
                <option value="reject">{{ currentLocale === 'zh' ? '拒绝' : 'Reject' }}</option>
                <option value="hijack-dns">{{ currentLocale === 'zh' ? '劫持 DNS' : 'Hijack DNS' }}</option>
              </select>
              <label v-if="rule.action === 'route'">{{ currentLocale === 'zh' ? '出站' : 'Outbound' }}</label>
              <input v-if="rule.action === 'route'" :value="rule.outbound" @input="updateRule(idx, 'outbound', ($event.target as HTMLInputElement).value)" type="text" placeholder="outbound-tag" />
              <button @click="removeRule(idx)">{{ t.inbound.remove }}</button>
            </div>
          </div>
          <div v-show="isExpanded(String(idx))" class="rule-fields">
            <!-- Logical Rule Mode Selector -->
            <template v-if="rule.type === 'logical'">
              <div class="field-group-section logical-mode">
                <h5>{{ currentLocale === 'zh' ? '逻辑模式' : 'Logical Mode' }}</h5>
                <div class="field-group">
                  <label>{{ currentLocale === 'zh' ? '模式' : 'Mode' }}</label>
                  <select :value="rule.mode || 'and'" @change="updateRule(idx, 'mode', ($event.target as HTMLSelectElement).value)">
                    <option value="and">{{ currentLocale === 'zh' ? 'AND - 所有子规则必须匹配' : 'AND - All sub-rules must match' }}</option>
                    <option value="or">{{ currentLocale === 'zh' ? 'OR - 任一子规则匹配即可' : 'OR - Any sub-rule can match' }}</option>
                  </select>
                </div>
                <div class="field-group checkbox">
                  <label>
                    <input type="checkbox" :checked="!!rule.invert" @change="updateRule(idx, 'invert', ($event.target as HTMLInputElement).checked || undefined)" />
                    {{ currentLocale === 'zh' ? '反转结果' : 'Invert Result' }}
                  </label>
                </div>
              </div>
              
              <!-- Sub-rules for Logical Rule (Recursive) -->
              <LogicalRuleTree
                :rules="(rule.rules as Array<Record<string, unknown>>) || []"
                :path="String(idx)"
                :level="0"
                :is-expanded="(path) => {
                  // 默认展开顶级规则
                  if (path === String(idx)) return expandedRules.has(path) || expandedRules.size === 0;
                  return expandedRules.has(path);
                }"
                @add-sub-rule="(path, type) => addSubRule(path, type)"
                @remove-sub-rule="(path, idx) => removeSubRule(path, idx)"
                @update-sub-rule="(path, idx, field, value) => updateSubRule(path, idx, field, value)"
                @toggle-rule="toggleRule"
              />
              
              <!-- Action for Logical Rule -->
              <div class="field-group-section">
                <h5>{{ currentLocale === 'zh' ? '动作' : 'Action' }}</h5>
                <div class="field-group">
                  <label>{{ currentLocale === 'zh' ? '动作类型' : 'Action Type' }}</label>
                  <select :value="rule.action || 'route'" @change="updateRule(idx, 'action', ($event.target as HTMLSelectElement).value)">
                    <option value="route">{{ currentLocale === 'zh' ? '路由' : 'Route' }}</option>
                    <option value="direct">{{ currentLocale === 'zh' ? '直连' : 'Direct' }}</option>
                    <option value="reject">{{ currentLocale === 'zh' ? '拒绝' : 'Reject' }}</option>
                  </select>
                </div>
                <div v-if="rule.action === 'route'" class="field-group">
                  <label>{{ currentLocale === 'zh' ? '出站标签' : 'Outbound Tag' }}</label>
                  <input :value="rule.outbound" @input="updateRule(idx, 'outbound', ($event.target as HTMLInputElement).value)" type="text" placeholder="outbound-tag" />
                </div>
              </div>
            </template>
            
            <!-- Default Rule Fields -->
            <template v-else>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '域名匹配' : 'Domain Matching' }}</h5>
              <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '完整域名' : 'Domain' }}</label>
              <input :value="Array.isArray(rule.domain) ? rule.domain.join(',') : rule.domain" @input="updateRule(idx, 'domain', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="example.com" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名后缀' : 'Domain Suffix' }}</label>
              <input :value="Array.isArray(rule.domain_suffix) ? rule.domain_suffix.join(',') : rule.domain_suffix" @input="updateRule(idx, 'domain_suffix', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder=".cn,.com" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名关键字' : 'Domain Keyword' }}</label>
              <input :value="Array.isArray(rule.domain_keyword) ? rule.domain_keyword.join(',') : rule.domain_keyword" @input="updateRule(idx, 'domain_keyword', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="test,example" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名正则' : 'Domain Regex' }}</label>
              <input :value="Array.isArray(rule.domain_regex) ? rule.domain_regex.join(',') : rule.domain_regex" @input="updateRule(idx, 'domain_regex', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="^stun\\..+" />
            </div>
            <div class="field-group">
              <label>GeoSite</label>
              <input :value="Array.isArray(rule.geosite) ? rule.geosite.join(',') : rule.geosite" @input="updateRule(idx, 'geosite', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="cn,ads" />
            </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? 'IP 匹配' : 'IP Matching' }}</h5>
              <!-- IP Matchers -->
            <div class="field-group">
              <label>GeoIP</label>
              <input :value="Array.isArray(rule.geoip) ? rule.geoip.join(',') : rule.geoip" @input="updateRule(idx, 'geoip', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="cn,private" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'IP CIDR' : 'IP CIDR' }}</label>
              <input :value="Array.isArray(rule.ip_cidr) ? rule.ip_cidr.join(',') : rule.ip_cidr" @input="updateRule(idx, 'ip_cidr', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="10.0.0.0/24" />
            </div>
            <div class="field-group checkbox">
              <label>
                <input type="checkbox" :checked="!!rule.ip_is_private" @change="updateRule(idx, 'ip_is_private', ($event.target as HTMLInputElement).checked || undefined)" />
                {{ currentLocale === 'zh' ? 'IP 是私有地址' : 'IP Is Private' }}
              </label>
            </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '端口匹配' : 'Port Matching' }}</h5>
              <!-- Port Matchers -->
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '端口' : 'Port' }}</label>
              <input :value="Array.isArray(rule.port) ? rule.port.join(',') : rule.port" @input="updateRule(idx, 'port', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n)))" type="text" placeholder="80,443" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '端口范围' : 'Port Range' }}</label>
              <input :value="Array.isArray(rule.port_range) ? rule.port_range.join(',') : rule.port_range" @input="updateRule(idx, 'port_range', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="1000:2000,:3000,4000:" />
            </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '网络与协议' : 'Network & Protocol' }}</h5>
              <!-- Network & Protocol -->
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '网络协议' : 'Network' }}</label>
              <select :value="Array.isArray(rule.network) ? rule.network[0] : rule.network || ''" @change="updateRule(idx, 'network', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">All</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '应用协议' : 'Protocol' }}</label>
              <input :value="Array.isArray(rule.protocol) ? rule.protocol.join(',') : rule.protocol" @input="updateRule(idx, 'protocol', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="tls,http" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'IP 版本' : 'IP Version' }}</label>
              <select :value="rule.ip_version || ''" @change="updateRule(idx, 'ip_version', ($event.target as HTMLSelectElement).value || undefined)">
                <option value="">All</option>
                <option value="4">IPv4</option>
                <option value="6">IPv6</option>
              </select>
            </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '源地址匹配' : 'Source Matching' }}</h5>
              <!-- Source Matchers -->
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '源 IP CIDR' : 'Source IP CIDR' }}</label>
              <input :value="Array.isArray(rule.source_ip_cidr) ? rule.source_ip_cidr.join(',') : rule.source_ip_cidr" @input="updateRule(idx, 'source_ip_cidr', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="10.0.0.0/24" />
            </div>
            <div class="field-group checkbox">
              <label>
                <input type="checkbox" :checked="!!rule.source_ip_is_private" @change="updateRule(idx, 'source_ip_is_private', ($event.target as HTMLInputElement).checked || undefined)" />
                {{ currentLocale === 'zh' ? '源 IP 是私有地址' : 'Source IP Is Private' }}
              </label>
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '源端口' : 'Source Port' }}</label>
              <input :value="Array.isArray(rule.source_port) ? rule.source_port.join(',') : rule.source_port" @input="updateRule(idx, 'source_port', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n)))" type="text" placeholder="12345" />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '源端口范围' : 'Source Port Range' }}</label>
              <input :value="Array.isArray(rule.source_port_range) ? rule.source_port_range.join(',') : rule.source_port_range" @input="updateRule(idx, 'source_port_range', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="1000:2000" />
            </div>
            </div>
            <div class="field-group-section">
              <h5>{{ currentLocale === 'zh' ? '其他选项' : 'Other Options' }}</h5>
              <!-- Other Options -->
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '入站标签' : 'Inbound Tag' }}</label>
              <input :value="Array.isArray(rule.inbound) ? rule.inbound.join(',') : rule.inbound" @input="updateRule(idx, 'inbound', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" type="text" placeholder="mixed-in" />
            </div>
            <div class="field-group checkbox">
              <label>
                <input type="checkbox" :checked="!!rule.invert" @change="updateRule(idx, 'invert', ($event.target as HTMLInputElement).checked || undefined)" />
                {{ currentLocale === 'zh' ? '反转匹配' : 'Invert' }}
              </label>
            </div>
            </div>
            </template>
          </div>
        </div>
        <div class="add-buttons">
          <button @click="addRule" class="add-btn">{{ currentLocale === 'zh' ? '添加默认规则' : 'Add Default Rule' }}</button>
          <button @click="addLogicalRule" class="add-btn">{{ currentLocale === 'zh' ? '添加逻辑规则' : 'Add Logical Rule' }}</button>
        </div>
      </div>
    </div>

    <!-- Rule Sets -->
    <div class="section">
      <h4>{{ currentLocale === 'zh' ? '规则集' : 'Rule Sets' }}</h4>
      <div class="rulesets-list">
        <div v-for="(rs, idx) in ruleSets" :key="idx" class="ruleset-item">
          <div class="ruleset-header" @click="toggleRuleSet(idx)">
            <div class="ruleset-header-main">
              <span class="expand-icon" :class="{ expanded: expandedRuleSets.has(idx) }">▶</span>
              <span class="ruleset-summary">
                {{ rs.tag || (currentLocale === 'zh' ? '规则集' : 'Rule Set') }} {{ idx + 1 }} ({{ rs.type || 'inline' }})
              </span>
            </div>
            <div class="ruleset-header-actions" @click.stop>
              <label>{{ currentLocale === 'zh' ? '类型' : 'Type' }}</label>
              <select :value="rs.type || 'inline'" @change="updateRuleSet(idx, 'type', ($event.target as HTMLSelectElement).value)">
                <option value="inline">Inline</option>
                <option value="local">Local</option>
                <option value="remote">Remote</option>
              </select>
              <label>Tag</label>
              <input :value="rs.tag" @input="updateRuleSet(idx, 'tag', ($event.target as HTMLInputElement).value)" type="text" />
              <button @click="removeRuleSet(idx)">{{ t.inbound.remove }}</button>
            </div>
          </div>
          <div v-show="expandedRuleSets.has(idx)" class="ruleset-fields">
            <!-- Inline Rule Set -->
            <template v-if="rs.type === 'inline' || !rs.type">
              <div class="field-group-section">
                <h5>{{ currentLocale === 'zh' ? '内联规则' : 'Inline Rules' }}</h5>
                <div class="inline-rules-list">
                  <div v-for="(inlineRule, ruleIdx) in ((rs.rules as Array<Record<string, unknown>>) || [])" :key="ruleIdx" class="inline-rule-item">
                    <div class="inline-rule-header">
                      <span>{{ currentLocale === 'zh' ? '规则' : 'Rule' }} {{ ruleIdx + 1 }}</span>
                      <button @click="removeInlineRule(idx, ruleIdx)" class="remove-btn-small">{{ currentLocale === 'zh' ? '删除' : 'Remove' }}</button>
                    </div>
                    <div class="inline-rule-fields">
                      <div class="field-group">
                        <label>{{ currentLocale === 'zh' ? '域名' : 'Domain' }}</label>
                        <input
                          :value="Array.isArray(inlineRule.domain) ? inlineRule.domain.join(',') : inlineRule.domain"
                          @input="updateInlineRule(idx, ruleIdx, 'domain', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                          type="text"
                          placeholder="example.com"
                        />
                      </div>
                      <div class="field-group">
                        <label>{{ currentLocale === 'zh' ? 'IP CIDR' : 'IP CIDR' }}</label>
                        <input
                          :value="Array.isArray(inlineRule.ip_cidr) ? inlineRule.ip_cidr.join(',') : inlineRule.ip_cidr"
                          @input="updateInlineRule(idx, ruleIdx, 'ip_cidr', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                          type="text"
                          placeholder="10.0.0.0/24"
                        />
                      </div>
                      <div class="field-group">
                        <label>{{ currentLocale === 'zh' ? '端口' : 'Port' }}</label>
                        <input
                          :value="Array.isArray(inlineRule.port) ? inlineRule.port.join(',') : inlineRule.port"
                          @input="updateInlineRule(idx, ruleIdx, 'port', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n)))"
                          type="text"
                          placeholder="80,443"
                        />
                      </div>
                    </div>
                  </div>
                  <button @click="addInlineRule(idx)" class="add-subrule-btn">{{ currentLocale === 'zh' ? '添加规则' : 'Add Rule' }}</button>
                </div>
              </div>
            </template>
            
            <!-- Local Rule Set -->
            <template v-if="rs.type === 'local'">
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '格式' : 'Format' }}</label>
                <select :value="rs.format || 'source'" @change="updateRuleSet(idx, 'format', ($event.target as HTMLSelectElement).value)">
                  <option value="source">source</option>
                  <option value="binary">binary</option>
                </select>
                <p class="field-hint">{{ currentLocale === 'zh' ? '规则集文件格式' : 'Rule set file format' }}</p>
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '文件路径' : 'File Path' }}</label>
                <input :value="rs.path" @input="updateRuleSet(idx, 'path', ($event.target as HTMLInputElement).value)" type="text" placeholder="./rules.json" />
                <p class="field-hint">{{ currentLocale === 'zh' ? '本地规则集文件的路径' : 'Path to local rule set file' }}</p>
              </div>
            </template>
            
            <!-- Remote Rule Set -->
            <template v-if="rs.type === 'remote'">
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '格式' : 'Format' }}</label>
                <select :value="rs.format || 'source'" @change="updateRuleSet(idx, 'format', ($event.target as HTMLSelectElement).value)">
                  <option value="source">source</option>
                  <option value="binary">binary</option>
                </select>
              </div>
              <div class="field-group">
                <label>URL</label>
                <input :value="rs.url" @input="updateRuleSet(idx, 'url', ($event.target as HTMLInputElement).value)" type="text" placeholder="https://example.com/rules.json" />
                <p class="field-hint">{{ currentLocale === 'zh' ? '远程规则集的下载 URL' : 'Download URL for remote rule set' }}</p>
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '下载出站' : 'Download Detour' }}</label>
                <input
                  :value="rs.download_detour || ''"
                  @input="updateRuleSet(idx, 'download_detour', ($event.target as HTMLInputElement).value || undefined)"
                  type="text"
                  placeholder="direct"
                />
                <p class="field-hint">{{ currentLocale === 'zh' ? '用于下载规则集的出站标签（可选）' : 'Outbound tag for downloading rule set (optional)' }}</p>
              </div>
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '更新间隔' : 'Update Interval' }}</label>
                <input
                  :value="rs.update_interval || '1d'"
                  @input="updateRuleSet(idx, 'update_interval', ($event.target as HTMLInputElement).value || undefined)"
                  type="text"
                  placeholder="1d"
                />
                <p class="field-hint">{{ currentLocale === 'zh' ? '自动更新间隔，如：1d, 6h' : 'Auto update interval, e.g.: 1d, 6h' }}</p>
              </div>
            </template>
          </div>
        </div>
        <button @click="addRuleSet" class="add-btn">{{ currentLocale === 'zh' ? '添加规则集' : 'Add Rule Set' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-form { padding: 16px; }
.section { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border, #e5e7eb); }
.section:last-child { border-bottom: none; }
.section h4 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }
.rules-list, .rulesets-list { display: grid; gap: 16px; margin-top: 12px; }
.rule-item, .ruleset-item { padding: 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
.rule-header, .ruleset-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app, #f5f5f5); border-radius: 4px; cursor: pointer; margin-bottom: 8px; }
.rule-header:hover, .ruleset-header:hover { background: var(--bg-hover, #e5e5e5); }
.rule-header-main, .ruleset-header-main { display: flex; align-items: center; gap: 8px; flex: 1; }
.rule-header-actions, .ruleset-header-actions { display: flex; align-items: center; gap: 8px; }
.expand-icon { transition: transform 0.2s; font-size: 10px; color: var(--text-secondary, #666); }
.expand-icon.expanded { transform: rotate(90deg); }
.rule-summary, .ruleset-summary { font-weight: 500; font-size: 14px; }
.rule-fields, .ruleset-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light, #eee); }
.field-group-section:last-child { border-bottom: none; margin-bottom: 0; }
.field-group-section h5 { margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; }
input[type="text"], select { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input:focus, select:focus { outline: none; border-color: var(--brand, #3b82f6); }
button { padding: 6px 12px; cursor: pointer; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); }
button:hover { background: var(--bg-app, #f5f5f5); }
.add-btn { margin-top: 8px; background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.add-btn:hover { background: var(--brand-hover, #2563eb); }
.add-buttons { display: flex; gap: 8px; margin-top: 12px; }
.logical-mode { background: rgba(59, 130, 246, 0.05); padding: 12px; border-radius: 6px; }
.logical-subrules { background: rgba(251, 191, 36, 0.05); padding: 12px; border-radius: 6px; }
.subrules-list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.subrule-item { padding: 12px; border: 1px solid var(--border-light, #eee); border-radius: 6px; background: var(--bg-panel, #fff); }
.subrule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.subrule-label { font-weight: 600; font-size: 13px; }
.subrule-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.remove-btn-small { padding: 4px 8px; font-size: 11px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; }
.remove-btn-small:hover { background: rgba(239, 68, 68, 0.2); }
.add-subrule-btn { margin-top: 8px; padding: 6px 12px; background: var(--brand, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.add-subrule-btn:hover { background: var(--brand-hover, #2563eb); }
.inline-rules-list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.inline-rule-item { padding: 12px; border: 1px solid var(--border-light, #eee); border-radius: 6px; background: var(--bg-panel, #fff); }
.inline-rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.inline-rule-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.field-hint { font-size: 11px; color: var(--text-secondary, #666); margin: 0; margin-top: 2px; }

/* 移动端优化 */
@media (max-width: 767px) {
  .rule-header-actions,
  .ruleset-header-actions {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  
  .rule-header,
  .ruleset-header {
    flex-direction: column !important;
    align-items: stretch !important;
  }
  
  .rule-header-actions,
  .ruleset-header-actions {
    width: 100% !important;
  }
  
  .rule-header-actions > label,
  .ruleset-header-actions > label {
    font-size: 11px !important;
  }
  
  .rule-header-actions > select,
  .rule-header-actions > input,
  .ruleset-header-actions > select,
  .ruleset-header-actions > input {
    font-size: 12px !important;
  }
  
  .rule-header-actions > button,
  .ruleset-header-actions > button {
    flex: 1;
    min-width: 80px;
  }
  
  .rule-fields,
  .ruleset-fields {
    grid-template-columns: 1fr !important;
  }
  
  .inline-rule-fields {
    grid-template-columns: 1fr !important;
  }
  
  .inline-rule-header button {
    width: 100%;
  }
}
</style>

