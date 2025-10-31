<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

const props = defineProps<{
  rules: Array<Record<string, unknown>>;
  path: string;
  level: number;
  isExpanded: (path: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'add-sub-rule', path: string, ruleType: 'default' | 'logical'): void;
  (e: 'remove-sub-rule', path: string, subIdx: number): void;
  (e: 'update-sub-rule', path: string, subIdx: number, field: string, value: unknown): void;
  (e: 'toggle-rule', path: string): void;
}>();

const { currentLocale } = useI18n();

function getSubRulePath(subIdx: number): string {
  return props.path ? `${props.path}.${subIdx}` : String(subIdx);
}

function handleAddSubRule(ruleType: 'default' | 'logical') {
  emit('add-sub-rule', props.path, ruleType);
}

function handleRemoveSubRule(subIdx: number) {
  emit('remove-sub-rule', props.path, subIdx);
}

function handleUpdateSubRule(subIdx: number, field: string, value: unknown) {
  emit('update-sub-rule', props.path, subIdx, field, value);
}

function toggleSubRule(subPath: string) {
  emit('toggle-rule', subPath);
}

// 计算当前层级的子规则路径的展开状态
const isThisLevelExpanded = computed(() => props.isExpanded(props.path));

// 获取规则摘要（用于折叠时的显示）
function getRuleSummary(rule: Record<string, unknown>): string {
  const locale = currentLocale.value;
  if (rule.type === 'logical') {
    const subRulesCount = (rule.rules as Array<unknown>)?.length || 0;
    const mode = String(rule.mode || 'and').toUpperCase();
    return `${mode} (${subRulesCount} ${locale === 'zh' ? '子规则' : 'sub-rules'})`;
  } else {
    const parts: string[] = [];
    if (rule.domain) parts.push(`domain:${Array.isArray(rule.domain) ? rule.domain[0] : rule.domain}`);
    if (rule.geoip) parts.push(`geoip:${Array.isArray(rule.geoip) ? rule.geoip[0] : rule.geoip}`);
    if (rule.ip_cidr) parts.push(`ip:${Array.isArray(rule.ip_cidr) ? rule.ip_cidr[0] : rule.ip_cidr}`);
    return parts.length > 0 ? parts.join(', ') : (locale === 'zh' ? '默认规则' : 'Default Rule');
  }
}

// 获取父级路径
function getParentPath(): string | null {
  const parts = props.path.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

</script>

<template>
  <div class="logical-subrules" :class="{ 'has-nesting': level > 0 }" :style="{ '--level': level }">
    <!-- 连接线指示器 -->
    <div v-if="level > 0" class="nesting-line"></div>
    
    <div class="subrules-header" :class="{ 'collapsed': !isThisLevelExpanded }">
      <div class="header-left">
        <button 
          @click="toggleSubRule(props.path)" 
          class="collapse-btn"
          :class="{ expanded: isThisLevelExpanded }"
          :title="isThisLevelExpanded ? (currentLocale === 'zh' ? '折叠' : 'Collapse') : (currentLocale === 'zh' ? '展开' : 'Expand')"
        >
          <span class="collapse-icon">▶</span>
        </button>
        <span class="subrules-title">
          {{ currentLocale === 'zh' ? '子规则' : 'Sub Rules' }} 
          <span class="count-badge">{{ rules?.length || 0 }}</span>
        </span>
        <span v-if="level > 0" class="path-indicator">
          {{ currentLocale === 'zh' ? '层级' : 'Level' }} {{ level + 1 }}
        </span>
      </div>
      <div class="header-actions">
        <button 
          v-if="getParentPath() !== null"
          @click="$emit('toggle-rule', getParentPath()!)"
          class="nav-btn"
          :title="currentLocale === 'zh' ? '返回上一级' : 'Go to parent level'"
        >
          <span>↑</span>
        </button>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="!rules || rules.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <p>{{ currentLocale === 'zh' ? '暂无子规则' : 'No sub rules yet' }}</p>
      <div class="empty-actions">
        <button @click="handleAddSubRule('default')" class="add-btn-icon" :title="currentLocale === 'zh' ? '添加默认规则' : 'Add Default Rule'">
          <span class="icon">+</span>
          <span class="label">{{ currentLocale === 'zh' ? '默认规则' : 'Default' }}</span>
        </button>
        <button @click="handleAddSubRule('logical')" class="add-btn-icon logical" :title="currentLocale === 'zh' ? '添加逻辑规则' : 'Add Logical Rule'">
          <span class="icon">⚡</span>
          <span class="label">{{ currentLocale === 'zh' ? '逻辑规则' : 'Logical' }}</span>
        </button>
      </div>
    </div>
    
    <!-- 规则列表 -->
    <div v-else v-show="isThisLevelExpanded" class="subrules-list">
      <template v-for="(subRule, subIdx) in rules" :key="subIdx">
        <!-- 在规则前添加占位按钮 -->
        <div class="add-rule-placeholder" @click="handleAddSubRule('default')">
          <div class="placeholder-line"></div>
          <button class="add-btn-mini" :title="currentLocale === 'zh' ? '在此处添加默认规则' : 'Add Default Rule Here'">
            <span>+</span>
          </button>
        </div>
        
        <div class="subrule-item" :class="{ 
          'nested-logical': subRule.type === 'logical',
          'collapsed-view': !isExpanded(getSubRulePath(subIdx)) && subRule.type === 'logical'
        }">
          <div class="subrule-header" @click="subRule.type === 'logical' ? toggleSubRule(getSubRulePath(subIdx)) : null" :class="{ 'clickable': subRule.type === 'logical' }">
            <div class="subrule-header-left">
              <button 
                v-if="subRule.type === 'logical'"
                @click.stop="toggleSubRule(getSubRulePath(subIdx))"
                class="rule-collapse-btn"
                :class="{ expanded: isExpanded(getSubRulePath(subIdx)) }"
              >
                <span>▶</span>
              </button>
              <span class="rule-type-badge" :class="subRule.type">
                <span v-if="subRule.type === 'logical'" class="badge-icon">⚡</span>
                <span v-else class="badge-icon">📋</span>
                <span class="badge-text">
                  {{ subRule.type === 'logical' 
                    ? (currentLocale === 'zh' ? '逻辑' : 'Logical') 
                    : (currentLocale === 'zh' ? '默认' : 'Default') }}
                  <template v-if="subRule.type === 'logical'">
                    <span class="mode-tag">({{ String(subRule.mode || 'and').toUpperCase() }})</span>
                  </template>
                </span>
              </span>
              <span class="subrule-index">{{ currentLocale === 'zh' ? '规则' : 'Rule' }} {{ subIdx + 1 }}</span>
              <span v-if="!isExpanded(getSubRulePath(subIdx)) && subRule.type === 'logical'" class="rule-summary">
                {{ getRuleSummary(subRule) }}
              </span>
            </div>
            <div class="subrule-header-actions" @click.stop>
              <button 
                @click="handleRemoveSubRule(subIdx)" 
                class="action-btn remove-btn" 
                :title="currentLocale === 'zh' ? '删除规则' : 'Remove Rule'"
              >
                <span class="icon">🗑️</span>
              </button>
            </div>
          </div>
        
        <!-- Recursive: Nested Logical Rule -->
        <template v-if="subRule.type === 'logical'">
          <div v-show="isExpanded(getSubRulePath(subIdx))" class="nested-logical-content">
            <div class="field-group-section logical-mode">
              <div class="field-group">
                <label>{{ currentLocale === 'zh' ? '模式' : 'Mode' }}</label>
                <select
                  :value="subRule.mode || 'and'"
                  @change="handleUpdateSubRule(subIdx, 'mode', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="and">{{ currentLocale === 'zh' ? 'AND' : 'AND' }}</option>
                  <option value="or">{{ currentLocale === 'zh' ? 'OR' : 'OR' }}</option>
                </select>
              </div>
              <div class="field-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    :checked="!!subRule.invert"
                    @change="handleUpdateSubRule(subIdx, 'invert', ($event.target as HTMLInputElement).checked || undefined)"
                  />
                  {{ currentLocale === 'zh' ? '反转' : 'Invert' }}
                </label>
              </div>
            </div>
            
            <!-- Recursive call -->
            <LogicalRuleTree
              :rules="(subRule.rules as Array<Record<string, unknown>>) || []"
              :path="getSubRulePath(subIdx)"
              :level="level + 1"
              :is-expanded="isExpanded"
              @add-sub-rule="(path, type) => emit('add-sub-rule', path, type)"
              @remove-sub-rule="(path, idx) => emit('remove-sub-rule', path, idx)"
              @update-sub-rule="(path, idx, field, value) => emit('update-sub-rule', path, idx, field, value)"
              @toggle-rule="(path) => emit('toggle-rule', path)"
            />
          </div>
        </template>
        
        <!-- Default Rule Fields -->
        <template v-else>
          <div class="subrule-fields">
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名' : 'Domain' }}</label>
              <input
                :value="Array.isArray(subRule.domain) ? subRule.domain.join(',') : subRule.domain"
                @input="handleUpdateSubRule(subIdx, 'domain', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder="example.com"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名后缀' : 'Domain Suffix' }}</label>
              <input
                :value="Array.isArray(subRule.domain_suffix) ? subRule.domain_suffix.join(',') : subRule.domain_suffix"
                @input="handleUpdateSubRule(subIdx, 'domain_suffix', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder=".cn,.com"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '域名关键字' : 'Domain Keyword' }}</label>
              <input
                :value="Array.isArray(subRule.domain_keyword) ? subRule.domain_keyword.join(',') : subRule.domain_keyword"
                @input="handleUpdateSubRule(subIdx, 'domain_keyword', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder="test"
              />
            </div>
            <div class="field-group">
              <label>GeoIP</label>
              <input
                :value="Array.isArray(subRule.geoip) ? subRule.geoip.join(',') : subRule.geoip"
                @input="handleUpdateSubRule(subIdx, 'geoip', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder="cn,private"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? 'IP CIDR' : 'IP CIDR' }}</label>
              <input
                :value="Array.isArray(subRule.ip_cidr) ? subRule.ip_cidr.join(',') : subRule.ip_cidr"
                @input="handleUpdateSubRule(subIdx, 'ip_cidr', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder="10.0.0.0/24"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '端口' : 'Port' }}</label>
              <input
                :value="Array.isArray(subRule.port) ? subRule.port.join(',') : subRule.port"
                @input="handleUpdateSubRule(subIdx, 'port', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n)))"
                type="text"
                placeholder="80,443"
              />
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '网络' : 'Network' }}</label>
              <select
                :value="Array.isArray(subRule.network) ? subRule.network[0] : subRule.network || ''"
                @change="handleUpdateSubRule(subIdx, 'network', ($event.target as HTMLSelectElement).value || undefined)"
              >
                <option value="">{{ currentLocale === 'zh' ? '全部' : 'All' }}</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div class="field-group">
              <label>{{ currentLocale === 'zh' ? '规则集' : 'Rule Set' }}</label>
              <input
                :value="Array.isArray(subRule.rule_set) ? subRule.rule_set.join(',') : subRule.rule_set"
                @input="handleUpdateSubRule(subIdx, 'rule_set', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
                type="text"
                placeholder="ads,local-rules"
              />
            </div>
          </div>
        </template>
        </div>
      </template>
      
      <!-- 最后一个添加按钮 -->
      <div class="add-rule-placeholder" @click="handleAddSubRule('default')">
        <div class="placeholder-line"></div>
        <button class="add-btn-mini" :title="currentLocale === 'zh' ? '添加默认规则' : 'Add Default Rule'">
          <span>+</span>
        </button>
      </div>
    </div>
    
    <!-- 底部快速添加按钮组 -->
    <div v-if="rules && rules.length > 0 && isThisLevelExpanded" class="quick-add-actions">
      <button @click="handleAddSubRule('default')" class="quick-add-btn">
        <span class="icon">+</span>
        <span>{{ currentLocale === 'zh' ? '默认规则' : 'Default' }}</span>
      </button>
      <button @click="handleAddSubRule('logical')" class="quick-add-btn logical">
        <span class="icon">⚡</span>
        <span>{{ currentLocale === 'zh' ? '逻辑规则' : 'Logical' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.logical-subrules {
  position: relative;
  padding: 16px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.03);
  border: 1px solid rgba(251, 191, 36, 0.15);
  transition: all 0.2s ease;
}

.logical-subrules.has-nesting {
  margin-left: calc(var(--level, 0) * 24px);
  border-left: 2px solid rgba(59, 130, 246, 0.3);
  padding-left: 20px;
}

.nesting-line {
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, 
    rgba(59, 130, 246, 0.3) 0%,
    rgba(59, 130, 246, 0.5) 50%,
    rgba(59, 130, 246, 0.3) 100%
  );
}

.subrules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.subrules-header.collapsed {
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.collapse-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  background: var(--bg-panel, #fff);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.collapse-btn:hover {
  border-color: var(--brand, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
}

.collapse-btn.expanded .collapse-icon {
  transform: rotate(90deg);
}

.collapse-icon {
  font-size: 10px;
  color: var(--text-secondary, #666);
  transition: transform 0.2s ease;
}

.path-indicator {
  font-size: 11px;
  color: var(--text-secondary, #999);
  background: rgba(107, 114, 128, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  background: var(--bg-panel, #fff);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.nav-btn:hover {
  border-color: var(--brand, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
  color: var(--brand, #3b82f6);
}

.subrules-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--brand, #3b82f6);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary, #999);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 13px;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* 规则列表 */
.subrules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 添加规则占位符 */
.add-rule-placeholder {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.subrules-list:hover .add-rule-placeholder,
.add-rule-placeholder:hover {
  opacity: 1;
}

.placeholder-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, 
    transparent 0%,
    rgba(59, 130, 246, 0.3) 50%,
    transparent 100%
  );
}

.add-btn-mini {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--brand, #3b82f6);
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.05);
  color: var(--brand, #3b82f6);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
  padding: 0;
}

.add-btn-mini:hover {
  background: var(--brand, #3b82f6);
  color: white;
  border-style: solid;
  transform: scale(1.1);
}

/* 规则项 */
.subrule-item {
  padding: 14px;
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-panel, #fff);
  transition: all 0.2s ease;
  position: relative;
}

.subrule-item:hover {
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.subrule-item.nested-logical {
  border-left: 4px solid var(--brand, #3b82f6);
  background: linear-gradient(to right,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(59, 130, 246, 0.02) 50%,
    var(--bg-panel, #fff) 100%
  );
}

.subrule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.subrule-header.clickable {
  cursor: pointer;
  border-radius: 6px;
}

.subrule-header.clickable:hover {
  background: rgba(59, 130, 246, 0.03);
}

.rule-collapse-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-right: 6px;
  color: var(--text-secondary, #666);
  transition: transform 0.2s ease;
  font-size: 10px;
}

.rule-collapse-btn.expanded {
  transform: rotate(90deg);
}

.rule-collapse-btn:hover {
  color: var(--brand, #3b82f6);
}

.rule-summary {
  font-size: 11px;
  color: var(--text-secondary, #999);
  font-style: italic;
  margin-left: 8px;
  opacity: 0.8;
}

.subrule-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 规则类型徽章 */
.rule-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.rule-type-badge.logical {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.rule-type-badge.default {
  background: rgba(107, 114, 128, 0.15);
  color: #4b5563;
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.badge-icon {
  font-size: 12px;
}

.mode-tag {
  margin-left: 4px;
  opacity: 0.8;
  font-size: 10px;
}

.subrule-index {
  font-size: 12px;
  color: var(--text-secondary, #999);
  font-weight: 500;
}

.subrule-header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  background: transparent;
  font-size: 14px;
}

.action-btn:hover {
  transform: scale(1.1);
}

.remove-btn {
  color: #ef4444;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 快速添加按钮 */
.quick-add-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.quick-add-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  background: var(--bg-panel, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.quick-add-btn:hover {
  border-color: var(--brand, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
  color: var(--brand, #3b82f6);
}

.quick-add-btn.logical:hover {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  color: #8b5cf6;
}

.quick-add-btn .icon {
  font-size: 14px;
  font-weight: bold;
}

.add-btn-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--brand, #3b82f6);
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.05);
  color: var(--brand, #3b82f6);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-btn-icon:hover {
  background: var(--brand, #3b82f6);
  color: white;
}

.add-btn-icon.logical {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  color: #8b5cf6;
}

.add-btn-icon.logical:hover {
  background: #8b5cf6;
  color: white;
}

.add-btn-icon .icon {
  font-size: 14px;
  font-weight: bold;
}

/* 字段样式 */
.subrule-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.nested-logical-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group.checkbox {
  flex-direction: row;
  align-items: center;
}

.field-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.field-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.field-group-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light, #eee);
}

.field-group-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.field-group-section h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
}

.logical-mode {
  background: rgba(59, 130, 246, 0.05);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

input[type="text"],
select {
  padding: 6px 10px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--brand, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
