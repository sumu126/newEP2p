import { reactive, toRaw } from 'vue';
import { AppConfig } from '@shared/types';
import { APP_CONSTANTS } from '@shared/constants';

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  private listeners: Array<(config: AppConfig) => void> = [];

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadFromStorage();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private getDefaultConfig(): AppConfig {
    return {
      appName: APP_CONSTANTS.NAME,
      version: APP_CONSTANTS.VERSION,
      theme: 'auto',
      language: 'zh-CN',
      window: {
        width: 1200,
        height: 800,
      },
      features: {
        developerTools: false,
        analytics: true,
        autoUpdate: true,
      },
      tray: {
        hasShownFirstTimeNotice: false,
      },
      userAgreement: {
        accepted: false,
      },
    };
  }

  private loadFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem('app-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.getDefaultConfig(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load config from storage, using defaults:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('app-config', JSON.stringify(toRaw(this.config)));
    } catch (error) {
      console.error('Failed to save config to storage:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }; // 返回副本以防止外部直接修改
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
    this.notifyListeners();
    
    // 同步到后端 - 序列化数据以确保可以安全传输
    try {
      const serializableUpdates = JSON.parse(JSON.stringify(updates));
      await window.electronAPI.invoke('config:update', serializableUpdates);
    } catch (error) {
      console.error('Failed to sync config to backend:', error);
      // 如果同步失败，可以选择回滚或者显示错误
    }
  }

  public async setValue<T>(keyPath: string, value: T): Promise<void> {
    // 解析并设置嵌套属性
    const keys = keyPath.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.config;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    this.saveToStorage();
    this.notifyListeners();
    
    // 同步到后端
    try {
      // 序列化数据以确保可以安全传输
      const serializableConfig = JSON.parse(JSON.stringify(this.config));
      await window.electronAPI.invoke('config:update', serializableConfig);
    } catch (error) {
      console.error('Failed to sync config to backend:', error);
    }
  }

  public getValue<T>(keyPath: string): T | undefined {
    // 简单的键路径解析（例如 'window.width'）
    return keyPath.split('.').reduce((obj: any, prop) => obj?.[prop], this.config) as T;
  }

  public subscribe(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }
}

// 创建一个全局实例
export const configService = ConfigService.getInstance();