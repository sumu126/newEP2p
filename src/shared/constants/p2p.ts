export const P2P_CONSTANTS = {
  // 连接相关
  MAX_CONNECTION_TIMEOUT: 30000, // 30秒连接超时
  RECONNECT_ATTEMPTS: 3,
  HEARTBEAT_INTERVAL: 10000, // 10秒心跳
  
  // 文件传输相关
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
  CHUNK_SIZE: 64 * 1024, // 64KB
  MAX_CONCURRENT_TRANSFERS: 3,
  
  // 信令相关
  SIGNALING_TYPES: {
    OFFER: 'offer',
    ANSWER: 'answer', 
    ICE_CANDIDATE: 'ice-candidate',
    CONNECTION_REQUEST: 'connection-request',
    FILE_TRANSFER: 'file-transfer',
    HEARTBEAT: 'heartbeat'
  },
  
  // 传输状态
  TRANSFER_STATUS: {
    PENDING: 'pending',
    TRANSFERRING: 'transferring',
    COMPLETED: 'completed',
    ERROR: 'error',
    CANCELLED: 'cancelled'
  }
} as const;

export const P2P_CHANNELS = {
  // IPC通信通道
  P2P_CONNECT: 'p2p:connect',
  P2P_DISCONNECT: 'p2p:disconnect',
  P2P_GET_PEERS: 'p2p:get-peers',
  P2P_SEND_FILE: 'p2p:send-file',
  P2P_CANCEL_TRANSFER: 'p2p:cancel-transfer',
  P2P_GET_TRANSFERS: 'p2p:get-transfers',
  P2P_GENERATE_CODE: 'p2p:generate-code',
  P2P_SCAN_CODE: 'p2p:scan-code',
  
  // 事件通道
  P2P_PEER_CONNECTED: 'p2p:peer-connected',
  P2P_PEER_DISCONNECTED: 'p2p:peer-disconnected',
  P2P_TRANSFER_PROGRESS: 'p2p:transfer-progress',
  P2P_TRANSFER_COMPLETE: 'p2p:transfer-complete',
  P2P_TRANSFER_ERROR: 'p2p:transfer-error'
} as const;