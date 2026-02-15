import { IpcMainInvokeEvent } from 'electron';
import { BaseIpcHandler } from '../ipc/base.handler';
import { AppConfig } from '@shared/types';
import { IPC_CHANNELS } from '@shared/constants';
import { ConfigModule } from '../modules/config.module';

export class ConfigHandler extends BaseIpcHandler {
  private configModule: ConfigModule;

  constructor(configModule: ConfigModule) {
    super();
    this.configModule = configModule;
  }

  async getConfig(event: IpcMainInvokeEvent): Promise<AppConfig> {
    return this.handleAsync<AppConfig>(() => {
      return Promise.resolve(this.configModule.getConfig());
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async updateConfig(event: IpcMainInvokeEvent, updates: Partial<AppConfig>): Promise<void> {
    return this.handleAsync<void>(() => {
      return this.configModule.updateConfig(updates);
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  registerHandlers(): void {
    // 注册配置相关的处理器
  }
}