import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { BaseIpcHandler } from '../ipc/base.handler';
import { IPC_CHANNELS } from '@shared/constants';

export class WindowHandler extends BaseIpcHandler {
  private getWindowByEvent(event: IpcMainInvokeEvent): BrowserWindow | null {
    // 通过事件获取对应的窗口
    const windowId = BrowserWindow.getAllWindows().find(w => 
      w.webContents.id === event.sender.id
    );
    return windowId || null;
  }

  async minimizeWindow(event: IpcMainInvokeEvent): Promise<void> {
    return this.handleAsync<void>(() => {
      const window = this.getWindowByEvent(event);
      if (window) {
        window.minimize();
      } else {
        // 如果无法通过事件找到窗口，则尝试获取所有窗口中的第一个
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          allWindows[0].minimize();
        } else {
          throw new Error('No browser window found');
        }
      }
      return Promise.resolve();
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async maximizeWindow(event: IpcMainInvokeEvent): Promise<void> {
    return this.handleAsync<void>(() => {
      const window = this.getWindowByEvent(event);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      } else {
        // 如果无法通过事件找到窗口，则尝试获取所有窗口中的第一个
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          const win = allWindows[0];
          if (win.isMaximized()) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else {
          throw new Error('No browser window found');
        }
      }
      return Promise.resolve();
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }

  async closeWindow(event: IpcMainInvokeEvent): Promise<void> {
    return this.handleAsync<void>(() => {
      const window = this.getWindowByEvent(event);
      if (window) {
        window.close();
      } else {
        // 如果无法通过事件找到窗口，则尝试获取所有窗口中的第一个
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          allWindows[0].close();
        } else {
          throw new Error('No browser window found');
        }
      }
      return Promise.resolve();
    }).then(response => {
      if (!response.success) {
        throw new Error(response.error!);
      }
      return response.data!;
    });
  }
}