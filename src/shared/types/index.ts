// 应用配置类型定义
export interface AppConfig {
  appName: string;
  version: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  downloadPath?: string;
  window: WindowConfig;
  features: FeatureFlags;
  tray: TrayConfig;
  userAgreement: UserAgreementConfig;
  sharedFolders: SharedFolder[];
}

export interface UserAgreementConfig {
  accepted: boolean;
  acceptedAt?: string;
}

export interface SharedFile {
  hash: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface SharedFolder {
  path: string;
  files: SharedFile[];
  lastScanAt?: string;
}

export interface WindowConfig {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export interface FeatureFlags {
  developerTools: boolean;
  analytics: boolean;
  autoUpdate: boolean;
}

export interface TrayConfig {
  hasShownFirstTimeNotice: boolean;
}

// IPC通信相关类型
export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 系统信息类型
export interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  totalMem: number;
  freeMem: number;
  userInfo: UserInfo;
}

export interface UserInfo {
  username: string;
  homeDir: string;
  osVersion: string;
}

// 模块类型定义
export interface ModuleInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}