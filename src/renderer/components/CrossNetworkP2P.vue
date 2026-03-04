<template>
  <div class="cross-network-p2p">
    <h2 class="page-title">跨网络P2P文件传输</h2>
    
    <!-- 信令服务器状态 -->
    <div class="signaling-status-section">
      <div class="section-header">
        <div class="section-icon">📡</div>
        <h3 class="section-title">信令服务器状态</h3>
      </div>
      
      <div class="server-status-card">
        <div class="status-row">
          <div class="status-info">
            <div class="status-label">服务器连接</div>
            <div class="status-details">
              <span 
                class="connection-status-badge" 
                :class="isSignalingConnected ? 'connected' : 'disconnected'"
              >
                <span class="status-dot"></span>
                {{ isSignalingConnected ? '已连接' : '未连接' }}
              </span>
              
              <button 
                v-if="!isSignalingConnected" 
                @click="reconnectSignalingServer"
                class="reconnect-button"
              >
                <svg class="reconnect-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  <path d="M21 3v5h-5"></path>
                </svg>
                重新连接
              </button>
            </div>
          </div>
        </div>
        
        <div class="status-row">
          <div class="status-info">
            <div class="status-label">用户ID</div>
            <div class="user-id-display">
              <code class="user-id-code">{{ userId || '未分配' }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件搜索 -->
    <div class="file-search">
      <h3>搜索全网文件</h3>
      <div class="search-hint">
        💡 支持文件名关键词或SHA-256哈希值（64位十六进制）搜索
      </div>
      <div class="input-group">
        <input 
          v-model="searchQuery" 
          placeholder="输入文件名关键词或SHA-256哈希值" 
          class="input-field"
          @keyup.enter="searchFiles"
          :disabled="!isSignalingConnected"
          :maxlength="64"
        />
        <button 
          @click="searchFiles" 
          class="btn btn-primary"
          :disabled="!searchQuery || !isSignalingConnected"
        >
          搜索
        </button>
      </div>
      
      <!-- 搜索结果 -->
      <div class="search-results" v-if="searchResults.length > 0">
        <h4>搜索结果 ({{ searchResults.length }})</h4>
        <div class="result-list">
          <div 
            v-for="result in searchResults" 
            :key="result.hash"
            class="result-item"
            :class="{ exact: result.isExactMatch }"
          >
            <div class="result-info">
              <span class="file-name">{{ result.fileName }}</span>
              <span class="file-size">{{ formatFileSize(result.fileSize) }}</span>
              <span class="node-count">可用节点: {{ result.nodeCount }}</span>
              <span v-if="result.isExactMatch" class="exact-match-badge">精确匹配</span>
            </div>
            <button 
              @click="downloadFile(result)"
              class="btn btn-download"
              :disabled="!isSignalingConnected"
            >
              下载
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件传输 -->
    <div class="file-transfer">
      <h3>文件传输</h3>
      <div class="input-group">
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          class="file-input"
        />
        <button 
          @click="selectFile" 
          class="btn btn-secondary"
        >
          选择文件
        </button>
        <button 
          @click="uploadFile" 
          class="btn btn-primary"
          :disabled="!selectedFile"
        >
          上传分享
        </button>
      </div>
    </div>

    <!-- P2P连接管理 -->
    <div class="p2p-connections" v-if="p2pConnections.length > 0">
      <h3>P2P连接</h3>
      <div class="connection-list">
        <div 
          v-for="(conn, index) in uniqueP2PConnections" 
          :key="conn.peerId"
          class="connection-item"
        >
          <span class="peer-id">{{ conn.peerId.split('-')[0] }}</span>
          <span class="connection-status" :class="{ connected: conn.isConnected }">
            {{ conn.isConnected ? '已连接' : '连接中' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 文件接收确认对话框 -->
    <div v-if="showFileTransferConfirm" class="modal-overlay">
      <div class="modal-content">
        <h3>文件传输请求</h3>
        <div class="file-info">
          <p><strong>发送方:</strong> {{ fileTransferRequest.fromUserId?.substring(0, 6) }}</p>
          <p><strong>文件名:</strong> {{ fileTransferRequest.fileInfo?.name }}</p>
          <p><strong>文件大小:</strong> {{ formatFileSize(fileTransferRequest.fileInfo?.size || 0) }}</p>
        </div>
        <div class="modal-actions">
          <button @click="acceptFileTransfer" class="btn btn-primary">接收文件</button>
          <button @click="rejectFileTransfer" class="btn btn-secondary">拒绝接收</button>
        </div>
      </div>
    </div>

    <!-- 日志信息 -->
    <div class="logs">
      <h3>操作日志</h3>
      <div class="log-container">
        <div 
          v-for="log in logs" 
          :key="log.id"
          class="log-item"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { IPC_CHANNELS } from '../../shared/constants'
import { socketService } from '../services/socket.service'

// 定义属性
const props = defineProps<{ signalingServerUrl?: string }>()

// 使用传入的信令服务器URL
const signalingServerUrl = computed(() => {
  if (!props.signalingServerUrl) return '';
  return props.signalingServerUrl.replace('http://', 'ws://').replace('https://', 'wss://')
})

// 响应式数据
const isSignalingConnected = ref(false)
const userId = ref('')
const p2pConnections = ref<any[]>([])

// 文件搜索相关数据
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const selectedPeerId = ref('')
const selectedFile = ref<File | null>(null)
const transfers = ref<any[]>([])
const logs = ref<any[]>([])

// 临时分享文件（用于临时上传分享）
const tempSharedFiles = ref<any[]>([])

// 计算属性 - 获取唯一的对等连接（排除通道后缀）
const uniqueP2PConnections = computed(() => {
  const seenPeers = new Set<string>();
  return p2pConnections.value.filter(conn => {
    // 提取基础对等方ID（去掉通道后缀）
    const peerIdParts = conn.peerId.split('-');
    let basePeerId: string;
    if (peerIdParts.length >= 5) {
      // 长ID：使用前5个部分作为基础ID
      basePeerId = peerIdParts.slice(0, 5).join('-');
    } else {
      // 短ID：直接使用完整ID
      basePeerId = conn.peerId;
    }
    if (seenPeers.has(basePeerId)) {
      return false; // 已经见过这个对等方，过滤掉
    }
    seenPeers.add(basePeerId);
    return true; // 第一次见到这个对等方，保留
  });
});

// 文件传输确认相关
const showFileTransferConfirm = ref(false)
const fileTransferRequest = ref<{
  fromUserId?: string
  fileInfo?: any
}>({})

// DOM元素引用
const fileInput = ref<HTMLInputElement | null>(null)

// WebRTC相关变量
let peerConnections: Map<string, RTCPeerConnection> = new Map()
let dataChannels: Map<string, RTCDataChannel> = new Map()

// 多通道并行传输支持
const multiDataChannels: Map<string, RTCDataChannel[]> = new Map(); // 每个对等方的多通道数组
const CHANNEL_COUNT = 8; // 增加并行通道数量以提高传输速度

// 存储主动关闭的数据通道（传输完成时主动关闭，不触发重连）
const intentionallyClosedChannels = new Set<string>();

// 待处理的传输请求
interface PendingTransfer {
  peerId: string;
  fileInfo: any;
  file: File | null;
}

const pendingTransfers: PendingTransfer[] = []

// 存储传输完成确认Promise，用于同步发送和接收完成状态
const transferCompletionPromises = new Map<string, {
  resolve: (value: any) => void,
  reject: (reason: any) => void
}>()

// 生命周期
onMounted(() => {
  connectToSignalingServer()
  setupFileTransferEventListeners()
})

// 监听信令服务器URL的变化
watch(() => props.signalingServerUrl, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    addLog('info', `信令服务器URL已更新`)
    // 如果之前没有连接或连接失败，尝试连接新URL
    if (!isSignalingConnected.value) {
      setTimeout(() => {
        connectToSignalingServer()
      }, 1000) // 延迟一下，确保状态更新完成
    }
  }
})

onUnmounted(() => {
  disconnectFromSignalingServer()
  removeFileTransferEventListeners()
})

// 连接到信令服务器
const connectToSignalingServer = () => {
  try {
    // 使用动态信令服务器URL
    if (!props.signalingServerUrl) {
      addLog('error', '信令服务器URL未配置');
      return;
    }
    
    let signalingUrl = props.signalingServerUrl;
    // 确保URL格式正确
    if (!signalingUrl.startsWith('http://') && !signalingUrl.startsWith('https://')) {
      signalingUrl = 'http://' + signalingUrl
    }
    
    addLog('info', `正在连接到信令服务器`)
    
    socketService.connect(signalingUrl)
    
    // 同步连接状态
    isSignalingConnected.value = socketService.isConnected.value
    userId.value = socketService.userId.value
    
    // 监听连接状态变化
    watch(socketService.isConnected, (connected) => {
      isSignalingConnected.value = connected
      if (connected) {
        userId.value = socketService.userId.value
        addLog('success', '已连接到信令服务器')
      }
    })
    
    watch(socketService.userId, (newUserId) => {
      userId.value = newUserId
    })
    
    // 如果已经连接，设置状态
    if (socketService.isConnected.value) {
      userId.value = socketService.userId.value
      addLog('success', '已连接到信令服务器')
    }
    
    const socket = socketService.getSocket()
    if (!socket) {
      addLog('error', '无法获取Socket实例')
      return
    }

    socket.on('disconnect', (reason) => {
      isSignalingConnected.value = false
      addLog('error', `与信令服务器断开连接: ${reason}`)
    })

    socket.on('connect_error', (error) => {
      isSignalingConnected.value = false
      addLog('error', `连接信令服务器失败: ${error.message}`)
      console.error('Socket连接错误详情:', error)
    })

    socket.on('connect_timeout', (timeout) => {
      isSignalingConnected.value = false
      addLog('error', `信令服务器连接超时: ${timeout}ms`)
    })

    socket.on('reconnect', (attemptNumber) => {
      isSignalingConnected.value = true
      userId.value = socketService.userId.value
      addLog('success', `信令服务器重连成功 (尝试次数: ${attemptNumber})`)
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      addLog('info', `正在尝试重连信令服务器 (${attemptNumber}/10)...`)
    })

    socket.on('reconnect_failed', () => {
      isSignalingConnected.value = false
      addLog('error', '信令服务器重连失败')
    })

    socket.on('reconnect_error', (error) => {
      addLog('error', `信令服务器重连错误: ${error.message}`)
    })

    // 新增：文件搜索相关事件
    socket.on('search-results', (results) => {
      searchResults.value = results
      addLog('success', `搜索完成，找到 ${results.length} 个匹配文件`)
    })

    // ✅ 多源下载：监听所有节点返回
    socket.on('download-nodes-found', (data) => {
      const { fileHash, fileName, fileSize, nodes, nodeCount } = data
      addLog('info', `找到文件 ${fileName} 的 ${nodeCount} 个下载节点`)
      
      // 查找之前创建的 pending 传输记录
      const pendingTransfer = transfers.value.find(
        t => t.hash === fileHash && t.status === 'pending' && t.isFromSearch
      )
      
      // 优先使用多源下载
      if (nodes && nodes.length > 1) {
        addLog('success', `启用多源下载模式，从 ${nodes.length} 个节点并行下载`)
        startMultiSourceDownload(fileHash, fileName, fileSize, nodes, pendingTransfer?.id)
      } else if (nodes && nodes.length === 1) {
        // 单节点时使用原有方式
        addLog('info', `只有1个节点可用，使用单源下载`)
        connectToUser(nodes[0]).then(() => {
          startFileDownload(fileHash, fileName, fileSize, nodes[0], pendingTransfer?.id)
        })
      }
    })

    socket.on('download-nodes-not-found', (data) => {
      const { fileHash, error } = data
      
      // 查找之前创建的 pending 传输记录并更新状态
      const pendingTransfer = transfers.value.find(
        t => t.hash === fileHash && t.status === 'pending' && t.isFromSearch
      )
      
      if (pendingTransfer) {
        pendingTransfer.status = 'error'
        window.dispatchEvent(new CustomEvent('p2p:transfer-error', {
          detail: { fileId: pendingTransfer.id, error }
        }))
      }
      
      addLog('error', `下载文件失败: ${error}`)
    })

    // 保留旧接口的兼容处理
    socket.on('download-node-found', (data) => {
      const { fileHash, fileName, fileSize, nodeId } = data
      addLog('info', `找到文件 ${fileName} 的下载节点: ${nodeId.substring(0, 6)} (单源模式)`)
      
      // 查找之前创建的 pending 传输记录
      const pendingTransfer = transfers.value.find(
        t => t.hash === fileHash && t.status === 'pending' && t.isFromSearch
      )
      
      // 连接到拥有文件的节点
      connectToUser(nodeId).then(() => {
        // 开始文件传输
        startFileDownload(fileHash, fileName, fileSize, nodeId, pendingTransfer?.id)
      })
    })

    socket.on('download-node-not-found', (data) => {
      const { fileHash, error } = data
      
      // 查找之前创建的 pending 传输记录并更新状态
      const pendingTransfer = transfers.value.find(
        t => t.hash === fileHash && t.status === 'pending' && t.isFromSearch
      )
      
      if (pendingTransfer) {
        pendingTransfer.status = 'error'
        window.dispatchEvent(new CustomEvent('p2p:transfer-error', {
          detail: { fileId: pendingTransfer.id, error }
        }))
      }
      
      addLog('error', `下载文件失败: ${error}`)
    })

    // WebRTC信令事件
    socket.on('webrtc-signal', (data) => {
      const { fromUserId, signal } = data
      
      if (signal.type === 'offer') {
        handleWebRTCOffer({ fromUserId, offer: signal })
      } else if (signal.type === 'answer') {
        handleWebRTCAnswer({ fromUserId, answer: signal })
      } else if (signal.type === 'candidate') {
        handleWebRTCICECandidate({ fromUserId, candidate: signal })
      }
    })

    // 文件传输信令
    socket.on('file-transfer-request', (data) => {
      const { fromUserId, fileInfo } = data
      console.log(`收到文件传输请求: ${fromUserId}`, fileInfo)
      
      // 触发文件接收确认对话框
      window.dispatchEvent(new CustomEvent('file-transfer-request', {
        detail: { fromUserId, fileInfo }
      }))
    })

    socket.on('file-transfer-response', (data) => {
      const { fromUserId, accepted, fileInfo } = data
      console.log(`收到文件传输响应: ${fromUserId} - ${accepted ? '接受' : '拒绝'}`)
      
      // 触发文件传输响应处理
      window.dispatchEvent(new CustomEvent('file-transfer-response', {
        detail: { fromUserId, accepted, fileInfo }
      }))
    })

  } catch (error) {
    addLog('error', `连接信令服务器时发生错误: ${error}`)
  }
}

// 断开信令服务器连接
const disconnectFromSignalingServer = () => {
  socketService.disconnect()
}

// 重新连接信令服务器
const reconnectSignalingServer = async () => {
  addLog('info', '正在尝试重新连接信令服务器...')
  socketService.reconnect()
}

// 搜索文件
const searchFiles = () => {
  if (!searchQuery.value.trim()) {
    addLog('error', '请输入搜索关键词')
    return
  }
  
  if (!socketService.isConnected.value) {
    addLog('error', '未连接到信令服务器')
    return
  }
  
  socketService.emit('search-files', searchQuery.value.trim())
  addLog('info', `正在搜索: ${searchQuery.value}`)
}

// 下载文件
const downloadFile = (result: any) => {
  if (!socketService.isConnected.value) {
    addLog('error', '未连接到信令服务器')
    return
  }
  
  // 检查是否已有相同文件的下载任务（防止重复点击）
  const existingTransfer = transfers.value.find(
    t => t.hash === result.hash && (t.status === 'pending' || t.status === 'connecting' || t.status === 'transferring')
  )
  
  if (existingTransfer) {
    addLog('warning', `文件 ${result.fileName} 已在下载队列中，请勿重复点击`)
    return
  }
  
  // 立即创建传输记录，显示在传输列表中
  const transferId = generateTransferId()
  const transfer = {
    id: transferId,
    peerId: 'searching',
    fileName: result.fileName,
    fileSize: result.fileSize,
    progress: 0,
    status: 'pending',
    direction: 'receive',
    hash: result.hash,
    receivedChunks: 0,
    totalChunks: 0,
    sourceNodeCount: 0,
    activeNodeCount: 0,
    isFromSearch: true
  }
  transfers.value.push(transfer)
  
  // 触发传输进度事件，让 FileTransferList 立即显示
  window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
    detail: { ...transfer }
  }))
  
  addLog('info', `开始搜索文件 ${result.fileName} 的下载源...`)
  
  // 请求下载文件的节点信息
  socketService.emit('request-download', result.hash)
}

// 连接到用户
const connectToUser = async (targetUserId: string) => {
  return new Promise<void>((resolve, reject) => {
    if (!socketService.isConnected.value) {
      addLog('error', '未连接到信令服务器');
      reject(new Error('未连接到信令服务器'));
      return;
    }

    // 检查是否已存在连接
    let peerConnection = peerConnections.get(targetUserId);
    
    // 如果不存在连接，创建新的
    if (!peerConnection) {
      peerConnection = createPeerConnection(targetUserId);
    } else {
      addLog('info', `已存在与 ${targetUserId} 的P2P连接，使用现有连接`);
      resolve();
      return;
    }

    // 监听连接状态变化以返回Promise
    const connectionHandler = () => {
      if (peerConnection.connectionState === 'connected') {
        resolve();
        peerConnection.removeEventListener('connectionstatechange', connectionHandler);
      } else if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
        reject(new Error(`连接失败: ${peerConnection.connectionState}`));
        peerConnection.removeEventListener('connectionstatechange', connectionHandler);
      }
    };

    peerConnection.addEventListener('connectionstatechange', connectionHandler);

    try {
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          socketService.emit('webrtc-signal', {
            targetUserId: targetUserId,
            signal: { type: 'offer', sdp: peerConnection.localDescription?.sdp }
          });
        })
        .catch(error => {
          addLog('error', `创建WebRTC Offer失败: ${error}`);
          // 可选：清理已创建的连接
          if (!peerConnections.has(targetUserId)) {
            peerConnections.delete(targetUserId);
            multiDataChannels.delete(targetUserId);
          }
          reject(error);
        });
    } catch (error) {
      addLog('error', `连接用户时发生错误: ${error}`);
      reject(error);
    }

    addLog('info', `正在连接用户 ${targetUserId}...`);
  });
};

// 创建WebRTC对等连接
const createPeerConnection = (peerId: string) => {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }  // 添加Cloudflare STUN服务器
    ]
  }

  const peerConnection = new RTCPeerConnection(configuration)
  
  // 创建多个数据通道用于并行传输
  const channels: RTCDataChannel[] = [];
  
  for (let i = 0; i < CHANNEL_COUNT; i++) {
    const dataChannel = peerConnection.createDataChannel(`fileTransfer-${i}`, {
      ordered: true
    });
    
    setupDataChannel(dataChannel, `${peerId}-ch${i}`); // 使用唯一的通道ID
    channels.push(dataChannel);
  }
  
  // 存储多通道
  multiDataChannels.set(peerId, channels);
  
  // 监听传入的数据通道（接收方）
  peerConnection.ondatachannel = (event) => {
    const incomingDataChannel = event.channel;
    // 为传入通道生成唯一ID
    const incomingChannelId = `${peerId}-incoming-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setupDataChannel(incomingDataChannel, incomingChannelId);
    
    // 将传入通道添加到多通道数组
    const existingChannels = multiDataChannels.get(peerId) || [];
    existingChannels.push(incomingDataChannel);
    multiDataChannels.set(peerId, existingChannels);
  }

  // ICE候选处理
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && socketService.isConnected.value) {
      socketService.emit('webrtc-signal', {
        targetUserId: peerId,
        signal: {
          type: 'candidate',
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        }
      })
    }
  }

  // 连接状态变化
  peerConnection.onconnectionstatechange = () => {
    updateConnectionStatus(peerId, peerConnection.connectionState)
  }

  peerConnections.set(peerId, peerConnection)
  // 使用第一个通道作为主通道
  dataChannels.set(peerId, channels[0])
  
  // 注意：不再在这里直接添加到p2pConnections，而是由updateConnectionStatus处理
  // 这样可以确保只添加短ID，保持UI一致性
  addLog('debug', `创建P2P连接: ${peerId}`);

  return peerConnection
}

// 存储数据通道健康状态
const dataChannelHealth = new Map<string, {
  lastActivity: number,
  consecutiveErrors: number,
  isHealthy: boolean,
  reconnectAttempts: number
}>();

// 存储网络性能指标（用于发送端）
const networkPerformance = new Map<string, {
  // 传输速率监控
  transferRateHistory: { timestamp: number, bytes: number }[];
  currentTransferRate: number; // bytes per second
  
  // 延迟监控
  latencyHistory: number[];
  currentLatency: number; // ms
  
  // 缓冲区大小动态调整
  currentBufferSize: number;
  lastAdjustment: number;
  
  // 性能统计
  lastBytesSent: number;
  lastSampleTime: number;
}>();

// 存储接收端网络性能指标
const receiveNetworkPerformance = new Map<string, {
  // 接收速率监控
  receiveRateHistory: { timestamp: number, bytes: number }[];
  currentReceiveRate: number; // bytes per second
  
  // 延迟监控
  latencyHistory: number[];
  currentLatency: number; // ms
  
  // 接收缓冲区大小动态调整
  currentBufferSize: number;
  lastAdjustment: number;
  
  // 性能统计
  lastBytesReceived: number;
  lastSampleTime: number;
}>();

// 初始化网络性能数据
const initNetworkPerformance = (peerId: string) => {
  if (!networkPerformance.has(peerId)) {
    networkPerformance.set(peerId, {
      transferRateHistory: [],
      currentTransferRate: 0,
      latencyHistory: [],
      currentLatency: 0,
      currentBufferSize: 4 * 1024 * 1024, // 初始4MB
      lastAdjustment: Date.now(),
      lastBytesSent: 0,
      lastSampleTime: Date.now()
    });
  }
};

// 初始化接收端网络性能数据
const initReceiveNetworkPerformance = (peerId: string) => {
  if (!receiveNetworkPerformance.has(peerId)) {
    receiveNetworkPerformance.set(peerId, {
      receiveRateHistory: [],
      currentReceiveRate: 0,
      latencyHistory: [],
      currentLatency: 0,
      currentBufferSize: 4 * 1024 * 1024, // 初始4MB
      lastAdjustment: Date.now(),
      lastBytesReceived: 0,
      lastSampleTime: Date.now()
    });
  }
};

// 更新传输速率
const updateTransferRate = (peerId: string, bytesSent: number) => {
  const perf = networkPerformance.get(peerId);
  if (!perf) return;
  
  const now = Date.now();
  const timeDiff = (now - perf.lastSampleTime) / 1000; // 转换为秒
  
  if (timeDiff > 0.5) { // 每0.5秒更新一次速率
    const bytesDiff = bytesSent - perf.lastBytesSent;
    const rate = bytesDiff / timeDiff;
    
    // 更新历史记录（保留最近10个样本）
    perf.transferRateHistory.push({ timestamp: now, bytes: rate });
    if (perf.transferRateHistory.length > 10) {
      perf.transferRateHistory.shift();
    }
    
    // 计算平均传输速率
    if (perf.transferRateHistory.length > 0) {
      const sum = perf.transferRateHistory.reduce((acc, sample) => acc + sample.bytes, 0);
      perf.currentTransferRate = sum / perf.transferRateHistory.length;
    }
    
    // 更新统计值
    perf.lastBytesSent = bytesSent;
    perf.lastSampleTime = now;
  }
};

// 更新接收速率
const updateReceiveRate = (peerId: string, bytesReceived: number) => {
  // 初始化接收端网络性能数据
  initReceiveNetworkPerformance(peerId);
  
  const perf = receiveNetworkPerformance.get(peerId);
  if (!perf) return;
  
  const now = Date.now();
  const timeDiff = (now - perf.lastSampleTime) / 1000; // 转换为秒
  
  if (timeDiff > 0.5) { // 每0.5秒更新一次速率
    const bytesDiff = bytesReceived - perf.lastBytesReceived;
    const rate = bytesDiff / timeDiff;
    
    // 更新历史记录（保留最近10个样本）
    perf.receiveRateHistory.push({ timestamp: now, bytes: rate });
    if (perf.receiveRateHistory.length > 10) {
      perf.receiveRateHistory.shift();
    }
    
    // 计算平均接收速率
    if (perf.receiveRateHistory.length > 0) {
      const sum = perf.receiveRateHistory.reduce((acc, sample) => acc + sample.bytes, 0);
      perf.currentReceiveRate = sum / perf.receiveRateHistory.length;
    }
    
    // 更新统计值
    perf.lastBytesReceived = bytesReceived;
    perf.lastSampleTime = now;
  }
};

// 估算网络延迟（通过心跳机制）
const estimateLatency = async (peerId: string): Promise<number> => {
  const start = Date.now();
  
  // 发送一个很小的心跳消息来测量延迟
  const dataChannel = dataChannels.get(peerId);
  if (dataChannel && dataChannel.readyState === 'open') {
    const heartbeatMsg = JSON.stringify({
      type: 'heartbeat',
      timestamp: start
    });
    
    // 注意：实际应用中需要对端响应心跳消息来计算往返时间
    dataChannel.send(heartbeatMsg);
    
    // 这里只是一个简化的估算，实际应用中需要更复杂的机制
    return Date.now() - start; // 简化的延迟估算
  }
  
  return 0;
};

// 计算推荐的缓冲区大小
const calculateOptimalBufferSize = (peerId: string): number => {
  const perf = networkPerformance.get(peerId);
  if (!perf) return 4 * 1024 * 1024; // 默认4MB
  
  // 基于传输速率计算建议缓冲区大小
  // 理论：缓冲区大小 ≈ 传输速率 × RTT + 冗余
  const bandwidthMBps = perf.currentTransferRate / (1024 * 1024); // 转换为MB/s
  const latencySeconds = perf.currentLatency / 1000; // 转换为秒
  
  // 如果带宽为0（初始状态），返回默认值
  if (bandwidthMBps <= 0) {
    return 4 * 1024 * 1024; // 返回默认4MB
  }
  
  // 基础缓冲区：带宽×延迟
  let baseBufferSize = bandwidthMBps * latencySeconds * 1024 * 1024; // 转换回bytes
  
  // 添加一些冗余并限制在合理范围内
  baseBufferSize *= 2; // 2倍冗余
  
  // 确保缓冲区大小在合理范围内
  baseBufferSize = Math.max(baseBufferSize, 2 * 1024 * 1024); // 最小2MB（避免过小）
  baseBufferSize = Math.min(baseBufferSize, 16 * 1024 * 1024); // 最大16MB
  
  return Math.floor(baseBufferSize);
};

// 计算推荐的接收缓冲区大小
const calculateOptimalReceiveBufferSize = (peerId: string): number => {
  const perf = receiveNetworkPerformance.get(peerId);
  if (!perf) return 4 * 1024 * 1024; // 默认4MB
  
  // 基于接收速率计算建议缓冲区大小
  // 理论：缓冲区大小 ≈ 接收速率 × RTT + 冗余
  const bandwidthMBps = perf.currentReceiveRate / (1024 * 1024); // 转换为MB/s
  const latencySeconds = perf.currentLatency / 1000; // 转换为秒
  
  // 如果带宽为0（初始状态），返回默认值
  if (bandwidthMBps <= 0) {
    return 4 * 1024 * 1024; // 返回默认4MB
  }
  
  // 基础缓冲区：带宽×延迟
  let baseBufferSize = bandwidthMBps * latencySeconds * 1024 * 1024; // 转换回bytes
  
  // 添加一些冗余并限制在合理范围内
  baseBufferSize *= 2; // 2倍冗余
  
  // 确保缓冲区大小在合理范围内
  baseBufferSize = Math.max(baseBufferSize, 2 * 1024 * 1024); // 最小2MB（避免过小）
  baseBufferSize = Math.min(baseBufferSize, 16 * 1024 * 1024); // 最大16MB
  
  return Math.floor(baseBufferSize);
};

// 自适应调整缓冲区大小
const adaptiveAdjustBufferSize = (peerId: string): number => {
  const perf = networkPerformance.get(peerId);
  if (!perf) return 8 * 1024 * 1024; // 增加默认缓冲区大小到8MB以提高吞吐量
  
  const now = Date.now();
  
  // 每3秒调整一次缓冲区大小（更频繁的调整以适应快速变化的网络条件）
  if (now - perf.lastAdjustment > 3000) {
    const recommendedSize = calculateOptimalBufferSize(peerId);
    
    // 平滑调整：不要一次性大幅改变缓冲区大小
    const currentSize = perf.currentBufferSize;
    
    // 计算调整比例，限制在±30%以内（而不是固定的大小）
    const sizeRatio = recommendedSize / currentSize;
    let adjustedRatio = sizeRatio;
    
    if (sizeRatio > 1.3) { // 如果推荐大小超过当前大小的30%
      adjustedRatio = 1.3;
    } else if (sizeRatio < 0.7) { // 如果推荐大小低于当前大小的70%
      adjustedRatio = 0.7;
    }
    
    // 计算新的缓冲区大小
    let newSize = Math.floor(currentSize * adjustedRatio);
    
    // 确保大小在合理范围内
    newSize = Math.max(newSize, 4 * 1024 * 1024); // 最小4MB（提高最小值以改善吞吐量）
    newSize = Math.min(newSize, 32 * 1024 * 1024); // 最大32MB（提高最大值以适应高速网络）
    
    // 只有当缓冲区大小发生显著变化时才更新和记录日志
    if (Math.abs(newSize - currentSize) > 2 * 1024 * 1024) { // 变化超过2MB时才记录
      perf.currentBufferSize = newSize;
      perf.lastAdjustment = now;
      
      addLog('info', `调整发送缓冲区大小: ${(newSize / (1024*1024)).toFixed(1)}MB (${peerId})`);
    }
    
    return newSize;
  }
  
  return Math.max(perf.currentBufferSize, 4 * 1024 * 1024); // 确保最小缓冲区大小为4MB
};

// 智能块大小调整
const getOptimalChunkSize = (peerId: string, fileSize: number): number => {
  const perf = networkPerformance.get(peerId);
  
  // 基础块大小
  let baseChunkSize = 65536; // 64KB
  
  // 大文件使用更大的块
  if (fileSize > 100 * 1024 * 1024) {
    baseChunkSize = 256 * 1024; // 256KB
  } else if (fileSize > 500 * 1024 * 1024) {
    baseChunkSize = 512 * 1024; // 512KB
  }
  
  // 根据网络状况调整
  if (perf) {
    const latency = perf.latency || 100;
    const throughput = perf.throughput || 1 * 1024 * 1024; // 默认1MB/s
    
    // 低延迟、高带宽网络使用更大的块
    if (latency < 100 && throughput > 5 * 1024 * 1024) {
      baseChunkSize *= 2;
    }
    // 高延迟网络使用更小的块
    else if (latency > 300) {
      baseChunkSize = Math.max(32768, baseChunkSize / 2); // 最小32KB
    }
  }
  
  // 限制块大小范围
  return Math.min(Math.max(32768, baseChunkSize), 1048576); // 32KB - 1MB
};

// 通道负载均衡器
class ChannelLoadBalancer {
  private channelStats: Map<string, {
    lastUsed: number;
    bufferedAmount: number;
    successCount: number;
    failCount: number;
  }> = new Map();
  
  // 更新通道状态
  updateChannelStatus(channelId: string, bufferedAmount: number, success: boolean) {
    const stats = this.channelStats.get(channelId) || {
      lastUsed: 0,
      bufferedAmount: 0,
      successCount: 0,
      failCount: 0
    };
    
    stats.lastUsed = Date.now();
    stats.bufferedAmount = bufferedAmount;
    if (success) {
      stats.successCount++;
    } else {
      stats.failCount++;
    }
    
    this.channelStats.set(channelId, stats);
  }
  
  // 选择最佳通道
  selectBestChannel(channels: RTCDataChannel[]): RTCDataChannel {
    if (channels.length === 1) {
      return channels[0];
    }
    
    let bestChannel = channels[0];
    let bestScore = -Infinity;
    
    channels.forEach((channel, index) => {
      const channelId = `${channel.label || index}`;
      const stats = this.channelStats.get(channelId) || {
        lastUsed: 0,
        bufferedAmount: 0,
        successCount: 0,
        failCount: 0
      };
      
      // 计算通道得分
      let score = 0;
      
      // 缓冲区越小得分越高
      const bufferScore = Math.max(0, 100 - (stats.bufferedAmount / (1024 * 1024)));
      score += bufferScore * 0.5;
      
      // 成功率越高得分越高
      const totalAttempts = stats.successCount + stats.failCount;
      const successRate = totalAttempts > 0 ? stats.successCount / totalAttempts : 1;
      score += successRate * 100 * 0.3;
      
      // 最近使用时间越久得分越高（负载均衡）
      const idleTime = Date.now() - stats.lastUsed;
      const idleScore = Math.min(50, idleTime / 1000);
      score += idleScore * 0.2;
      
      if (score > bestScore) {
        bestScore = score;
        bestChannel = channel;
      }
    });
    
    return bestChannel;
  }
}

// 创建全局通道负载均衡器
const channelLoadBalancer = new ChannelLoadBalancer();

// 自适应调整接收缓冲区大小
const adaptiveAdjustReceiveBufferSize = (peerId: string): number => {
  const perf = receiveNetworkPerformance.get(peerId);
  if (!perf) return 8 * 1024 * 1024; // 增加默认缓冲区大小到8MB以提高吞吐量
  
  const now = Date.now();
  
  // 每3秒调整一次接收缓冲区大小（更频繁的调整以适应快速变化的网络条件）
  if (now - perf.lastAdjustment > 3000) {
    const recommendedSize = calculateOptimalReceiveBufferSize(peerId);
    
    // 平滑调整：不要一次性大幅改变缓冲区大小
    const currentSize = perf.currentBufferSize;
    
    // 计算调整比例，限制在±30%以内（而不是固定的大小）
    const sizeRatio = recommendedSize / currentSize;
    let adjustedRatio = sizeRatio;
    
    if (sizeRatio > 1.3) { // 如果推荐大小超过当前大小的30%
      adjustedRatio = 1.3;
    } else if (sizeRatio < 0.7) { // 如果推荐大小低于当前大小的70%
      adjustedRatio = 0.7;
    }
    
    // 计算新的缓冲区大小
    let newSize = Math.floor(currentSize * adjustedRatio);
    
    // 确保大小在合理范围内
    newSize = Math.max(newSize, 4 * 1024 * 1024); // 最小4MB（提高最小值以改善吞吐量）
    newSize = Math.min(newSize, 32 * 1024 * 1024); // 最大32MB（提高最大值以适应高速网络）
    
    // 只有当缓冲区大小发生显著变化时才更新和记录日志
    if (Math.abs(newSize - currentSize) > 2 * 1024 * 1024) { // 变化超过2MB时才记录
      perf.currentBufferSize = newSize;
      perf.lastAdjustment = now;
      
      addLog('info', `调整接收缓冲区大小: ${(newSize / (1024*1024)).toFixed(1)}MB (${peerId})`);
    }
    
    return newSize;
  }
  
  return Math.max(perf.currentBufferSize, 4 * 1024 * 1024); // 确保最小缓冲区大小为4MB
};

// 设置数据通道
const setupDataChannel = (dataChannel: RTCDataChannel, peerId: string) => {

  if ((dataChannel as any).__setupDone) {
    return;
  }
  (dataChannel as any).__setupDone = true;

  dataChannelHealth.set(peerId, {
    lastActivity: Date.now(),
    consecutiveErrors: 0,
    isHealthy: true,
    reconnectAttempts: 0
  });
  
  initNetworkPerformance(peerId);

  dataChannel.onopen = () => {
    addLog('success', `与 ${peerId} 的数据通道已建立`)
    updateConnectionStatus(peerId, 'connected')
    dataChannels.set(peerId, dataChannel)
    
    const health = dataChannelHealth.get(peerId);
    if (health) {
      health.isHealthy = true;
      health.consecutiveErrors = 0;
      health.reconnectAttempts = 0;
      health.lastActivity = Date.now();
    }
    
    startAdaptiveBufferSizeTask(peerId);
    
     const pendingTransferIndex = pendingTransfers.findIndex(transfer => transfer.peerId === peerId)
     if (pendingTransferIndex !== -1) {
       const pendingTransfer = pendingTransfers[pendingTransferIndex]
       startFileTransfer(pendingTransfer.peerId, pendingTransfer.fileInfo, pendingTransfer.file)
       pendingTransfers.splice(pendingTransferIndex, 1)
     }
  }

  dataChannel.onclose = () => {
    addLog('warning', `与 ${peerId} 的数据通道已关闭`)
    updateConnectionStatus(peerId, 'disconnected')
    // 移除数据通道
    dataChannels.delete(peerId)
    
    // 停止缓冲区调整任务
    stopAdaptiveBufferSizeTask(peerId);
    
    // 更新健康状态
    const health = dataChannelHealth.get(peerId);
    if (health) {
      health.isHealthy = false;
      health.lastActivity = Date.now();
    }
    
    // 只有在非主动关闭的情况下才尝试重连
    // 同时检查peerId和基础peerId
    const basePeerId = peerId.split('-')[0];
    if (!intentionallyClosedChannels.has(peerId) && !intentionallyClosedChannels.has(basePeerId)) {
      // 尝试重新建立连接
      attemptReconnect(peerId);
    } else {
      addLog('debug', `跳过重新连接 ${peerId}，该连接已被主动关闭`);
    }
  }

  dataChannel.onmessage = (event) => {
    // 更新最后活动时间
    const health = dataChannelHealth.get(peerId);
    if (health) {
      health.lastActivity = Date.now();
      health.consecutiveErrors = 0; // 重置错误计数
    }
    
    handleDataChannelMessage(event.data, peerId)
  }

  dataChannel.onerror = (error) => {
    addLog('error', `数据通道错误 (${peerId}): ${error}`)
    
    // 更新健康状态
    const health = dataChannelHealth.get(peerId);
    if (health) {
      health.consecutiveErrors++;
      if (health.consecutiveErrors > 5) { // 如果连续错误超过5次，认为通道不健康
        health.isHealthy = false;
        addLog('error', `与 ${peerId} 的数据通道健康状况下降，建议重连`);
      }
    }
  }
}

// 尝试重新连接到对等方
const attemptReconnect = async (peerId: string) => {
  // 清理peerId，移除通道后缀
  let cleanPeerId = peerId;
  if (cleanPeerId.includes('-ch')) {
    cleanPeerId = cleanPeerId.split('-ch')[0];
  } else if (cleanPeerId.includes('-incoming')) {
    cleanPeerId = cleanPeerId.split('-incoming')[0];
  }
  
  // 检查是否为主动关闭的连接
  if (intentionallyClosedChannels.has(peerId) || intentionallyClosedChannels.has(cleanPeerId)) {
    addLog('debug', `跳过重新连接 ${cleanPeerId}，该连接已被主动关闭`);
    return;
  }
  
  addLog('info', `正在尝试重新连接到 ${cleanPeerId}`);
  
  // 发起连接请求
  socketService.emit('webrtc-signal', {
    targetUserId: cleanPeerId,
    signal: { type: 'reconnect' }
  });
}

// 存储缓冲区调整任务的定时器
const bufferSizeAdjustmentTasks = new Map<string, number>();

// 启动自适应缓冲区大小调整任务
const startAdaptiveBufferSizeTask = (peerId: string) => {
  // 如果已有任务在运行，先清除
  stopAdaptiveBufferSizeTask(peerId);
  
  // 启动新的定时任务，每3秒检查一次
  const intervalId = window.setInterval(() => {
    // 调整发送缓冲区大小
    const newSendBufferSize = adaptiveAdjustBufferSize(peerId);
    
    // 调整接收缓冲区大小
    const newReceiveBufferSize = adaptiveAdjustReceiveBufferSize(peerId);
    
    // 这里可以进一步优化，比如根据网络状况决定是否调整
  }, 3000); // 每3秒检查一次
  
  bufferSizeAdjustmentTasks.set(peerId, intervalId);
  
  addLog('info', `已启动自适应缓冲区调整任务 (${peerId})`);
};

// 停止自适应缓冲区大小调整任务
const stopAdaptiveBufferSizeTask = (peerId: string) => {
  const intervalId = bufferSizeAdjustmentTasks.get(peerId);
  if (intervalId) {
    clearInterval(intervalId);
    bufferSizeAdjustmentTasks.delete(peerId);
    
    addLog('info', `已停止自适应缓冲区调整任务 (${peerId})`);
  }
};

// 处理WebRTC Offer
const handleWebRTCOffer = async (data: any) => {
  const { fromUserId, offer } = data
  
  if (!peerConnections.has(fromUserId)) {
    createPeerConnection(fromUserId)
  }

  const peerConnection = peerConnections.get(fromUserId)!
  
  // 正确构造SessionDescription
  const sessionDescription = new RTCSessionDescription({
    type: 'offer',
    sdp: offer.sdp
  })
  
  await peerConnection.setRemoteDescription(sessionDescription)
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  if (socketService.isConnected.value) {
    socketService.emit('webrtc-signal', {
      targetUserId: fromUserId,
      signal: {
        type: 'answer',
        sdp: answer.sdp
      }
    })
  }
}

// 处理WebRTC Answer
const handleWebRTCAnswer = async (data: any) => {
  const { fromUserId, answer } = data
  
  const peerConnection = peerConnections.get(fromUserId)
  if (peerConnection) {
    const sessionDescription = new RTCSessionDescription({
      type: 'answer',
      sdp: answer.sdp
    })
    await peerConnection.setRemoteDescription(sessionDescription)
  }
}

// 处理ICE候选
const handleWebRTCICECandidate = async (data: any) => {
  const { fromUserId, candidate } = data
  
  const peerConnection = peerConnections.get(fromUserId)
  if (peerConnection && candidate) {
    const iceCandidate = new RTCIceCandidate({
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex
    })
    await peerConnection.addIceCandidate(iceCandidate)
  }
}

// 更新连接状态
const updateConnectionStatus = (peerId: string, state: string) => {
  // 提取短ID（8位）
  const peerIdParts = peerId.split('-');
  const shortPeerId = peerIdParts[0];

  // 先尝试找到短ID的连接
  let connection = p2pConnections.value.find(c => c.peerId === shortPeerId);
  // 如果找不到，再尝试找到完整ID的连接
  if (!connection) {
    connection = p2pConnections.value.find(c => c.peerId === peerId);
  }

  if (connection) {
    connection.connectionState = state;
    connection.isConnected = state === 'connected';
    addLog('debug', `更新连接状态: ${connection.peerId} -> ${state}`);

    // 如果连接已断开，从列表中移除
    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      const initialLength = p2pConnections.value.length;
      p2pConnections.value = p2pConnections.value.filter(c => c.peerId !== connection!.peerId);
      if (p2pConnections.value.length < initialLength) {
        addLog('info', `连接已断开，从列表中移除: ${connection.peerId}`);
      }
    }
  } else {
    // 只有在连接状态不是断开时才添加新连接
    if (state !== 'disconnected' && state !== 'failed' && state !== 'closed') {
      // 只添加短ID到连接列表，保持UI一致性
      p2pConnections.value.push({
        peerId: shortPeerId,
        connectionState: state,
        isConnected: state === 'connected'
      });
      addLog('debug', `添加新连接: ${shortPeerId} (状态: ${state})`);
    } else {
      addLog('debug', `连接状态为${state}，不添加到列表: ${shortPeerId}`);
    }
  }

  addLog('debug', `当前连接列表: ${JSON.stringify(p2pConnections.value.map(conn => conn.peerId))}`);
}

// 处理数据通道消息
const handleDataChannelMessage = (message: any, peerId: string) => {
  try {
    // 检查是否为二进制数据(ArrayBuffer)
    if (message instanceof ArrayBuffer) {
      // 这是二进制文件数据块，需要与最近的元数据关联
      const metadata = lastReceivedMetadata.get(peerId);
      if (metadata) {
        handleFileChunkBinary(message, metadata, peerId);
      } else {
        addLog('warning', '收到二进制数据但无关联元数据');
      }
      return;
    }
    
    // 解析JSON消息
    const data = JSON.parse(message)
    
    switch (data.type) {
      case 'download-request':
        handleDownloadRequest(data, peerId)
        break
      case 'multi-source-download-request':
        // ✅ 处理多源下载请求 - 只发送指定范围的块
        handleMultiSourceDownloadRequest(data, peerId)
        break
      case 'file-transfer-start':
        handleFileTransferStart(data, peerId)
        break
      case 'file-chunk-metadata':
        // 保存元数据以便与接下来的二进制数据关联
        lastReceivedMetadata.set(peerId, data);
        handleFileChunkMetadata(data, peerId)
        break
      case 'file-chunk-metadata-batch':
        // 处理批量元数据
        handleFileChunkMetadataBatch(data, peerId)
        break
      case 'file-transfer-complete':
        handleFileTransferComplete(data, peerId)
        break
      case 'file-transfer-accepted':
        handleFileTransferAcceptedConfirm(data, peerId)
        break
      case 'file-transfer-rejected':
        handleFileTransferRejected(data, peerId)
        break
      case 'file-transfer-confirmed':
        handleFileTransferConfirmed(data, peerId)
        break
      case 'disconnect-notification':
        // 处理断链通知 - 标记为主动关闭，不触发重连
        handleDisconnectNotification(data, peerId)
        break
      default:
        addLog('info', `收到未知消息类型: ${data.type}`)
    }
  } catch (error) {
    // 如果解析JSON失败，可能是二进制数据，直接处理
    if (message instanceof ArrayBuffer) {
      const metadata = lastReceivedMetadata.get(peerId);
      if (metadata) {
        handleFileChunkBinary(message, metadata, peerId);
      } else {
        addLog('warning', '收到二进制数据但无关联元数据');
      }
    } else {
      addLog('error', `处理消息时发生错误: ${error}`)
    }
  }
}

// 存储最近接收到的元数据，用于与二进制数据关联
const lastReceivedMetadata = new Map<string, any>();

// 批量写入缓冲区配置
const BATCH_WRITE_THRESHOLD = 10; // 每10个块批量写入一次
const BATCH_WRITE_TIMEOUT = 100; // 100ms超时后强制写入

// 批量写入缓冲区
interface WriteBatch {
  chunks: Array<{
    offset: number;
    data: ArrayBuffer;
  }>;
  timeout: NodeJS.Timeout;
  receivedCount: number;
  totalChunks: number;
}

const writeBatches = new Map<string, WriteBatch>();

// 批量写入文件块
const batchWriteChunks = async (transferId: string) => {
  const batch = writeBatches.get(transferId);
  if (!batch) return;
  
  // 清除超时定时器
  clearTimeout(batch.timeout);
  writeBatches.delete(transferId);
  
  const storage = receivedFileBlocks.get(transferId);
  if (!storage || !storage.fileHandleId) {
    addLog('error', `批量写入失败: 存储或文件句柄未初始化`);
    return;
  }
  
  try {
    // 按偏移量排序，确保顺序写入
    batch.chunks.sort((a, b) => a.offset - b.offset);
    
    // 批量写入
    await window.electronAPI.invoke('file:write-batch', {
      handleId: storage.fileHandleId,
      chunks: batch.chunks
    });
    
    // 更新已接收的块
    batch.chunks.forEach((chunk, index) => {
      const chunkIndex = Math.floor(chunk.offset / CHUNK_SIZE) + 1;
      storage.receivedChunkIndexes.add(chunkIndex);
      storage.totalReceivedBytes += chunk.data.byteLength;
    });
    
    // 更新进度
    const progress = Math.round((storage.receivedChunkIndexes.size / batch.totalChunks) * 100);
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.receivedChunks = storage.receivedChunkIndexes.size;
      transfer.progress = progress;
      
      window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
        detail: { ...transfer }
      }));
    }
    
    // 检查是否完成
    if (storage.receivedChunkIndexes.size === batch.totalChunks) {
      // 使用存储的源节点ID进行断链
      const sourcePeerId = storage.sourcePeerId || '';
      addLog('debug', `批量写入完成，sourcePeerId: ${sourcePeerId}, sourceNodes: ${JSON.stringify(storage.sourceNodes)}`);
      if (!sourcePeerId && (!storage.sourceNodes || storage.sourceNodes.length === 0)) {
        addLog('error', `无法获取源节点ID，无法完成断链`);
        return;
      }
      await finalizeReceivedFile(transferId, storage.fileInfo, batch.totalChunks, sourcePeerId);
    }
    
  } catch (error) {
    addLog('error', `批量写入失败: ${error}`);
  }
};

// 处理文件传输被拒绝
const handleFileTransferRejected = (data: any, peerId: string) => {
  const { transferId, fileInfo } = data
  addLog('warning', `文件传输被拒绝: ${fileInfo.name}`)
  
  // 更新传输状态
  const transfer = transfers.value.find(t => t.id === transferId)
  if (transfer) {
    transfer.status = 'failed'
  }
}

// 传输完成后断链：关闭所有与该传输相关的数据通道
const disconnectDataChannelsAfterTransfer = async (peerId: string, transferId: string, allSourceNodes?: string[]) => {
  try {
    addLog('info', `开始断链处理: peerId=${peerId}, 传输ID: ${transferId}, allSourceNodes=${JSON.stringify(allSourceNodes)}`);
    
    // 检查peerId是否有效
    if (!peerId) {
      addLog('error', `断链失败: peerId为空`);
      return;
    }
    
    // 检查是否为多源下载
    const multiSourceState = multiSourceDownloads.get(transferId);
    if (multiSourceState) {
      // 多源下载：关闭所有参与节点的数据通道
      addLog('info', `检测到多源下载，将关闭所有 ${multiSourceState.sourceNodes.length} 个节点的数据通道`);
      
      for (const nodeId of multiSourceState.sourceNodes) {
        await disconnectNodeDataChannels(nodeId, transferId);
        // 清理主动关闭标记
        intentionallyClosedChannels.delete(nodeId);
      }
      
      // 清理多源下载状态
      multiSourceDownloads.delete(transferId);
      
      // 清理传输完成Promise
      transferCompletionPromises.delete(transferId);
    } else if (allSourceNodes && allSourceNodes.length > 0) {
      // 使用传入的所有源节点（从storage.sourceNodes获取）
      addLog('info', `使用传入的节点列表，将关闭所有 ${allSourceNodes.length} 个节点的数据通道`);
      
      for (const nodeId of allSourceNodes) {
        if (nodeId) {
          await disconnectNodeDataChannels(nodeId, transferId);
          // 清理主动关闭标记
          intentionallyClosedChannels.delete(nodeId);
        } else {
          addLog('warning', `跳过空的nodeId`);
        }
      }
      
      // 清理传输完成Promise
      transferCompletionPromises.delete(transferId);
    } else {
      // 单源下载：关闭单个节点的数据通道
      addLog('info', `单源下载，关闭节点: ${peerId}`);
      await disconnectNodeDataChannels(peerId, transferId);
      // 清理主动关闭标记
      intentionallyClosedChannels.delete(peerId);
      
      // 清理传输完成Promise
      transferCompletionPromises.delete(transferId);
    }
    
    addLog('success', `传输完成断链成功: ${peerId}, 传输ID: ${transferId}`);
    
  } catch (error) {
    addLog('error', `断链处理失败: ${error}`);
  }
};

// 关闭单个节点的所有数据通道
const disconnectNodeDataChannels = async (nodeId: string, transferId: string) => {
  try {
    addLog('debug', `开始关闭节点 ${nodeId} 的数据通道和P2P连接`);
    
    // 标记为主动关闭，防止触发重连（在发送通知前标记，确保发送过程中不会触发重连）
    intentionallyClosedChannels.add(nodeId);
    
    // 提取完整的UUID前缀（前5个部分）
    const nodeIdParts = nodeId.split('-');
    const basePeerId = nodeIdParts.slice(0, 5).join('-');
    addLog('debug', `节点基础ID: ${basePeerId}`);
    
    // 先发送断链通知给发送端（通过所有可用的数据通道发送）
    let notificationSent = false;
    
    // 1. 尝试通过主数据通道发送（尝试多种可能的key）
    let primaryChannel = dataChannels.get(nodeId);
    if (!primaryChannel) {
      primaryChannel = dataChannels.get(basePeerId);
    }
    // 尝试查找以basePeerId开头的任何通道
    if (!primaryChannel) {
      for (const [channelId, channel] of dataChannels.entries()) {
        if (channelId.startsWith(basePeerId) && channel.readyState === 'open') {
          primaryChannel = channel;
          addLog('debug', `找到匹配的数据通道: ${channelId}`);
          break;
        }
      }
    }
    
    if (primaryChannel && primaryChannel.readyState === 'open') {
      try {
        primaryChannel.send(JSON.stringify({
          type: 'disconnect-notification',
          transferId: transferId,
          reason: 'transfer-complete'
        }));
        addLog('info', `已通过主通道发送断链通知给 ${nodeId}`);
        notificationSent = true;
      } catch (error) {
        addLog('warning', `通过主通道发送断链通知失败: ${error}`);
      }
    }
    
    // 2. 尝试通过多通道传输中的并行通道发送
    let multiChannels = multiDataChannels.get(nodeId);
    if (!multiChannels) {
      multiChannels = multiDataChannels.get(basePeerId);
    }
    if (multiChannels && multiChannels.length > 0) {
      for (const channel of multiChannels) {
        if (channel.readyState === 'open') {
          try {
            channel.send(JSON.stringify({
              type: 'disconnect-notification',
              transferId: transferId,
              reason: 'transfer-complete'
            }));
            addLog('info', `已通过并行通道 ${channel.label} 发送断链通知给 ${nodeId}`);
            notificationSent = true;
            break; // 发送成功一个即可
          } catch (error) {
            addLog('warning', `通过并行通道发送断链通知失败: ${error}`);
          }
        }
      }
    }
    
    // 等待一小段时间确保消息发送完成
    if (notificationSent) {
      addLog('debug', `等待断链通知发送完成...`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 3. 关闭主数据通道
    if (primaryChannel && primaryChannel.readyState === 'open') {
      primaryChannel.close();
      addLog('debug', `已关闭主数据通道`);
    }
    
    // 4. 关闭多通道传输中的并行通道
    if (multiChannels && multiChannels.length > 0) {
      let closedCount = 0;
      for (const channel of multiChannels) {
        if (channel.readyState === 'open') {
          // 标记每个并行通道为主动关闭
          const channelId = `${nodeId}-${channel.label}`;
          intentionallyClosedChannels.add(channelId);
          channel.close();
          closedCount++;
        }
      }
      addLog('debug', `已关闭 ${closedCount} 个并行数据通道: ${nodeId}`);
      
      // 清理多通道存储
      multiDataChannels.delete(nodeId);
      multiDataChannels.delete(basePeerId);
    }
    
    // 5. 关闭P2P连接（尝试多种可能的key）
    let peerConnection = peerConnections.get(nodeId);
    if (!peerConnection) {
      peerConnection = peerConnections.get(basePeerId);
    }
    if (peerConnection) {
      peerConnection.close();
      addLog('info', `已关闭P2P连接: ${nodeId}`);
    }
    
    // 6. 更新UI连接状态 - 从连接列表中移除（支持短ID和长ID匹配）
    const initialLength = p2pConnections.value.length;
    // 提取短ID（8位）
    const shortPeerId = nodeIdParts[0];
    const filteredConnections = p2pConnections.value.filter(conn => {
      // 检查是否匹配短ID（8位）
      if (conn.peerId === shortPeerId) {
        addLog('debug', `匹配短ID: ${conn.peerId}`);
        return false; // 移除这个连接
      }
      // 检查是否匹配长ID的基础部分（前5个部分）
      const connPeerIdParts = conn.peerId.split('-');
      if (connPeerIdParts.length >= 5) {
        const connBaseId = connPeerIdParts.slice(0, 5).join('-');
        if (connBaseId === basePeerId) {
          addLog('debug', `匹配长ID基础部分: ${conn.peerId} -> ${connBaseId}`);
          return false; // 移除这个连接
        }
      }
      // 检查是否以basePeerId开头（处理带后缀的通道ID）
      if (conn.peerId.startsWith(basePeerId)) {
        addLog('debug', `匹配带后缀的通道ID: ${conn.peerId}`);
        return false; // 移除这个连接
      }
      return true; // 保留这个连接
    });
    
    p2pConnections.value = filteredConnections;
    
    addLog('debug', `过滤前连接数: ${initialLength}, 过滤后连接数: ${p2pConnections.value.length}`);
    addLog('debug', `当前连接列表: ${JSON.stringify(p2pConnections.value.map(conn => conn.peerId))}`);
    
    if (p2pConnections.value.length < initialLength) {
      addLog('info', `已从UI连接列表中移除: ${nodeId} (短ID: ${shortPeerId}, 基础ID: ${basePeerId})`);
    }
    
    // 7. 停止自适应缓冲区调整任务
    stopAdaptiveBufferSizeTask(nodeId);
    stopAdaptiveBufferSizeTask(basePeerId);
    
    // 8. 清理存储（删除所有匹配的key）
    // 删除主数据通道（多种可能的key）
    dataChannels.delete(nodeId);
    dataChannels.delete(basePeerId);
    // 删除所有以basePeerId开头的通道
    for (const key of dataChannels.keys()) {
      if (key.startsWith(basePeerId)) {
        dataChannels.delete(key);
        addLog('debug', `已删除数据通道记录: ${key}`);
      }
    }
    
    peerConnections.delete(nodeId);
    peerConnections.delete(basePeerId);
    lastReceivedMetadata.delete(nodeId);
    lastReceivedMetadata.delete(basePeerId);
    
    addLog('debug', `节点 ${nodeId} 的数据通道和P2P连接关闭完成`);
    
  } catch (error) {
    addLog('error', `关闭节点 ${nodeId} 数据通道失败: ${error}`);
  }
};

// 处理文件传输完成确认（发送方接收来自接收方的确认）
const handleFileTransferConfirmed = async (data: any, peerId: string) => {
  const { transferId, success } = data
  addLog('info', `收到接收端传输完成确认: ${transferId}, 成功: ${success}`)
  
  // 查找并解决对应的Promise
  const completionPromise = transferCompletionPromises.get(transferId);
  if (completionPromise) {
    if (success) {
      // 解决Promise，让发送端知道传输已完成
      completionPromise.resolve(true);
      
      // 更新传输状态
      const transfer = transfers.value.find(t => t.id === transferId);
      if (transfer) {
        transfer.status = 'completed';
        transfer.progress = 100; // 现在可以设置为100%，因为接收方已经确认完成
        
        // 触发传输完成事件，供FileTransferList组件使用
        window.dispatchEvent(new CustomEvent('p2p:transfer-complete', {
          detail: { ...transfer }
        }));
      }
    } else {
      // 如果接收端报告失败，拒绝Promise
      completionPromise.reject(new Error('接收端确认传输失败'));
      
      // 更新传输状态
      const transfer = transfers.value.find(t => t.id === transferId);
      if (transfer) {
        transfer.status = 'failed';
      }
    }
    
    // 从映射中删除已处理的Promise
    transferCompletionPromises.delete(transferId);
    
    // 注意：发送端不在这里主动断链，而是等待接收端的断链通知
    // 接收端在 finalizeReceivedFile 中会发送 disconnect-notification
    // 发送端在 handleDisconnectNotification 中处理断链
    addLog('info', `发送端等待接收端断链通知: ${transferId}`);
    
  } else {
    addLog('warning', `未找到对应的传输完成确认Promise: ${transferId}`);
  }
}

// 处理断链通知（接收端主动断链时发送）
const handleDisconnectNotification = async (data: any, peerId: string) => {
  const { transferId } = data
  addLog('info', `收到断链通知: ${peerId}, 传输ID: ${transferId}`)
  
  // 标记为主动关闭，防止触发重连
  intentionallyClosedChannels.add(peerId);
  
  // 获取基础peerId（用于匹配所有相关通道）
  // 提取完整的UUID前缀（前5个部分）
  const peerIdParts = peerId.split('-');
  const basePeerId = peerIdParts.slice(0, 5).join('-');
  // 提取8位短ID（与UI显示一致）
  const shortPeerId = peerIdParts[0];
  addLog('debug', `处理断链通知，基础peerId: ${basePeerId}，短ID: ${shortPeerId}`);
  
  // 1. 关闭所有匹配的数据通道（包括带后缀的）
  let closedChannelsCount = 0;
  for (const [channelId, channel] of dataChannels.entries()) {
    if (channelId.startsWith(basePeerId)) {
      intentionallyClosedChannels.add(channelId);
      if (channel.readyState === 'open') {
        channel.close();
        addLog('debug', `已关闭数据通道: ${channelId}`);
      }
      closedChannelsCount++;
    }
  }
  if (closedChannelsCount > 0) {
    addLog('info', `已关闭 ${closedChannelsCount} 个数据通道`);
  }
  
  // 2. 关闭多通道传输中的并行通道
  const multiChannels = multiDataChannels.get(peerId) || multiDataChannels.get(basePeerId);
  if (multiChannels && multiChannels.length > 0) {
    let closedCount = 0;
    for (const channel of multiChannels) {
      if (channel.readyState === 'open') {
        const channelId = `${peerId}-${channel.label}`;
        intentionallyClosedChannels.add(channelId);
        channel.close();
        closedCount++;
      }
    }
    addLog('debug', `已关闭 ${closedCount} 个并行数据通道: ${peerId}`);
    multiDataChannels.delete(peerId);
    multiDataChannels.delete(basePeerId);
  }
  
  // 3. 关闭P2P连接（尝试多种可能的key）
  let peerConnection = peerConnections.get(peerId);
  if (!peerConnection) {
    peerConnection = peerConnections.get(basePeerId);
  }
  if (peerConnection) {
    peerConnection.close();
    addLog('info', `已关闭P2P连接: ${peerId}`);
  }
  
  // 4. 更新UI连接状态 - 从连接列表中移除（支持短ID和长ID匹配）
  const initialLength = p2pConnections.value.length;
  const filteredConnections = p2pConnections.value.filter(conn => {
    // 检查是否匹配短ID（8位）
    if (conn.peerId === shortPeerId) {
      addLog('debug', `匹配短ID: ${conn.peerId}`);
      return false; // 移除这个连接
    }
    // 检查是否匹配长ID的基础部分（前5个部分）
    const connPeerIdParts = conn.peerId.split('-');
    if (connPeerIdParts.length >= 5) {
      const connBaseId = connPeerIdParts.slice(0, 5).join('-');
      if (connBaseId === basePeerId) {
        addLog('debug', `匹配长ID基础部分: ${conn.peerId} -> ${connBaseId}`);
        return false; // 移除这个连接
      }
    }
    // 检查是否以basePeerId开头（处理带后缀的通道ID）
    if (conn.peerId.startsWith(basePeerId)) {
      addLog('debug', `匹配带后缀的通道ID: ${conn.peerId}`);
      return false; // 移除这个连接
    }
    return true; // 保留这个连接
  });
  
  p2pConnections.value = filteredConnections;
  
  addLog('debug', `过滤前连接数: ${initialLength}, 过滤后连接数: ${p2pConnections.value.length}`);
  addLog('debug', `当前连接列表: ${JSON.stringify(p2pConnections.value.map(conn => conn.peerId))}`);
  
  if (p2pConnections.value.length < initialLength) {
    addLog('info', `已从UI连接列表中移除: ${peerId} (短ID: ${shortPeerId}, 基础ID: ${basePeerId})`);
  }
  
  // 5. 停止自适应缓冲区调整任务
  stopAdaptiveBufferSizeTask(peerId);
  stopAdaptiveBufferSizeTask(basePeerId);
  
  // 6. 清理存储（删除所有匹配的key）
  for (const key of dataChannels.keys()) {
    if (key.startsWith(basePeerId)) {
      dataChannels.delete(key);
    }
  }
  peerConnections.delete(peerId);
  peerConnections.delete(basePeerId);
  lastReceivedMetadata.delete(peerId);
  lastReceivedMetadata.delete(basePeerId);
  
  // 7. 清理传输完成Promise
  if (transferId) {
    transferCompletionPromises.delete(transferId);
  }
  
  addLog('info', `已处理断链通知，连接已正常关闭`);
}

// 发送指定路径的文件
const startFileSend = async (transferId: string, peerId: string, filePath: string, fileName: string, fileSize: number, fileHash: string) => {
  addLog('info', `开始发送文件: ${fileName} 到 ${peerId.substring(0, 6)}`)
  
  let cleanPeerId = peerId;
  if (cleanPeerId.includes('-ch')) {
    cleanPeerId = cleanPeerId.split('-ch')[0];
  } else if (cleanPeerId.includes('-incoming')) {
    cleanPeerId = cleanPeerId.split('-incoming')[0];
  }
  
  let channels = multiDataChannels.get(cleanPeerId);
  
  if (!channels || channels.length === 0) {
    const singleChannel = dataChannels.get(cleanPeerId);
    if (singleChannel) {
      channels = [singleChannel];
    } else {
      const allChannels: RTCDataChannel[] = [];
      for (const [key, channelList] of multiDataChannels.entries()) {
        if (key === cleanPeerId || key.startsWith(`${cleanPeerId}-`)) {
          allChannels.push(...channelList);
        }
      }
      
      if (allChannels.length > 0) {
        channels = allChannels;
      } else {
        addLog('error', '没有可用的数据通道');
        return;
      }
    }
  }
  
  const availableChannels = channels.filter(channel => channel.readyState === 'open');
  if (availableChannels.length === 0) {
    addLog('error', '没有可用的数据通道');
    return;
  }
  channels = availableChannels;
  
  const dataChannel = channels[0];
  
  try {
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'sending';
    }
    
    dataChannel.send(JSON.stringify({
      type: 'file-transfer-start',
      transferId: transferId,
      fileInfo: {
        name: fileName,
        size: fileSize,
        hash: fileHash
      }
    }));
    
    addLog('info', `已发送文件传输开始信号: ${fileName}`)
    
    await sendFileChunksStreaming(cleanPeerId, filePath, fileName, fileSize, transferId, channels);
    
  } catch (error) {
    addLog('error', `发送文件失败: ${error}`)
    
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'failed';
    }
  }
}

const sendFileChunksStreaming = async (
  cleanPeerId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  transferId: string,
  channels: RTCDataChannel[]
) => {
  const OPTIMIZED_CHUNK_SIZE = getOptimalChunkSize(cleanPeerId, fileSize);
  const optimizedTotalChunks = Math.ceil(fileSize / OPTIMIZED_CHUNK_SIZE);
  const MAX_PENDING_SEND = 40;
  let pendingSends = 0;
  let sentChunks = 0;
  
  addLog('info', `开始使用 ${channels.length} 个通道流式传输文件: ${fileName}，块大小: ${(OPTIMIZED_CHUNK_SIZE / 1024).toFixed(0)}KB`);
  
  const sendChunk = async (chunkIndex: number) => {
    const start = chunkIndex * OPTIMIZED_CHUNK_SIZE;
    const end = Math.min(start + OPTIMIZED_CHUNK_SIZE, fileSize);
    const chunkSize = end - start;
    
    // 使用通道负载均衡器选择最佳通道
    const dataChannel = channelLoadBalancer.selectBestChannel(channels);
    const channelIndex = channels.indexOf(dataChannel);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      return;
    }
    
    while (pendingSends >= MAX_PENDING_SEND) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    const BUFFER_THRESHOLD = Math.max(adaptiveAdjustBufferSize(cleanPeerId), 8 * 1024 * 1024);
    if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
      await new Promise(resolve => {
        const checkBuffer = () => {
          if (dataChannel.bufferedAmount <= BUFFER_THRESHOLD * 0.7) {
            resolve(true);
          } else {
            setTimeout(checkBuffer, 5);
          }
        };
        checkBuffer();
      });
    }
    
    pendingSends++;
    
    try {
      const chunkBuffer = await window.electronAPI.invoke('file:read-arraybuffer-range', {
        filePath: filePath,
        start: start,
        length: chunkSize
      });
      
      dataChannel.send(JSON.stringify({
        type: 'file-chunk-metadata',
        transferId: transferId,
        chunkIndex: chunkIndex + 1,
        totalChunks: optimizedTotalChunks,
        chunkSize: chunkSize,
        channelIndex: channelIndex,
        fileInfo: {
          name: fileName,
          size: fileSize
        }
      }));
      
      dataChannel.send(chunkBuffer);
      
      // 更新通道状态
      channelLoadBalancer.updateChannelStatus(`${dataChannel.label || channelIndex}`, dataChannel.bufferedAmount, true);
      
      sentChunks++;
      
      if (sentChunks % 5 === 0 || sentChunks === optimizedTotalChunks) {
        const transfer = transfers.value.find(t => t.id === transferId);
        if (transfer) {
          transfer.progress = Math.round((sentChunks / optimizedTotalChunks) * 90);
            
          window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
            detail: { ...transfer }
          }));
        }
      }
      
      if (fileSize > 100 * 1024 * 1024) {
        if (sentChunks % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      } else if (fileSize > 50 * 1024 * 1024) {
        if (sentChunks % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    } catch (error) {
      addLog('error', `读取文件块失败: ${error}`);
      // 更新通道状态（失败）
      if (dataChannel) {
        channelLoadBalancer.updateChannelStatus(`${dataChannel.label || channelIndex}`, dataChannel.bufferedAmount, false);
      }
    } finally {
      pendingSends--;
    }
  };
  
  const chunkPromises: Promise<void>[] = [];
  const maxConcurrentReads = 20;
  
  for (let i = 0; i < optimizedTotalChunks; i += maxConcurrentReads) {
    const batchEnd = Math.min(i + maxConcurrentReads, optimizedTotalChunks);
    const batchPromises: Promise<void>[] = [];
    
    for (let j = i; j < batchEnd; j++) {
      batchPromises.push(sendChunk(j));
    }
    
    await Promise.all(batchPromises);
  }
  
  while (pendingSends > 0) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const primaryChannel = channels[0];
  await new Promise(resolve => {
    const maxWaitTime = 10000;
    const startTime = Date.now();
    
    const waitForSend = () => {
      if (primaryChannel.bufferedAmount === 0 || Date.now() - startTime > maxWaitTime) {
        resolve(true);
      } else {
        setTimeout(waitForSend, 10);
      }
    };
    waitForSend();
  });
  
  const completionPromise = new Promise((resolve, reject) => {
    transferCompletionPromises.set(transferId, { resolve, reject });
    
    setTimeout(() => {
      if (transferCompletionPromises.has(transferId)) {
        transferCompletionPromises.delete(transferId);
        const transfer = transfers.value.find(t => t.id === transferId);
        if (transfer) {
          transfer.status = 'completed';
          transfer.progress = 100;
            
          window.dispatchEvent(new CustomEvent('p2p:transfer-complete', {
            detail: { ...transfer }
          }));
        }
        resolve(true);
      }
    }, 30000);
  });
  
  try {
    await completionPromise;
    addLog('success', `文件传输完成: ${fileName}`);
  } catch (error) {
    addLog('error', `等待传输确认超时: ${error}`);
  }
}

// 处理下载请求（当收到下载请求时，根据哈希查找文件并发送）
const handleDownloadRequest = async (data: any, peerId: string) => {
  const { transferId, fileHash, fileName, fileSize } = data
  addLog('info', `收到下载请求: ${fileName} (哈希: ${fileHash.substring(0, 8)}...)`)
  
  try {
    // 通过IPC调用查找文件
    const fileInfo = await window.electronAPI.invoke(IPC_CHANNELS.P2P_FIND_FILE_BY_HASH, fileHash);
    
    if (fileInfo) {
      addLog('info', `找到文件: ${fileInfo.filePath}`)
      
      // 创建发送传输记录
      const sendingTransfer = {
        id: transferId,
        peerId: peerId,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        progress: 0,
        status: 'preparing',
        direction: 'send',
        hash: fileHash
      }
      transfers.value.push(sendingTransfer)
      
      // 开始发送文件
      await startFileSend(transferId, peerId, fileInfo.filePath, fileInfo.fileName, fileInfo.fileSize, fileHash)
    } else {
      addLog('error', `未找到哈希为 ${fileHash} 的文件`)
      
      // 发送错误消息
      const dataChannel = dataChannels.get(peerId)
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
          type: 'download-error',
          transferId: transferId,
          error: 'File not found'
        }))
      }
    }
  } catch (error) {
    addLog('error', `处理下载请求时出错: ${error}`)
  }
}

// ✅ 处理多源下载请求 - 只发送指定范围的块
const handleMultiSourceDownloadRequest = async (data: any, peerId: string) => {
  const { transferId, fileHash, fileName, fileSize, requestedChunks, chunkStart, chunkEnd } = data;
  
  addLog('info', `收到多源下载请求: ${fileName} (块 ${chunkStart}-${chunkEnd}, 共 ${requestedChunks?.length || 0} 块)`);
  
  try {
    // 通过IPC调用查找文件
    const fileInfo = await window.electronAPI.invoke(IPC_CHANNELS.P2P_FIND_FILE_BY_HASH, fileHash);
    
    if (!fileInfo) {
      addLog('error', `未找到哈希为 ${fileHash} 的文件`);
      return;
    }
    
    addLog('info', `找到文件: ${fileInfo.filePath}, 准备发送指定块`);
    
    // 创建发送传输记录
    const sendingTransfer = {
      id: transferId,
      peerId: peerId,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      progress: 0,
      status: 'preparing',
      direction: 'send',
      hash: fileHash,
      isMultiSource: true,
      requestedChunks: requestedChunks
    };
    transfers.value.push(sendingTransfer);
    
    // 只发送指定范围的块
    await sendFileChunksForRange(
      transferId,
      peerId,
      fileInfo.filePath,
      fileInfo.fileName,
      fileInfo.fileSize,
      requestedChunks
    );
    
  } catch (error) {
    addLog('error', `处理多源下载请求时出错: ${error}`);
  }
}

// ✅ 发送指定范围的文件块 - 改进版：大缓冲区读取，减少IPC调用
const sendFileChunksForRange = async (
  transferId: string,
  peerId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  requestedChunks: number[]
) => {
  const CHUNK_SIZE = 65536;
  const READ_BUFFER_SIZE = 4 * 1024 * 1024; // 4MB读取缓冲区
  const totalToSend = requestedChunks?.length || 0;
  
  let cleanPeerId = peerId;
  if (cleanPeerId.includes('-ch')) {
    cleanPeerId = cleanPeerId.split('-ch')[0];
  } else if (cleanPeerId.includes('-incoming')) {
    cleanPeerId = cleanPeerId.split('-incoming')[0];
  }
  
  addLog('info', `开始发送指定块: ${fileName}, 块数: ${totalToSend}, peerId: ${cleanPeerId}`);
  
  let channels = multiDataChannels.get(cleanPeerId);
  
  if (!channels || channels.length === 0) {
    const singleChannel = dataChannels.get(cleanPeerId);
    if (singleChannel) {
      channels = [singleChannel];
    } else {
      addLog('error', '没有可用的数据通道');
      return;
    }
  }
  
  const availableChannels = channels.filter(ch => ch.readyState === 'open');
  if (availableChannels.length === 0) {
    addLog('error', '没有可用的数据通道');
    return;
  }
  channels = availableChannels;
  
  addLog('info', `使用 ${channels.length} 个通道发送 ${totalToSend} 个块 (缓冲区: ${READ_BUFFER_SIZE/(1024*1024)}MB`);
  
  const transfer = transfers.value.find(t => t.id === transferId);
  if (transfer) {
    transfer.status = 'transferring';
  }
  
  let sentCount = 0;
  let failedCount = 0;
  
  // ✅ 关键改进：按块号排序，使用4MB大缓冲区读取
  const sortedChunks = [...requestedChunks].sort((a, b) => a - b);
  let bufferCache: Map<string, ArrayBuffer> = new Map();
  
  const getChunkData = async (chunkIndex: number): Promise<ArrayBuffer | null> => {
    const start = (chunkIndex - 1) * CHUNK_SIZE;
    const bufferStart = Math.floor(start / READ_BUFFER_SIZE) * READ_BUFFER_SIZE;
    
    const cacheKey = `${filePath}_${bufferStart}`;
    
    // 如果缓存存在，直接从缓存读取
    if (bufferCache.has(cacheKey)) {
      const bufferData = bufferCache.get(cacheKey)!;
      const offsetInBuffer = start - bufferStart;
      const endOffset = Math.min(offsetInBuffer + CHUNK_SIZE, bufferData.byteLength);
      return bufferData.slice(offsetInBuffer, endOffset);
    }
    
    // 读取4MB缓冲区
    const readLength = Math.min(READ_BUFFER_SIZE, fileSize - bufferStart);
    try {
      const bufferData = await window.electronAPI.invoke('file:read-arraybuffer-range', {
        filePath,
        start: bufferStart,
        length: readLength
      });
      
      // 缓存新读取的数据
      bufferCache.set(cacheKey, bufferData);
      
      // 保持最多4个缓存（约16MB内存）
      if (bufferCache.size > 4) {
        const firstKey = bufferCache.keys().next().value;
        bufferCache.delete(firstKey);
      }
      
      const offsetInBuffer = start - bufferStart;
      const endOffset = Math.min(offsetInBuffer + CHUNK_SIZE, bufferData.byteLength);
      return bufferData.slice(offsetInBuffer, endOffset);
    } catch (e) {
      addLog('error', `读取块 ${chunkIndex} 失败: ${e}`);
      return null;
    }
  };
  
  for (let i = 0; i < sortedChunks.length; i++) {
    const chunkIndex = sortedChunks[i];
    
    const chunk = await getChunkData(chunkIndex);
    if (!chunk) {
      failedCount++;
      continue;
    }
    
    const channelIndex = i % channels.length;
    const channel = channels[channelIndex];
    
    if (!channel || channel.readyState !== 'open') {
      failedCount++;
      continue;
    }
    
    // ✅ 更严格的缓冲区控制：发送前先检查
    const MAX_BUFFER = 8 * 1024 * 1024; // 8MB
    if (channel.bufferedAmount > MAX_BUFFER) {
      await new Promise(resolve => {
        const check = () => {
          if (channel.bufferedAmount < MAX_BUFFER * 0.3) {
            resolve(true);
          } else {
            setTimeout(check, 20);
          }
        };
        check();
      });
    }
    
    try {
      channel.send(JSON.stringify({
        type: 'file-chunk-metadata',
        transferId: transferId,
        chunkIndex: chunkIndex,
        totalChunks: Math.ceil(fileSize / CHUNK_SIZE),
        chunkSize: chunk.byteLength,
        channelIndex: channelIndex,
        fileInfo: { name: fileName, size: fileSize }
      }));
      
      channel.send(chunk);
      sentCount++;
    } catch (e) {
      addLog('error', `发送块 ${chunkIndex} 失败: ${e}`);
      failedCount++;
    }
    
    if (transfer && (sentCount % 100 === 0 || sentCount === totalToSend)) {
      transfer.progress = Math.round((sentCount / totalToSend) * 100);
    }
    
    // 每200块短暂休息
    if (i % 200 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  bufferCache.clear();
  
  await new Promise(resolve => {
    const check = () => {
      const allEmpty = channels.every(ch => ch.bufferedAmount === 0);
      if (allEmpty) {
        resolve(true);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
  
  channels[0].send(JSON.stringify({
    type: 'file-transfer-complete',
    transferId: transferId,
    success: true,
    isMultiSource: true,
    sentChunks: sentCount,
    failedChunks: failedCount
  }));
  
  if (transfer) {
    transfer.status = 'completed';
    transfer.progress = 100;
  }
  
  addLog('success', `多源块发送完成: 发送 ${sentCount} 个块, 失败 ${failedCount} 个`);
};

// 处理文件传输开始
const handleFileTransferStart = async (data: any, peerId: string) => {
  const { transferId, fileInfo, totalChunks } = data
  addLog('info', `收到文件传输开始信号: ${fileInfo.name}`)
  
  initReceivedFileBlocks(transferId, fileInfo, totalChunks, peerId, [peerId]);

  if (fileInfo && fileInfo.size) {
    await initFinalFile(transferId, fileInfo, totalChunks, fileInfo.size);
  }

  acceptFileTransfer();
  
  addLog('info', `自动接受来自 ${peerId.substring(0, 6)} 的下载文件: ${fileInfo.name}`)
}



// 处理文件传输接受确认（发送方处理）
const handleFileTransferAcceptedConfirm = (data: any, peerId: string) => {
  const { transferId, fileInfo } = data
  addLog('info', `对方已确认接受文件传输，开始传输文件数据`)
  
  // 清理peerId，移除通道后缀
  let cleanPeerId = peerId;
  if (cleanPeerId.includes('-ch')) {
    cleanPeerId = cleanPeerId.split('-ch')[0];
  } else if (cleanPeerId.includes('-incoming')) {
    cleanPeerId = cleanPeerId.split('-incoming')[0];
  }
  
  addLog('info', `清理后的peerId: ${cleanPeerId}`);
  
  // 首先尝试使用确切的transferId查找传输记录
  let transfer = transfers.value.find(t => t.id === transferId)
  
  // 如果没找到，尝试使用fallback机制（基于文件信息）
  if (!transfer && fileInfo) {
    const fallbackId = `${fileInfo.name}_${fileInfo.size}`
    if (transferId === fallbackId) {
      // 使用fallback ID查找
      transfer = transfers.value.find(t => t.fileName === fileInfo.name && t.fileSize === fileInfo.size)
    }
  }
  
  if (!transfer) {
    addLog('error', `找不到传输记录: ${transferId}`)
    return
  }
  
  // 更新传输状态
  transfer.status = 'transferring'
  
  // 使用保存的文件引用
  if (transfer.file) {
    // 开始真正的文件传输
    sendFileChunks(cleanPeerId, transfer.file, transfer.id)
  } else {
    addLog('error', '找不到要传输的文件，请重新选择文件')
    
    // 发送失败信号
    const dataChannel = dataChannels.get(cleanPeerId)
    if (dataChannel) {
      dataChannel.send(JSON.stringify({
        type: 'file-transfer-complete',
        transferId: transfer.id,
        success: false
      }))
    }
  }
}





// 存储接收的文件块
const receivedFileChunks = new Map<string, Map<number, string>>()



// 流式保存接收到的文件块 - 真正的流式传输


// 获取默认下载路径
const getDefaultDownloadPath = async () => {
  try {
    // 从主应用获取系统信息
    const systemInfo = await window.electronAPI.invoke('system:info');
    const homeDir = systemInfo.userInfo.homeDir;
    const config = await window.electronAPI.invoke('config:get');
    
    // 构建下载路径，兼容Windows和非Windows系统
    let downloadPath = config.downloadPath;
    
    // 如果配置中没有下载路径，使用默认路径
    if (!downloadPath) {
      // 构建Downloads文件夹路径
      const downloadsPath = homeDir + '/Downloads';
      downloadPath = downloadsPath + '/P2PFiles';
    }
    
    // 确保路径使用正确的分隔符
    return downloadPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('获取系统信息失败:', error);
    // 如果无法获取系统信息，返回空字符串，由主进程决定默认位置
    // 在渲染器进程无法直接访问os模块，所以返回空字符串让主进程处理
    return '';
  }
};

// 用于存储批量处理的文件块
const pendingChunks = new Map();

// 存储接收的文件块和元数据
// 存储接收到的文件块信息 - 按要求实现切片下载和组装
const receivedFileBlocks = new Map<string, {
  metadata: any[],
  receivedChunkIndexes: Set<number>,
  totalReceivedBytes: number,
  fileInfo: any,
  finalFilePath: string,
  fileHandleId: string | null,
  expectedTotalChunks: number,
  isInitialized: boolean,
  chunkSize: number,
  sourcePeerId: string | null,  // 新增：存储主源节点ID
  sourceNodes: string[]  // 新增：存储所有源节点ID（多源下载用）
}>()

const CHUNK_SIZE = 65536;

// 初始化接收文件块存储
const initReceivedFileBlocks = (transferId: string, fileInfo?: any, expectedTotalChunks?: number, sourcePeerId?: string, sourceNodes?: string[]) => {
  if (!receivedFileBlocks.has(transferId)) {
    receivedFileBlocks.set(transferId, {
      metadata: [],
      receivedChunkIndexes: new Set<number>(),
      totalReceivedBytes: 0,
      fileInfo: fileInfo || null,
      finalFilePath: '',
      fileHandleId: null,
      expectedTotalChunks: expectedTotalChunks || 0,
      isInitialized: false,
      chunkSize: CHUNK_SIZE,
      sourcePeerId: sourcePeerId || null,  // 设置主源节点ID
      sourceNodes: sourceNodes || (sourcePeerId ? [sourcePeerId] : [])  // 设置所有源节点ID（多源下载用）
    });
  }
}

const initFinalFile = async (transferId: string, fileInfo: any, totalChunks: number, totalSize: number) => {
  const storage = receivedFileBlocks.get(transferId);
  if (!storage || storage.isInitialized) return;
  
  let downloadPath = await getDefaultDownloadPath();
  if (!downloadPath || downloadPath.trim() === '') {
    try {
      const systemInfo = await window.electronAPI.invoke('system:info');
      downloadPath = systemInfo.userInfo.homeDir + '/Downloads/P2PFiles';
    } catch (error) {
      addLog('error', `获取下载路径失败: ${error}`);
      throw new Error('无法确定有效的下载路径');
    }
  }
  
  const fileNameWithoutExt = fileInfo.name.replace(/\.[^/.]+$/, "") || 'unknown_file';
  const fileExtension = fileInfo.name.match(/\.[^/.]+$/)?.[0] || '';
  
  const normalizedDownloadPath = downloadPath.replace(/[\\\/]/g, '/');
  const downloadFolderPath = `${normalizedDownloadPath}/${fileNameWithoutExt}_download`;
  const finalFilePath = `${downloadFolderPath}/${fileInfo.name}`;
  
  await window.electronAPI.invoke('file:create-directory', {
    dirPath: downloadFolderPath
  });
  
  const handleResult = await window.electronAPI.invoke('file:create-handle', {
    filePath: finalFilePath,
    totalSize: totalSize
  });
  
  storage.finalFilePath = finalFilePath;
  storage.fileHandleId = handleResult.handleId;
  storage.fileInfo = fileInfo;
  storage.expectedTotalChunks = totalChunks;
  storage.isInitialized = true;
  
  addLog('info', `预创建文件: ${finalFilePath}, 句柄ID: ${handleResult.handleId}`);
};

// 处理文件块元数据 - 实现批量流式传输
const handleFileChunkMetadata = async (data: any, peerId: string) => {
  const { transferId, chunkIndex, totalChunks, chunkSize, fileInfo } = data
  
  let transfer = transfers.value.find(t => t.id === transferId)
  if (!transfer) {
    transfer = transfers.value.find(t => 
      t.fileName === fileInfo?.name && 
      t.fileSize === fileInfo?.size &&
      t.direction === 'receive'
    );
    
    if (transfer) {
      transfer.id = transferId;
    } else {
      transfer = {
        id: transferId,
        fileName: fileInfo?.name || 'unknown',
        fileSize: fileInfo?.size || 0,
        peerId: peerId,
        direction: 'receive',
        status: 'in-progress',
        progress: 0,
        receivedChunks: 0,
        totalChunks: totalChunks
      };
      transfers.value.push(transfer);
    }
  }
  
  // 更新传输状态为传输中（如果当前是连接中状态）
  if (transfer && transfer.status === 'connecting') {
    transfer.status = 'transferring';
    addLog('info', `文件传输开始: ${transfer.fileName}`);
  }
  
  if (!receivedFileBlocks.has(transferId)) {
    initReceivedFileBlocks(transferId, fileInfo, totalChunks, peerId, [peerId]);
  }

  const storage = receivedFileBlocks.get(transferId)!;

  if (!storage.isInitialized && fileInfo && fileInfo.size) {
    await initFinalFile(transferId, fileInfo, totalChunks, fileInfo.size);
  }

  // 检查是否已经处理过这个块
  const isDuplicate = storage.metadata.some(m => m.index === chunkIndex);
  if (isDuplicate) {
    // 忽略重复的块
    return;
  }
  
  // 存储元数据
  storage.metadata.push({
    index: chunkIndex,
    size: chunkSize,
    channelIndex: data.channelIndex  // 添加通道索引
  });
  
  // 只记录元数据，不更新进度（进度由实际数据块接收决定）
  if (transfer) {
    transfer.totalChunks = totalChunks;
  }
  
  // 如果是最后一个块，准备写入文件
  if (chunkIndex === totalChunks) {
    // 此时应该已收到所有二进制数据，准备写入文件
  }
  // 不在接收每个块时显示日志，避免日志过多
}

// 处理批量元数据
const handleFileChunkMetadataBatch = async (data: any, peerId: string) => {
  const { transferId, totalChunks, chunkSize, fileInfo, batches } = data
  
  let transfer = transfers.value.find(t => t.id === transferId)
  if (!transfer) {
    transfer = transfers.value.find(t => 
      t.fileName === fileInfo?.name && 
      t.fileSize === fileInfo?.size &&
      t.direction === 'receive'
    );
    
    if (transfer) {
      transfer.id = transferId;
    } else {
      transfer = {
        id: transferId,
        fileName: fileInfo?.name || 'unknown',
        fileSize: fileInfo?.size || 0,
        peerId: peerId,
        direction: 'receive',
        status: 'in-progress',
        progress: 0,
        receivedChunks: 0,
        totalChunks: totalChunks
      };
      transfers.value.push(transfer);
    }
  }
  
  // 更新传输状态为传输中（如果当前是连接中状态）
  if (transfer && transfer.status === 'connecting') {
    transfer.status = 'transferring';
    addLog('info', `文件传输开始: ${transfer.fileName}`);
  }
  
  if (!receivedFileBlocks.has(transferId)) {
    initReceivedFileBlocks(transferId, fileInfo, totalChunks, peerId, [peerId]);
  }

  const storage = receivedFileBlocks.get(transferId)!;

  if (!storage.isInitialized && fileInfo && fileInfo.size) {
    await initFinalFile(transferId, fileInfo, totalChunks, fileInfo.size);
  }

  // 存储批量元数据
  if (!storage.batchMetadata) {
    storage.batchMetadata = [];
  }

  storage.batchMetadata.push({ batchId: Date.now(), batches, chunkSize });
  
  if (transfer) {
    transfer.totalChunks = totalChunks;
  }
  
  // 为批量元数据创建临时存储，用于后续二进制数据的匹配
  if (!lastReceivedMetadata.has(peerId)) {
    lastReceivedMetadata.set(peerId, { ...data, currentBatchIndex: 0, currentChunkIndex: 0 });
  }
  
  // 不在接收每个批次时显示日志，避免日志过多
}

// 处理二进制数据块
const handleFileChunkBinary = async (binaryData: ArrayBuffer, metadata: any, peerId: string) => {
  let transferId: string;
  let chunkIndex: number;
  let totalChunks: number;
  let fileInfo: any;
  let chunkSize: number;
  
  // 检查是否是批量元数据
  if (metadata.type === 'file-chunk-metadata-batch' && metadata.currentBatchIndex !== undefined) {
    const { batches, totalChunks: metadataTotalChunks, fileInfo: metadataFileInfo, chunkSize: metadataChunkSize } = metadata;
    const currentBatch = batches[metadata.currentBatchIndex];
    
    if (currentBatch) {
      transferId = metadata.transferId;
      chunkIndex = currentBatch.chunkIndex;
      totalChunks = metadataTotalChunks;
      fileInfo = metadataFileInfo;
      chunkSize = currentBatch.chunkSize;
      
      // 更新当前批处理索引
      metadata.currentChunkIndex++;
      if (metadata.currentChunkIndex >= batches.length) {
        metadata.currentChunkIndex = 0;
        metadata.currentBatchIndex++;
        
        // 如果所有批次都处理完了，清理元数据
        if (metadata.currentBatchIndex >= batches.length) {
          lastReceivedMetadata.delete(peerId);
        }
      }
    } else {
      // 没有找到对应的批次，清理元数据
      lastReceivedMetadata.delete(peerId);
      return;
    }
  } else {
    // 普通元数据
    transferId = metadata.transferId;
    chunkIndex = metadata.chunkIndex;
    totalChunks = metadata.totalChunks;
    fileInfo = metadata.fileInfo;
    chunkSize = metadata.chunkSize;
  }
  
  const storage = receivedFileBlocks.get(transferId);
  if (!storage) {
    addLog('error', `找不到传输块存储: ${transferId}`);
    return;
  }
  
  if (storage.receivedChunkIndexes.has(chunkIndex)) {
    addLog('debug', `块 ${chunkIndex} 已接收，跳过处理`);
    return;
  }
  
  if (!storage.isInitialized) {
    if (fileInfo && fileInfo.size) {
      await initFinalFile(transferId, fileInfo, totalChunks, fileInfo.size);
      storage.fileInfo = fileInfo;
    } else {
      addLog('error', `无法初始化文件: 缺少文件大小信息`);
      return;
    }
  }
  
  if (!storage.fileHandleId) {
    addLog('error', `文件句柄未初始化，无法写入块 ${chunkIndex}`);
    return;
  }
  
  try {
    const offset = (chunkIndex - 1) * CHUNK_SIZE;
    
    // 使用批量写入
    let batch = writeBatches.get(transferId);
    if (!batch) {
      // 创建新的批处理
      batch = {
        chunks: [],
        timeout: setTimeout(() => batchWriteChunks(transferId), BATCH_WRITE_TIMEOUT),
        receivedCount: 0,
        totalChunks: totalChunks
      };
      writeBatches.set(transferId, batch);
    }
    
    // 添加到批处理
    batch.chunks.push({ offset, data: binaryData });
    batch.receivedCount++;
    
    // 检查是否达到批量写入阈值
    if (batch.chunks.length >= BATCH_WRITE_THRESHOLD) {
      await batchWriteChunks(transferId);
    }
    
    // 更新接收速率
    updateReceiveRate(peerId, storage.totalReceivedBytes + binaryData.byteLength);
    
    // 处理多源下载的块分配
    updateMultiSourceReceivedChunk(transferId, chunkIndex, peerId);
    
  } catch (error) {
    addLog('error', `处理文件块失败: ${error}`);
  }
}

// 完成接收文件
const finalizeReceivedFile = async (transferId: string, fileInfo: any, totalChunks: number, peerId: string) => {
  // 处理剩余的批量写入
  if (writeBatches.has(transferId)) {
    await batchWriteChunks(transferId);
  }
  
  const storage = receivedFileBlocks.get(transferId);
  if (!storage) {
    addLog('error', `找不到传输块存储: ${transferId}`);
    return;
  }
  
  // 获取源节点信息（在删除storage之前保存）
  const sourceNodes = storage.sourceNodes || [];
  const sourcePeerId = storage.sourcePeerId || '';
  // 使用peerId（传入的参数）或sourcePeerId，优先使用传入的peerId
  const effectivePeerId = peerId || sourcePeerId;
  
  addLog('debug', `finalizeReceivedFile: peerId=${peerId}, sourcePeerId=${sourcePeerId}, effectivePeerId=${effectivePeerId}, sourceNodes=${JSON.stringify(sourceNodes)}`);
  
  if (!effectivePeerId && sourceNodes.length === 0) {
    addLog('error', `无法获取有效的peerId或sourceNodes，无法完成断链`);
    return;
  }
  
  try {
    if (storage.fileHandleId) {
      await window.electronAPI.invoke('file:close-handle', {
        handleId: storage.fileHandleId
      });
      addLog('debug', `已关闭文件句柄: ${storage.fileHandleId}`);
    }
    
    receivedFileBlocks.delete(transferId);
    
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.progress = 100;
      transfer.filePath = storage.finalFilePath;
      
      window.dispatchEvent(new CustomEvent('p2p:transfer-complete', {
        detail: { ...transfer }
      }));
    }
    
    addLog('success', `文件下载完成: ${storage.finalFilePath}`);
    
    // 向发送端发送传输完成确认
    const primaryChannel = dataChannels.get(effectivePeerId);
    if (primaryChannel && primaryChannel.readyState === 'open') {
      primaryChannel.send(JSON.stringify({
        type: 'file-transfer-confirmed',
        transferId: transferId,
        success: true
      }));
      addLog('info', `已向发送端确认传输完成: ${transferId}`);
    } else {
      // 如果主通道不可用，尝试从multiDataChannels中获取通道
      const channels = multiDataChannels.get(effectivePeerId);
      if (channels && channels.length > 0) {
        const primaryChannel = channels[0];
        if (primaryChannel.readyState === 'open') {
          primaryChannel.send(JSON.stringify({
            type: 'file-transfer-confirmed',
            transferId: transferId,
            success: true
          }));
          addLog('info', `已向发送端确认传输完成 (via multi-channel): ${transferId}`);
        }
      }
    }
    
    // 传输完成后断链：关闭所有数据通道
    // 使用sourceNodes（多源下载时包含所有节点）
    await disconnectDataChannelsAfterTransfer(effectivePeerId, transferId, sourceNodes);
    
  } catch (error) {
    addLog('error', `保存文件失败: ${error}`);
    
    // 向发送端发送失败确认
    const primaryChannel = dataChannels.get(effectivePeerId);
    if (primaryChannel && primaryChannel.readyState === 'open') {
      primaryChannel.send(JSON.stringify({
        type: 'file-transfer-confirmed',
        transferId: transferId,
        success: false
      }));
      addLog('info', `已向发送端确认传输失败: ${transferId}`);
    } else {
      // 如果主通道不可用，尝试从multiDataChannels中获取通道
      const channels = multiDataChannels.get(effectivePeerId);
      if (channels && channels.length > 0) {
        const primaryChannel = channels[0];
        if (primaryChannel.readyState === 'open') {
          primaryChannel.send(JSON.stringify({
            type: 'file-transfer-confirmed',
            transferId: transferId,
            success: false
          }));
          addLog('info', `已向发送端确认传输失败 (via multi-channel): ${transferId}`);
        }
      }
    }
    
    // 传输失败时也断链
    await disconnectDataChannelsAfterTransfer(effectivePeerId, transferId, sourceNodes);
    
    // 更新传输状态
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'failed';
    }
  }
}

// 处理文件传输完成
const handleFileTransferComplete = (data: any, peerId: string) => {
  const { transferId, success } = data
  
  const transfer = transfers.value.find(t => t.id === transferId)
  if (transfer) {
    if (success) {
      // 注意：这里不立即标记为完成，而是等待所有数据块接收完毕
      // 接收端只有在所有数据块都接收并写入完成后，才会发送确认给发送端
      addLog('info', `收到发送端传输完成信号，等待所有数据块接收完成: ${transfer.fileName}`)
    } else {
      transfer.status = 'failed'
      addLog('error', `文件传输失败: ${transfer.fileName}`)
      
      // 触发传输错误事件，供FileTransferList组件使用
      window.dispatchEvent(new CustomEvent('p2p:transfer-error', {
        detail: { fileId: transferId, error: 'File transfer failed' }
      }))
    }
  }
}

// ✅ 多源下载状态存储 - 增强版（包含容错机制）
interface MultiSourceState {
  transferId: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  sourceNodes: string[];
  activeNodes: Set<string>;
  failedNodes: Set<string>;
  nodeAssignments: Map<string, number[]>;
  pendingChunksPerNode: Map<string, Set<number>>;  // 每个节点待接收的块
  receivedChunks: Set<number>;
  status: 'connecting' | 'downloading' | 'completed' | 'failed';
  startTime: number;
  lastProgressTime: number;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

const multiSourceDownloads = new Map<string, MultiSourceState>();
const MULTI_SOURCE_CHUNK_TIMEOUT = 30000; // 30秒无进度则触发重新分配

// ✅ 块分配算法 - 将块分配给各个节点
const assignChunksToNodes = (totalChunks: number, nodes: string[]): Map<string, number[]> => {
  const assignments = new Map<string, number[]>();
  
  // 轮询分配：节点1负责块1, 节点2负责块2... 循环分配
  const nodeChunks: number[][] = nodes.map(() => []);
  
  for (let chunk = 1; chunk <= totalChunks; chunk++) {
    const nodeIndex = (chunk - 1) % nodes.length;
    nodeChunks[nodeIndex].push(chunk);
  }
  
  nodes.forEach((nodeId, index) => {
    assignments.set(nodeId, nodeChunks[index]);
  });
  
  return assignments;
};

// ✅ 重新分配失败节点的块到活跃节点
const redistributeChunksForRecovery = async (
  state: MultiSourceState,
  failedNodeId: string
): Promise<boolean> => {
  const pendingChunks = state.pendingChunksPerNode.get(failedNodeId);
  if (!pendingChunks || pendingChunks.size === 0) {
    addLog('info', `节点 ${failedNodeId.substring(0, 6)} 没有待接收的块需要重新分配`);
    return true;
  }
  
  const chunksToRedistribute = Array.from(pendingChunks);
  addLog('warning', `重新分配节点 ${failedNodeId.substring(0, 6)} 的 ${chunksToRedistribute.length} 个块`);
  
  // 获取活跃节点（排除失败节点）
  const activeNodes = Array.from(state.activeNodes).filter(id => id !== failedNodeId);
  
  if (activeNodes.length === 0) {
    addLog('error', `没有活跃节点，无法重新分配块`);
    return false;
  }
  
  // 将待分配的块重新分配给活跃节点
  const newAssignments = assignChunksToNodesFromArray(chunksToRedistribute, activeNodes);
  
  for (const [nodeId, chunks] of newAssignments.entries()) {
    if (chunks.length === 0) continue;
    
    const channel = dataChannels.get(nodeId);
    if (!channel || channel.readyState !== 'open') {
      addLog('warning', `节点 ${nodeId.substring(0, 6)} 不可用，跳过重新分配`);
      continue;
    }
    
    // 更新待接收块集合
    const nodePending = state.pendingChunksPerNode.get(nodeId) || new Set<number>();
    chunks.forEach(c => nodePending.add(c));
    state.pendingChunksPerNode.set(nodeId, nodePending);
    
    addLog('info', `向节点 ${nodeId.substring(0, 6)} 追加请求 ${chunks.length} 个块`);
    
    // 发送追加的块请求
    channel.send(JSON.stringify({
      type: 'multi-source-download-request',
      transferId: state.transferId,
      fileHash: state.fileHash,
      fileName: state.fileName,
      fileSize: state.fileSize,
      requestedChunks: chunks,
      isRedistribution: true
    }));
  }
  
  // 清除失败节点的待接收块
  pendingChunks.clear();
  
  return true;
};

// ✅ 从数组分配块到节点（用于重新分配）
const assignChunksToNodesFromArray = (chunks: number[], nodes: string[]): Map<string, number[]> => {
  const assignments = new Map<string, number[]>();
  nodes.forEach(nodeId => assignments.set(nodeId, []));
  
  if (nodes.length === 0) return assignments;
  
  chunks.forEach((chunk, index) => {
    const nodeIndex = index % nodes.length;
    assignments.get(nodes[nodeIndex])!.push(chunk);
  });
  
  return assignments;
};

// ✅ 检查多源下载进度并触发容错
const checkMultiSourceProgress = async (transferId: string) => {
  const state = multiSourceDownloads.get(transferId);
  if (!state || state.status !== 'downloading') return;
  
  const now = Date.now();
  const timeSinceLastProgress = now - state.lastProgressTime;
  
  // 检查是否超时且还有未完成的块
  if (timeSinceLastProgress > MULTI_SOURCE_CHUNK_TIMEOUT && state.receivedChunks.size < state.totalChunks) {
    addLog('warning', `检测到下载超时 (${Math.round(timeSinceLastProgress/1000)}s无进度)，尝试容错恢复`);
    
    if (state.recoveryAttempts >= state.maxRecoveryAttempts) {
      addLog('error', `达到最大恢复次数 (${state.maxRecoveryAttempts})，下载失败`);
      state.status = 'failed';
      const transfer = transfers.value.find(t => t.id === transferId);
      if (transfer) transfer.status = 'failed';
      return;
    }
    
    state.recoveryAttempts++;
    
    // 检查每个节点的连接状态
    for (const nodeId of state.activeNodes) {
      const channel = dataChannels.get(nodeId);
      if (!channel || channel.readyState !== 'open') {
        addLog('warning', `节点 ${nodeId.substring(0, 6)} 连接断开`);
        state.activeNodes.delete(nodeId);
        state.failedNodes.add(nodeId);
        
        // 重新分配该节点的待接收块
        await redistributeChunksForRecovery(state, nodeId);
      }
    }
    
    // 如果还有活跃节点，继续等待
    if (state.activeNodes.size > 0) {
      state.lastProgressTime = now;
    } else {
      addLog('error', `所有节点都已断开，下载失败`);
      state.status = 'failed';
      const transfer = transfers.value.find(t => t.id === transferId);
      if (transfer) transfer.status = 'failed';
    }
  }
};

// ✅ 启动多源下载进度监控
const startProgressMonitor = (transferId: string) => {
  const checkInterval = setInterval(() => {
    const state = multiSourceDownloads.get(transferId);
    if (!state || state.status === 'completed' || state.status === 'failed') {
      clearInterval(checkInterval);
      return;
    }
    checkMultiSourceProgress(transferId);
  }, 5000); // 每5秒检查一次
};

// ✅ 多源下载核心函数 - 增强版
const startMultiSourceDownload = async (
  fileHash: string,
  fileName: string,
  fileSize: number,
  sourceNodes: string[],
  existingTransferId?: string
) => {
  const CHUNK_SIZE = 65536;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  
  addLog('info', `开始多源下载: ${fileName} (${formatFileSize(fileSize)}, ${totalChunks} 块, ${sourceNodes.length} 节点)`);
  
  // 分配块到各节点
  const nodeAssignments = assignChunksToNodes(totalChunks, sourceNodes);
  
  // 初始化待接收块集合
  const pendingChunksPerNode = new Map<string, Set<number>>();
  nodeAssignments.forEach((chunks, nodeId) => {
    pendingChunksPerNode.set(nodeId, new Set(chunks));
  });
  
  // 如果有之前的传输记录，复用它
  let transferId = existingTransferId;
  let transfer: any;
  
  if (transferId) {
    // 查找并更新已有的传输记录
    transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      // 更新传输记录
      transfer.peerId = 'multi-source';
      transfer.status = 'connecting';
      transfer.totalChunks = totalChunks;
      transfer.sourceNodeCount = sourceNodes.length;
      transfer.activeNodeCount = sourceNodes.length;
    }
  }
  
  // 如果没有找到或没有传入，创建新的传输ID
  if (!transfer) {
    transferId = generateTransferId();
    transfer = {
      id: transferId,
      peerId: 'multi-source',
      fileName: fileName,
      fileSize: fileSize,
      progress: 0,
      status: 'connecting',
      direction: 'receive',
      hash: fileHash,
      receivedChunks: 0,
      totalChunks: totalChunks,
      sourceNodeCount: sourceNodes.length,
      activeNodeCount: sourceNodes.length
    };
    transfers.value.push(transfer);
  }
  
  // 创建增强的多源下载状态
  const multiSourceState: MultiSourceState = {
    transferId: transferId!,
    fileHash: fileHash,
    fileName: fileName,
    fileSize: fileSize,
    totalChunks: totalChunks,
    sourceNodes: [...sourceNodes],
    activeNodes: new Set(sourceNodes),
    failedNodes: new Set<string>(),
    nodeAssignments: nodeAssignments,
    pendingChunksPerNode: pendingChunksPerNode,
    receivedChunks: new Set<number>(),
    status: 'connecting',
    startTime: Date.now(),
    lastProgressTime: Date.now(),
    recoveryAttempts: 0,
    maxRecoveryAttempts: 5
  };
  multiSourceDownloads.set(transferId!, multiSourceState);
  
  initReceivedFileBlocks(transferId!, { name: fileName, size: fileSize }, totalChunks, sourceNodes[0], sourceNodes);
  
  try {
    await initFinalFile(transferId!, { name: fileName, size: fileSize }, totalChunks, fileSize);
  } catch (error) {
    addLog('error', `预创建文件失败: ${error}`);
  }
  
  // 等待数据通道打开的辅助函数
  const waitForDataChannelOpen = (nodeId: string, timeout: number = 15000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkChannel = () => {
        const dataChannel = dataChannels.get(nodeId);
        if (dataChannel && dataChannel.readyState === 'open') {
          resolve(true);
        } else if (Date.now() - startTime >= timeout) {
          resolve(false);
        } else {
          setTimeout(checkChannel, 100);
        }
      };
      
      checkChannel();
    });
  };
  
  // 并行连接所有节点
  addLog('info', `正在连接 ${sourceNodes.length} 个源节点...`);
  
  const connectAndRequest = async (nodeId: string): Promise<boolean> => {
    try {
      addLog('info', `[${nodeId.substring(0, 6)}] 开始连接...`);
      await connectToUser(nodeId);
      
      // ✅ 关键修复：等待数据通道打开，而不是立即检查
      addLog('info', `[${nodeId.substring(0, 6)}] P2P连接成功，等待数据通道打开...`);
      const channelReady = await waitForDataChannelOpen(nodeId, 15000);
      
      if (!channelReady) {
        addLog('warning', `[${nodeId.substring(0, 6)}] 数据通道超时未打开`);
        multiSourceState.activeNodes.delete(nodeId);
        multiSourceState.failedNodes.add(nodeId);
        return false;
      }
      
      const dataChannel = dataChannels.get(nodeId);
      if (dataChannel && dataChannel.readyState === 'open') {
        const assignedChunks = nodeAssignments.get(nodeId) || [];
        
        addLog('info', `向节点 ${nodeId.substring(0, 6)} 请求 ${assignedChunks.length} 个块`);
        
        // 发送多源下载请求，指定需要的块范围
        dataChannel.send(JSON.stringify({
          type: 'multi-source-download-request',
          transferId: transferId,
          fileHash: fileHash,
          fileName: fileName,
          fileSize: fileSize,
          chunkStart: Math.min(...assignedChunks),
          chunkEnd: Math.max(...assignedChunks),
          requestedChunks: assignedChunks
        }));
        
        return true;
      }
      
      multiSourceState.activeNodes.delete(nodeId);
      multiSourceState.failedNodes.add(nodeId);
      addLog('warning', `节点 ${nodeId.substring(0, 6)} 数据通道异常`);
      return false;
    } catch (error) {
      multiSourceState.activeNodes.delete(nodeId);
      multiSourceState.failedNodes.add(nodeId);
      addLog('error', `连接节点 ${nodeId.substring(0, 6)} 失败: ${error}`);
      return false;
    }
  };
  
  // 并行连接所有节点
  const connectResults = await Promise.all(sourceNodes.map(nodeId => connectAndRequest(nodeId)));
  const successCount = connectResults.filter(r => r).length;
  
  if (successCount === 0) {
    addLog('error', `无法连接任何源节点，下载失败`);
    transfer.status = 'failed';
    multiSourceState.status = 'failed';
    return;
  }
  
  // 如果有节点连接失败，立即重新分配其块
  if (successCount < sourceNodes.length) {
    addLog('warning', `${sourceNodes.length - successCount} 个节点连接失败，尝试重新分配其块`);
    for (const failedNode of multiSourceState.failedNodes) {
      await redistributeChunksForRecovery(multiSourceState, failedNode);
    }
  }
  
  // 更新传输状态
  transfer.status = 'transferring';
  transfer.activeNodeCount = multiSourceState.activeNodes.size;
  multiSourceState.status = 'downloading';
  
  // 启动进度监控
  startProgressMonitor(transferId);
  
  addLog('success', `多源下载已启动 (${successCount}/${sourceNodes.length} 节点活跃)，等待数据块...`);
};

// ✅ 更新多源下载的块接收处理 - 集成容错
const updateMultiSourceReceivedChunk = (transferId: string, chunkIndex: number, peerId: string) => {
  const state = multiSourceDownloads.get(transferId);
  if (!state) return;
  
  // 标记块已接收
  state.receivedChunks.add(chunkIndex);
  
  // 从节点待接收集合中移除
  const nodePending = state.pendingChunksPerNode.get(peerId);
  if (nodePending) {
    nodePending.delete(chunkIndex);
  }
  
  // 更新最后进度时间
  state.lastProgressTime = Date.now();
  
  // 更新UI传输记录
  const transfer = transfers.value.find(t => t.id === transferId);
  if (transfer) {
    transfer.receivedChunks = state.receivedChunks.size;
    transfer.activeNodeCount = state.activeNodes.size;
    transfer.progress = Math.round((state.receivedChunks.size / state.totalChunks) * 100);
  }
  
  // 检查是否完成
  if (state.receivedChunks.size >= state.totalChunks) {
    state.status = 'completed';
    addLog('success', `多源下载完成！接收了 ${state.receivedChunks.size}/${state.totalChunks} 个块`);
    multiSourceDownloads.delete(transferId);
  }
};

// 文件下载功能（单源下载）
const startFileDownload = async (fileHash: string, fileName: string, fileSize: number, targetUserId: string, existingTransferId?: string) => {
  let transferId = existingTransferId;
  let transfer: any;
  
  if (transferId) {
    transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.peerId = targetUserId;
      transfer.status = 'connecting';
      transfer.hash = fileHash;
    }
  }
  
  if (!transfer) {
    transferId = generateTransferId();
    transfer = {
      id: transferId,
      peerId: targetUserId,
      fileName: fileName,
      fileSize: fileSize,
      progress: 0,
      status: 'connecting',
      direction: 'receive',
      hash: fileHash
    };
    transfers.value.push(transfer);
  }
  
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  initReceivedFileBlocks(transferId!, { name: fileName, size: fileSize }, totalChunks, targetUserId, [targetUserId]);

  try {
    await initFinalFile(transferId!, { name: fileName, size: fileSize }, totalChunks, fileSize);
  } catch (error) {
    addLog('error', `预创建文件失败: ${error}`);
  }
  
  // 发送下载请求
  const waitForDataChannel = (targetId: string, timeout: number = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkChannel = () => {
        const dataChannel = dataChannels.get(targetId);
        if (dataChannel && dataChannel.readyState === 'open') {
          resolve(true);
        } else if (Date.now() - startTime >= timeout) {
          resolve(false);
        } else {
          setTimeout(checkChannel, 100); // 每100ms检查一次
        }
      };
      
      checkChannel();
    });
  };
  
  // 等待数据通道就绪
  const isReady = await waitForDataChannel(targetUserId);
  
  if (isReady) {
    const dataChannel = dataChannels.get(targetUserId);
    if (dataChannel && dataChannel.readyState === 'open') {
      // 发送下载请求，让对方发送指定哈希的文件
      dataChannel.send(JSON.stringify({
        type: 'download-request',
        transferId: transferId,
        fileHash: fileHash,
        fileName: fileName,
        fileSize: fileSize
      }));
      
      addLog('info', `已发送下载请求: ${fileName}`);
    } else {
      addLog('error', '数据通道状态异常，无法发送下载请求');
    }
  } else {
    addLog('error', '等待数据通道就绪超时，无法发送下载请求');
  }
}

// 文件传输相关方法
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}



const selectFile = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 上传分享文件（添加到共享列表并注册到全局索引）
const uploadFile = async () => {
  if (!selectedFile.value) {
    addLog('error', '请选择要上传分享的文件')
    return
  }
  
  if (!socketService.isConnected.value) {
    addLog('error', '未连接到信令服务器，无法分享文件')
    return
  }

  try {
    // 创建一个临时的文件对象用于哈希计算
    const file = selectedFile.value;
    
    // 为了计算哈希，我们将文件内容读取并计算（这可能对于大文件不太高效，但在前端环境这是必要的）
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 添加到共享文件列表
    const newSharedFile = {
      fileName: file.name,
      fileSize: file.size,
      hash: hash,
      filePath: '' // 临时文件，没有实际路径
    };
    
    tempSharedFiles.value.push(newSharedFile);
    
    // 向信令服务器注册这个新文件
    socketService.emit('register-files', [{
      hash: hash,
      fileName: file.name,
      fileSize: file.size
    }]);
    
    addLog('success', `已分享文件: ${file.name}，哈希: ${hash.substring(0, 8)}...`)
  } catch (error) {
    addLog('error', `分享文件失败: ${error}`)
  }
  
  // 清空选择
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  selectedFile.value = null
}

// 文件传输事件监听器
const setupFileTransferEventListeners = () => {
  const socket = socketService.getSocket()
  if (socket) {
    socket.on('file-transfer-request', handleFileTransferRequest)
    socket.on('file-transfer-response', handleFileTransferResponse)
  }
}

const removeFileTransferEventListeners = () => {
  const socket = socketService.getSocket()
  if (socket) {
    socket.off('file-transfer-request', handleFileTransferRequest)
    socket.off('file-transfer-response', handleFileTransferResponse)
  }
}
  
  // 文件传输请求处理
  const handleFileTransferRequest = (data: any) => {
    const { fromUserId, fileInfo } = data
    
    // 显示确认对话框
    fileTransferRequest.value = { fromUserId, fileInfo }
    showFileTransferConfirm.value = true
    
    addLog('info', `收到来自 ${fromUserId.substring(0, 6)} 的文件传输请求: ${fileInfo.name}`)
  }
  
  // 文件传输响应处理
  const handleFileTransferResponse = (data: any) => {
    const { fromUserId, accepted, fileInfo } = data
    
    if (accepted) {
      addLog('success', `用户 ${fromUserId.substring(0, 6)} 接受了文件传输请求`)
      // 在新的流程中，我们通过数据通道发送接受确认，所以这里不需要额外处理
    } else {
      addLog('warning', `用户 ${fromUserId.substring(0, 6)} 拒绝了文件传输请求`)
    }
  }

const acceptFileTransfer = async () => {
  if (!fileTransferRequest.value.fromUserId) return

  const transferId = fileTransferRequest.value.transferId || generateTransferId()
  const fileInfo = fileTransferRequest.value.fileInfo;
  const totalChunks = Math.ceil(fileInfo.size / 16384);
  const fromUserId = fileTransferRequest.value.fromUserId;

  initReceivedFileBlocks(transferId, fileInfo, totalChunks, fromUserId, [fromUserId]);

  await initFinalFile(transferId, fileInfo, totalChunks, fileInfo.size);
  
  const transfer = {
    id: transferId,
    peerId: fileTransferRequest.value.fromUserId,
    fileName: fileInfo.name,
    fileSize: fileInfo.size,
    progress: 0,
    status: 'receiving',
    direction: 'receive',
    receivedChunks: 0,
    totalChunks: totalChunks
  }
  transfers.value.push(transfer)
  
  // 通过数据通道发送接受信号，使用原始的transferId
  const dataChannel = dataChannels.get(fileTransferRequest.value.fromUserId)
  if (dataChannel && dataChannel.readyState === 'open') {
    // 确保transferId存在，否则使用其他信息构建唯一标识
    const transferIdToSend = fileTransferRequest.value.transferId || 
                            `${fileTransferRequest.value.fileInfo.name}_${fileTransferRequest.value.fileInfo.size}`
    
    dataChannel.send(JSON.stringify({
      type: 'file-transfer-accepted',
      transferId: transferIdToSend,  // 使用有效的transferId
      fileInfo: fileTransferRequest.value.fileInfo
    }))
  } else {
    // 如果数据通道未打开，通过socket.io发送（备用方案）
    if (socketService.isConnected.value) {
      socketService.emit('file-transfer-response', {
        targetUserId: fileTransferRequest.value.fromUserId,
        accepted: true,
        fileInfo: fileTransferRequest.value.fileInfo
      })
    }
  }
  
  showFileTransferConfirm.value = false
  addLog('info', '已接受文件传输请求')
}

// 拒绝文件传输
const rejectFileTransfer = () => {
  if (!fileTransferRequest.value.fromUserId) return
  
  // 通过数据通道发送拒绝信号
  const dataChannel = dataChannels.get(fileTransferRequest.value.fromUserId)
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({
      type: 'file-transfer-rejected',
      transferId: generateTransferId(),
      fileInfo: fileTransferRequest.value.fileInfo
    }))
  } else {
    // 如果数据通道未打开，通过socket.io发送（备用方案）
    if (socketService.isConnected.value) {
      socketService.emit('file-transfer-response', {
        targetUserId: fileTransferRequest.value.fromUserId,
        accepted: false,
        fileInfo: fileTransferRequest.value.fileInfo
      })
    }
  }
  
  showFileTransferConfirm.value = false
  addLog('warning', '已拒绝文件传输请求')
}

// 开始文件传输
const startFileTransfer = async (peerId: string, fileInfo: any, file: File | null = null) => {
  addLog('info', `开始向 ${peerId.substring(0, 6)} 传输文件: ${fileInfo.name}`)
  
  // 检查数据通道是否就绪
  const dataChannel = dataChannels.get(peerId)
  if (!dataChannel || dataChannel.readyState !== 'open') {
    addLog('error', '数据通道未就绪，无法传输文件')
    return
  }
  
  // 使用传入的文件，如果为空则尝试从其他来源查找
  let fileToTransfer: File | null = file
  
  if (!fileToTransfer) {
    // 首先尝试使用组件中的selectedFile
    if (selectedFile.value) {
      fileToTransfer = selectedFile.value
    }
    
    // 如果上面没找到，再尝试从DOM中查找
    if (!fileToTransfer) {
      const domFileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (domFileInput && domFileInput.files && domFileInput.files.length > 0) {
        // 尝试从当前input中找到匹配的文件
        fileToTransfer = Array.from(domFileInput.files).find(f => 
          f.name === fileInfo.name && f.size === fileInfo.size && f.lastModified === fileInfo.lastModified
        ) || domFileInput.files[0] // 如果没找到精确匹配，使用第一个文件
      }
    }
  }
  
  if (!fileToTransfer) {
    addLog('error', '找不到要传输的文件')
    return
  }
  
  // 创建传输记录
  const transferId = generateTransferId()
  const transfer = {
    id: transferId,
    peerId: peerId,
    fileName: fileInfo.name,
    fileSize: fileInfo.size,
    progress: 0,
    status: 'waiting-accept',
    direction: 'send',
    file: fileToTransfer  // 保存文件引用
  }
  transfers.value.push(transfer)
  
  try {
    // 发送文件传输开始信号
    dataChannel.send(JSON.stringify({
      type: 'file-transfer-start',
      transferId: transferId,
      fileInfo: fileInfo
    }))
    
    addLog('info', `已发送文件传输开始信号，等待对方确认`)
    
  } catch (error) {
    addLog('error', `发送文件传输开始信号失败: ${error}`)
    
    // 更新传输状态
    const transfer = transfers.value.find(t => t.id === transferId)
    if (transfer) {
      transfer.status = 'failed'
    }
  }
}

// 处理接收到的文件传输
const handleReceivedFileTransfer = async (peerId: string, fileInfo: any) => {
  addLog('info', `准备接收来自 ${peerId.substring(0, 6)} 的文件: ${fileInfo.name}`)
  
  // 创建接收传输记录
  const transferId = generateTransferId()
  const transfer = {
    id: transferId,
    peerId: peerId,
    fileName: fileInfo.name,
    fileSize: fileInfo.size,
    progress: 0,
    status: 'receiving',
    direction: 'receive'
  }
  transfers.value.push(transfer)
}

// 生成传输ID
const generateTransferId = (): string => {
  return 'transfer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}



// 使用多通道并行传输文件块
const sendFileChunksParallel = async (peerId: string, file: File, transferId: string) => {
  const CHUNK_SIZE = 65536; // 64KB每块
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // 清理peerId，移除通道后缀
  let cleanPeerId = peerId;
  if (cleanPeerId.includes('-ch')) {
    cleanPeerId = cleanPeerId.split('-ch')[0];
  } else if (cleanPeerId.includes('-incoming')) {
    cleanPeerId = cleanPeerId.split('-incoming')[0];
  }
  
  addLog('info', `开始准备传输文件: ${file.name} (${file.size} bytes) 到 ${cleanPeerId}`);
  
  // 获取多通道
  let channels = multiDataChannels.get(cleanPeerId);
  
  // 如果多通道不存在或为空，尝试使用单通道作为备用
  if (!channels || channels.length === 0) {
    addLog('warning', `无法获取多通道，尝试使用单通道，peerId: ${cleanPeerId}`);
    // 尝试获取单通道作为备用
    const singleChannel = dataChannels.get(cleanPeerId);
    if (singleChannel) {
      channels = [singleChannel];
      addLog('info', '使用单通道进行传输');
    } else {
      // 尝试从所有可用通道中查找属于该peerId的通道
      const allChannels: RTCDataChannel[] = [];
      for (const [key, channelList] of multiDataChannels.entries()) {
        if (key === cleanPeerId || key.startsWith(`${cleanPeerId}-`)) {
          allChannels.push(...channelList);
        }
      }
      
      if (allChannels.length > 0) {
        channels = allChannels;
        addLog('info', `找到了 ${allChannels.length} 个可用通道`);
      } else {
        addLog('error', '没有可用的数据通道');
        return;
      }
    }
  }
  
  // 只使用已打开的通道
  const availableChannels = channels.filter(channel => channel.readyState === 'open');
  if (availableChannels.length === 0) {
    addLog('error', '没有可用的数据通道');
    return;
  }
  channels = availableChannels;
  
  addLog('info', `开始使用 ${channels.length} 个通道传输文件: ${file.name}`);
  
  try {
    const OPTIMIZED_CHUNK_SIZE = getOptimalChunkSize(cleanPeerId, file.size);
    const optimizedTotalChunks = Math.ceil(file.size / OPTIMIZED_CHUNK_SIZE);
    
    const MAX_PENDING_SEND = 40;
    let pendingSends = 0;
    let sentChunks = 0;
    
    const sendChunk = async (chunkIndex: number) => {
      const start = chunkIndex * OPTIMIZED_CHUNK_SIZE;
      const end = Math.min(start + OPTIMIZED_CHUNK_SIZE, file.size);
      const chunkSize = end - start;
      
      // 使用通道负载均衡器选择最佳通道
      const dataChannel = channelLoadBalancer.selectBestChannel(channels);
      const channelIndex = channels.indexOf(dataChannel);
      
      if (!dataChannel || dataChannel.readyState !== 'open') {
        return;
      }
      
      while (pendingSends >= MAX_PENDING_SEND) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      const BUFFER_THRESHOLD = Math.max(adaptiveAdjustBufferSize(cleanPeerId), 8 * 1024 * 1024);
      if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise(resolve => {
          const checkBuffer = () => {
            if (dataChannel.bufferedAmount <= BUFFER_THRESHOLD * 0.7) {
              resolve(true);
            } else {
              setTimeout(checkBuffer, 5);
            }
          };
          checkBuffer();
        });
      }
      
      pendingSends++;
      
      try {
        const chunkBuffer = await window.electronAPI.invoke('file:read-arraybuffer-range', {
          filePath: file.path,
          start: start,
          length: chunkSize
        });
        
        dataChannel.send(JSON.stringify({
          type: 'file-chunk-metadata',
          transferId: transferId,
          chunkIndex: chunkIndex + 1,
          totalChunks: optimizedTotalChunks,
          chunkSize: chunkSize,
          channelIndex: channelIndex,
          fileInfo: {
            name: file.name,
            size: file.size
          }
        }));
        
        dataChannel.send(chunkBuffer);
        
        // 更新通道状态
        channelLoadBalancer.updateChannelStatus(`${dataChannel.label || channelIndex}`, dataChannel.bufferedAmount, true);
        
        sentChunks++;
        
        if (sentChunks % 5 === 0 || sentChunks === optimizedTotalChunks) {
          const transfer = transfers.value.find(t => t.id === transferId);
          if (transfer) {
            transfer.progress = Math.round((sentChunks / optimizedTotalChunks) * 90);
            
            window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
              detail: { ...transfer }
            }));
          }
        }
        
        if (file.size > 100 * 1024 * 1024) {
          if (sentChunks % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        } else if (file.size > 50 * 1024 * 1024) {
          if (sentChunks % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      } catch (error) {
        addLog('error', `读取文件块失败: ${error}`);
        // 更新通道状态（失败）
        if (dataChannel) {
          channelLoadBalancer.updateChannelStatus(`${dataChannel.label || channelIndex}`, dataChannel.bufferedAmount, false);
        }
      } finally {
        pendingSends--;
      }
    };
    
    const chunkPromises: Promise<void>[] = [];
    const maxConcurrentReads = 20;
    
    for (let i = 0; i < optimizedTotalChunks; i += maxConcurrentReads) {
      const batchEnd = Math.min(i + maxConcurrentReads, optimizedTotalChunks);
      const batchPromises: Promise<void>[] = [];
      
      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(sendChunk(j));
      }
      
      await Promise.all(batchPromises);
    }
    
    while (pendingSends > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const primaryChannel = channels[0];
    await new Promise(resolve => {
      const maxWaitTime = 10000;
      const startTime = Date.now();
      
      const waitForSend = () => {
        if (primaryChannel.bufferedAmount === 0 || Date.now() - startTime > maxWaitTime) {
          resolve(true);
        } else {
          setTimeout(waitForSend, 10);
        }
      };
      waitForSend();
    });
    
    // 创建一个Promise来等待接收端的确认
    const completionPromise = new Promise((resolve, reject) => {
      transferCompletionPromises.set(transferId, { resolve, reject });
      
      // 设置超时，如果接收端长时间未确认，则超时
      setTimeout(() => {
        if (transferCompletionPromises.has(transferId)) {
          transferCompletionPromises.delete(transferId);
          // 超时情况下也标记为完成，避免无限等待
          const transfer = transfers.value.find(t => t.id === transferId);
          if (transfer) {
            transfer.status = 'completed';
            transfer.progress = 100; // 即使超时，也将进度设为100%
            
            // 触发传输完成事件，供FileTransferList组件使用
            window.dispatchEvent(new CustomEvent('p2p:transfer-complete', {
              detail: { ...transfer }
            }));
          }
          
          addLog('warning', `文件传输确认超时: ${file.name}`);
        }
      }, 30000); // 30秒超时
    });
    
    // 发送完成信号
    primaryChannel.send(JSON.stringify({
      type: 'file-transfer-complete',
      transferId: transferId,
      success: true
    }));
    
    // 等待接收端确认
    await completionPromise;
    
    addLog('success', `文件传输完成: ${file.name} (使用 ${channels.length} 个并行通道)`);
    
  } catch (error) {
    addLog('error', `文件传输失败: ${error}`)
    
    // 发送失败信号
    const primaryChannel = channels[0];
    primaryChannel.send(JSON.stringify({
      type: 'file-transfer-complete',
      transferId: transferId,
      success: false
    }));
    
    // 更新传输状态
    const transfer = transfers.value.find(t => t.id === transferId)
    if (transfer) {
      transfer.status = 'failed'
      
      // 触发传输错误事件，供FileTransferList组件使用
      window.dispatchEvent(new CustomEvent('p2p:transfer-error', {
        detail: { fileId: transferId, error: error }
      }))
    }
  }
}

// 修改原来的sendFileChunks函数以使用并行传输
const sendFileChunks = async (peerId: string, file: File, transferId: string) => {
  // 使用并行传输函数
  await sendFileChunksParallel(peerId, file, transferId);
}

// 保存接收的文件
const saveReceivedFile = async (transferId: string, fileData: ArrayBuffer, fileName: string) => {
  try {
    // 检查是否在Electron环境中
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
      // 使用Electron对话框选择保存位置
      const result = await window.electronAPI.saveFileDialog(fileName, Array.from(new Uint8Array(fileData)))
      
      if (result.success) {
        addLog('success', `文件已保存到: ${result.filePath}`)
        return true
      } else {
        addLog('error', `文件保存失败: ${result.error}`)
        return false
      }
    } else {
      // 回退到浏览器下载
      const blob = new Blob([fileData])
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      
      addLog('success', `文件已保存到下载文件夹: ${fileName}`)
      return true
    }
    
  } catch (error) {
    addLog('error', `保存文件时发生错误: ${error}`)
    return false
  }
}

// 辅助方法
const generateRoomId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待中',
    'transferring': '传输中',
    'receiving': '接收中',
    'completed': '已完成',
    'failed': '失败'
  }
  return statusMap[status] || status
}

// 复制文件哈希到剪贴板
const copyFileHash = async (hash: string) => {
  try {
    await navigator.clipboard.writeText(hash)
    addLog('success', `文件哈希已复制: ${hash.substring(0, 16)}...`)
  } catch (error) {
    addLog('error', `复制哈希失败: ${error}`)
  }
}

const addLog = (type: string, message: string) => {
  logs.value.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    type,
    message
  })
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}
</script>

<style>
.cross-network-p2p {
  background: var(--bg-primary) !important;
}

.cross-network-p2p .page-title {
  color: var(--text-primary) !important;
}

.cross-network-p2p h2,
.cross-network-p2p h3,
.cross-network-p2p h4 {
  color: var(--text-primary) !important;
}

.cross-network-p2p .section-title {
  color: var(--text-primary) !important;
}

.cross-network-p2p .section-header {
  border-color: var(--border-color) !important;
}

.cross-network-p2p .panel {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .panel-header {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .panel-title {
  color: var(--text-primary) !important;
}

.cross-network-p2p .form-input,
.cross-network-p2p input[type="text"] {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.cross-network-p2p .form-input:focus,
.cross-network-p2p input[type="text"]:focus {
  border-color: var(--accent-primary) !important;
}

.cross-network-p2p .room-info,
.cross-network-p2p .connection-status {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .connection-info {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .file-list-section {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .file-list {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .file-item {
  border-color: var(--border-color) !important;
  background: var(--bg-card) !important;
}

.cross-network-p2p .file-item:hover {
  background: var(--bg-card-hover) !important;
}

.cross-network-p2p .file-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .file-size {
  color: var(--text-secondary) !important;
  background: var(--bg-input) !important;
}

.cross-network-p2p .file-info {
  background: var(--bg-input) !important;
}

.cross-network-p2p .file-info .file-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .file-info .file-size {
  color: var(--text-secondary) !important;
  background: var(--bg-card) !important;
}

.cross-network-p2p .file-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .btn-copy-hash {
  background: var(--bg-button-primary) !important;
  color: var(--text-white) !important;
}

.cross-network-p2p .result-list {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .result-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .result-item:hover {
  background: var(--bg-card-hover) !important;
  border-color: var(--accent-primary) !important;
}

.cross-network-p2p .result-item.exact {
  background: var(--bg-card-hover) !important;
  border-color: var(--accent-secondary) !important;
}

.cross-network-p2p .log-container {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .log-entry {
  border-color: var(--border-color) !important;
}

.cross-network-p2p .log-timestamp {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .log-message {
  color: var(--text-primary) !important;
}

.cross-network-p2p .node-info {
  background: var(--bg-card-hover) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .node-id {
  color: var(--text-primary) !important;
}

.cross-network-p2p .connection-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .connection-item:hover {
  background: var(--bg-card-hover) !important;
}

.cross-network-p2p .peer-id {
  color: var(--text-primary) !important;
}

.cross-network-p2p .connection-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .btn {
  color: var(--text-white) !important;
}

.cross-network-p2p .btn-primary {
  background: var(--bg-button-primary) !important;
}

.cross-network-p2p .btn-secondary {
  background: var(--bg-button-secondary) !important;
}

.cross-network-p2p .btn-copy {
  background: var(--bg-button-primary) !important;
  color: var(--text-white) !important;
}

.cross-network-p2p .btn-disconnect {
  background: var(--bg-button-secondary) !important;
  color: var(--text-white) !important;
}

.cross-network-p2p .transfer-actions .btn {
  color: var(--text-white) !important;
}

.cross-network-p2p .btn-download {
  background: var(--accent-gradient) !important;
}

.cross-network-p2p .btn-upload {
  background: var(--bg-button-primary) !important;
}

.cross-network-p2p .node-list-section {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .node-list-title {
  color: var(--text-primary) !important;
}

.cross-network-p2p .node-card {
  background: var(--bg-card-hover) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .node-card:hover {
  border-color: var(--accent-primary) !important;
}

.cross-network-p2p .node-card.selected {
  border-color: var(--accent-primary) !important;
  background: var(--bg-input) !important;
}

.cross-network-p2p .node-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .node-status {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .node-stats {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .stat-value {
  color: var(--text-primary) !important;
}

.cross-network-p2p .stat-label {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .transfer-stats {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .stat-item .value {
  color: var(--text-primary) !important;
}

.cross-network-p2p .stat-item .label {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .transfer-list-section {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .transfer-list-header {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .transfer-list {
  background: var(--bg-input) !important;
}

.cross-network-p2p .transfer-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .transfer-item:hover {
  background: var(--bg-card-hover) !important;
}

.cross-network-p2p .transfer-file-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .transfer-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .transfer-progress-bar {
  background: var(--border-color) !important;
}

.cross-network-p2p .transfer-progress-fill {
  background: var(--accent-gradient) !important;
}

.cross-network-p2p .transfer-status {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .empty-state {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .empty-icon {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .empty-text {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .modal-overlay {
  background: rgba(0, 0, 0, 0.6) !important;
}

.cross-network-p2p .modal {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .modal-header {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .modal-body {
  color: var(--text-primary) !important;
}

.cross-network-p2p .form-group label {
  color: var(--text-primary) !important;
}

.cross-network-p2p .form-control {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.cross-network-p2p .form-control:focus {
  border-color: var(--accent-primary) !important;
}

.cross-network-p2p .form-text {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .modal-footer {
  border-color: var(--border-color) !important;
}

.cross-network-p2p .chunk-allocation-item {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .allocation-peer-id {
  color: var(--text-primary) !important;
}

.cross-network-p2p .allocation-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .allocation-status {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .chunk-allocation-visualization {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .visualization-header {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .chunk-grid {
  background: var(--bg-card) !important;
}

.cross-network-p2p .legend {
  border-color: var(--border-color) !important;
}

.cross-network-p2p .legend-title {
  color: var(--text-primary) !important;
}

.cross-network-p2p .legend-item span {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .visualization-stats {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .visualization-stats strong {
  color: var(--text-primary) !important;
}

.cross-network-p2p .search-hint,
.cross-network-p2p .hash-progress-container {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
  box-shadow: none !important;
}

.cross-network-p2p .search-hint {
  border-left: 4px solid var(--accent-primary) !important;
}

.cross-network-p2p .hash-filename,
.cross-network-p2p .hash-progress-info {
  color: var(--text-primary) !important;
}

.cross-network-p2p .hash-progress-bar-container {
  background: var(--border-color) !important;
}

.cross-network-p2p .hash-progress-bar {
  background: var(--accent-gradient) !important;
}

.cross-network-p2p .server-status-card {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .status-label {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .connection-status-badge.connected {
  background: rgba(16, 185, 129, 0.15) !important;
  color: var(--accent-secondary) !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

.cross-network-p2p .connection-status-badge.disconnected {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #ef4444 !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

.cross-network-p2p .result-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .result-item:hover {
  background: var(--bg-card-hover) !important;
  border-color: var(--accent-primary) !important;
}

.cross-network-p2p .result-item .file-name {
  color: var(--accent-primary) !important;
}

.cross-network-p2p .result-item .file-size {
  background: var(--bg-input) !important;
  color: var(--text-secondary) !important;
}

.cross-network-p2p .node-count {
  background: var(--bg-input) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .connection-list {
  background: var(--bg-input) !important;
}

.cross-network-p2p .peer-info .peer-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .peer-info .peer-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .transfer-list .transfer-header {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .transfer-item {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .transfer-item:hover {
  background: var(--bg-card-hover) !important;
}

.cross-network-p2p .transfer-item .file-name {
  color: var(--text-primary) !important;
}

.cross-network-p2p .transfer-item .transfer-meta {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .progress-container {
  background: var(--border-color) !important;
}

.cross-network-p2p .progress-fill {
  background: var(--accent-gradient) !important;
}

.cross-network-p2p .transfer-status {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .log-container {
  background: var(--bg-input) !important;
  border-color: var(--border-color) !important;
}

.cross-network-p2p .log-item {
  border-color: var(--border-color) !important;
}

.cross-network-p2p .log-item .log-time {
  color: var(--text-secondary) !important;
}

.cross-network-p2p .log-item .log-message {
  color: var(--text-primary) !important;
}

.cross-network-p2p .log-item.warning .log-message {
  color: #f59e0b !important;
}

.cross-network-p2p .log-item.error .log-message {
  color: #ef4444 !important;
}

.cross-network-p2p .log-item.success .log-message {
  color: var(--accent-secondary) !important;
}
</style>

<style scoped>
.cross-network-p2p {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100vh;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .cross-network-p2p {
    padding: 16px;
    gap: 16px;
  }
}

/* 状态指示器 */
.status-indicator {
  padding: 4px 12px;
  border-radius: 20px;
  margin-right: 12px;
  font-size: 0.85em;
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.status-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s ease;
}

.status-indicator.online {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #10b981;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.status-indicator.online::before {
  left: 100%;
}

.status-indicator:not(.online) {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  border-color: #6b7280;
}

/* 输入组 */
.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
}

/* 确保按钮不会被挤压 */
.btn {
  white-space: nowrap;
  flex-shrink: 0;
}

/* 确保面板内容正确显示 */
.cross-network-p2p {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 确保所有卡片宽度一致 */
.signaling-status-section,
.share-management,
.file-search,
.file-transfer {
  width: 100%;
  box-sizing: border-box;
}

/* 确保所有输入组和容器宽度一致 */
.input-group,
.file-list,
.result-list,
.connection-list,
.log-container {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .cross-network-p2p {
    padding: 16px;
    gap: 16px;
  }
  
  .input-group {
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .btn {
    padding: 10px 16px;
    font-size: 13px;
  }
}

.input-field {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.btn:hover:not(:disabled)::before {
  left: 100%;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
}

.btn-download {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 8px 16px;
  font-size: 13px;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
}

.btn-download:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
}

.btn-reconnect {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-reconnect:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}

.btn-cancel {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-cancel:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
  min-height: 36px;
}

/* 扫描进度容器 */
.scan-progress-container {
  margin-top: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border-radius: 16px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 进度头部 */
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.loading-icon {
  font-size: 24px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.progress-percentage {
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 进度条容器 */
.progress-bar-container {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 进度详情 */
.progress-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  font-family: 'Courier New', monospace;
}

/* 哈希进度容器 */
.hash-progress-container {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  border: 1px solid #fbbf24;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
}

.hash-progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.hash-icon {
  font-size: 20px;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.hash-filename {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hash-progress-bar-container {
  width: 100%;
  height: 8px;
  background: #fef3c7;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.hash-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.hash-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
  min-height: 36px;
}

/* 文件列表 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  gap: 12px;
}

.file-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #e5e7eb;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.btn-copy-hash {
  padding: 6px 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-copy-hash:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.file-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.file-size {
  color: #6b7280;
  font-size: 0.85em;
  margin-left: 12px;
  background: #f9fafb;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

/* 搜索结果 */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.result-item.exact {
  border: 2px solid #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.result-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #e5e7eb;
}

.result-item.exact:hover {
  border-color: #059669;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.exact-match-badge {
  display: inline-block;
  padding: 2px 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

/* 搜索提示 */
.search-hint {
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
  margin-bottom: 16px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
}

.result-item .file-name {
  font-weight: 600;
  color: #1e40af;
  font-size: 15px;
  line-height: 1.4;
}

.result-item .file-size {
  font-size: 0.9em;
  color: #4b5563;
  background: #f0f9ff;
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  width: fit-content;
}

.node-count {
  font-size: 0.8em;
  color: #374151;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 4px 10px;
  border-radius: 16px;
  font-weight: 500;
  border: 1px solid #dbeafe;
}

/* P2P连接列表 */
.connection-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.connection-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #e5e7eb;
}

.connection-status {
  font-size: 0.9em;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 16px;
  border: 1px solid;
  transition: all 0.3s ease;
}

.connection-status.connected {
  color: #10b981;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #a7f3d0;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}

.connection-status:not(.connected) {
  color: #6b7280;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-color: #e5e7eb;
}

/* 日志容器 */
.log-container {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.85em;
  color: #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid #374151;
  transition: all 0.2s ease;
}

.log-item:hover {
  background: rgba(255, 255, 255, 0.05);
  margin: 0 -8px;
  padding: 8px;
  border-radius: 4px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #9ca3af;
  margin-right: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.log-message {
  word-break: break-word;
  line-height: 1.5;
}

.log-item.info .log-message {
  color: #60a5fa;
}

.log-item.success .log-message {
  color: #34d399;
  font-weight: 500;
}

.log-item.warning .log-message {
  color: #fbbf24;
}

.log-item.error .log-message {
  color: #f87171;
  font-weight: 500;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 28px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  border: 1px solid #f1f5f9;
  animation: slideUp 0.4s ease;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.file-info {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 20px;
  border-radius: 12px;
  margin: 20px 0;
  border: 1px solid #e0f2fe;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
}

.status-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.status-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.status-item span:first-child {
  width: 120px;
  font-weight: 600;
  color: #374151;
  font-size: 0.95em;
}

.status-item span:last-child {
  flex: 1;
  font-weight: 500;
}

/* 页面主标题 */
.page-title {
  color: #1e293b;
  margin: 0 0 2rem 0;
  font-weight: 700;
  font-size: 1.6rem;
  text-align: center;
  letter-spacing: -0.025em;
  color: #1f2937;
}

/* 标题样式 */
h3 {
  color: #1e293b;
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  line-height: 1.5;
}

/* 信令服务器状态部分 */
.signaling-status-section {
  margin-bottom: 2rem;
}

/* 章节标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.section-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #374151;
}

/* 服务器状态卡片 */
.server-status-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 状态行 */
.status-row {
  margin-bottom: 1.5rem;
}

.status-row:last-child {
  margin-bottom: 0;
}

/* 状态信息 */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* 状态详情 */
.status-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* 连接状态徽章 */
.connection-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.connection-status-badge.connected {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.connection-status-badge.disconnected {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

/* 状态点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.connection-status-badge.connected .status-dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

/* 重连按钮 */
.reconnect-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f97316;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.reconnect-button:hover {
  background-color: #ea580c;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(249, 115, 22, 0.15);
}

.reconnect-button:focus {
  outline: 2px solid rgba(249, 115, 22, 0.5);
  outline-offset: 2px;
}

.reconnect-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 重连图标 */
.reconnect-icon {
  flex-shrink: 0;
}

/* 用户ID显示 */
.user-id-display {
  width: 100%;
}

.user-id-code {
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 0.75rem 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  color: #374151;
  overflow-x: auto;
  white-space: nowrap;
  box-sizing: border-box;
}

.user-id-code::-webkit-scrollbar {
  height: 4px;
}

.user-id-code::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

.user-id-code::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .server-status-card {
    padding: 1.25rem;
  }
  
  .status-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .connection-status-badge {
    width: 100%;
    justify-content: flex-start;
  }
  
  .reconnect-button {
    width: 100%;
    justify-content: center;
  }
  
  .page-title {
    font-size: 1.3rem;
  }
  
  .section-title {
    font-size: 1rem;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .server-status-card {
    background: #1f2937;
    border-color: #374151;
  }
  
  .section-title {
    color: #e5e7eb;
  }
  
  .status-label {
    color: #9ca3af;
  }
  
  .connection-status-badge.connected {
    background-color: #065f46;
    color: #d1fae5;
    border-color: #047857;
  }
  
  .connection-status-badge.disconnected {
    background-color: #b91c1c;
    color: #fee2e2;
    border-color: #991b1b;
  }
  
  .user-id-code {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .user-id-code::-webkit-scrollbar-track {
    background: #4b5563;
  }
  
  .user-id-code::-webkit-scrollbar-thumb {
    background: #6b7280;
  }
  
  .reconnect-button:hover {
    box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.input-field:disabled {
  background: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
  border-color: #d1d5db;
}

/* 滚动条样式 */
.file-list::-webkit-scrollbar,
.result-list::-webkit-scrollbar,
.connection-list::-webkit-scrollbar,
.log-container::-webkit-scrollbar {
  width: 8px;
}

.file-list::-webkit-scrollbar-track,
.result-list::-webkit-scrollbar-track,
.connection-list::-webkit-scrollbar-track,
.log-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.file-list::-webkit-scrollbar-thumb,
.result-list::-webkit-scrollbar-thumb,
.connection-list::-webkit-scrollbar-thumb,
.log-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.file-list::-webkit-scrollbar-thumb:hover,
.result-list::-webkit-scrollbar-thumb:hover,
.connection-list::-webkit-scrollbar-thumb:hover,
.log-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}

.log-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.log-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.file-input {
  display: none;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .input-group {
    flex-direction: column;
    gap: 8px;
  }
  
  .input-field {
    min-width: auto;
    width: 100%;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions .btn {
    width: 100%;
  }
  
  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .status-item span:first-child {
    width: auto;
  }
}

/* 加载状态动画 */
.loading {
  position: relative;
  overflow: hidden;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 无障碍访问优化 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .btn {
    border-width: 2px;
  }
  
  .input-field {
    border-width: 2px;
  }
}

</style>

.file-input-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.file-input-label:hover {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cross-network-p2p {
    padding: 16px;
    margin: 8px;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-field {
    min-width: auto;
  }
  
  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .result-info {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  
  .result-item .file-name {
    flex: 1;
  }
  
  .transfer-info {
    flex-direction: column;
    gap: 4px;
  }
  
  .transfer-progress {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .modal-content {
    margin: 16px;
    padding: 24px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions .btn {
    width: 100%;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.file-info p {
  margin: 10px 0;
  color: #495057;
  font-size: 14px;
}

.file-info strong {
  color: #2c3e50;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 24px;
}

.modal-actions .btn {
  padding: 12px 24px;
  min-width: 100px;
  font-size: 15px;
}

/* 为文件选择按钮提供替代样式 */
.file-input-button {
  padding: 10px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  text-align: center;
  font-size: 14px;
  color: #6c757d;
}

.file-input-button:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  color: #495057;
}


.file-input {
  display: none;
}

/* 为文件选择按钮提供替代样式 */
.file-input-button {
  padding: 10px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  text-align: center;
  font-size: 14px;
  color: #6c757d;
}

.file-input-button:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  color: #495057;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cross-network-p2p {
    padding: 16px;
    margin: 8px;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-field {
    min-width: auto;
  }
  
  .transfer-info {
    flex-direction: column;
    gap: 4px;
  }
  
  .transfer-progress {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .modal-content {
    margin: 16px;
    padding: 24px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions .btn {
    width: 100%;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}