import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { ensureDir, deepMerge } from '@shared/utils';
import { AppConfig } from '@shared/types';
import { APP_CONSTANTS } from '@shared/constants';

export class ConfigModule {
  public readonly name = 'ConfigModule';
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.config = this.getDefaultConfig();
  }

  public async init(): Promise<void> {
    await this.loadConfig();
  }

  public async destroy?(): Promise<void> {
    // 保存配置并在销毁前执行清理工作
    await this.saveConfig();
  }

  private getDefaultConfig(): AppConfig {
    return {
      appName: app.getName() || APP_CONSTANTS.NAME,
      version: app.getVersion() || APP_CONSTANTS.VERSION,
      theme: 'auto',
      language: 'zh-CN',
      downloadPath: undefined,
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

  private async loadConfig(): Promise<void> {
    try {
      // 确保用户数据目录存在
      await ensureDir(path.dirname(this.configPath));
      
      // 检查配置文件是否存在
      try {
        const configFile = await fs.readFile(this.configPath, 'utf-8');
        const savedConfig = JSON.parse(configFile);
        
        // 深度合并默认配置和保存的配置
        this.config = deepMerge(this.getDefaultConfig(), savedConfig);
      } catch (error) {
        // 如果配置文件不存在或解析失败，则使用默认配置
        console.warn('Failed to load config, using defaults:', error);
        await this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading config:', error);
      // 出错时也使用默认配置
      this.config = this.getDefaultConfig();
    }
  }

  public async saveConfig(): Promise<void> {
    try {
      await ensureDir(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }; // 返回副本以防止外部直接修改
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  public getValue<T>(keyPath: string): T | undefined {
    // 简单的键路径解析（例如 'window.width'）
    return keyPath.split('.').reduce((obj: any, prop) => obj?.[prop], this.config) as T;
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
    await this.saveConfig();
  }
}