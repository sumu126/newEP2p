import { IpcMainInvokeEvent } from 'electron';
import { IpcResponse } from '@shared/types';

export abstract class BaseIpcHandler {
  protected async handleAsync<T>(
    operation: () => Promise<T>
  ): Promise<IpcResponse<T>> {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  protected handleSync<T>(operation: () => T): IpcResponse<T> {
    try {
      const result = operation();
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }
}