<template>
  <div class="cross-network-p2p">
    <h2>跨网络P2P文件传输</h2>
    
    <!-- 信令服务器状态 -->
    <div class="signaling-status">
      <h3>信令服务器状态</h3>
      <div class="status-item">
        <span>服务器连接:</span>
        <span class="status-indicator" :class="{ online: isSignalingConnected }">
          {{ isSignalingConnected ? '已连接' : '未连接' }}
        </span>
        <button 
          v-if="!isSignalingConnected" 
          @click="reconnectSignalingServer"
          class="btn btn-reconnect"
        >
          重连
        </button>
      </div>
      <div class="status-item">
        <span>当前房间:</span>
        <span>{{ currentRoomId || '未加入' }}</span>
      </div>
      <div class="status-item">
        <span>用户ID:</span>
        <span>{{ userId || '未分配' }}</span>
      </div>
    </div>

    <!-- 房间管理 -->
    <div class="room-management">
      <h3>房间管理</h3>
      <div class="input-group">
        <input 
          v-model="roomIdInput" 
          placeholder="输入房间ID" 
          class="input-field"
          :disabled="!isSignalingConnected"
        />
        <button 
          @click="joinRoom" 
          class="btn btn-primary"
          :disabled="!roomIdInput || !isSignalingConnected"
        >
          加入房间
        </button>
        <button 
          @click="createRoom" 
          class="btn btn-secondary"
          :disabled="!isSignalingConnected"
        >
          创建新房间
        </button>
      </div>
    </div>

    <!-- 房间用户列表 -->
    <div class="room-users" v-if="currentRoomId">
      <h3>房间用户</h3>
      <div class="user-list">
        <div 
          v-for="user in roomUsers" 
          :key="user.id"
          class="user-item"
          :class="{ 
            connected: user.isConnected,
            'current-user': user.id === userId 
          }"
        >
          <span class="user-name">
            {{ user.name || user.id }} 
            <span v-if="user.id === userId" class="current-user-label">(我)</span>
          </span>
          <span class="user-status">{{ user.isConnected ? '已连接' : '未连接' }}</span>
          <button 
            v-if="!user.isConnected && user.id !== userId"
            @click="connectToUser(user.id)"
            class="btn btn-small"
          >
            连接
          </button>
          <span v-else-if="user.id === userId" class="current-user-status">当前用户</span>
          <span v-else-if="user.id !== userId && user.isConnected" class="connection-status">已连接</span>
        </div>
      </div>
    </div>

    <!-- 文件传输 -->
    <div class="file-transfer" v-if="roomUsers.some(u => u.isConnected)">
      <h3>文件传输</h3>
      <div class="input-group">
        <select 
          v-model="selectedPeerId" 
          class="input-field"
        >
          <option value="">选择接收用户</option>
          <option 
            v-for="user in roomUsers.filter(u => u.isConnected)" 
            :key="user.id"
            :value="user.id"
          >
            {{ user.name || user.id }}
          </option>
        </select>
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          class="file-input"
          :disabled="!selectedPeerId"
        />
        <button 
          @click="selectFile" 
          class="btn btn-secondary"
          :disabled="!selectedPeerId"
        >
          选择文件
        </button>
        <button 
          @click="sendFile" 
          class="btn btn-primary"
          :disabled="!selectedFile || !selectedPeerId"
        >
          发送文件
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
import { io, Socket } from 'socket.io-client'

// 定义属性
const props = defineProps<{ signalingServerUrl?: string }>()

// 使用传入的信令服务器URL
const signalingServerUrl = computed(() => {
  if (!props.signalingServerUrl) return '';
  return props.signalingServerUrl.replace('http://', 'ws://').replace('https://', 'wss://')
})

// 响应式数据
const isSignalingConnected = ref(false)
const currentRoomId = ref('')
const roomIdInput = ref('')
const userId = ref('')
const roomUsers = ref<any[]>([])
const p2pConnections = ref<any[]>([])
const selectedPeerId = ref('')
const selectedFile = ref<File | null>(null)
const transfers = ref<any[]>([])
const logs = ref<any[]>([])

// 计算属性 - 获取唯一的对等连接（排除通道后缀）
const uniqueP2PConnections = computed(() => {
  const seenPeers = new Set<string>();
  return p2pConnections.value.filter(conn => {
    // 提取基础对等方ID（去掉通道后缀）
    const basePeerId = conn.peerId.split('-')[0];
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

// Socket.io连接实例
let socket: Socket | null = null

// WebRTC相关变量
let peerConnections: Map<string, RTCPeerConnection> = new Map()
let dataChannels: Map<string, RTCDataChannel> = new Map()

// 多通道并行传输支持
const multiDataChannels: Map<string, RTCDataChannel[]> = new Map(); // 每个对等方的多通道数组
const CHANNEL_COUNT = 8; // 增加并行通道数量以提高传输速度

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
    const serverUrl = signalingUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    addLog('info', `正在连接到信令服务器`)
    
    socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10, // 增加重连尝试次数
      reconnectionDelay: 2000, // 增加重连延迟
      reconnectionDelayMax: 5000, // 设置最大重连延迟
      timeout: 20000, // 增加超时时间到20秒
      transports: ['websocket'], // 优先使用WebSocket
      // 添加更多连接选项
      randomizationFactor: 0.5, // 随机化重连时间
      pingTimeout: 10000, // ping超时
      pingInterval: 5000 // ping间隔
    })

    socket.on('connect', () => {
      isSignalingConnected.value = true
      userId.value = socket!.id || ''
      addLog('success', '已连接到信令服务器')
    })

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
      userId.value = socket!.id || ''
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

    // 房间相关事件
    socket.on('room-info', (data) => {
      currentRoomId.value = data.roomId
      // 过滤掉当前用户，不在列表中显示自己
      roomUsers.value = data.users
        .filter((uid: string) => uid !== userId.value) // 过滤掉当前用户
        .map((userId: string) => ({
          id: userId,
          name: `用户 ${userId.substring(0, 6)}`,
          isConnected: false
        }))
      addLog('success', `已加入房间: ${data.roomId}, 用户数: ${data.userCount}`)
    })

    socket.on('user-joined', (data) => {
      // 只有当加入的用户不是当前用户时才添加到列表
      if (data.userId !== userId.value) {
        roomUsers.value.push({
          id: data.userId,
          name: `用户 ${data.userId.substring(0, 6)}`,
          isConnected: false
        })
        addLog('info', `用户 ${data.userId.substring(0, 6)} 加入了房间`)
      }
    })

    socket.on('user-left', (data) => {
      roomUsers.value = roomUsers.value.filter(u => u.id !== data.userId)
      addLog('info', `用户 ${data.userId.substring(0, 6)} 离开了房间`)
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
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// 重新连接信令服务器
const reconnectSignalingServer = async () => {
  addLog('info', '正在尝试重新连接信令服务器...')
  // 断开现有连接
  if (socket) {
    try {
      socket.disconnect()
    } catch (error) {
      addLog('warning', `断开现有连接时出错: ${error}`)
    }
    socket = null
  }
  
  // 重置连接状态
  isSignalingConnected.value = false
  
  // 立即尝试重连
  connectToSignalingServer()
}

// 创建房间
const createRoom = () => {
  if (!socket) return
  
  const newRoomId = generateRoomId()
  roomIdInput.value = newRoomId
  joinRoom()
}

// 加入房间
const joinRoom = () => {
  if (!socket || !roomIdInput.value.trim()) return
  
  socket.emit('join-room', roomIdInput.value.trim())
}

// 连接到用户
const connectToUser = async (targetUserId: string) => {
  if (!socket) return;

  // 检查是否已存在连接
  let peerConnection = peerConnections.get(targetUserId);
  
  // 如果不存在连接，创建新的
  if (!peerConnection) {
    peerConnection = createPeerConnection(targetUserId);
  } else {
    addLog('info', `已存在与 ${targetUserId} 的P2P连接，使用现有连接`);
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-signal', {
      roomId: currentRoomId.value,
      targetUserId: targetUserId,
      signal: { type: 'offer', sdp: offer.sdp }
    });
  } catch (error) {
    addLog('error', `创建WebRTC Offer失败: ${error}`);
    // 可选：清理已创建的连接
    if (!peerConnections.has(targetUserId)) {
      peerConnections.delete(targetUserId);
      multiDataChannels.delete(targetUserId);
    }
  }

  addLog('info', `正在连接用户 ${targetUserId}...`);
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
    if (event.candidate && socket) {
      socket.emit('webrtc-signal', {
        roomId: currentRoomId.value,
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
  
  // 添加到连接列表
  p2pConnections.value.push({
    peerId,
    isConnected: false,
    connectionState: 'new'
  })

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
  // 初始化健康状态
  dataChannelHealth.set(peerId, {
    lastActivity: Date.now(),
    consecutiveErrors: 0,
    isHealthy: true,
    reconnectAttempts: 0
  });
  
  // 初始化网络性能数据
  initNetworkPerformance(peerId);

  dataChannel.onopen = () => {
    addLog('success', `与 ${peerId} 的数据通道已建立`)
    updateConnectionStatus(peerId, 'connected')
    // 将数据通道存储起来
    dataChannels.set(peerId, dataChannel)
    
    // 更新健康状态
    const health = dataChannelHealth.get(peerId);
    if (health) {
      health.isHealthy = true;
      health.consecutiveErrors = 0;
      health.reconnectAttempts = 0;
      health.lastActivity = Date.now();
    }
    
    // 启动定期调整缓冲区大小的任务
    startAdaptiveBufferSizeTask(peerId);
    
    // 检查是否有待处理的传输请求
     const pendingTransferIndex = pendingTransfers.findIndex(transfer => transfer.peerId === peerId)
     if (pendingTransferIndex !== -1) {
       const pendingTransfer = pendingTransfers[pendingTransferIndex]
       
       // 开始传输，直接传递文件引用
       startFileTransfer(pendingTransfer.peerId, pendingTransfer.fileInfo, pendingTransfer.file)
       
       // 从待处理队列中移除
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
    
    // 尝试重新建立连接
    attemptReconnect(peerId);
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
  
  addLog('info', `正在尝试重新连接到 ${cleanPeerId}`);
  
  // 检查是否仍在房间中
  if (currentRoomId.value) {
    // 重新发起连接请求
    socket.value?.emit('request-webrtc-offer', {
      roomId: currentRoomId.value,
      targetUserId: cleanPeerId
    });
  }
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

  if (socket) {
    socket.emit('webrtc-signal', {
      roomId: currentRoomId.value,
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
  const connection = p2pConnections.value.find(c => c.peerId === peerId)
  if (connection) {
    connection.connectionState = state
    connection.isConnected = state === 'connected'
  } else {
    p2pConnections.value.push({
      peerId,
      connectionState: state,
      isConnected: state === 'connected'
    })
  }
  
  // 同时更新房间用户列表中的连接状态
  const userIndex = roomUsers.value.findIndex(u => u.id === peerId)
  if (userIndex !== -1) {
    roomUsers.value[userIndex].isConnected = state === 'connected'
  }
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
      case 'file-transfer-start':
        handleFileTransferStart(data, peerId)
        break
      case 'file-chunk-metadata':
        // 保存元数据以便与接下来的二进制数据关联
        lastReceivedMetadata.set(peerId, data);
        handleFileChunkMetadata(data, peerId)
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

// 处理文件传输完成确认（发送方接收来自接收方的确认）
const handleFileTransferConfirmed = (data: any, peerId: string) => {
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
  } else {
    addLog('warning', `未找到对应的传输完成确认Promise: ${transferId}`);
  }
}

// 处理文件传输开始
const handleFileTransferStart = (data: any, peerId: string) => {
  const { transferId, fileInfo } = data
  addLog('info', `收到文件传输开始信号: ${fileInfo.name}`)
  
  // 初始化接收文件块存储
  initReceivedFileBlocks(transferId, fileInfo, data.totalChunks);
  
  // 保存传输ID以便在用户接受时使用
  fileTransferRequest.value = { 
    fromUserId: peerId, 
    fileInfo: fileInfo,
    transferId: transferId  // 保存原始transferId
  }
  showFileTransferConfirm.value = true
  
  addLog('info', `收到来自 ${peerId.substring(0, 6)} 的文件传输请求: ${fileInfo.name}`)
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
  binaryData: (ArrayBuffer | null)[], // 存储接收到的块数据，null表示未接收
  receivedChunkIndexes: Set<number>, // 新增：快速检查块是否已接收
  totalReceivedBytes: number,
  fileInfo: any, // 存储文件信息
  downloadFolderPath: string, // 下载文件夹路径
  expectedTotalChunks: number, // 预期总块数
  isInitialized: boolean // 是否已初始化
}>()

// 初始化接收文件块存储
const initReceivedFileBlocks = (transferId: string, fileInfo?: any, expectedTotalChunks?: number) => {
  if (!receivedFileBlocks.has(transferId)) {
    receivedFileBlocks.set(transferId, {
      metadata: [],
      binaryData: [], // 初始化为空数组
      receivedChunkIndexes: new Set<number>(), // 初始化已接收块索引集合
      totalReceivedBytes: 0,
      fileInfo: fileInfo || null,
      downloadFolderPath: '',
      expectedTotalChunks: expectedTotalChunks || 0,
      isInitialized: false
    });
  }
}

// 处理文件块元数据 - 实现批量流式传输
const handleFileChunkMetadata = async (data: any, peerId: string) => {
  const { transferId, chunkIndex, totalChunks, chunkSize, fileInfo } = data
  
  // 初始化传输记录（如果尚未存在）
  let transfer = transfers.value.find(t => t.id === transferId)
  if (!transfer) {
    // 如果没找到传输记录，尝试使用fallback方法查找
    transfer = transfers.value.find(t => 
      t.fileName === fileInfo?.name && 
      t.fileSize === fileInfo?.size &&
      t.direction === 'receive'
    );
    
    if (transfer) {
      transfer.id = transferId; // 更新ID以便后续追踪
    } else {
      // 如果仍然找不到，创建一个新的传输记录
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
  
  // 初始化此传输的接收块存储（如果尚未初始化）
  if (!receivedFileBlocks.has(transferId)) {
    initReceivedFileBlocks(transferId, fileInfo, totalChunks);
    
    // 初始化下载文件夹
    const storage = receivedFileBlocks.get(transferId)!;
    let downloadPath = await getDefaultDownloadPath();
    
    // 确保下载路径不为空
    if (!downloadPath || downloadPath.trim() === '') {
      try {
        // 如果无法获取默认下载路径，使用当前用户的下载文件夹
        const systemInfo = await window.electronAPI.invoke('system:info');
        downloadPath = systemInfo.userInfo.homeDir + '/Downloads/P2PFiles';
      } catch (error) {
        addLog('error', `获取系统信息失败，使用备用路径: ${error}`);
        // 最后的备选方案：使用当前用户的下载目录
        try {
          const systemInfo = await window.electronAPI.invoke('system:info');
          downloadPath = systemInfo.userInfo.homeDir + '/P2PFiles';
        } catch (e) {
          addLog('error', `备用路径也失败: ${e}`);
          // 如果所有方法都失败，抛出错误
          throw new Error('无法确定有效的下载路径');
        }
      }
    }
    
    const fileNameWithoutExt = fileInfo?.name?.replace(/\.[^/.]+$/, "") || 'unknown_file';
    const fileExtension = fileInfo?.name?.match(/\.[^/.]+$/)?.[0] || '';
    
    // 使用标准的路径分隔符并规范化路径
    const normalizedDownloadPath = downloadPath.replace(/[\\\/]/g, '/');
    // 使用正斜杠进行路径拼接，然后在发送到主进程时再根据系统调整
    storage.downloadFolderPath = `${normalizedDownloadPath}/${fileNameWithoutExt}_download${fileExtension}`;
    
    // 创建下载文件夹
    try {
      await window.electronAPI.invoke('file:create-directory', {
        dirPath: storage.downloadFolderPath
      });
    } catch (error) {
      addLog('error', `创建下载目录失败: ${error}`);
      // 如果创建目录失败，尝试使用一个更简单的路径
      const fallbackPath = downloadPath.replace(/[\\\/]$/, '') + '/P2PFiles';
      storage.downloadFolderPath = fallbackPath;
      await window.electronAPI.invoke('file:create-directory', {
        dirPath: storage.downloadFolderPath
      });
    }
    
    storage.fileInfo = fileInfo;
    storage.expectedTotalChunks = totalChunks;
    storage.isInitialized = true;
  }
  
  const storage = receivedFileBlocks.get(transferId)!;
  
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

// 处理二进制数据块
const handleFileChunkBinary = async (binaryData: ArrayBuffer, metadata: any, peerId: string) => {
  const { transferId, chunkIndex, totalChunks, fileInfo } = metadata;
  
  const storage = receivedFileBlocks.get(transferId);
  if (!storage) {
    addLog('error', `找不到传输块存储: ${transferId}`);
    return;
  }
  
  // 检查是否已接收过这个块，避免重复处理
  if (storage.receivedChunkIndexes.has(chunkIndex)) {
    addLog('debug', `块 ${chunkIndex} 已接收，跳过处理`);
    return;
  }
  
  // 如果还没有初始化文件路径，先获取并设置
  if (!storage.isInitialized) {
    // storage.downloadFolderPath 应该已经被 handleFileChunkMetadata 初始化了
    // 如果没有，我们需要初始化它
    if (!storage.downloadFolderPath) {
      const downloadPath = await getDefaultDownloadPath();
      // 如果下载路径为空，使用默认路径
      const actualDownloadPath = downloadPath || (await window.electronAPI.invoke('system:info')).userInfo.homeDir + '/Downloads/P2PFiles';
      const fileNameWithoutExt = fileInfo?.name?.replace(/\.[^/.]+$/, "") || 'unknown_file';
      storage.downloadFolderPath = `${actualDownloadPath}/${fileNameWithoutExt}_download`;
      
      // 确保下载文件夹存在
      await window.electronAPI.invoke('file:create-directory', {
        dirPath: storage.downloadFolderPath
      });
    }
    storage.fileInfo = fileInfo;
    storage.expectedTotalChunks = totalChunks;
    storage.isInitialized = true;
  }
  
  try {
    // 将接收到的块保存为单独的切片文件
    const sliceFileName = `slice_${String(chunkIndex).padStart(5, '0')}.bin`;
    const sliceFilePath = `${storage.downloadFolderPath}/${sliceFileName}`;
    
    // 保存切片到本地
    await window.electronAPI.invoke('file:save-arraybuffer-as-file', {
      filePath: sliceFilePath,
      arrayBufferData: binaryData
    });
    
    // 标记该块已接收
    storage.receivedChunkIndexes.add(chunkIndex);
    
    // 更新接收性能指标
    updateReceiveRate(peerId, storage.totalReceivedBytes + binaryData.byteLength);
    storage.totalReceivedBytes += binaryData.byteLength;
    
    // 更新进度
    const progress = Math.round((storage.receivedChunkIndexes.size / totalChunks) * 100);
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.receivedChunks = storage.receivedChunkIndexes.size;
      transfer.progress = progress;
      
      // 触发传输进度更新事件，供FileTransferList组件使用
      window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
        detail: { ...transfer }
      }));
    }
    
    // 检查是否所有块都已接收 - 现在使用Set的大小来判断，性能更好
    if (storage.receivedChunkIndexes.size === totalChunks) {
      // 所有块都已接收，现在组装完整文件
      await finalizeReceivedFile(transferId, fileInfo, totalChunks, peerId);
    }
  } catch (error) {
    addLog('error', `处理文件块失败: ${error}`);
  }
}

// 完成接收文件
const finalizeReceivedFile = async (transferId: string, fileInfo: any, totalChunks: number, peerId: string) => {
  const storage = receivedFileBlocks.get(transferId);
  if (!storage) {
    addLog('error', `找不到传输块存储: ${transferId}`);
    return;
  }
  
  try {
    // 从切片文件组装完整文件
    const fileNameWithoutExt = storage.fileInfo?.name?.replace(/\.[^/.]+$/, "") || 'unknown_file';
    const fileExtension = storage.fileInfo?.name?.match(/\.[^/.]+$/)?.[0] || '';
    // 将最终文件保存在同一目录下，而不是上级目录
    const finalFilePath = `${storage.downloadFolderPath}/${storage.fileInfo.name}`;
    
    // 按顺序读取所有切片并组合成完整文件
    const allSliceData: ArrayBuffer[] = [];
    
    for (let i = 1; i <= storage.expectedTotalChunks; i++) {
      const sliceFileName = `slice_${String(i).padStart(5, '0')}.bin`;
      const sliceFilePath = `${storage.downloadFolderPath}/${sliceFileName}`;
      
      // 读取切片文件
      const sliceData: ArrayBuffer = await window.electronAPI.invoke('file:read-arraybuffer', {
        filePath: sliceFilePath
      });
      
      allSliceData.push(sliceData);
    }
    
    // 组合所有切片数据
    const totalSize = allSliceData.reduce((acc, slice) => acc + slice.byteLength, 0);
    const combinedData = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const sliceData of allSliceData) {
      combinedData.set(new Uint8Array(sliceData), offset);
      offset += sliceData.byteLength;
    }
    
    // 写入最终的完整文件
    await window.electronAPI.invoke('file:save-arraybuffer-as-file', {
      filePath: finalFilePath,
      arrayBufferData: combinedData.buffer
    });
    
    // 清理切片文件（可选，根据需要保留或删除）
    // 这里可以选择删除切片文件以节省空间
    for (let i = 1; i <= storage.expectedTotalChunks; i++) {
      const sliceFileName = `slice_${String(i).padStart(5, '0')}.bin`;
      const sliceFilePath = `${storage.downloadFolderPath}/${sliceFileName}`;
      
      try {
        await window.electronAPI.invoke('file:delete-file', {
          filePath: sliceFilePath
        });
      } catch (err) {
        addLog('warning', `删除切片文件失败: ${sliceFilePath}`);
      }
    }
    
    // 清理存储
    receivedFileBlocks.delete(transferId);
    
    // 更新传输状态
    const transfer = transfers.value.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.progress = 100;
      transfer.filePath = finalFilePath; // 使用最终文件路径
      
      // 触发传输完成事件，供FileTransferList组件使用
      window.dispatchEvent(new CustomEvent('p2p:transfer-complete', {
        detail: { ...transfer }
      }));
    }
    
    addLog('success', `文件已自动保存: ${finalFilePath}`);
    
    // 向发送端发送传输完成确认
    const primaryChannel = dataChannels.get(peerId);
    if (primaryChannel && primaryChannel.readyState === 'open') {
      primaryChannel.send(JSON.stringify({
        type: 'file-transfer-confirmed',
        transferId: transferId,
        success: true
      }));
      addLog('info', `已向发送端确认传输完成: ${transferId}`);
    } else {
      // 如果主通道不可用，尝试从multiDataChannels中获取通道
      const channels = multiDataChannels.get(peerId);
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
    
  } catch (error) {
    addLog('error', `保存文件失败: ${error}`);
    
    // 向发送端发送失败确认
    const primaryChannel = dataChannels.get(peerId);
    if (primaryChannel && primaryChannel.readyState === 'open') {
      primaryChannel.send(JSON.stringify({
        type: 'file-transfer-confirmed',
        transferId: transferId,
        success: false
      }));
      addLog('info', `已向发送端确认传输失败: ${transferId}`);
    } else {
      // 如果主通道不可用，尝试从multiDataChannels中获取通道
      const channels = multiDataChannels.get(peerId);
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

const sendFile = async () => {
  console.log('sendFile函数被调用')
  console.log('selectedPeerId:', selectedPeerId.value)
  console.log('selectedFile:', selectedFile.value)
  console.log('socket状态:', socket ? '已连接' : '未连接')
  
  if (!selectedPeerId.value || !selectedFile.value) {
    console.log('文件传输条件不满足: 未选择接收用户或文件')
    addLog('error', '请先选择接收用户和要传输的文件')
    return
  }
  
  if (!socket) {
    console.log('Socket未连接，无法发送文件传输请求')
    addLog('error', '未连接到信令服务器，无法发送文件')
    return
  }

  // 发送文件传输请求
  const fileInfo = {
    name: selectedFile.value.name,
    size: selectedFile.value.size,
    type: selectedFile.value.type,
    lastModified: selectedFile.value.lastModified
  }

  console.log('准备发送文件传输请求:', {
    targetUserId: selectedPeerId.value,
    fileInfo: fileInfo
  })

  // 首先通过socket.io发送文件传输请求以通知接收方
  socket.emit('file-transfer-request', {
    targetUserId: selectedPeerId.value,
    fileInfo: fileInfo
  })

  console.log('文件传输请求已发送')
  addLog('info', `已向 ${selectedPeerId.value.substring(0, 6)} 发送文件传输请求: ${selectedFile.value.name}`)
  
  // 检查数据通道是否就绪，如果就绪则准备P2P传输
  const dataChannel = dataChannels.get(selectedPeerId.value)
  if (dataChannel && dataChannel.readyState === 'open') {
    // 数据通道已就绪，可以准备P2P传输
    startFileTransfer(selectedPeerId.value, fileInfo, selectedFile.value)
  } else {
    // 数据通道未就绪，延迟准备传输直到连接建立
    addLog('warning', '数据通道未就绪，将在连接建立后开始传输')
    // 将传输任务暂存，等待连接建立后执行
    // 为此，我们需要一个队列来保存待传输的文件
    pendingTransfers.push({
      peerId: selectedPeerId.value,
      fileInfo: fileInfo,
      file: selectedFile.value
    })
  }
  
  // 清空选择
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  selectedFile.value = null
}

// 文件传输事件监听器
  const setupFileTransferEventListeners = () => {
    if (socket) {
      socket.on('file-transfer-request', handleFileTransferRequest)
      socket.on('file-transfer-response', handleFileTransferResponse)
    }
  }
  
  const removeFileTransferEventListeners = () => {
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

// 接受文件传输
const acceptFileTransfer = () => {
  if (!fileTransferRequest.value.fromUserId) return
  
  // 使用原始的transferId
  const transferId = fileTransferRequest.value.transferId || generateTransferId()
  
  // 初始化接收文件块存储
  initReceivedFileBlocks(transferId);
  
  // 创建接收传输记录
  const transfer = {
    id: transferId,
    peerId: fileTransferRequest.value.fromUserId,
    fileName: fileTransferRequest.value.fileInfo.name,
    fileSize: fileTransferRequest.value.fileInfo.size,
    progress: 0,
    status: 'receiving',
    direction: 'receive',
    receivedChunks: 0,
    totalChunks: Math.ceil(fileTransferRequest.value.fileInfo.size / 16384) // 16KB每块
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
    if (socket) {
      socket.emit('file-transfer-response', {
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
    if (socket) {
      socket.emit('file-transfer-response', {
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
    // 增加块大小以提高传输效率
    const OPTIMIZED_CHUNK_SIZE = file.size > 100 * 1024 * 1024 ? 256 * 1024 : 65536; // 对大文件使用256KB块，小文件使用64KB块
    const optimizedTotalChunks = Math.ceil(file.size / OPTIMIZED_CHUNK_SIZE);
    
    // 首先将整个文件读取到内存中，但分块处理以避免内存峰值
    const fileBuffer = await file.arrayBuffer();
    
    // 优化：使用异步队列和更高效的流量控制
    const MAX_PENDING_SEND = 40; // 增加最大待发送块数以提高并发性
    let pendingSends = 0;
    
    // 使用更大的批次处理，提高效率
    const batchSize = 20; // 每次处理20个块
    
    for (let batchStart = 0; batchStart < optimizedTotalChunks; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, optimizedTotalChunks);
      
      for (let chunkIndex = batchStart; chunkIndex < batchEnd; chunkIndex++) {
        // 检查是否有可用通道
        if (channels.length === 0) {
          addLog('error', `没有可用的通道，终止传输`);
          const transfer = transfers.value.find(t => t.id === transferId)
          if (transfer) {
            transfer.status = 'failed';
          }
          return;
        }
        
        // 控制并发发送的数量
        while (pendingSends >= MAX_PENDING_SEND) {
          // 稍微等待，让一些发送操作完成
          await new Promise(resolve => setTimeout(resolve, 5)); // 减少等待时间
        }
        
        // 从预先加载的buffer中切片
        const start = chunkIndex * OPTIMIZED_CHUNK_SIZE;
        const end = Math.min(start + OPTIMIZED_CHUNK_SIZE, file.size);
        const chunk = fileBuffer.slice(start, end); // 直接从ArrayBuffer切片
        
        // 选择一个通道进行发送（轮询）
        const channelIndex = chunkIndex % channels.length;
        const dataChannel = channels[channelIndex];
        
        // 检查通道状态
        if (!dataChannel || dataChannel.readyState !== 'open') {
          addLog('warning', `通道 ${channelIndex} 未就绪，尝试下一个通道`);
          continue;
        }
        
        // 增加pending计数
        pendingSends++;
        
        // 获取自适应缓冲区大小
        const BUFFER_THRESHOLD = Math.max(adaptiveAdjustBufferSize(cleanPeerId), 8 * 1024 * 1024); // 设置最小缓冲区大小为8MB以提高吞吐量
        if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
          // 等待缓冲区清空一些后再继续
          await new Promise(resolve => {
            const checkBuffer = () => {
              if (dataChannel.bufferedAmount <= BUFFER_THRESHOLD * 0.7) { // 当缓冲区降至阈值的70%时继续
                resolve(true);
              } else {
                setTimeout(checkBuffer, 5); // 每5ms检查一次，更快响应
              }
            };
            checkBuffer();
          });
        }
        
        // 更新传输速率监控（每次发送数据后）
        const perf = networkPerformance.get(cleanPeerId);
        if (perf) {
          updateTransferRate(cleanPeerId, dataChannel.bufferedAmount + chunk.byteLength);
        }
        
        // 直接发送ArrayBuffer，不进行Base64编码
        // 首先发送包含元数据的消息
        dataChannel.send(JSON.stringify({
          type: 'file-chunk-metadata',
          transferId: transferId,
          chunkIndex: chunkIndex + 1,
          totalChunks: optimizedTotalChunks,
          chunkSize: chunk.byteLength, // 传递实际字节长度
          channelIndex: channelIndex, // 通道索引
          fileInfo: {  // 添加文件信息用于接收方匹配
            name: file.name,
            size: file.size
          }
        }));
        
        // 然后发送实际的二进制数据
        dataChannel.send(chunk);
        
        // 减少pending计数（在发送后）
        pendingSends--;
        
        // 更新进度 - 只在主线程更新以避免性能问题
        if (chunkIndex % 5 === 0 || chunkIndex === optimizedTotalChunks - 1) { // 更频繁地更新进度
          const transfer = transfers.value.find(t => t.id === transferId)
          if (transfer) {
            // 在发送阶段，只显示发送进度，而不是最终完成状态
            // 标记为正在传输中，而不是完成
            transfer.progress = Math.round(((chunkIndex + 1) / optimizedTotalChunks) * 90) // 限制在90%，保留10%给接收确认
            
            // 触发传输进度更新事件，供FileTransferList组件使用
            window.dispatchEvent(new CustomEvent('p2p:transfer-progress', {
              detail: { ...transfer }
            }))
          }
        }
        
        // 对于非常大的文件，减少延迟以提高速度
        if (file.size > 100 * 1024 * 1024) { // 100MB以上文件
          if (chunkIndex % 100 === 0) { // 减少延迟频率
            await new Promise(resolve => setTimeout(resolve, 1)); // 减少延迟时间
          }
        } else if (file.size > 50 * 1024 * 1024) { // 50MB以上文件
          if (chunkIndex % 50 === 0) { // 减少延迟频率
            await new Promise(resolve => setTimeout(resolve, 1)); // 减少延迟时间
          }
        }
      }
      
      // 在批次之间最小化停顿
      if (batchEnd < optimizedTotalChunks) {
        await new Promise(resolve => setTimeout(resolve, 0)); // 最小延迟
      }
    }
    
    // 等待所有发送操作完成
    while (pendingSends > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // 确保所有数据都已发送 - 使用主通道发送完成信号
    const primaryChannel = channels[0];
    await new Promise(resolve => {
      const maxWaitTime = 10000; // 最大等待10秒
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

<style scoped>
.cross-network-p2p {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 组件布局 */
.component-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1fr;
  gap: 0;
  height: 100%;
  padding: 0;
}

.grid-item {
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 信令服务器状态 - 顶部左侧 */
.signaling-status {
  grid-column: 1;
  grid-row: 1;
  padding: 1rem;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

/* 房间管理 - 顶部右侧 */
.room-management {
  grid-column: 2;
  grid-row: 1;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

/* 房间用户列表 - 中间左侧 */
.room-users {
  grid-column: 1;
  grid-row: 2;
  padding: 1rem;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

/* P2P连接 - 中间右侧 */
.p2p-connections {
  grid-column: 2;
  grid-row: 2;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

/* 文件传输 - 底部左侧 */
.file-transfer {
  grid-column: 1;
  grid-row: 3;
  padding: 1rem;
  border-right: 1px solid #e2e8f0;
}

/* 操作日志 - 底部右侧 */
.logs {
  grid-column: 2;
  grid-row: 3;
  padding: 1rem;
}

/* 标题样式 */
h3 {
  color: #1e293b;
  margin: 0 0 1rem 0;
  font-weight: 600;
  font-size: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

/* 输入组样式 */
.input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.input-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  min-width: 150px;
  background: #ffffff;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-field:disabled {
  background-color: #f8fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #475569;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  min-width: 60px;
}

.btn-reconnect {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;
  font-size: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  min-width: 60px;
}

.btn-reconnect:hover {
  background: #d97706;
}

/* 状态项样式 */
.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.status-indicator {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.status-indicator.online {
  background: #10b981;
  color: white;
}

/* 列表样式 */
.user-list, .connection-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.5rem;
  background: #ffffff;
}

.user-item, .connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.user-item:last-child, .connection-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.user-item:hover, .connection-item:hover {
  background-color: #f8fafc;
}

.user-item.connected, .connection-item.connected {
  background: #d1fae5;
  border-left: 3px solid #10b981;
}

.user-item.current-user {
  background: #dbeafe;
  border-left: 3px solid #3b82f6;
}

.current-user-label {
  color: #3b82f6;
  font-weight: 600;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 8px;
}

/* 日志样式 */
.log-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 0.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  background: #0f172a;
  color: #e2e8f0;
}

.log-item {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-left: 2px solid transparent;
  padding-left: 0.5rem;
  font-size: 0.75rem;
}

.log-item.success {
  border-left-color: #10b981;
  color: #a7f3d0;
}

.log-item.error {
  border-left-color: #ef4444;
  color: #fca5a5;
}

.log-item.info {
  border-left-color: #3b82f6;
  color: #93c5fd;
}

.log-item.warning {
  border-left-color: #f59e0b;
  color: #fde68a;
}

.log-time {
  color: #94a3b8;
  margin-right: 0.5rem;
}

/* 滚动条样式 */
.user-list::-webkit-scrollbar,
.connection-list::-webkit-scrollbar,
.log-container::-webkit-scrollbar {
  width: 4px;
}

.user-list::-webkit-scrollbar-track,
.connection-list::-webkit-scrollbar-track,
.log-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.user-list::-webkit-scrollbar-thumb,
.connection-list::-webkit-scrollbar-thumb,
.log-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.user-list::-webkit-scrollbar-thumb:hover,
.connection-list::-webkit-scrollbar-thumb:hover,
.log-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.file-input {
  display: none;
}

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

.transfer-list {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  margin-bottom: 28px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.transfer-item {
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  border-radius: 12px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.transfer-item:hover {
  transform: translateX(6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.transfer-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.transfer-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.file-name {
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  min-width: 180px;
  font-size: 16px;
}

.file-size {
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
}

.peer-id {
  color: #64748b;
  font-size: 14px;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
}

.transfer-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.progress-bar {
  flex: 1;
  height: 16px;
  background-color: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  transition: width 0.3s ease;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.progress-text {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  min-width: 60px;
}

.transfer-status {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 15px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  font-weight: 600;
}

.logs {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.log-container {
  max-height: 280px;
  overflow-y: auto;
  border: 2px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.3);
}

.log-item {
  margin-bottom: 8px;
  padding: 8px 0;
  border-left: 4px solid transparent;
  padding-left: 12px;
  transition: all 0.2s ease;
}

.log-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.log-item.success {
  border-left-color: #10b981;
  color: #a7f3d0;
}

.log-item.error {
  border-left-color: #ef4444;
  color: #fca5a5;
}

.log-item.info {
  border-left-color: #3b82f6;
  color: #93c5fd;
}

.log-item.warning {
  border-left-color: #f59e0b;
  color: #fde68a;
}

.log-time {
  color: #94a3b8;
  margin-right: 12px;
  font-weight: 600;
}

.log-message {
  color: #e2e8f0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 36px;
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  max-width: 520px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-content h3 {
  margin-top: 0;
  color: #1e293b;
  text-align: center;
  font-size: 26px;
  margin-bottom: 28px;
  border-bottom: none;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cross-network-p2p {
    padding: 20px;
    margin: 16px;
    border-radius: 12px;
  }
  
  h2 {
    font-size: 24px;
    margin-bottom: 24px;
  }
  
  h3 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .input-group {
    flex-direction: column;
    gap: 12px;
  }
  
  .input-field {
    min-width: 100%;
  }
  
  .btn {
    min-width: 100%;
    margin-bottom: 8px;
  }
  
  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .user-item, .connection-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .transfer-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .transfer-progress {
    flex-direction: column;
    gap: 12px;
  }
  
  .progress-bar {
    min-width: 100%;
  }
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading {
  animation: pulse 2s infinite;
}

/* 滚动条样式 */
.user-list::-webkit-scrollbar,
.connection-list::-webkit-scrollbar,
.log-container::-webkit-scrollbar {
  width: 8px;
}

.user-list::-webkit-scrollbar-track,
.connection-list::-webkit-scrollbar-track,
.log-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.user-list::-webkit-scrollbar-thumb,
.connection-list::-webkit-scrollbar-thumb,
.log-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 4px;
}

.user-list::-webkit-scrollbar-thumb:hover,
.connection-list::-webkit-scrollbar-thumb:hover,
.log-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
}

.file-info {
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border-left: 4px solid #667eea;
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
</style>