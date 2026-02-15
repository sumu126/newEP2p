import { IpcMainInvokeEvent } from 'electron';
import os from 'os';
import { BaseIpcHandler } from './base.handler';
import { SystemInfo } from '@shared/types';
import { IPC_CHANNELS } from '@shared/constants';

export class SystemInfoHandler extends BaseIpcHandler {
  async getSystemInfo(event: IpcMainInvokeEvent): Promise<SystemInfo> {
    return this.handleAsync<SystemInfo>(() => {
      return Promise.resolve({
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        userInfo: {
          username: os.userInfo().username,
          homeDir: os.userInfo().homedir,
          osVersion: os.version(),
        },
      });
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data!;
    });
  }

  registerHandlers(): void {
    // 这里可以注册更多系统相关的处理器
  }
}