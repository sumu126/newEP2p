import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // 状态
  const theme = ref<'light' | 'dark' | 'auto'>('auto');
  const language = ref<string>('zh-CN');
  const isDeveloperMode = ref<boolean>(false);
  const systemInfo = ref<any>(null);
  const appConfig = ref<any>(null);

  // 方法
  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    theme.value = newTheme;
  };

  const setLanguage = (newLang: string) => {
    language.value = newLang;
  };

  const toggleDeveloperMode = () => {
    isDeveloperMode.value = !isDeveloperMode.value;
  };

  const setSystemInfo = (info: any) => {
    systemInfo.value = info;
  };

  const setAppConfig = (config: any) => {
    appConfig.value = config;
  };

  return {
    // 状态
    theme,
    language,
    isDeveloperMode,
    systemInfo,
    appConfig,
    
    // 方法
    setTheme,
    setLanguage,
    toggleDeveloperMode,
    setSystemInfo,
    setAppConfig
  };
});