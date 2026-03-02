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
      let mainWindow = null;
      
      const globalMainWindow = (global as any).MAIN_WINDOW;
      if (globalMainWindow && !globalMainWindow.isDestroyed()) {
        mainWindow = globalMainWindow;
      }
      
      if (!mainWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        const senderWindow = allWindows.find(w => w.webContents.id === event.sender.id);
        if (senderWindow && !senderWindow.isDestroyed()) {
          mainWindow = senderWindow;
        }
      }
      
      if (!mainWindow) {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          mainWindow = allWindows[0];
        }
      }
      
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
      await fs.mkdir(dirPath, { recursive: true });
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
      
      const fileHandle = await fs.open(filePath, 'r');
      
      try {
        const buffer = Buffer.alloc(length);
        const result = await fileHandle.read(buffer, 0, length, start);
        
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
      
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      const buffer = Buffer.from(arrayBufferData);
      await fs.writeFile(filePath, buffer);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
  
  // 文件句柄缓存，用于并行写入
  private fileHandles: Map<string, fs.FileHandle> = new Map();
  private handleCounter = 0;
  
  async createFileHandle(event: IpcMainInvokeEvent, params: { filePath: string, totalSize: number }): Promise<{ handleId: string }> {
    return this.handleAsync<{ handleId: string }>(async () => {
      const { filePath, totalSize } = params;
      
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      const fileHandle = await fs.open(filePath, 'w+');
      
      if (totalSize > 0) {
        try {
          await fileHandle.truncate(totalSize);
        } catch (e) {
          console.warn(`预分配空间失败，继续创建文件：${e}`);
        }
      }
      
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
      
      const buffer = Buffer.from(arrayBufferData);
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
  
  // 批量写入文件块
  async writeBatch(event: IpcMainInvokeEvent, params: { handleId: string, chunks: Array<{ offset: number, data: ArrayBuffer }> }): Promise<void> {
    return this.handleAsync<void>(async () => {
      const { handleId, chunks } = params;
      
      const fileHandle = this.fileHandles.get(handleId);
      if (!fileHandle) {
        throw new Error(`File handle ${handleId} not found`);
      }
      
      chunks.sort((a, b) => a.offset - b.offset);
      
      for (const chunk of chunks) {
        const buffer = Buffer.from(chunk.data);
        await fileHandle.write(buffer, 0, buffer.length, chunk.offset);
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

}
