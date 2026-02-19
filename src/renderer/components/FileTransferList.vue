<template>
  <div class="file-transfer-list">
    <h3>文件传输</h3>
    
    <div v-if="transfers.length === 0" class="empty-state">
      <p>暂无文件传输任务</p>
    </div>
    
    <div v-else class="transfers-container">
      <div 
        v-for="transfer in transfers" 
        :key="transfer.id"
        class="transfer-item"
        :class="transfer.status"
      >
        <div class="transfer-info">
          <div class="file-name">{{ transfer.fileName }}</div>
          <div class="transfer-details">
            <span class="direction" :class="transfer.direction">
              {{ transfer.direction === 'send' ? '发送' : '接收' }}
            </span>
            <span class="file-size">{{ formatFileSize(transfer.fileSize) }}</span>
            <span class="peer-id">对端: {{ transfer.peerId }}</span>
          </div>
        </div>
        
        <div class="transfer-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: transfer.progress + '%' }"
              :class="transfer.status"
            ></div>
          </div>
          <div class="progress-text">
            {{ transfer.progress }}%
            <span v-if="transfer.speed" class="speed">
              ({{ formatSpeed(transfer.speed) }})
            </span>
          </div>
        </div>
        
        <div class="transfer-actions">
          <span class="status" :class="transfer.status">
            {{ getStatusText(transfer.status) }}
          </span>
          <button 
            v-if="transfer.status === 'transferring' || transfer.status === 'pending' || transfer.status === 'connecting'"
            @click="cancelTransfer(transfer.id)"
            class="cancel-btn"
          >
            取消
          </button>
          <button 
            v-if="transfer.status === 'completed' && transfer.direction === 'receive'"
            @click="openFile(transfer)"
            class="open-btn"
          >
            打开
          </button>
        </div>
        
        <div class="transfer-time" v-if="transfer.startTime">
          开始: {{ formatTime(transfer.startTime) }}
          <span v-if="transfer.endTime">
            | 结束: {{ formatTime(transfer.endTime) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { FileTransferInfo } from '@shared/types/p2p'

// 响应式数据
const transfers = ref<FileTransferInfo[]>([])

// 生命周期
onMounted(() => {
  setupEventListeners()
  loadTransfers()
})

onUnmounted(() => {
  removeEventListeners()
})

// 事件监听器
const setupEventListeners = () => {
  // 监听来自CrossNetworkP2P组件的传输事件
  window.addEventListener('p2p:transfer-progress', handleTransferProgressFromEvent)
  window.addEventListener('p2p:transfer-complete', handleTransferCompleteFromEvent)
  window.addEventListener('p2p:transfer-error', handleTransferErrorFromEvent)
}

const removeEventListeners = () => {
  window.removeEventListener('p2p:transfer-progress', handleTransferProgressFromEvent)
  window.removeEventListener('p2p:transfer-complete', handleTransferCompleteFromEvent)
  window.removeEventListener('p2p:transfer-error', handleTransferErrorFromEvent)
}

// 从全局事件处理传输进度
const handleTransferProgressFromEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  handleTransferProgress(customEvent.detail)
}

// 从全局事件处理传输完成
const handleTransferCompleteFromEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  handleTransferComplete(customEvent.detail)
}

// 从全局事件处理传输错误
const handleTransferErrorFromEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  handleTransferError(customEvent.detail)
}

// 事件处理
const handleTransferProgress = (transferInfo: FileTransferInfo) => {
  const index = transfers.value.findIndex(t => t.id === transferInfo.id)
  if (index >= 0) {
    transfers.value[index] = transferInfo
  } else {
    transfers.value.unshift(transferInfo)
  }
}

const handleTransferComplete = (transferInfo: FileTransferInfo) => {
  const index = transfers.value.findIndex(t => t.id === transferInfo.id)
  if (index >= 0) {
    transfers.value[index] = transferInfo
  }
}

const handleTransferError = (errorInfo: { fileId: string; error: any }) => {
  const index = transfers.value.findIndex(t => t.id === errorInfo.fileId)
  if (index >= 0) {
    transfers.value[index].status = 'error'
  }
}

// 方法
const loadTransfers = async () => {
  // 由于我们使用全局事件监听，传输列表将通过事件自动更新
  // 这里不需要主动获取传输列表
  console.log('传输列表将通过事件自动更新')
}

const cancelTransfer = async (transferId: string) => {
  if (!window.electronAPI) return
  
  try {
    const success = await window.electronAPI.p2p.cancelTransfer(transferId)
    if (success) {
      console.log('传输已取消')
      // 更新传输列表中的状态
      const index = transfers.value.findIndex(t => t.id === transferId)
      if (index >= 0) {
        transfers.value[index].status = 'cancelled'
      }
    }
  } catch (error) {
    console.error('取消传输失败:', error)
  }
}

const openFile = async (transfer: FileTransferInfo) => {
  if (!window.electronAPI) {
    console.error('electronAPI未定义')
    return
  }
  
  if (!window.electronAPI.shell) {
    console.error('electronAPI.shell未定义')
    return
  }
  
  if (!window.electronAPI.shell.showItemInFolder) {
    console.error('electronAPI.shell.showItemInFolder未定义')
    return
  }
  
  try {
    // 假设transfer对象中有filePath属性，表示文件保存的完整路径
    if (transfer.filePath) {
      await window.electronAPI.shell.showItemInFolder(transfer.filePath)
      console.log('已打开文件所在位置:', transfer.filePath)
    } else {
      console.error('文件路径不存在，无法打开文件所在位置')
    }
  } catch (error) {
    console.error('打开文件所在位置失败:', error)
  }
}

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytesPerSecond: number): string => {
  return formatFileSize(bytesPerSecond) + '/s'
}

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getStatusText = (status: string): string => {
  const statusMap = {
    pending: '搜索源中',
    connecting: '连接中',
    transferring: '传输中',
    completed: '已完成',
    error: '错误',
    cancelled: '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}
</script>

<style>
.file-transfer-list {
  background: var(--bg-card) !important;
}

.file-transfer-list h3 {
  color: var(--text-primary) !important;
}

.file-transfer-list .empty-state {
  color: var(--text-secondary) !important;
  background: var(--bg-input) !important;
}

.file-transfer-list .transfer-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.file-transfer-list .transfer-item:hover {
  background: var(--bg-card-hover) !important;
}

.file-transfer-list .file-name {
  color: var(--text-primary) !important;
}

.file-transfer-list .file-meta {
  color: var(--text-secondary) !important;
}

.file-transfer-list .file-size,
.file-transfer-list .speed,
.file-transfer-list .progress-text {
  color: var(--text-secondary) !important;
}

.file-transfer-list .progress-bar-bg,
.file-transfer-list .progress-bar {
  background: var(--border-color) !important;
}

.file-transfer-list .progress-fill {
  background: var(--accent-gradient) !important;
}

.file-transfer-list .status-badge {
  background: var(--bg-input) !important;
  color: var(--text-secondary) !important;
}

.file-transfer-list .status-connecting {
  background: rgba(251, 191, 36, 0.2) !important;
  color: #f59e0b !important;
}

.file-transfer-list .status-transferring {
  background: rgba(59, 130, 246, 0.2) !important;
  color: var(--accent-primary) !important;
}

.file-transfer-list .status-completed {
  background: rgba(16, 185, 129, 0.2) !important;
  color: var(--accent-secondary) !important;
}

.file-transfer-list .status-failed,
.file-transfer-list .status-cancelled {
  background: rgba(239, 68, 68, 0.2) !important;
  color: #ef4444 !important;
}

.file-transfer-list .status-paused {
  background: rgba(245, 158, 11, 0.2) !important;
  color: #f59e0b !important;
}

.file-transfer-list .transfer-actions button {
  color: var(--text-primary) !important;
}

.file-transfer-list .transfer-actions button:hover {
  background: var(--bg-card-hover) !important;
}

.file-transfer-list .btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
}

.file-transfer-list .btn-primary {
  background: var(--bg-button-primary) !important;
  color: var(--text-white) !important;
}
</style>

<style scoped>
.file-transfer-list {
  height: 100%;
  margin: 0;
  border-radius: 0;
  padding: 20px;
  box-shadow: none;
  backdrop-filter: none;
  border: none;
  display: flex;
  flex-direction: column;
}

.file-transfer-list h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.2em;
  text-align: left;
  font-weight: 600;
  position: relative;
  display: flex;
  align-items: center;
}

.file-transfer-list h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 2px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  color: #6c757d;
  font-style: italic;
  background: #f8fafc;
  border-radius: 12px;
  margin-top: 10px;
}

.transfers-container {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  padding: 10px;
  background: #f8fafc;
  margin-top: 10px;
  border: 1px solid #e2e8f0;
}

/* 滚动条样式 */
.transfers-container::-webkit-scrollbar {
  width: 6px;
}

.transfers-container::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 3px;
}

.transfers-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.transfers-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.transfer-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.transfer-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.transfer-item.transferring {
  border-left: 4px solid #3498db;
  background: #f0f9ff;
}

.transfer-item.completed {
  border-left: 4px solid #2ecc71;
  background: #f0fff4;
}

.transfer-item.error {
  border-left: 4px solid #e74c3c;
  background: #fef2f2;
}

.transfer-item.cancelled {
  border-left: 4px solid #f39c12;
  background: #fffbeb;
}

.transfer-info {
  margin-bottom: 12px;
}

.file-name {
  font-weight: 600;
  margin-bottom: 6px;
  color: #2c3e50;
  word-break: break-all;
  font-size: 0.95em;
}

.transfer-details {
  display: flex;
  gap: 16px;
  font-size: 0.85em;
  color: #64748b;
  flex-wrap: wrap;
}

.direction {
  padding: 4px 8px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.direction.send {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.direction.receive {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.transfer-progress {
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: shimmer 2s infinite;
}

.progress-fill.completed {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.progress-fill.error {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.progress-fill.cancelled {
  background: linear-gradient(90deg, #f39c12, #e67e22);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
  color: #64748b;
  margin-top: 6px;
  font-weight: 500;
}

.speed {
  font-style: italic;
  opacity: 0.8;
}

.transfer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.status {
  font-size: 0.85em;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  background: #f1f5f9;
}

.status.pending {
  color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.status.transferring {
  color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.status.completed {
  color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
}

.status.error {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.status.cancelled {
  color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
}

.cancel-btn, .open-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cancel-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.open-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.open-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.transfer-time {
  font-size: 0.8em;
  color: #94a3b8;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-transfer-list {
    padding: 15px;
    margin: 10px;
  }
  
  .transfer-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .transfer-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .cancel-btn, .open-btn {
    width: 100%;
  }
}
</style>