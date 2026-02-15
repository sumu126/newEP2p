import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 使用系统信息
 */
export const useSystemInfo = () => {
  const systemInfo = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchSystemInfo = async () => {
    try {
      loading.value = true;
      error.value = null;
      systemInfo.value = await window.electronAPI.invoke('system:info');
    } catch (err: any) {
      error.value = err.message || '获取系统信息失败';
      console.error('获取系统信息失败:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    systemInfo: systemInfo,
    loading: loading,
    error: error,
    fetchSystemInfo
  };
};

/**
 * 使用应用配置
 */
export const useAppConfig = () => {
  const config = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchConfig = async () => {
    try {
      loading.value = true;
      error.value = null;
      config.value = await window.electronAPI.invoke('config:get');
    } catch (err: any) {
      error.value = err.message || '获取配置失败';
      console.error('获取配置失败:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateConfig = async (updates: any) => {
    try {
      loading.value = true;
      error.value = null;
      await window.electronAPI.invoke('config:update', updates);
      // 更新本地配置
      await fetchConfig();
    } catch (err: any) {
      error.value = err.message || '更新配置失败';
      console.error('更新配置失败:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    config: config,
    loading: loading,
    error: error,
    fetchConfig,
    updateConfig
  };
};

/**
 * 使用窗口控制
 */
export const useWindowControl = () => {
  const minimizeWindow = async () => {
    try {
      await window.electronAPI.invoke('window:minimize');
    } catch (err) {
      console.error('最小化窗口失败:', err);
    }
  };

  const maximizeWindow = async () => {
    try {
      await window.electronAPI.invoke('window:maximize');
    } catch (err) {
      console.error('最大化窗口失败:', err);
    }
  };

  const closeWindow = async () => {
    try {
      await window.electronAPI.invoke('window:close');
    } catch (err) {
      console.error('关闭窗口失败:', err);
    }
  };

  return {
    minimizeWindow,
    maximizeWindow,
    closeWindow
  };
};