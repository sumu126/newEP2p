import { app } from 'electron';
import { join } from 'path';
import { ConfigModule } from '../modules/config.module';

export interface Module {
  name: string;
  init(): Promise<void>;
  destroy?(): Promise<void>;
}

export class ModuleManager {
  private modules: Map<string, Module> = new Map();

  public async init(): Promise<void> {
    // 初始化系统模块
    await this.loadCoreModules();
    
    // 初始化用户模块
    await this.loadUserModules();
  }

  private async loadCoreModules(): Promise<void> {
    // 核心模块加载逻辑
    console.log('Loading core modules...');
    
    // 注册配置管理模块
    const configModule = new ConfigModule();
    await this.registerModule(configModule);
    
    
  }

  private async loadUserModules(): Promise<void> {
    // 用户自定义模块加载逻辑
    console.log('Loading user modules...');
    
    // 模块可以从特定目录动态加载
    const modulesDir = join(app.getPath('userData'), 'modules');
    console.log(`Looking for user modules in: ${modulesDir}`);
  }

  public async registerModule(module: Module): Promise<void> {
    if (this.modules.has(module.name)) {
      throw new Error(`Module ${module.name} already registered`);
    }

    try {
      await module.init();
      this.modules.set(module.name, module);
      console.log(`Module ${module.name} registered successfully`);
    } catch (error) {
      console.error(`Failed to register module ${module.name}:`, error);
      throw error;
    }
  }

  public getModule(name: string): Module | undefined {
    return this.modules.get(name);
  }

  public async destroy(): Promise<void> {
    // 销毁所有模块
    for (const [name, module] of this.modules) {
      if (module.destroy) {
        try {
          await module.destroy();
          console.log(`Module ${name} destroyed successfully`);
        } catch (error) {
          console.error(`Failed to destroy module ${name}:`, error);
        }
      }
    }
    this.modules.clear();
  }
}