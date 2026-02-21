<template>
  <div class="agreement-overlay">
    <div class="agreement-modal">
      <div class="agreement-header">
        <div class="agreement-icon">📜</div>
        <h2>用户使用协议</h2>
        <p class="agreement-subtitle">请仔细阅读以下条款</p>
      </div>
      
      <div class="agreement-content">
        <div class="agreement-section">
          <h3>🔒 隐私与安全</h3>
          <ul>
            <li>本应用通过 P2P 技术进行文件传输，您的 IP 地址将会暴露给连接的节点</li>
            <li>请确保您有权分享下载的文件，遵守相关法律法规</li>
            <li>不要分享包含个人隐私、商业机密或敏感信息的文件</li>
          </ul>
        </div>
        
        <div class="agreement-section">
          <h3>💻 资源使用说明</h3>
          <ul>
            <li><strong>带宽资源</strong>：作为 P2P 网络节点，您的带宽将被用于为其他用户提供文件下载服务</li>
            <li><strong>存储空间</strong>：应用会缓存下载的文件和文件索引信息</li>
            <li><strong>CPU 使用</strong>：文件哈希计算和数据加密会占用一定的 CPU 资源</li>
          </ul>
        </div>
        
        <div class="agreement-section">
          <h3>⚡ 注意事项</h3>
          <ul>
            <li>共享目录中的文件信息（哈希值、文件名、大小）会被上传到信令服务器供其他用户搜索</li>
            <li>下载文件时会从多个节点并行下载，建议使用稳定网络</li>
            <li>大文件下载可能需要较长时间，请保持应用运行</li>
          </ul>
        </div>
        
        <div class="agreement-section">
          <h3>⚠️ 责任声明</h3>
          <ul>
            <li>开发者不对通过本应用传输的文件内容负责</li>
            <li>用户对自己分享和下载的内容承担全部责任</li>
            <li>禁止用于非法用途，包括但不限于盗版、病毒传播等</li>
          </ul>
        </div>
      </div>
      
      <div class="agreement-footer">
        <div class="checkbox-container" @click="toggleAgreement">
          <div class="custom-checkbox" :class="{ checked: isAgreed }">
            <span v-if="isAgreed">✓</span>
          </div>
          <span class="checkbox-label">我已阅读并同意以上条款</span>
        </div>
        
        <div class="agreement-buttons">
          <button 
            class="btn btn-primary btn-agree" 
            :class="{ disabled: !isAgreed }"
            :disabled="!isAgreed"
            @click="acceptAgreement">
            同意并进入
          </button>
          <button class="btn btn-secondary btn-exit" @click="exitApp">
            不同意并退出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'accepted'): void
}>()

const isAgreed = ref(false)

const toggleAgreement = () => {
  isAgreed.value = !isAgreed.value
}

const acceptAgreement = async () => {
  if (!isAgreed.value) return
  
  await window.electronAPI.invoke('config:update', {
    userAgreement: {
      accepted: true,
      acceptedAt: new Date().toISOString()
    }
  })
  
  emit('accepted')
}

const exitApp = async () => {
  try {
    await window.electronAPI.invoke('window:close')
  } catch (error) {
    window.close()
  }
}
</script>

<style scoped>
.agreement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.agreement-modal {
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: modalSlideIn 0.4s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.agreement-header {
  padding: 30px 40px 20px;
  text-align: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.agreement-icon {
  font-size: 4rem;
  margin-bottom: 10px;
  animation: iconBounce 1s ease-out;
}

@keyframes iconBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.agreement-header h2 {
  margin: 0 0 8px;
  font-size: 1.8rem;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.agreement-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
}

.agreement-content {
  flex: 1;
  overflow-y: auto;
  padding: 25px 40px;
}

.agreement-content::-webkit-scrollbar {
  width: 8px;
}

.agreement-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.agreement-content::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.5);
  border-radius: 4px;
}

.agreement-content::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.7);
}

.agreement-section {
  margin-bottom: 25px;
}

.agreement-section:last-child {
  margin-bottom: 0;
}

.agreement-section h3 {
  margin: 0 0 12px;
  font-size: 1.1rem;
  color: #a5b4fc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.agreement-section ul {
  margin: 0;
  padding-left: 20px;
}

.agreement-section li {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 8px;
}

.agreement-section li strong {
  color: #fbbf24;
}

.agreement-footer {
  padding: 25px 40px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: transparent;
}

.custom-checkbox.checked {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
}

.custom-checkbox span {
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
}

.checkbox-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
}

.agreement-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 14px 35px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
  min-width: 140px;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.btn-primary:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
}

.btn-primary.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}
</style>