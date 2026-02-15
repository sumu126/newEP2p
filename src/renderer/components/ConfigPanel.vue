<template>
  <div class="config-panel">
    <h3>应用配置</h3>
    
    <div class="config-section">
      <h4>外观设置</h4>
      <div class="form-group">
        <label>主题:</label>
        <select 
          :value="localConfig.theme" 
          @change="handleThemeChange"
          class="form-control"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="auto">跟随系统</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>语言:</label>
        <select 
          :value="localConfig.language" 
          @change="handleLanguageChange"
          class="form-control"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
    </div>
    
    <div class="config-section">
      <h4>功能设置</h4>
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="localConfig.features.developerTools"
            @change="handleFeatureToggle('developerTools', ($event.target as HTMLInputElement).checked)"
          />
          开发者工具
        </label>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="localConfig.features.analytics"
            @change="handleFeatureToggle('analytics', ($event.target as HTMLInputElement).checked)"
          />
          数据统计
        </label>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="localConfig.features.autoUpdate"
            @change="handleFeatureToggle('autoUpdate', ($event.target as HTMLInputElement).checked)"
          />
          自动更新
        </label>
      </div>
    </div>
    
    <div class="config-actions">
      <button @click="saveConfig" :disabled="loading" class="btn btn-primary">
        {{ loading ? '保存中...' : '保存配置' }}
      </button>
      <button @click="resetConfig" class="btn btn-secondary">重置</button>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useConfig } from '../composables/useConfig';
import { AppConfig } from '@shared/types';

// 使用配置composable
const { config, loading, error, updateConfig, cleanup } = useConfig();

// 本地配置副本，用于编辑
const localConfig = ref<AppConfig>({ ...config.value });

// 监听远程配置变化
watch(
  () => config.value,
  (newConfig) => {
    localConfig.value = { ...newConfig };
  },
  { deep: true }
);

// 处理主题变化
const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  localConfig.value = {
    ...localConfig.value,
    theme: target.value as 'light' | 'dark' | 'auto'
  };
};

// 处理语言变化
const handleLanguageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  localConfig.value = {
    ...localConfig.value,
    language: target.value
  };
};

// 处理功能开关
const handleFeatureToggle = (feature: keyof AppConfig['features'], checked: boolean) => {
  localConfig.value = {
    ...localConfig.value,
    features: {
      ...localConfig.value.features,
      [feature]: checked
    }
  };
};

// 保存配置
const saveConfig = async () => {
  await updateConfig(localConfig.value);
};

// 重置配置
const resetConfig = () => {
  localConfig.value = { ...config.value };
};

// 组件卸载时清理
onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.config-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.config-section {
  margin-bottom: 25px;
}

.config-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}
</style>