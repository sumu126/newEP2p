import { ref, Ref, watch } from 'vue';
import { configService } from '../services/config.service';
import { AppConfig } from '@shared/types';

export const useConfig = () => {
  const config: Ref<AppConfig> = ref(configService.getConfig());
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 监听配置变化
  const unsubscribe = configService.subscribe((newConfig) => {
    config.value = newConfig;
  });

  // 清理函数
  const cleanup = () => {
    unsubscribe();
  };

  const updateConfig = async (updates: Partial<AppConfig>) => {
    try {
      loading.value = true;
      error.value = null;
      await configService.updateConfig(updates);
    } catch (err: any) {
      error.value = err.message || '更新配置失败';
      console.error('更新配置失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const setValue = async <T,>(keyPath: string, value: T) => {
    try {
      loading.value = true;
      error.value = null;
      await configService.setValue(keyPath, value);
    } catch (err: any) {
      error.value = err.message || '设置配置值失败';
      console.error('设置配置值失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const getValue = <T,>(keyPath: string): T | undefined => {
    return configService.getValue<T>(keyPath);
  };

  // 页面卸载时清理监听器
  watch(
    () => config.value,
    () => {
      // 当配置改变时，不需要额外操作，因为config已经是最新的
    },
    { deep: true }
  );

  return {
    config: config,
    loading: loading,
    error: error,
    updateConfig,
    setValue,
    getValue,
    cleanup
  };
};