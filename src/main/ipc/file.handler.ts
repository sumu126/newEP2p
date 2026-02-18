import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { BaseIpcHandler } from '../ipc/base.handler';
import { IPC_CHANNELS } from '@shared/constants';

export class FileHandler extends BaseIpcHandler {
  async readFile(event: IpcMainInvokeEvent, filePath: string): Promise<string> {
    return this.handleAsync<string>(async () => {
      const data = await fs.readFile(filePath, 'utf-8');
      return data;
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async writeFile(event: IpcMainInvokeEvent, filePath: string, data: string): Promise<void> {
    return this.handleAsync<void>(async () => {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, data, 'utf-8');
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async selectFile(event: IpcMainInvokeEvent, options?: Electron.OpenDialogOptions): Promise<string | null> {
    return this.handleAsync<string | null>(async () => {
      // 这里需要通过主窗口访问dialog，简化处理
      // 实际实现中可能需要通过windowManager访问主窗口
      console.warn('File selection not fully implemented in this handler');
      return null;
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async selectDirectory(event: IpcMainInvokeEvent, options?: Electron.OpenDialogOptions): Promise<{ filePath?: string, canceled?: boolean }> {
    return this.handleAsync<{ filePath?: string, canceled?: boolean }>(async () => {
      // 尝试多种方式获取可用窗口
      let mainWindow = null;
      
      // 方式1: 尝试从全局变量获取MAIN_WINDOW
      const globalMainWindow = (global as any).MAIN_WINDOW;
      if (globalMainWindow && !globalMainWindow.isDestroyed()) {
        mainWindow = globalMainWindow;
      }
      
      // 方式2: 如果全局变量不可用，尝试获取当前事件对应的窗口
      if (!mainWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        const senderWindow = allWindows.find(w => w.webContents.id === event.sender.id);
        if (senderWindow && !senderWindow.isDestroyed()) {
          mainWindow = senderWindow;
        }
      }
      
      // 方式3: 如果仍不可用，尝试获取第一个可用窗口
      if (!mainWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          mainWindow = allWindows[0];
        }
      }
      
      // 如果仍然没有可用窗口，抛出错误
      if (!mainWindow) {
        throw new Error('No available window to show dialog');
      }
      
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog(mainWindow, {
        ...options,
        properties: ['openDirectory', 'createDirectory']
      });
      
      if (result.canceled) {
        return { canceled: true };
      }
      
      return { filePath: result.filePaths[0] };
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async createDirectory(event: IpcMainInvokeEvent, params: { dirPath: string }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { dirPath } = params;
      
      // 创建目录（递归创建）
      await fs.mkdir(dirPath, { recursive: true });
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  


  async readArrayBuffer(event: IpcMainInvokeEvent, params: { filePath: string }): Promise<ArrayBuffer> {
    return this.handleAsync<ArrayBuffer>(async () => {
      const { filePath } = params;
      
      // 读取文件为Buffer
      const buffer = await fs.readFile(filePath);
      
      // 转换为ArrayBuffer
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  // ✅ 按范围读取文件 - 用于多源下载的流式传输
  async readArrayBufferRange(event: IpcMainInvokeEvent, params: { filePath: string, start: number, length: number }): Promise<ArrayBuffer> {
    return this.handleAsync<ArrayBuffer>(async () => {
      const { filePath, start, length } = params;
      
      // 打开文件句柄
      const fileHandle = await fs.open(filePath, 'r');
      
      try {
        // 分配缓冲区
        const buffer = Buffer.alloc(length);
        
        // 读取指定范围的数据
        const result = await fileHandle.read(buffer, 0, length, start);
        
        // 返回实际读取的部分
        if (result.bytesRead < length) {
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + result.bytesRead);
        }
        
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + length);
      } finally {
        await fileHandle.close();
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async deleteFile(event: IpcMainInvokeEvent, params: { filePath: string }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { filePath } = params;
      
      // 删除文件
      await fs.unlink(filePath);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async saveArrayBufferAsFile(event: IpcMainInvokeEvent, params: { filePath: string, arrayBufferData: ArrayBuffer }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { filePath, arrayBufferData } = params;
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 将ArrayBuffer转换为Buffer
      const buffer = Buffer.from(arrayBufferData);
      
      // 写入文件
      await fs.writeFile(filePath, buffer);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  // 文件写入队列，确保同一文件不会并发写入
  private fileWriteQueues: Map<string, Promise<any>> = new Map();
  
  // 文件句柄缓存，用于并行写入
  private fileHandles: Map<string, fs.FileHandle> = new Map();
  private handleCounter = 0;
  
  async createFileHandle(event: IpcMainInvokeEvent, params: { filePath: string, totalSize: number }): Promise<{ handleId: string }> {
    return this.handleAsync<{ handleId: string }>(async () => {
      const { filePath, totalSize } = params;
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 创建空文件并设置大小（预分配空间）
      await fs.truncate(filePath, totalSize);
      
      // 打开文件进行写入
      const fileHandle = await fs.open(filePath, 'r+');
      
      // 生成唯一的句柄ID
      const handleId = `fh_${++this.handleCounter}`;
      this.fileHandles.set(handleId, fileHandle);
      
      return { handleId };
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async writeToFileAtPosition(event: IpcMainInvokeEvent, params: { handleId: string, arrayBufferData: ArrayBuffer, position: number }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { handleId, arrayBufferData, position } = params;
      
      const fileHandle = this.fileHandles.get(handleId);
      if (!fileHandle) {
        throw new Error(`File handle ${handleId} not found`);
      }
      
      // 将ArrayBuffer转换为Buffer
      const buffer = Buffer.from(arrayBufferData);
      
      // 写入到指定位置
      await fileHandle.write(buffer, 0, buffer.length, position);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async closeFileHandle(event: IpcMainInvokeEvent, params: { handleId: string }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { handleId } = params;
      
      const fileHandle = this.fileHandles.get(handleId);
      if (fileHandle) {
        await fileHandle.close();
        this.fileHandles.delete(handleId);
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  async appendArrayBufferToFile(event: IpcMainInvokeEvent, params: { filePath: string, arrayBufferData: ArrayBuffer, position?: number }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { filePath, arrayBufferData, position } = params;
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 将ArrayBuffer转换为Buffer
      const buffer = Buffer.from(arrayBufferData);
      
      // 如果指定了位置，则使用该位置写入；否则追加到文件末尾
      if (position !== undefined) {
        // 如果指定了位置，需要写入到特定偏移量
        const fileHandle = await fs.open(filePath, 'r+');
        try {
          await fileHandle.write(buffer, 0, buffer.length, position);
        } finally {
          await fileHandle.close();
        }
      } else {
        // 追加到文件末尾
        await fs.appendFile(filePath, buffer);
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  

}