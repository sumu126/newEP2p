<template>
  <div class="app-container">
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
        
        <!-- 配置内容 -->
        <div class="page-content" :class="{ active: activeMenu === 'config' }" v-show="activeMenu === 'config'">
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import CrossNetworkP2P from './components/CrossNetworkP2P.vue'
import FileTransferList from './components/FileTransferList.vue'

const title = ref('P2P文件传输')
const activeMenu = ref('home') // 默认首页

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
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #f0f2f5 0%, #e6e9ef 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #333;
}

.sidebar {
  width: 280px;
  background: linear-gradient(160deg, #2c3e50 0%, #34495e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 2rem 0;
  box-shadow: 4px 0 25px rgba(0, 0, 0, 0.15);
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
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.logo {
  padding: 0 2rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
}

.logo h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
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
  color: rgba(255, 255, 255, 0.7);
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
  color: white;
  transform: translateX(4px);
}

.menu-item.active {
  background: linear-gradient(90deg, rgba(52, 152, 219, 0.2) 0%, rgba(46, 204, 113, 0.2) 100%);
  color: white;
  border-left: 4px solid #3498db;
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
  background: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid #eaeaea;
  z-index: 10;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
}

.app-header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-main {
  flex: 1;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
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
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  background: linear-gradient(90deg, #3498db, #2ecc71);
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.stats-card h3 {
  margin-top: 0;
  color: #2c3e50;
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
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 2px;
}

.stats-card p {
  margin: 1rem 0;
  color: #495057;
  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed #eee;
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
  border-right: 1px solid #e2e8f0;
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  max-width: 800px;
  margin: 2rem auto;
  width: 100%;
  box-sizing: border-box;
}

.config-section h3 {
  color: #1e293b;
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
  background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
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
  background: linear-gradient(90deg, #3b82f6, #10b981, transparent);
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
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.form-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: #f9fafb;
  color: #374151;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: #9ca3af;
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
  border-top: 1px solid #f1f5f9;
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
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.config-section .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.config-section .btn-secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
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
  color: #1e293b;
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  font-size: 1.75rem;
  letter-spacing: -0.025em;
}

.empty-content p {
  color: #6b7280;
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
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.empty-actions .btn-secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
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

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .empty-content {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-color: #374151;
  }
  
  .empty-content h2 {
    color: #e5e7eb;
  }
  
  .empty-content p {
    color: #9ca3af;
  }
  
  .empty-actions .btn-primary {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .empty-actions .btn-secondary {
    box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
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
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2980b9 0%, #2573a7 100%);
}

.btn-secondary {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: white;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #7f8c8d 0%, #6c7a7d 100%);
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
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.85) 0%, rgba(46, 204, 113, 0.85) 100%);
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
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 20px 20px 0 0;
}

.config-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
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
  color: #6c757d;
  font-weight: normal;
}

.btn-close:hover {
  background-color: #f8f9fa;
  color: #495057;
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