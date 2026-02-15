// 应用常量
export const APP_CONSTANTS = {
  NAME: 'Electron-Vue3 Framework',
  VERSION: '1.0.0',
  COMPANY: 'Electron-Vue3 Team',
};

// P2P相关常量
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

// IPC通道常量
export const IPC_CHANNELS = {
  // 通用通道
  PING: 'ping',
  
  // 应用信息通道
  APP_GET_INFO: 'app:get-info',
  
  // 文件操作通道
        FILE_READ: 'file:read',
        FILE_WRITE: 'file:write',
        FILE_SELECT: 'file:select',
        FILE_SELECT_DIRECTORY: 'file:select-directory',
        FILE_SAVE_ARRAYBUFFER_AS_FILE: 'file:save-arraybuffer-as-file',
        FILE_APPEND_ARRAYBUFFER_TO_FILE: 'file:append-arraybuffer-to-file',
        FILE_CREATE_HANDLE: 'file:create-handle',
        FILE_WRITE_AT_POSITION: 'file:write-at-position',
        FILE_CLOSE_HANDLE: 'file:close-handle',
        FILE_CREATE_DIRECTORY: 'file:create-directory',
        FILE_READ_ARRAYBUFFER: 'file:read-arraybuffer',
        FILE_DELETE_FILE: 'file:delete-file',
  
  // 系统信息通道
  SYSTEM_INFO: 'system:info',
  
  // 窗口操作通道
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  
  // 配置管理通道
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_UPDATE: 'config:update',
  
  // 模块管理通道
  MODULE_LOAD: 'module:load',
  MODULE_UNLOAD: 'module:unload',
  MODULE_LIST: 'module:list',
  
  // P2P通信通道
  P2P_INITIALIZE: 'p2p:initialize',
  P2P_GET_USER_ID: 'p2p:get-user-id',
  P2P_CREATE_ROOM: 'p2p:create-room',
  P2P_JOIN_ROOM: 'p2p:join-room',
  P2P_CONNECT_TO_USER: 'p2p:connect-to-user',
  P2P_DISCONNECT_PEER: 'p2p:disconnect-peer',
  P2P_GET_PEERS: 'p2p:get-peers',
  P2P_SEND_FILE: 'p2p:send-file',
  P2P_CANCEL_TRANSFER: 'p2p:cancel-transfer',
  P2P_GET_TRANSFERS: 'p2p:get-transfers',
  
  // P2P事件通道
  P2P_PEER_CONNECTED: 'p2p:peer-connected',
  P2P_PEER_DISCONNECTED: 'p2p:peer-disconnected',
  P2P_TRANSFER_PROGRESS: 'p2p:transfer-progress',
  P2P_TRANSFER_COMPLETE: 'p2p:transfer-complete',
  P2P_TRANSFER_ERROR: 'p2p:transfer-error',
};

// 系统常量
export const SYSTEM_CONSTANTS = {
  SUPPORTED_PLATFORMS: ['win32', 'darwin', 'linux'] as const,
  DEFAULT_LANGUAGE: 'zh-CN',
  THEMES: ['light', 'dark', 'auto'] as const,
};