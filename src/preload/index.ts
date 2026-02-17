import { contextBridge, ipcRenderer, shell } from 'electron';

// 定义暴露给渲染进程的安全API
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC通信API
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.on(channel, listener),
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.removeListener(channel, listener),
  
  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  
  // 文件操作相关API
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  saveFileDialog: (fileName: string, fileData: number[]) => ipcRenderer.invoke('file:save-dialog', { fileName, fileData }),
  // 添加临时文件处理API
  createTempFile: (fileName: string, fileData: number[]) => ipcRenderer.invoke('file:create-temp', { fileName, fileData }),
  // 添加保存文件到默认路径的API
  saveFileToDefaultPath: (fileName: string, fileData: number[]) => ipcRenderer.invoke('file:save-to-default-path', { fileName, fileData }),
  
  // 系统信息相关API
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  
  // 窗口操作相关API
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // Shell相关API
  shell: {
    // 显示文件在文件夹中的位置
    showItemInFolder: (fullPath: string) => shell.showItemInFolder(fullPath),
  },
  
  // P2P文件传输相关API
  p2p: {
    // 创建P2P连接
    createConnection: (peerId: string, signalData?: any) => 
      ipcRenderer.invoke('p2p:create-connection', peerId, signalData),
    
    // 处理WebRTC信令
    handleSignal: (peerId: string, signal: any) => 
      ipcRenderer.invoke('p2p:handle-signal', peerId, signal),
    
    // 发送文件
    sendFile: (peerId: string, filePath: string) => 
      ipcRenderer.invoke('p2p:send-file', peerId, filePath),
    
    // 获取对等端列表
    getPeers: () => ipcRenderer.invoke('p2p:get-peers'),
    
    // 获取传输列表
    getTransfers: () => ipcRenderer.invoke('p2p:get-transfers'),
    
    // 扫描并哈希文件
    scanAndHashFiles: (dirPath: string) => 
      ipcRenderer.invoke('p2p:scan-and-hash-files', dirPath),
    
    // 取消文件扫描
    cancelScan: () => 
      ipcRenderer.invoke('p2p:cancel-scan'),
    
    // 监听扫描进度
    onScanProgress: (callback: (data: any) => void) => 
      ipcRenderer.on('p2p:scan-progress', (event, data) => callback(data)),
    
    // 监听哈希进度
    onHashProgress: (callback: (data: any) => void) => 
      ipcRenderer.on('p2p:hash-progress', (event, data) => callback(data)),
    
    // 移除进度监听器
    removeScanProgressListener: (callback: (event: any, data: any) => void) => 
      ipcRenderer.removeListener('p2p:scan-progress', callback),
    
    removeHashProgressListener: (callback: (event: any, data: any) => void) => 
      ipcRenderer.removeListener('p2p:hash-progress', callback),
  },
});