<template>
  <div class="shared-files-container">
    <div class="section-header">
      <div class="header-icon">📂</div>
      <div class="header-info">
        <h2>共享文件管理</h2>
        <p class="header-desc">管理您共享给P2P网络的文件，连接后自动注册到信令服务器</p>
      </div>
    </div>

    <div class="connection-status" :class="{ connected: isSignalingConnected }">
      <span class="status-dot"></span>
      <span>{{ isSignalingConnected ? '信令服务器已连接' : '未连接信令服务器' }}</span>
      <button v-if="!isSignalingConnected" @click="reconnect" class="reconnect-btn">重连</button>
    </div>

    <div class="actions-bar">
      <button @click="addSharedFolder" class="btn btn-primary">
        ➕ 添加共享目录
      </button>
      <button 
        @click="rescanAllFolders" 
        class="btn btn-secondary"
        :disabled="sharedFolders.length === 0 || isScanning"
      >
        🔄 重新扫描所有目录
      </button>
    </div>

    <div v-if="sharedFolders.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h3>还没有添加共享目录</h3>
      <p>点击上方的"添加共享目录"按钮，选择一个文件夹来共享您的文件</p>
    </div>

    <div v-else class="folders-list">
      <div 
        v-for="(folder, index) in sharedFolders" 
        :key="folder.path"
        class="folder-card"
      >
        <div class="folder-header">
          <div class="folder-info">
            <span class="folder-icon">📂</span>
            <div class="folder-details">
              <span class="folder-path">{{ folder.path }}</span>
              <span class="folder-meta">
                {{ folder.files?.length || 0 }} 个文件
                <span v-if="folder.lastScanAt"> · 上次扫描: {{ formatDate(folder.lastScanAt) }}</span>
              </span>
            </div>
          </div>
          <div class="folder-actions">
            <button 
              @click="rescanFolder(index)" 
              class="action-btn"
              :disabled="isScanning"
              title="重新扫描"
            >
              🔄
            </button>
            <button 
              @click="removeFolder(index)" 
              class="action-btn remove-btn"
              title="移除共享目录"
            >
              🗑️
            </button>
          </div>
        </div>

        <div v-if="currentScanningFolder === index" class="scan-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: scanProgress.progress + '%' }"></div>
          </div>
          <div class="progress-info">
            <span>{{ scanProgress.currentFile || '扫描中...' }}</span>
            <span>{{ scanProgress.progress }}%</span>
          </div>
          <div v-if="hashProgress.fileName" class="hash-progress">
            <span>🔐 {{ hashProgress.fileName }}</span>
            <span>{{ hashProgress.progress }}%</span>
          </div>
          <button @click="cancelScan" class="cancel-scan-btn">取消扫描</button>
        </div>

        <div v-else-if="folder.files && folder.files.length > 0" class="files-list">
          <div 
            v-for="file in folder.files" 
            :key="file.hash"
            class="file-item"
          >
            <span class="file-icon">📄</span>
            <span class="file-name">{{ file.fileName }}</span>
            <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
            <button 
              @click="copyHash(file.hash)" 
              class="copy-hash-btn"
              title="复制哈希值"
            >
              📋
            </button>
          </div>
        </div>

        <div v-else class="no-files">
          <span v-if="folder.files && folder.files.length === 0">该目录没有文件</span>
          <span v-else>尚未扫描，请点击扫描按钮</span>
        </div>
      </div>
    </div>

    <div class="summary-bar" v-if="totalFileCount > 0">
      <span>共 {{ sharedFolders.length }} 个目录，{{ totalFileCount }} 个共享文件，总计 {{ formatFileSize(totalFileSize) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { SharedFolder, SharedFile } from '@shared/types'
import { socketService } from '../services/socket.service'

const emit = defineEmits<{
  (e: 'files-updated', files: SharedFile[]): void
}>()

const sharedFolders = ref<SharedFolder[]>([])
const isSignalingConnected = ref(false)
const isScanning = ref(false)
const currentScanningFolder = ref<number | null>(null)
const scanProgress = ref({ currentFile: '', progress: 0, currentIndex: 0, totalFiles: 0 })
const hashProgress = ref({ fileName: '', processedBytes: 0, totalBytes: 0, progress: 0 })



const totalFileCount = computed(() => {
  return sharedFolders.value.reduce((sum, folder) => sum + (folder.files?.length || 0), 0)
})

const totalFileSize = computed(() => {
  return sharedFolders.value.reduce((sum, folder) => {
    return sum + (folder.files?.reduce((s, f) => s + f.fileSize, 0) || 0)
  }, 0)
})

const allSharedFiles = computed(() => {
  return sharedFolders.value.flatMap(folder => folder.files || [])
})

onMounted(async () => {
  await loadConfig()
  setupSocketConnection()
  setupProgressListeners()
})

onUnmounted(() => {
  removeProgressListeners()
})

const loadConfig = async () => {
  try {
    const config = await window.electronAPI.invoke('config:get')
    if (config.sharedFolders) {
      sharedFolders.value = config.sharedFolders
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

const saveConfig = async () => {
  try {
    const serializableFolders = JSON.parse(JSON.stringify(sharedFolders.value))
    await window.electronAPI.invoke('config:update', { sharedFolders: serializableFolders })
    emit('files-updated', allSharedFiles.value)
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

const setupSocketConnection = () => {
  isSignalingConnected.value = socketService.isConnected.value
  
  watch(socketService.isConnected, (connected) => {
    isSignalingConnected.value = connected
    if (connected) {
      registerAllFiles()
    }
  })
  
  if (socketService.isConnected.value) {
    registerAllFiles()
  }
}

const registerAllFiles = () => {
  if (allSharedFiles.value.length === 0) return
  
  const success = socketService.registerFiles(allSharedFiles.value.map(file => ({
    hash: file.hash,
    fileName: file.fileName,
    fileSize: file.fileSize
  })))
  
  if (success) {
    console.log(`已注册 ${allSharedFiles.value.length} 个共享文件，用户ID: ${socketService.userId.value}`)
  } else {
    console.warn('注册文件失败：未连接到信令服务器')
  }
}

const addSharedFolder = async () => {
  try {
    const result = await window.electronAPI.invoke('p2p:select-share-dir')
    if (result.canceled || !result.filePath) return
    
    const existingIndex = sharedFolders.value.findIndex(f => f.path === result.filePath)
    if (existingIndex !== -1) {
      alert('该目录已添加')
      return
    }
    
    const newFolder: SharedFolder = {
      path: result.filePath,
      files: []
    }
    
    sharedFolders.value.push(newFolder)
    await saveConfig()
    await scanFolder(sharedFolders.value.length - 1)
  } catch (error) {
    console.error('添加共享目录失败:', error)
  }
}

const scanFolder = async (index: number) => {
  if (isScanning.value) return
  
  const folder = sharedFolders.value[index]
  if (!folder) return
  
  isScanning.value = true
  currentScanningFolder.value = index
  scanProgress.value = { currentFile: '', progress: 0, currentIndex: 0, totalFiles: 0 }
  hashProgress.value = { fileName: '', processedBytes: 0, totalBytes: 0, progress: 0 }
  
  try {
    const files = await window.electronAPI.p2p.scanAndHashFiles(folder.path)
    folder.files = files
    folder.lastScanAt = new Date().toISOString()
    
    await saveConfig()
    registerAllFiles()
  } catch (error: any) {
    if (error.message !== '文件扫描已取消') {
      console.error('扫描失败:', error)
    }
  } finally {
    isScanning.value = false
    currentScanningFolder.value = null
  }
}

const rescanFolder = async (index: number) => {
  await scanFolder(index)
}

const rescanAllFolders = async () => {
  for (let i = 0; i < sharedFolders.value.length; i++) {
    await scanFolder(i)
  }
}

const cancelScan = async () => {
  await window.electronAPI.p2p.cancelScan()
}

const removeFolder = async (index: number) => {
  if (!confirm('确定要移除该共享目录吗？')) return
  
  const folder = sharedFolders.value[index]
  if (!folder) return
  
  const removedHashes = folder.files?.map(f => f.hash) || []
  
  sharedFolders.value.splice(index, 1)
  await saveConfig()
  
  unregisterFilesFromServer(removedHashes)
}

const unregisterFilesFromServer = (hashes: string[]) => {
  if (hashes.length === 0) return
  
  const success = socketService.unregisterFiles(hashes)
  
  if (success) {
    console.log(`已从服务器取消注册 ${hashes.length} 个文件`)
  } else {
    console.warn('取消注册文件失败：未连接到信令服务器')
  }
}

const copyHash = async (hash: string) => {
  try {
    await navigator.clipboard.writeText(hash)
    alert('哈希值已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const reconnect = () => {
  socketService.reconnect()
}

const scanProgressListener = (event: any, data: any) => {
  scanProgress.value = {
    currentFile: data.currentFile,
    progress: data.progress,
    currentIndex: data.currentIndex,
    totalFiles: data.totalFiles
  }
}

const hashProgressListener = (event: any, data: any) => {
  hashProgress.value = {
    fileName: data.fileName,
    processedBytes: data.processedBytes,
    totalBytes: data.totalBytes,
    progress: data.progress
  }
}

const setupProgressListeners = () => {
  window.electronAPI.on('p2p:scan-progress', scanProgressListener)
  window.electronAPI.on('p2p:hash-progress', hashProgressListener)
}

const removeProgressListeners = () => {
  window.electronAPI.removeListener('p2p:scan-progress', scanProgressListener)
  window.electronAPI.removeListener('p2p:hash-progress', hashProgressListener)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

defineExpose({
  allSharedFiles,
  registerAllFiles
})
</script>

<style scoped>
.shared-files-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-icon {
  font-size: 3rem;
}

.header-info h2 {
  margin: 0 0 4px;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.header-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
  color: #ef4444;
}

.connection-status.connected {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reconnect-btn {
  margin-left: auto;
  padding: 6px 12px;
  background: var(--bg-button-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--bg-button-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: var(--bg-button-secondary);
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-card);
  border-radius: 16px;
  border: 2px dashed var(--border-color);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.folder-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.folder-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.folder-icon {
  font-size: 2rem;
}

.folder-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-path {
  font-family: monospace;
  font-weight: 600;
  color: var(--text-primary);
}

.folder-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.folder-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.scan-progress {
  background: var(--bg-input);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  transition: width 0.3s;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.hash-progress {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--accent-primary);
  margin-bottom: 12px;
}

.cancel-scan-btn {
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-input);
  border-radius: 10px;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.file-size {
  color: var(--text-secondary);
  font-size: 0.85rem;
  min-width: 70px;
  text-align: right;
}

.copy-hash-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  font-size: 1rem;
}

.copy-hash-btn:hover {
  background: var(--bg-card-hover);
}

.no-files {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.summary-bar {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
}
</style>