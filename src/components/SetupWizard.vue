<script setup lang="ts">
import { ref, computed } from 'vue';
import { setConfig } from '../stores/config';
import { useI18n } from '../i18n';
import { templates, applyTemplate, type ConfigTemplate } from '../lib/templates';

const { currentLocale } = useI18n();

const step = ref(1);
const totalSteps = 5;

const selectedOutboundTemplate = ref<ConfigTemplate | null>(null);
const selectedInboundTemplate = ref<ConfigTemplate | null>(null);
const selectedDnsTemplate = ref<ConfigTemplate | null>(null);
const routeFinal = ref('');

const outboundTemplates = computed(() => templates.filter(t => t.category === 'outbound'));
const inboundTemplates = computed(() => templates.filter(t => t.category === 'inbound'));
const dnsTemplates = computed(() => templates.filter(t => t.category === 'dns'));

function nextStep() {
  if (step.value < totalSteps) {
    step.value++;
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--;
  }
}

function selectTemplate(template: ConfigTemplate, category: 'outbound' | 'inbound' | 'dns') {
  if (category === 'outbound') {
    selectedOutboundTemplate.value = template;
  } else if (category === 'inbound') {
    selectedInboundTemplate.value = template;
  } else if (category === 'dns') {
    selectedDnsTemplate.value = template;
  }
}

async function finishWizard() {
  let config: Record<string, unknown> = {
    inbounds: [],
    outbounds: [],
    route: {},
  };
  
  if (selectedOutboundTemplate.value) {
    config = applyTemplate(selectedOutboundTemplate.value, config);
  }
  
  if (selectedInboundTemplate.value) {
    config = applyTemplate(selectedInboundTemplate.value, config);
  }
  
  if (selectedDnsTemplate.value) {
    config = applyTemplate(selectedDnsTemplate.value, config);
  }
  
  if (routeFinal.value) {
    config.route = { ...(config.route as Record<string, unknown> || {}), final: routeFinal.value };
  }
  
  await setConfig(config);
  emit('close');
}

const emit = defineEmits<{ (e: 'close'): void }>();

const stepTitle = computed(() => {
  const titles = {
    1: currentLocale.value === 'zh' ? '选择出站模板' : 'Select Outbound Template',
    2: currentLocale.value === 'zh' ? '选择入站模板' : 'Select Inbound Template',
    3: currentLocale.value === 'zh' ? '选择 DNS 方案' : 'Select DNS Scheme',
    4: currentLocale.value === 'zh' ? '设置默认路由' : 'Set Default Route',
    5: currentLocale.value === 'zh' ? '完成配置' : 'Finish Setup',
  };
  return titles[step.value as keyof typeof titles];
});
</script>

<template>
  <div class="setup-wizard">
    <div class="wizard-header">
      <h2>{{ currentLocale === 'zh' ? '配置向导' : 'Setup Wizard' }}</h2>
      <div class="step-indicator">
        <div v-for="i in totalSteps" :key="i" class="step-dot" :class="{ active: i <= step, completed: i < step }">
          {{ i }}
        </div>
      </div>
      <div class="step-title">{{ stepTitle }}</div>
    </div>
    
    <div class="wizard-content">
      <!-- Step 1: Outbound Template -->
      <div v-if="step === 1" class="step-content">
        <p class="step-description">{{ currentLocale === 'zh' ? '选择一个出站协议模板' : 'Select an outbound protocol template' }}</p>
        <div class="template-list">
          <div
            v-for="template in outboundTemplates"
            :key="template.name"
            class="template-option"
            :class="{ selected: selectedOutboundTemplate?.name === template.name }"
            @click="selectTemplate(template, 'outbound')"
          >
            <div class="template-name">{{ currentLocale === 'zh' ? template.nameZh : template.name }}</div>
            <div class="template-desc">{{ currentLocale === 'zh' ? template.descriptionZh : template.description }}</div>
          </div>
        </div>
      </div>
      
      <!-- Step 2: Inbound Template -->
      <div v-if="step === 2" class="step-content">
        <p class="step-description">{{ currentLocale === 'zh' ? '选择一个入站协议模板' : 'Select an inbound protocol template' }}</p>
        <div class="template-list">
          <div
            v-for="template in inboundTemplates"
            :key="template.name"
            class="template-option"
            :class="{ selected: selectedInboundTemplate?.name === template.name }"
            @click="selectTemplate(template, 'inbound')"
          >
            <div class="template-name">{{ currentLocale === 'zh' ? template.nameZh : template.name }}</div>
            <div class="template-desc">{{ currentLocale === 'zh' ? template.descriptionZh : template.description }}</div>
          </div>
        </div>
      </div>
      
      <!-- Step 3: DNS Template -->
      <div v-if="step === 3" class="step-content">
        <p class="step-description">{{ currentLocale === 'zh' ? '选择一个 DNS 解析方案' : 'Select a DNS resolution scheme' }}</p>
        <div class="template-list">
          <div
            v-for="template in dnsTemplates"
            :key="template.name"
            class="template-option"
            :class="{ selected: selectedDnsTemplate?.name === template.name }"
            @click="selectTemplate(template, 'dns')"
          >
            <div class="template-name">{{ currentLocale === 'zh' ? template.nameZh : template.name }}</div>
            <div class="template-desc">{{ currentLocale === 'zh' ? template.descriptionZh : template.description }}</div>
          </div>
        </div>
      </div>
      
      <!-- Step 4: Route Final -->
      <div v-if="step === 4" class="step-content">
        <p class="step-description">{{ currentLocale === 'zh' ? '设置默认出站标签（可选）' : 'Set default outbound tag (optional)' }}</p>
        <div class="field-group">
          <label>{{ currentLocale === 'zh' ? '默认出站标签' : 'Default Outbound Tag' }}</label>
          <input v-model="routeFinal" type="text" :placeholder="selectedOutboundTemplate ? (selectedOutboundTemplate.config.tag as string || 'outbound-tag') : 'outbound-tag'" />
        </div>
      </div>
      
      <!-- Step 5: Summary -->
      <div v-if="step === 5" class="step-content">
        <p class="step-description">{{ currentLocale === 'zh' ? '检查配置摘要' : 'Review configuration summary' }}</p>
        <div class="summary-list">
          <div class="summary-item">
            <span class="summary-label">{{ currentLocale === 'zh' ? '出站' : 'Outbound' }}:</span>
            <span class="summary-value">{{ selectedOutboundTemplate ? (currentLocale === 'zh' ? selectedOutboundTemplate.nameZh : selectedOutboundTemplate.name) : (currentLocale === 'zh' ? '未选择' : 'None') }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ currentLocale === 'zh' ? '入站' : 'Inbound' }}:</span>
            <span class="summary-value">{{ selectedInboundTemplate ? (currentLocale === 'zh' ? selectedInboundTemplate.nameZh : selectedInboundTemplate.name) : (currentLocale === 'zh' ? '未选择' : 'None') }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">DNS:</span>
            <span class="summary-value">{{ selectedDnsTemplate ? (currentLocale === 'zh' ? selectedDnsTemplate.nameZh : selectedDnsTemplate.name) : (currentLocale === 'zh' ? '未选择' : 'None') }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ currentLocale === 'zh' ? '默认路由' : 'Default Route' }}:</span>
            <span class="summary-value">{{ routeFinal || (currentLocale === 'zh' ? '未设置' : 'Not set') }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="wizard-actions">
      <button v-if="step > 1" @click="prevStep">{{ currentLocale === 'zh' ? '上一步' : 'Previous' }}</button>
      <button v-if="step < totalSteps" @click="nextStep" :disabled="(step === 1 && !selectedOutboundTemplate) || (step === 2 && !selectedInboundTemplate) || (step === 3 && !selectedDnsTemplate)">
        {{ currentLocale === 'zh' ? '下一步' : 'Next' }}
      </button>
      <button v-if="step === totalSteps" @click="finishWizard" class="finish-btn">
        {{ currentLocale === 'zh' ? '完成' : 'Finish' }}
      </button>
      <button @click="emit('close')" class="cancel-btn">{{ currentLocale === 'zh' ? '取消' : 'Cancel' }}</button>
    </div>
  </div>
</template>

<style scoped>
.setup-wizard { display: flex; flex-direction: column; height: 100%; }
.wizard-header { padding: 20px; border-bottom: 1px solid var(--border, #e5e7eb); }
.wizard-header h2 { margin: 0 0 16px 0; font-size: 20px; }
.step-indicator { display: flex; gap: 8px; margin-bottom: 12px; }
.step-dot { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border, #e5e7eb); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.step-dot.active { background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.step-dot.completed { background: var(--success, #16a34a); color: white; border-color: var(--success, #16a34a); }
.step-title { font-size: 16px; font-weight: 600; color: var(--text-primary, #1f2328); }
.wizard-content { flex: 1; overflow: auto; padding: 24px; }
.step-content { max-width: 600px; margin: 0 auto; }
.step-description { margin: 0 0 20px 0; color: var(--text-secondary, #666); font-size: 14px; }
.template-list { display: flex; flex-direction: column; gap: 12px; }
.template-option { padding: 16px; border: 2px solid var(--border, #e5e7eb); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.template-option:hover { border-color: var(--brand, #3b82f6); background: var(--bg-app, #f5f5f5); }
.template-option.selected { border-color: var(--brand, #3b82f6); background: rgba(59, 130, 246, 0.1); }
.template-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.template-desc { font-size: 13px; color: var(--text-secondary, #666); }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-group label { font-size: 14px; font-weight: 500; }
.field-group input { padding: 8px 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 14px; }
.field-group input:focus { outline: none; border-color: var(--brand, #3b82f6); }
.summary-list { display: flex; flex-direction: column; gap: 12px; }
.summary-item { display: flex; justify-content: space-between; padding: 12px; background: var(--bg-app, #f5f5f5); border-radius: 6px; }
.summary-label { font-weight: 600; color: var(--text-secondary, #666); }
.summary-value { color: var(--text-primary, #1f2328); }
.wizard-actions { display: flex; gap: 8px; padding: 20px; border-top: 1px solid var(--border, #e5e7eb); justify-content: flex-end; }
.wizard-actions button { padding: 8px 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; background: var(--bg-panel, #fff); cursor: pointer; font-size: 14px; }
.wizard-actions button:hover:not(:disabled) { background: var(--bg-app, #f5f5f5); }
.wizard-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.finish-btn { background: var(--brand, #3b82f6); color: white; border-color: var(--brand, #3b82f6); }
.finish-btn:hover { background: var(--brand-hover, #2563eb); }
.cancel-btn { background: transparent; }
</style>

