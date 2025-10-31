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
    // 同步到 localStorage，供 JSON 编辑器使用
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', loc);
    }
  }
  
  return { t, setLocale, currentLocale: locale };
}

// 获取系统语言，优先使用 localStorage 中的设置
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('locale');
  if (stored === 'zh' || stored === 'en') {
    currentLocale.value = stored;
  } else {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) {
      currentLocale.value = 'zh';
    } else {
      currentLocale.value = 'en';
    }
    // 保存到 localStorage
    localStorage.setItem('locale', currentLocale.value);
  }
}

