<template>
  <div class="config-panel">
    <h3>应用配置</h3>
    
    <div class="config-section">
      <h4>外观设置</h4>
      <div class="form-group">
        <label>主题:</label>
        <div class="theme-selector">
          <div 
            v-for="theme in themes" 
            :key="theme.value"
            :class="['theme-option', { active: localConfig.theme === theme.value }]"
            @click="handleThemeClick(theme.value)"
          >
            <div 
              class="theme-preview" 
              :style="{ background: theme.primary, '--sidebar-bg': theme.sidebar }"
            >
              <div class="preview-sidebar" :style="{ background: theme.sidebar }"></div>
              <div class="preview-content"></div>
            </div>
            <span class="theme-name">{{ theme.name }}</span>
          </div>
        </div>
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

type ThemeType = 'dark-green' | 'dark-black' | 'light-blue';

const themes = [
  {
    value: 'dark-green' as ThemeType,
    name: '墨绿色',
    primary: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
    sidebar: 'linear-gradient(160deg, #064e3b 0%, #047857 100%)'
  },
  {
    value: 'dark-black' as ThemeType,
    name: '暗黑色',
    primary: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
    sidebar: 'linear-gradient(160deg, #1a1a1a 0%, #262626 100%)'
  },
  {
    value: 'light-blue' as ThemeType,
    name: '浅蓝色',
    primary: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    sidebar: 'linear-gradient(160deg, #1e40af 0%, #2563eb 100%)'
  }
];

const emit = defineEmits<{
  (e: 'theme-change', theme: ThemeType): void;
}>();

const { config, loading, error, updateConfig, cleanup } = useConfig();

const localConfig = ref<AppConfig>({ ...config.value });

watch(
  () => config.value,
  (newConfig) => {
    localConfig.value = { ...newConfig };
  },
  { deep: true }
);

const handleThemeClick = (theme: ThemeType) => {
  localConfig.value = {
    ...localConfig.value,
    theme: theme
  };
  emit('theme-change', theme);
};

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

.theme-selector {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.theme-option:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
}

.theme-option.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.theme-preview {
  width: 80px;
  height: 50px;
  border-radius: 6px;
  display: flex;
  overflow: hidden;
  position: relative;
}

.preview-sidebar {
  width: 20px;
  height: 100%;
}

.preview-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  margin: 4px;
  border-radius: 2px;
}

.theme-name {
  margin-top: 8px;
  font-size: 12px;
  color: #555;
  font-weight: 500;
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