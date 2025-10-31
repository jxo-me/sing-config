<script setup lang="ts">
import { computed } from 'vue';
import { currentConfig, setConfig } from '../../stores/config';
import { useI18n } from '../../i18n';

const { currentLocale } = useI18n();

const ntp = computed(() => currentConfig.value.ntp as Record<string, unknown> | undefined || {});

async function updateNtpField(field: string, value: unknown) {
  await setConfig({
    ...currentConfig.value,
    ntp: { ...ntp.value, [field]: value },
  });
}
</script>

<template>
  <div class="ntp-form">
    <h3>{{ currentLocale === 'zh' ? 'NTP 配置' : 'NTP Configuration' }}</h3>
    
    <div class="field-group checkbox">
      <label>
        <input
          type="checkbox"
          :checked="!!ntp.enabled"
          @change="updateNtpField('enabled', ($event.target as HTMLInputElement).checked)"
        />
        {{ currentLocale === 'zh' ? '启用 NTP 时间同步' : 'Enable NTP Time Synchronization' }}
      </label>
    </div>
    
    <div v-if="ntp.enabled" class="enabled-fields">
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? 'NTP 服务器' : 'NTP Server' }}</label>
        <input
          :value="ntp.server || 'time.google.com'"
          @input="updateNtpField('server', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="time.google.com"
        />
      </div>
      
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '服务器端口' : 'Server Port' }}</label>
        <input
          :value="ntp.server_port || 123"
          @input="updateNtpField('server_port', Number(($event.target as HTMLInputElement).value) || 123)"
          type="number"
          min="1"
          max="65535"
        />
      </div>
      
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '同步间隔' : 'Sync Interval' }}</label>
        <input
          :value="ntp.interval || '1h'"
          @input="updateNtpField('interval', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="1h"
        />
        <p class="field-hint">{{ currentLocale === 'zh' ? '时间格式: 1h, 30m, 5s' : 'Time format: 1h, 30m, 5s' }}</p>
      </div>
      
      <div class="field-group checkbox">
        <label>
          <input
            type="checkbox"
            :checked="!!ntp.write_to_system"
            @change="updateNtpField('write_to_system', ($event.target as HTMLInputElement).checked)"
          />
          {{ currentLocale === 'zh' ? '写入系统时间' : 'Write to System Time' }}
        </label>
      </div>
      
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '出站标签' : 'Detour Tag' }}</label>
        <input
          :value="ntp.detour || ''"
          @input="updateNtpField('detour', ($event.target as HTMLInputElement).value || undefined)"
          type="text"
          placeholder="direct"
        />
        <p class="field-hint">{{ currentLocale === 'zh' ? '可选，用于连接 NTP 服务器的出站' : 'Optional, outbound tag for NTP server connection' }}</p>
      </div>
      
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '绑定网络接口' : 'Bind Interface' }}</label>
        <input
          :value="ntp.bind_interface || ''"
          @input="updateNtpField('bind_interface', ($event.target as HTMLInputElement).value || undefined)"
          type="text"
          placeholder="eth0"
        />
      </div>
      
      <div class="field-group">
        <label>{{ currentLocale === 'zh' ? '连接超时' : 'Connect Timeout' }}</label>
        <input
          :value="ntp.connect_timeout || '5s'"
          @input="updateNtpField('connect_timeout', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="5s"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ntp-form { padding: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field-group label { font-size: 13px; font-weight: 500; }
.field-group.checkbox { flex-direction: row; align-items: center; }
.field-group.checkbox label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.field-hint { font-size: 12px; color: var(--text-secondary, #666); margin: 0; }
.enabled-fields { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border, #e5e7eb); }
input[type="text"], input[type="number"] { padding: 6px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 4px; font-size: 13px; }
input[type="text"]:focus, input[type="number"]:focus { outline: none; border-color: var(--brand, #3b82f6); }
input[type="checkbox"] { cursor: pointer; }
</style>

