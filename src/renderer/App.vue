<template>
  <div>
    <UserAgreement v-if="showAgreement" @accepted="onAgreementAccepted" />
    
    <div class="app-container" :class="themeClass">
    <aside class="sidebar">
      <div class="logo">
        <h2>{{ title }}</h2>
      </div>
      <nav class="menu">
        <ul>
          <li>
            <a href="#" 
               :class="{ active: activeMenu === 'home' }" 
               @click.prevent="changeMenu('home')"
               class="menu-item">
              <span class="icon">🏠</span>
              <span class="text">首页</span>
            </a>
          </li>
          <li>
            <a href="#"
               :class="{ active: activeMenu === 'transfer' }" 
               @click.prevent="changeMenu('transfer')"
               class="menu-item">
              <span class="icon">📁</span>
              <span class="text">文件传输</span>
            </a>
          </li>
          <li>
            <a href="#"
               :class="{ active: activeMenu === 'share' }" 
               @click.prevent="changeMenu('share')"
               class="menu-item">
              <span class="icon">📂</span>
              <span class="text">共享文件</span>
            </a>
          </li>
          <li>
            <a href="#" 
               :class="{ active: activeMenu === 'config' }" 
               @click.prevent="changeMenu('config')"
               class="menu-item">
              <span class="icon">⚙️</span>
              <span class="text">配置</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
    
    <div class="main-content">
      <header class="app-header">
        <h1>{{ getCurrentPageTitle }}</h1>
      </header>
      
      <main class="app-main">
        <!-- 首页内容 -->
        <div class="page-content" :class="{ active: activeMenu === 'home' }" v-show="activeMenu === 'home'">
          <!-- 空白首页 -->
          <div class="empty-home">
            <div class="empty-content">
              <div class="empty-icon">📁</div>
              <h2>欢迎使用 EP2P</h2>
              <p>跨网络 P2P 文件传输应用</p>
              <div class="empty-actions">
                <button @click="changeMenu('transfer')" class="btn btn-primary">
                  开始文件传输
                </button>
                <button @click="changeMenu('config')" class="btn btn-secondary">
                  配置设置
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 文件传输内容 -->
        <div class="page-content" :class="{ active: activeMenu === 'transfer' }" v-show="activeMenu === 'transfer'">
          <div class="transfer-container">
            <div class="transfer-content">
              <div class="transfer-panel">
                <CrossNetworkP2P :signalingServerUrl="signalingServerUrl" />
              </div>
              <div class="transfer-panel">
                <FileTransferList />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 共享文件管理内容 -->
        <div class="page-content" :class="{ active: activeMenu === 'share' }" v-show="activeMenu === 'share'">
          <SharedFiles ref="sharedFilesRef" />
        </div>
        
        <!-- 配置内容 -->
        <div class="page-content" :class="{ active: activeMenu === 'config' }" v-show="activeMenu === 'config'">
          <div class="config-section">
            <h3>主题设置</h3>
            <div class="form-group">
              <label>选择主题:</label>
              <div class="theme-selector">
                <div 
                  v-for="theme in themes" 
                  :key="theme.value"
                  :class="['theme-option', { active: currentTheme === theme.value }]"
                  @click="saveTheme(theme.value)"
                >
                  <div class="theme-preview-wrapper" :style="{ background: theme.primary }">
                    <div class="preview-sidebar-mini" :style="{ background: theme.sidebar }"></div>
                    <div class="preview-content-mini"></div>
                  </div>
                  <span class="theme-label">{{ theme.name }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="config-section">
            <h3>信令服务器配置</h3>
            <div class="form-group">
              <label for="server-url">服务器地址:</label>
              <input 
                id="server-url" 
                v-model="tempServerUrl" 
                type="text" 
                placeholder="例如: ws://123.57.8.125:11451"
                class="form-input"
              />
            </div>
            
            <h3>文件路径配置</h3>
            <div class="form-group">
              <label for="download-path">文件保存路径:</label>
              <div class="input-with-button">
                <input 
                  id="download-path" 
                  v-model="tempDownloadPath" 
                  type="text" 
                  placeholder="例如: C:\Downloads\P2PFiles"
                  class="form-input"
                />
                <button @click="browseDownloadPath" class="btn btn-secondary">浏览</button>
              </div>
            </div>
            
            <div class="config-actions">
              <button @click="saveConfig" class="btn btn-primary">保存配置</button>
            </div>
          </div>
        </div>
      </main>
    </div>
    
    <!-- 配置对话框 -->
    <div v-if="showConfigDialog" class="config-modal-overlay" @click="closeConfigDialog">
      <div class="config-modal" @click.stop>
        <div class="config-header">
          <h3>配置信令服务器</h3>
          <button @click="closeConfigDialog" class="btn-close">×</button>
        </div>
        <div class="config-content">
          <div class="form-group">
            <label for="server-url">信令服务器地址:</label>
            <input 
              id="server-url" 
              v-model="tempServerUrl" 
              type="text" 
              placeholder="例如: ws://123.57.8.125:11451"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="download-path">文件保存路径:</label>
            <div class="input-with-button">
              <input 
                id="download-path" 
                v-model="tempDownloadPath" 
                type="text" 
                placeholder="例如: C:\Downloads\P2PFiles"
                class="form-input"
              />
              <button @click="browseDownloadPath" class="btn btn-secondary">浏览</button>
            </div>
          </div>
          <div class="config-actions">
            <button @click="saveConfig" class="btn btn-primary">保存</button>
            <button @click="closeConfigDialog" class="btn btn-secondary">取消</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import CrossNetworkP2P from './components/CrossNetworkP2P.vue'
import FileTransferList from './components/FileTransferList.vue'
import UserAgreement from './components/UserAgreement.vue'
import SharedFiles from './components/SharedFiles.vue'

const title = ref('P2P文件传输')
const activeMenu = ref('home') // 默认首页
const sharedFilesRef = ref<any>(null)
const showAgreement = ref(false)

const checkAgreement = async () => {
  try {
    const config = await window.electronAPI.invoke('config:get')
    if (!config?.userAgreement?.accepted) {
      showAgreement.value = true
    }
  } catch (error) {
    console.error('Failed to check user agreement:', error)
    showAgreement.value = true
  }
}

const onAgreementAccepted = () => {
  showAgreement.value = false
}

type ThemeType = 'dark-green' | 'dark-black' | 'light-blue';
const currentTheme = ref<ThemeType>('dark-green');

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

const themeClass = computed(() => `theme-${currentTheme.value}`);

const loadTheme = () => {
  const savedTheme = localStorage.getItem('appTheme') as ThemeType;
  if (savedTheme) {
    currentTheme.value = savedTheme;
  }
};

const saveTheme = (theme: ThemeType) => {
  currentTheme.value = theme;
  localStorage.setItem('appTheme', theme);
};

loadTheme();

watch(currentTheme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
}, { immediate: true });

// 配置相关
const showConfigDialog = ref(false)
const tempServerUrl = ref('')
const tempDownloadPath = ref('')
const signalingServerUrl = ref('')

// 统计数据（模拟）
const isSignalingConnected = ref(false)
const currentRoomId = ref('')
const connectedPeersCount = ref(0)
const totalTransfers = ref(0)
const completedTransfers = ref(0)
const inProgressTransfers = ref(0)

// 在组件挂载时获取应用配置
onMounted(async () => {
  checkAgreement()
  
  try {
    const config = await window.electronAPI.invoke('config:get');
    if (config && config.appName) {
      title.value = config.appName;
    }
    
    // 尝试从localStorage加载保存的配置
    const savedConfig = localStorage.getItem('appConfig')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        signalingServerUrl.value = config.serverUrl || ''
        tempServerUrl.value = signalingServerUrl.value
        tempDownloadPath.value = config.downloadPath || ''
      } catch {
        signalingServerUrl.value = ''
        tempServerUrl.value = signalingServerUrl.value
        tempDownloadPath.value = ''
      }
    } else {
      // 默认配置为空，等待用户配置
      signalingServerUrl.value = ''
      tempServerUrl.value = signalingServerUrl.value
      tempDownloadPath.value = ''
    }
  } catch (error) {
    console.error('Failed to get app config:', error);
    // 如果获取失败，使用默认值
    signalingServerUrl.value = ''
    tempServerUrl.value = signalingServerUrl.value
    tempDownloadPath.value = ''
  }
})

// 切换菜单
const changeMenu = (menu: string) => {
  activeMenu.value = menu
}

// 获取当前页面标题
const getCurrentPageTitle = computed(() => {
  const titles = {
    'home': '控制面板',
    'transfer': '文件传输',
    'share': '共享文件管理',
    'config': '系统配置'
  }
  return titles[activeMenu.value as keyof typeof titles] || 'P2P文件传输'
})

// 保存配置
const saveConfig = async () => {
  try {
    const config = {
      serverUrl: tempServerUrl.value,
      downloadPath: tempDownloadPath.value
    };
    
    // 保存到localStorage
    localStorage.setItem('appConfig', JSON.stringify(config));
    
    // 同时保存到主进程配置
    await window.electronAPI.invoke('config:update', config);
    
    // 更新当前配置
    signalingServerUrl.value = tempServerUrl.value;
    
    // 关闭对话框
    showConfigDialog.value = false;
    
    console.log('配置已保存:', config);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// 浏览下载路径
const browseDownloadPath = async () => {
  try {
    // 获取系统信息来获得用户主目录
    const systemInfo = await window.electronAPI.getSystemInfo();
    const homeDir = systemInfo.userInfo.homedir;
    
    const result = await window.electronAPI.invoke('file:select-directory', {
      title: '选择文件保存目录',
      defaultPath: tempDownloadPath.value || homeDir
    });
    
    if (result && result.filePath) {
      tempDownloadPath.value = result.filePath;
    }
  } catch (error) {
    console.error('选择目录失败:', error);
  }
}

// 关闭配置对话框
const closeConfigDialog = () => {
  tempServerUrl.value = signalingServerUrl.value
  showConfigDialog.value = false
}

defineExpose({
  currentTheme,
  saveTheme
});
</script>

<style>
:root {
  --bg-primary: linear-gradient(135deg, #f0f2f5 0%, #e6e9ef 100%);
  --bg-sidebar: linear-gradient(160deg, #2c3e50 0%, #34495e 100%);
  --bg-header: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  --bg-card: #ffffff;
  --bg-card-hover: #f8f9fa;
  --bg-input: #f9fafb;
  --bg-button-primary: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  --bg-button-secondary: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  
  --text-primary: #333333;
  --text-secondary: #6b7280;
  --text-light: rgba(255, 255, 255, 0.7);
  --text-white: #ffffff;
  
  --border-color: #e5e7eb;
  --border-light: rgba(255, 255, 255, 0.15);
  
  --accent-gradient: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  --accent-primary: #3b82f6;
  --accent-secondary: #10b981;
  
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.theme-dark-green {
  --bg-primary: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  --bg-sidebar: linear-gradient(160deg, #064e3b 0%, #047857 100%);
  --bg-header: linear-gradient(135deg, #065f46 0%, #047857 100%);
  --bg-card: rgba(6, 78, 59, 0.8);
  --bg-card-hover: rgba(6, 95, 70, 0.9);
  --bg-input: rgba(4, 120, 87, 0.3);
  --bg-button-primary: linear-gradient(135deg, #059669 0%, #047857 100%);
  --bg-button-secondary: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
  
  --text-primary: #ecfdf5;
  --text-secondary: #a7f3d0;
  --text-light: rgba(167, 243, 208, 0.7);
  --text-white: #ecfdf5;
  
  --border-color: rgba(16, 185, 129, 0.3);
  --border-light: rgba(16, 185, 129, 0.2);
  
  --accent-gradient: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  --accent-primary: #10b981;
  --accent-secondary: #34d399;
}

.theme-dark-black {
  --bg-primary: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  --bg-sidebar: linear-gradient(160deg, #1a1a1a 0%, #262626 100%);
  --bg-header: linear-gradient(135deg, #1f1f1f 0%, #262626 100%);
  --bg-card: rgba(38, 38, 38, 0.9);
  --bg-card-hover: rgba(48, 48, 48, 0.95);
  --bg-input: rgba(64, 64, 64, 0.5);
  --bg-button-primary: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  --bg-button-secondary: linear-gradient(135deg, #404040 0%, #262626 100%);
  
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-light: rgba(163, 163, 163, 0.7);
  --text-white: #fafafa;
  
  --border-color: rgba(115, 115, 115, 0.3);
  --border-light: rgba(115, 115, 115, 0.15);
  
  --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  --accent-primary: #8b5cf6;
  --accent-secondary: #a78bfa;
}

.theme-light-blue {
  --bg-primary: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  --bg-sidebar: linear-gradient(160deg, #1e40af 0%, #2563eb 100%);
  --bg-header: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  --bg-card: #ffffff;
  --bg-card-hover: #eff6ff;
  --bg-input: #f0f9ff;
  --bg-button-primary: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  --bg-button-secondary: linear-gradient(135deg, #64748b 0%, #475569 100%);
  
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-light: rgba(255, 255, 255, 0.8);
  --text-white: #ffffff;
  
  --border-color: #bfdbfe;
  --border-light: rgba(255, 255, 255, 0.2);
  
  --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  --accent-primary: #2563eb;
  --accent-secondary: #60a5fa;
}

/* FileTransferList 组件主题覆盖 */
.file-transfer-list {
  background: var(--bg-card) !important;
}

.file-transfer-list h3 {
  color: var(--text-primary) !important;
}

.file-transfer-list .empty-state {
  background: var(--bg-input) !important;
  color: var(--text-secondary) !important;
}

.file-transfer-list .transfers-container {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.file-transfer-list .transfer-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.file-transfer-list .transfer-item:hover {
  background: var(--bg-card-hover) !important;
}

.file-transfer-list .transfer-item.transferring {
  background: var(--bg-card) !important;
  border-left-color: var(--accent-primary) !important;
}

.file-transfer-list .transfer-item.completed {
  background: var(--bg-card) !important;
  border-left-color: var(--accent-secondary) !important;
}

.file-transfer-list .transfer-item.error,
.file-transfer-list .transfer-item.cancelled {
  background: var(--bg-card) !important;
}

.file-transfer-list .file-name {
  color: var(--text-primary) !important;
}

.file-transfer-list .transfer-details {
  color: var(--text-secondary) !important;
}

.file-transfer-list .direction.send {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #ef4444 !important;
}

.file-transfer-list .direction.receive {
  background: rgba(59, 130, 246, 0.15) !important;
  color: var(--accent-primary) !important;
}

.file-transfer-list .progress-bar {
  background: var(--border-color) !important;
}

.file-transfer-list .progress-fill {
  background: var(--accent-gradient) !important;
}

.file-transfer-list .progress-text {
  color: var(--text-secondary) !important;
}

.file-transfer-list .speed {
  color: var(--text-secondary) !important;
}

.file-transfer-list .status {
  color: var(--text-secondary) !important;
}

.file-transfer-list .status.transferring {
  color: var(--accent-primary) !important;
}

.file-transfer-list .status.completed {
  color: var(--accent-secondary) !important;
}

.file-transfer-list .status.error,
.file-transfer-list .status.cancelled {
  color: #ef4444 !important;
}

.file-transfer-list .cancel-btn,
.file-transfer-list .open-btn {
  color: var(--text-primary) !important;
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.file-transfer-list .cancel-btn:hover,
.file-transfer-list .open-btn:hover {
  background: var(--bg-card-hover) !important;
}

.file-transfer-list .transfer-time {
  color: var(--text-secondary) !important;
}
</style>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  background: var(--bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: var(--text-primary);
}

.sidebar {
  width: 280px;
  background: var(--bg-sidebar);
  color: var(--text-white);
  display: flex;
  flex-direction: column;
  padding: 2rem 0;
  box-shadow: var(--shadow-md);
  z-index: 100;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.logo {
  padding: 0 2rem 2rem;
  border-bottom: 1px solid var(--border-light);
  text-align: center;
}

.logo h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.menu ul {
  list-style: none;
  margin: 2rem 0 0 0;
  padding: 0;
  flex: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 1.2rem 2rem;
  color: var(--text-light);
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 1.1rem;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
}

.menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.menu-item:hover::before {
  left: 100%;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-white);
  transform: translateX(4px);
}

.menu-item.active {
  background: linear-gradient(90deg, rgba(52, 152, 219, 0.2) 0%, rgba(46, 204, 113, 0.2) 100%);
  color: var(--text-white);
  border-left: 4px solid var(--accent-primary);
  box-shadow: inset 2px 0 8px rgba(0, 0, 0, 0.2);
}

.icon {
  margin-right: 16px;
  font-size: 1.4rem;
  width: 28px;
  text-align: center;
  transition: transform 0.3s ease;
}

.menu-item:hover .icon {
  transform: scale(1.1);
}

.text {
  flex: 1;
  transition: all 0.3s ease;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-left: 280px; /* 与侧边栏宽度相同 */
  transition: all 0.3s ease;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: var(--bg-header);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid var(--border-color);
  z-index: 10;
}

.app-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-main {
  flex: 1;
  padding: 0;
  overflow: hidden;
  background: var(--bg-primary);
}

.page-content {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* 首页仪表盘样式 */
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.stats-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent-gradient);
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
}

.stats-card h3 {
  margin-top: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  position: relative;
  display: flex;
  align-items: center;
}

.stats-card h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 40px;
  height: 3px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.stats-card p {
  margin: 1rem 0;
  color: var(--text-secondary);
  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border-color);
}

.stats-card p:last-child {
  border-bottom: none;
}

/* 文件传输布局 */
.transfer-container {
  height: 100%;
  width: 100%;
  display: flex;
  background: white;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

/* 文件传输内容区域 */
.transfer-content {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
}

.transfer-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.transfer-panel:first-child {
  flex: 3;
  border-right: 1px solid var(--border-color);
  min-width: 0;
  padding: 0;
}

.transfer-panel:last-child {
  flex: 2;
  min-width: 300px;
  max-width: 450px;
  padding: 0;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .transfer-panel:first-child {
    flex: 2;
  }
  
  .transfer-panel:last-child {
    flex: 1;
    min-width: 280px;
  }
}

@media (max-width: 768px) {
  .transfer-content {
    flex-direction: column;
  }
  
  .transfer-panel {
    min-height: 400px;
  }
  
  .transfer-panel:last-child {
    min-width: 100%;
    max-width: 100%;
  }
}

/* 配置页面样式 */
.config-section {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  max-width: 800px;
  margin: 2rem auto;
  width: 100%;
  box-sizing: border-box;
}

.config-section h3 {
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  position: relative;
  padding-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.config-section h3::before {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--accent-gradient);
  border-radius: 50%;
  flex-shrink: 0;
}

.config-section h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent-gradient);
  border-radius: 1px;
}

.form-group {
  margin-bottom: 2rem;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.form-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: var(--bg-card);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.input-with-button {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.input-with-button .form-input {
  flex: 1;
  min-width: 250px;
}

.config-actions {
  display: flex;
  justify-content: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  gap: 1rem;
}

/* 配置页面按钮样式 */
.config-section .btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
}

.config-section .btn-primary {
  background: var(--bg-button-primary);
  color: var(--text-white);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.config-section .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.config-section .btn-secondary {
  background: var(--bg-button-secondary);
  color: var(--text-white);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.config-section .btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
}

.config-section .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.theme-selector {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  background: var(--bg-card);
}

.theme-option:hover {
  border-color: var(--accent-primary);
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.theme-option.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.theme-preview-wrapper {
  width: 90px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.preview-sidebar-mini {
  width: 22px;
  height: 100%;
}

.preview-content-mini {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  margin: 4px;
  border-radius: 3px;
}

.theme-label {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .config-section {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .input-with-button {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-with-button .form-input {
    min-width: auto;
  }
  
  .config-section .btn {
    padding: 0.875rem 1.5rem;
    font-size: 0.875rem;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .config-actions .btn {
    width: 100%;
    justify-content: center;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .config-section {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-color: #374151;
  }
  
  .config-section h3 {
    color: #e5e7eb;
  }
  
  .form-group label {
    color: #9ca3af;
  }
  
  .form-input {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
  
  .form-input:focus {
    background: #1f2937;
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }
  
  .form-input::placeholder {
    color: #6b7280;
  }
  
  .config-actions {
    border-top-color: #374151;
  }
  
  .config-section .btn-primary {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
    .config-section .btn-secondary {
    box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
  }
}

/* 空白首页样式 */
.empty-home {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-content {
  text-align: center;
  max-width: 500px;
  padding: 3rem;
  background: var(--bg-card);
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}

.empty-content h2 {
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  font-size: 1.75rem;
  letter-spacing: -0.025em;
}

.empty-content p {
  color: var(--text-secondary);
  margin: 0 0 2.5rem 0;
  font-size: 1.1rem;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.empty-actions .btn {
  padding: 1rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.empty-actions .btn-primary {
  background: var(--bg-button-primary);
  color: var(--text-white);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.empty-actions .btn-secondary {
  background: var(--bg-button-secondary);
  color: var(--text-white);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.empty-actions .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .empty-home {
    padding: 1rem;
  }
  
  .empty-content {
    padding: 2rem;
    margin: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-content h2 {
    font-size: 1.4rem;
  }
  
  .empty-content p {
    font-size: 1rem;
  }
  
  .empty-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .empty-actions .btn {
    justify-content: center;
  }
}

/* 按钮基础样式 */
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: var(--bg-button-primary);
  color: var(--text-white);
}

.btn-primary:hover {
  filter: brightness(0.9);
}

.btn-secondary {
  background: var(--bg-button-secondary);
  color: var(--text-white);
}

.btn-secondary:hover {
  filter: brightness(0.9);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* 配置模态框样式 */
.config-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--accent-gradient);
  opacity: 0.9;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.config-modal {
  background: var(--bg-card);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

@keyframes modalSlideIn {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.8rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-header);
  border-radius: 20px 20px 0 0;
}

.config-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0.5rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  font-weight: normal;
}

.btn-close:hover {
  background-color: var(--bg-card-hover);
  color: var(--text-primary);
  transform: rotate(90deg);
}

.config-content {
  padding: 1.8rem;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .transfer-sidebar {
    width: 350px;
  }
  
  .sidebar {
    width: 240px;
  }
  
  .main-content {
    margin-left: 240px;
  }
}

@media (max-width: 1024px) {
  .sidebar {
    width: 80px;
  }
  
  .main-content {
    margin-left: 80px;
  }
  
  .logo h2 {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .logo {
    padding: 0 0.5rem 1.5rem;
  }
  
  .menu-item {
    justify-content: center;
    padding: 1.2rem 0.5rem;
  }
  
  .icon {
    margin-right: 0;
  }
  
  .text {
    display: none;
  }
  
  .transfer-layout {
    flex-direction: column;
    height: auto;
    gap: 1.5rem;
  }
  
  .transfer-sidebar {
    width: 100%;
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    width: 280px;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.active {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .app-header {
    padding: 1rem;
  }
  
  .app-main {
    padding: 1.5rem 1rem;
  }
  
  .dashboard {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .transfer-main {
    padding: 1.5rem;
  }
  
  .transfer-sidebar {
    width: 100%;
  }
  
  .config-section {
    padding: 1.5rem;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

/* 移动端汉堡菜单按钮 */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
}

.hamburger span {
  width: 100%;
  height: 2px;
  background: #2c3e50;
  border-radius: 2px;
  transition: all 0.3s linear;
  position: relative;
  transform-origin: center;
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .app-header h1 {
    font-size: 1.4rem;
  }
  
  .stats-card {
    padding: 1.5rem;
  }
  
  .stats-card h3 {
    font-size: 1.1rem;
  }
  
  .stats-card p {
    font-size: 1rem;
  }
  
  .btn {
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
  }
  
  .config-modal {
    width: 95%;
    margin: 2.5vh auto;
  }
  
  .config-header, .config-content {
    padding: 1.2rem;
  }
}
</style>