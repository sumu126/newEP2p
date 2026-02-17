import { IpcMainInvokeEvent, dialog } from 'electron';
import { BaseIpcHandler } from './base.handler';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';

export class P2PHandler extends BaseIpcHandler {
  // 取消标志，用于中断文件扫描
  private scanCancelFlag = false;

  /**
   * 扫描目录中的文件并计算哈希（带进度回调）
   */
  async scanAndHashFilesWithProgress(event: IpcMainInvokeEvent, dirPath: string): Promise<any[]> {
    this.scanCancelFlag = false;
    return this.handleAsync<any[]>(async () => {
      const files: any[] = [];
      
      try {
        const items = await readdir(dirPath);
        const totalFiles = items.length;
        
        for (let i = 0; i < items.length; i++) {
          // 检查是否取消
          if (this.scanCancelFlag) {
            throw new Error('文件扫描已取消');
          }
          
          const item = items[i];
          const fullPath = join(dirPath, item);
          const stats = await stat(fullPath);
          
          // 发送进度更新
          event.sender.send('p2p:scan-progress', {
            currentFile: item,
            currentIndex: i + 1,
            totalFiles: totalFiles,
            progress: Math.round(((i + 1) / totalFiles) * 100)
          });
          
          if (stats.isFile()) {
            const hash = await this.calculateFileHashWithProgress(event, fullPath, item);
            files.push({
              fileName: item,
              filePath: fullPath,
              fileSize: stats.size,
              hash: hash
            });
          } else if (stats.isDirectory()) {
            // 递归扫描子目录（可选，根据需要启用）
            // const subFiles = await this.scanAndHashFilesWithProgress(event, fullPath);
            // files.push(...subFiles);
          }
        }
        
        return files;
      } catch (error) {
        console.error('扫描文件时出错:', error);
        throw error;
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  /**
   * 取消文件扫描
   */
  cancelScan(): void {
    this.scanCancelFlag = true;
  }

  /**
   * 扫描目录中的文件并计算哈希（旧方法，保持兼容）
   */
  async scanAndHashFiles(event: IpcMainInvokeEvent, dirPath: string): Promise<any[]> {
    return this.scanAndHashFilesWithProgress(event, dirPath);
  }

  /**
   * 计算文件的SHA-256哈希值（带进度回调）
   */
  private async calculateFileHashWithProgress(event: IpcMainInvokeEvent, filePath: string, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      let processedBytes = 0;
      
      // 获取文件大小用于进度计算
      stat(filePath).then(stats => {
        const totalBytes = stats.size;
        
        stream.on('data', (data) => {
          hash.update(data);
          processedBytes += data.length;
          
          // 每处理1MB数据发送一次进度更新
          if (processedBytes % (1024 * 1024) === 0 || processedBytes === totalBytes) {
            event.sender.send('p2p:hash-progress', {
              fileName: fileName,
              filePath: filePath,
              processedBytes: processedBytes,
              totalBytes: totalBytes,
              progress: Math.round((processedBytes / totalBytes) * 100)
            });
          }
        });
        
        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    });
  }

  /**
   * 计算文件的SHA-256哈希值（旧方法，保持兼容）
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 注册文件到信令服务器
   */
  async registerFilesWithSignalServer(event: IpcMainInvokeEvent, files: any[]): Promise<void> {
    return this.handleAsync<void>(async () => {
      // 这里会通过WebSocket或其他方式将文件信息发送到信令服务器
      // 模拟向信令服务器发送注册请求
      console.log('向信令服务器注册文件:', files);
      
      // 实际实现中，这里应该通过WebSocket连接发送register-files事件
      // 但由于这是主进程，需要通过渲染进程桥接或使用新的WebSocket客户端
      // 目前先打印日志，实际实现会在渲染进程中完成
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  // 存储共享文件信息的映射
  private sharedFilesMap = new Map<string, any>(); // hash -> file info

  /**
   * 设置共享文件列表
   */
  setSharedFiles(files: any[]): void {
    this.sharedFilesMap.clear();
    for (const file of files) {
      this.sharedFilesMap.set(file.hash, file);
    }
    console.log(`设置共享文件列表: ${files.length} 个文件`);
  }

  /**
   * 根据文件哈希查找文件信息
   */
  async findFileByHash(event: IpcMainInvokeEvent, hash: string): Promise<any> {
    return this.handleAsync<any>(async () => {
      const fileInfo = this.sharedFilesMap.get(hash);
      if (fileInfo) {
        console.log(`找到文件: ${fileInfo.fileName} (${hash})`);
        return fileInfo;
      } else {
        console.log(`未找到文件哈希: ${hash}`);
        return null;
      }
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  /**
   * 搜索文件
   */
  async searchFiles(event: IpcMainInvokeEvent, query: string): Promise<any[]> {
    return this.handleAsync<any[]>(async () => {
      // 这里会通过WebSocket向信令服务器发送搜索请求
      // 模拟搜索过程，实际实现会在渲染进程中完成
      console.log('搜索文件:', query);
      return [];
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  /**
   * 选择共享目录
   */
  async selectShareDirectory(event: IpcMainInvokeEvent): Promise<{ filePath?: string, canceled?: boolean }> {
    return this.handleAsync<{ filePath?: string, canceled?: boolean }>(async () => {
      const result = await dialog.showOpenDialog({
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
}