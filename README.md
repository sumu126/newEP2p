# EP2P - 基于 Electron + Vue3 的跨网络 P2P 文件传输应用

一个现代化的桌面应用，专门用于跨网络的 P2P 文件传输，结合了 Electron、Vue3 和 TypeScript 技术栈，提供安全、高效的分布式文件传输解决方案。

## 🚀 核心特性

### P2P 文件传输功能
- **跨网络传输**: 支持不同网络环境下的直接文件传输
- **信令服务器**: 基于 Socket.IO 的信令服务器实现连接建立
- **WebRTC 连接**: 使用 Simple Peer 库实现 WebRTC 对等连接
- **多文件并发**: 支持多文件同时传输和进度跟踪
- **断点续传**: 文件传输中断后可恢复续传
- **实时状态**: 实时显示连接状态和传输进度

### 技术架构优势
- **现代化技术栈**: Electron + Vue3 + TypeScript + Vite + Pinia
- **类型安全**: 全面的 TypeScript 支持，完整的类型定义
- **模块化设计**: 清晰的职责分离和模块化架构
- **安全通信**: 基于预加载脚本的安全 IPC 通信机制
- **开发体验**: 支持热重载、快速构建和实时调试

### 应用功能特性
- **窗口管理**: 多窗口支持、系统托盘、窗口状态管理
- **状态管理**: 基于 Pinia 的响应式状态管理
- **用户界面**: 基于 Vue3 Composition API 的现代化 UI 设计
- **配置管理**: 支持环境变量和运行时配置
- **构建系统**: 高效的 Vite 构建和 electron-builder 打包

## 📁 项目结构

```
EP2P/
├── src/
│   ├── main/                 # 主进程代码
│   │   ├── index.ts          # 主进程入口
│   │   ├── managers/         # 管理器类
│   │   │   ├── window.manager.ts    # 窗口管理器
│   │   │   └── module.manager.ts    # 模块管理器
│   │   ├── ipc/              # IPC 处理器
│   │   │   ├── base.handler.ts      # 基础处理器
│   │   │   ├── config.handler.ts    # 配置处理器
│   │   │   ├── file.handler.ts      # 文件处理器
│   │   │   ├── file-save.handler.ts # 文件保存处理器
│   │   │   ├── ipc.manager.ts       # IPC 管理器
│   │   │   ├── system.handler.ts    # 系统处理器
│   │   │   └── window.handler.ts    # 窗口处理器
│   │   └── modules/          # 核心模块
│   │       └── config.module.ts     # 配置模块
│   ├── renderer/             # 渲染进程代码
│   │   ├── main.ts           # Vue 应用入口
│   │   ├── App.vue           # 根组件
│   │   ├── components/       # Vue 组件
│   │   │   ├── ConfigPanel.vue      # 配置面板
│   │   │   ├── CrossNetworkP2P.vue  # P2P 传输组件
│   │   │   ├── FileTransferList.vue # 文件传输列表
│   │   │   ├── Message.vue          # 消息组件
│   │   │   ├── Modal.vue            # 模态框
│   │   │   └── Table.vue            # 表格组件
│   │   ├── composables/      # 组合式 API 函数
│   │   │   ├── index.ts              # 导出文件
│   │   │   └── useConfig.ts          # 配置 Hook
│   │   ├── services/         # 服务层
│   │   │   └── config.service.ts     # 配置服务
│   │   ├── stores/           # Pinia 状态管理
│   │   │   └── app.store.ts          # 应用状态
│   │   └── utils/            # 工具函数
│   │       ├── index.ts              # 导出文件
│   │       └── message.ts            # 消息工具
│   ├── preload/              # 预加载脚本
│   │   └── index.ts          # 预加载脚本入口
│   └── shared/               # 共享代码
│       ├── constants/        # 常量定义
│       │   ├── index.ts              # IPC 通道常量
│       │   └── p2p.ts                # P2P 相关常量
│       ├── types/            # 类型定义
│       │   ├── index.ts              # 应用类型
│       │   └── p2p.ts                # P2P 相关类型
│       └── utils/            # 共享工具
│           ├── helpers.ts            # 辅助函数
│           └── index.ts              # 导出文件
├── scripts/                  # 脚本文件
│   └── delay-electron.js     # Electron 启动延时脚本
├── assets/                   # 静态资源
│   ├── icon.ico              # 应用图标 (Windows)
│   └── icon.png              # 应用图标
├── dist-electron/            # 主进程构建输出
├── dist/                     # 渲染进程构建输出
├── .env                      # 环境变量配置
├── package.json              # 项目配置
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 配置
├── tsconfig.node.json        # Node.js TypeScript 配置
├── build.mjs                 # 构建脚本
├── build-app.js              # 应用打包脚本
└── index.html                # HTML 模板
```

## 🛠️ 快速开始

### 环境要求

- **Node.js**: >= 16.x (推荐 18.x 或更高版本)
- **包管理器**: npm 或 yarn
- **操作系统**: Windows 10/11, macOS, Linux

### 安装步骤

```bash
# 进入项目目录
cd EP2P

# 安装依赖
npm install

# 或使用 yarn
yarn install
```

### 开发模式

#### 推荐方式（一体化启动）
```bash
# 同时启动开发服务器和 Electron 应用
npm run electron:dev
```

#### 分离启动（用于调试）
```bash
# 终端 1：启动前端开发服务器
npm run dev

# 终端 2：启动 Electron 应用
npm run electron:start
```

**开发模式特性**：
- 🔥 前端热重载，代码更改自动刷新
- 🪟 Electron 窗口自动打开
- 🔧 开发工具默认开启
- 🌐 使用 `http://localhost:5173` 加载资源
- ⏳ 自动延时启动 Electron 确保开发服务器就绪

### 生产构建

```bash
# 构建应用（渲染进程 + 主进程）
npm run build

# 构建并打包 Electron 应用
npm run electron:build

# 构建 Windows 安装包
npm run electron:build-win

# 简化版 Windows 打包
npm run electron:build-win-simple
```

## 🔧 核心功能详解

### P2P 文件传输系统

EP2P 应用的核心是完整的 P2P 文件传输系统，支持跨网络的文件传输：

#### 信令服务器连接
- **Socket.IO 通信**: 基于 Socket.IO 实现信令服务器通信
- **自定义配置**: 支持自定义信令服务器地址配置
- **自动重连**: 自动重连机制确保连接稳定性
- **房间管理**: 支持房间创建和加入，实现用户分组

#### WebRTC 对等连接
- **Simple Peer 库**: 使用 Simple Peer 库实现 WebRTC 连接
- **NAT 穿透**: 支持 NAT 穿透和 ICE 候选交换
- **连接管理**: 自动处理连接建立、维护和断开
- **多用户支持**: 支持与多个对等端同时连接

#### 文件传输管理
- **多文件并发**: 支持多文件同时传输
- **进度跟踪**: 实时显示传输进度和速度
- **断点续传**: 文件传输中断后可恢复续传
- **状态管理**: 完整的传输状态管理（等待、传输中、完成、错误）
- **文件处理**: 支持大文件分块传输和校验

### 模块化架构

应用采用模块化设计，支持动态加载和生命周期管理：

```typescript
// 模块定义示例
interface Module {
  name: string;
  init(): Promise<void>;
  destroy?(): Promise<void>;
}

// 模块管理器
class ModuleManager {
  private modules: Map<string, Module> = new Map();
  
  public async init(): Promise<void> {
    // 初始化所有模块
  }
  
  public async registerModule(module: Module): Promise<void> {
    // 注册模块
  }
}
```

### IPC 通信机制

安全的进程间通信，基于预加载脚本：

#### 渲染进程调用主进程
```typescript
// 调用主进程方法（带返回值）
const systemInfo = await window.electronAPI.invoke('system:get-info');

// 发送消息到主进程（无返回值）
window.electronAPI.send('window:minimize');

// 监听主进程消息
window.electronAPI.on('config:updated', (event, newConfig) => {
  console.log('配置已更新:', newConfig);
});
```

#### 预加载脚本暴露的 API
```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: Function) => ipcRenderer.on(channel, listener),
  
  // 文件操作 API
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  
  // P2P 相关 API
  p2p: {
    createConnection: (peerId: string, signalData?: any) => 
      ipcRenderer.invoke('p2p:create-connection', peerId, signalData),
    sendFile: (peerId: string, filePath: string) => 
      ipcRenderer.invoke('p2p:send-file', peerId, filePath),
  }
});
```

### 配置管理系统

统一的配置管理，支持持久化存储和实时同步：

```typescript
// 配置服务使用示例
const configService = {
  getConfig: (): AppConfig => {
    // 获取完整配置
  },
  
  updateConfig: async (updates: Partial<AppConfig>): Promise<void> => {
    // 更新配置
  },
  
  subscribe: (callback: ConfigCallback): Unsubscribe => {
    // 监听配置变化
  }
};

// 在 Vue 组件中使用
const { config, updateConfig, loading } = useConfig();
```

## 🎯 使用指南

### 首次使用配置

1. **启动应用**: 运行 `npm run electron:dev` 启动应用
2. **配置信令服务器**: 在配置页面设置信令服务器地址（如：`ws://localhost:3000`）
3. **设置文件保存路径**: 配置文件下载保存的默认路径
4. **开始传输**: 创建或加入房间，开始文件传输

### 文件传输流程

1. **连接信令服务器**: 应用自动连接配置的信令服务器
2. **创建/加入房间**: 输入房间 ID 创建或加入房间
3. **建立 P2P 连接**: 与房间内其他用户建立 WebRTC 连接
4. **选择文件传输**: 选择要发送的文件，开始传输
5. **监控传输进度**: 实时查看传输进度和状态

### 房间管理

- **创建房间**: 输入唯一的房间 ID 创建新房间
- **加入房间**: 输入已有房间 ID 加入房间
- **房间状态**: 显示房间内在线用户和连接状态
- **自动重连**: 网络中断后自动重新加入房间

## 📦 打包部署

### 打包配置

项目使用 electron-builder 进行应用打包：

```json
{
  "build": {
    "appId": "com.ep2p.demo",
    "productName": "EP2P",
    "directories": {
      "output": "dist-app"
    },
    "files": [
      "dist-electron/**/*",
      "node_modules/**/*",
      "package.json",
      "assets/**/*",
      ".env"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    }
  }
}
```

### 打包命令

```bash
# 构建应用
npm run build

# 打包为可执行文件
npm run electron:build

# 构建 Windows 安装包
npm run electron:build-win
```

### 输出文件

- **安装包**: `dist-app/EP2P Setup [version].exe`
- **解包应用**: `dist-app/win-unpacked/`
- **资源文件**: 自动包含图标和配置文件

## 🐛 故障排除

### 常见问题

1. **端口 5173 被占用**
```bash
# 检查端口占用
netstat -ano | findstr :5173

# 终止占用进程
taskkill /PID <PID> /F

# 或修改 Vite 配置端口
```

2. **Electron 应用无法启动**
- 确认前端开发服务器正常运行（http://localhost:5173）
- 检查防火墙或安全软件设置
- 查看控制台错误信息

3. **P2P 连接失败**
- 确认信令服务器地址正确
- 检查网络连接和防火墙设置
- 验证 WebRTC 支持情况

4. **文件传输中断**
- 检查网络连接稳定性
- 确认文件路径权限
- 查看传输日志和错误信息

### 调试技巧

**主进程调试**:
```bash
electron . --inspect=9229
```

**渲染进程调试**:
- 使用 Chrome DevTools（默认开启）
- 查看 Console 和 Network 面板

## 📚 API 参考

### 主进程 API

#### WindowManager
- `createMainWindow(): BrowserWindow` - 创建主窗口
- `createWindow(id: string, options: WindowOptions): BrowserWindow` - 创建新窗口
- `setupTray(): void` - 设置系统托盘
- `destroyTray(): void` - 销毁系统托盘

#### IpcManager
- `registerHandler(handler: IpcHandler): void` - 注册 IPC 处理器
- `setupHandlers(): void` - 设置所有处理器
- `unregisterHandler(channel: string): void` - 注销处理器

### 渲染进程 API

#### Electron API (通过预加载脚本暴露)
- `invoke(channel: string, ...args: any[]): Promise<any>` - 调用主进程方法
- `send(channel: string, ...args: any[]): void` - 发送消息到主进程
- `on(channel: string, listener: Function): void` - 监听主进程消息

#### P2P 相关 API
- `p2p.createConnection(peerId, signalData)` - 创建 P2P 连接
- `p2p.sendFile(peerId, filePath)` - 发送文件
- `p2p.getPeers()` - 获取对等端列表
- `p2p.getTransfers()` - 获取传输列表

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 使用 TypeScript 并确保类型安全
- 遵循现有的代码风格
- 添加适当的注释和文档
- 确保所有功能都有相应的测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Socket.IO](https://socket.io/) - 实时通信库
- [Simple Peer](https://github.com/feross/simple-peer) - WebRTC 对等连接库

---

**⭐ 如果这个项目对您有帮助，请给它一个 Star！**