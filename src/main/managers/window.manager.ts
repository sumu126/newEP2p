import { BrowserWindow, screen, Rectangle, Tray, Menu, nativeImage, app, Notification } from 'electron';
import { join } from 'path';
import * as dotenv from 'dotenv';

import { ConfigModule } from '../modules/config.module';

// 加载环境变量 - 使用绝对路径确保正确找到文件
const envPath = join(app.getAppPath(), '.env');
dotenv.config({ path: envPath });

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private windows: Map<string, BrowserWindow> = new Map();
  private tray: Tray | null = null;
  private configModule: ConfigModule | null = null;

  public setConfigModule(configModule: ConfigModule): void {
    this.configModule = configModule;
  }

  public createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width - 50),
      height: Math.min(800, height - 50),
      minWidth: 800,
      minHeight: 600,
      frame: true, // 保留窗口边框和系统控制按钮
      autoHideMenuBar: true, // 隐藏默认菜单栏
      webPreferences: {
        preload: join(__dirname, './preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // 在开发阶段暂时关闭sandbox以支持某些功能
      },
      icon: join(app.getAppPath(), 'assets/icon.ico'), // 使用ico图标
    });

    this.mainWindow.setBackgroundColor('#ffffff'); // 匹配你的应用主题色

    // 窗口关闭事件 - 改为最小化到系统托盘
    this.mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
        this.setupTray();
        return;
      }
    });

    // 窗口真正关闭事件
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  public createWindow(
    id: string,
    options: Electron.BrowserWindowConstructorOptions
  ): BrowserWindow {
    // 检查窗口是否已存在
    if (this.windows.has(id)) {
      const existingWindow = this.windows.get(id);
      if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.focus();
        return existingWindow;
      } else {
        this.windows.delete(id);
      }
    }

    const window = new BrowserWindow({
      ...options,
      webPreferences: {
        preload: join(__dirname, './preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        ...(options.webPreferences || {}),
      },
    });

    // 窗口关闭时从映射中移除
    window.on('closed', () => {
      this.windows.delete(id);
    });

    this.windows.set(id, window);

    return window;
  }

  public getWindow(id: string): BrowserWindow | null {
    return this.windows.get(id) || null;
  }

  public closeWindow(id: string): boolean {
    const window = this.getWindow(id);
    if (window && !window.isDestroyed()) {
      window.close();
      this.windows.delete(id);
      return true;
    }
    return false;
  }

  public getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).filter(window => !window.isDestroyed());
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  private setupTray(): void {
    // 如果托盘已存在，确保托盘可见并显示通知
    if (this.tray) {
      this.checkAndShowTrayNotification();
      return;
    }

    // 创建托盘图标
    let iconPath = join(app.getAppPath(), 'assets/icon.ico');
    
    // 检查图标文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(iconPath)) {
      // 尝试使用PNG图标
      const pngIconPath = join(app.getAppPath(), 'assets/icon.png');
      if (fs.existsSync(pngIconPath)) {
        iconPath = pngIconPath;
      }
    }
    
    try {
      const trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        // 使用默认图标
        this.tray = new Tray(nativeImage.createEmpty());
      } else {
        this.tray = new Tray(trayIcon);
      }
    } catch (error) {
      // 使用默认图标
      this.tray = new Tray(nativeImage.createEmpty());
    }
    
    // 设置托盘提示，使用配置中的应用名称
    const appName = this.configModule?.getValue<string>('appName') || 'Electron Vue3 Framework';
    this.tray.setToolTip(appName);
    
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    
    // 托盘图标点击事件
    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });

    // 设置托盘时显示提醒
    this.checkAndShowTrayNotification();
  }

  private async checkAndShowTrayNotification(): Promise<void> {
    // 直接读取.env文件内容，避免dotenv问题
    const fs = require('fs');
    const envPath = join(app.getAppPath(), '.env');
    
    let enableBalloonNotification = true; // 默认启用
    
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // 解析环境变量
        const lines = envContent.split('\n');
        for (const line of lines) {
          if (line.trim() && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
              if (key.trim() === 'BALLOON_NOTIFICATION_ENABLED') {
                enableBalloonNotification = value.trim() === 'true';
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading .env file:', error);
    }
    
    if (!enableBalloonNotification) {
      // 如果配置为false，只在第一次显示通知
      if (this.configModule) {
        try {
          const hasShown = this.configModule.getValue<boolean>('tray.hasShownFirstTimeNotice');
          if (!hasShown) {
            this.showTrayNotification('应用已最小化到托盘', '点击托盘图标可恢复窗口');
            await this.configModule.setValue('tray.hasShownFirstTimeNotice', true);
          }
        } catch (error) {
          console.error('Error checking tray notification status:', error);
          // 出错时显示通知
          this.showTrayNotification('应用已最小化到托盘', '点击托盘图标可恢复窗口');
        }
      } else {
        // 配置模块未设置时显示通知
        this.showTrayNotification('应用已最小化到托盘', '点击托盘图标可恢复窗口');
      }
    } else {
      // 如果配置为true，每次关闭都显示通知
      this.showTrayNotification('应用已最小化到托盘', '点击托盘图标可恢复窗口');
    }
  }

  private showTrayNotification(title: string, content: string): void {
    if (!this.tray) {
      return;
    }

    try {
      // 使用Windows气球通知
      this.tray.displayBalloon({
        title: title,
        content: content,
        icon: nativeImage.createFromPath(join(app.getAppPath(), 'assets/icon.ico'))
      });
      
    } catch (error) {
      // 忽略通知错误
    }
  }

  public destroyTray(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}