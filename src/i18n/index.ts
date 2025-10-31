import { ref, computed } from 'vue';
import zh from './locales/zh';
import en from './locales/en';

type Locale = 'zh' | 'en';
type Messages = typeof zh;

const currentLocale = ref<Locale>('zh');
const messages: Record<Locale, Messages> = { zh, en };

export function useI18n() {
  const t = computed(() => messages[currentLocale.value]);
  const locale = computed(() => currentLocale.value);
  
  function setLocale(loc: Locale) {
    currentLocale.value = loc;
  }
  
  return { t, setLocale, currentLocale: locale };
}

// 获取系统语言
if (typeof navigator !== 'undefined') {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) {
    currentLocale.value = 'zh';
  } else {
    currentLocale.value = 'en';
  }
}

