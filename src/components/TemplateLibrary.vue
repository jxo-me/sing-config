<script setup lang="ts">
import { computed } from 'vue';
import { templates, applyTemplate, type ConfigTemplate } from '../lib/templates';
import { currentConfig, setConfig } from '../stores/config';
import { useI18n } from '../i18n';

const { currentLocale } = useI18n();

const selectedCategory = computed(() => {
  return (category: string) => templates.filter(t => t.category === category);
});

async function useTemplate(template: ConfigTemplate) {
  const newConfig = applyTemplate(template, currentConfig.value);
  await setConfig(newConfig);
}

const categories = [
  { key: 'outbound', label: 'Outbound', labelZh: '出站' },
  { key: 'inbound', label: 'Inbound', labelZh: '入站' },
  { key: 'dns', label: 'DNS', labelZh: 'DNS' },
  { key: 'route', label: 'Route', labelZh: '路由' },
];
</script>

<template>
  <div class="template-library">
    <h3>{{ currentLocale === 'zh' ? '配置模板库' : 'Template Library' }}</h3>
    <div class="categories">
      <div v-for="cat in categories" :key="cat.key" class="category-section">
        <h4>{{ currentLocale === 'zh' ? cat.labelZh : cat.label }}</h4>
        <div class="template-grid">
          <div
            v-for="template in selectedCategory(cat.key)"
            :key="template.name"
            class="template-card"
            @click="useTemplate(template)"
          >
            <div class="template-name">{{ currentLocale === 'zh' ? template.nameZh : template.name }}</div>
            <div class="template-desc">{{ currentLocale === 'zh' ? template.descriptionZh : template.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-library { padding: 16px; }
.categories { display: flex; flex-direction: column; gap: 24px; }
.category-section h4 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; }
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.template-card { padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.template-card:hover { border-color: var(--brand, #3b82f6); background: var(--bg-app, #f5f5f5); transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.template-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; color: var(--text-primary, #1f2328); }
.template-desc { font-size: 12px; color: var(--text-secondary, #666); line-height: 1.4; }
</style>

