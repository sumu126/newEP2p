import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private serverUrl: string = '';
  
  public isConnected = ref(false);
  public userId = ref('');

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(serverUrl: string): Socket | null {
    if (this.socket && this.serverUrl === serverUrl && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.serverUrl = serverUrl;
    
    try {
      let wsUrl = serverUrl;
      if (!wsUrl.startsWith('http://') && !wsUrl.startsWith('https://')) {
        wsUrl = 'http://' + wsUrl;
      }
      wsUrl = wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');

      this.socket = io(wsUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket'],
        randomizationFactor: 0.5,
        pingTimeout: 10000,
        pingInterval: 5000
      });

      this.socket.on('connect', () => {
        this.isConnected.value = true;
        this.userId.value = this.socket!.id || '';
        console.log('SocketService: 已连接到信令服务器，用户ID:', this.userId.value);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected.value = false;
        console.log('SocketService: 与信令服务器断开连接:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.isConnected.value = false;
        console.error('SocketService: 连接信令服务器失败:', error.message);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        this.isConnected.value = true;
        this.userId.value = this.socket!.id || '';
        console.log('SocketService: 信令服务器重连成功 (尝试次数:', attemptNumber, ')');
      });

      return this.socket;
    } catch (error) {
      console.error('SocketService: 连接信令服务器时发生错误:', error);
      return null;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.value = false;
      this.userId.value = '';
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public emit(event: string, ...args: any[]): boolean {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
      return true;
    }
    console.warn(`SocketService: 无法发送事件 ${event}，未连接到服务器`);
    return false;
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  public registerFiles(files: Array<{ hash: string; fileName: string; fileSize: number }>): boolean {
    return this.emit('register-files', files);
  }

  public unregisterFiles(hashes: string[]): boolean {
    return this.emit('unregister-files', hashes);
  }

  public reconnect(): void {
    if (this.serverUrl) {
      this.disconnect();
      this.connect(this.serverUrl);
    }
  }
}

export const socketService = SocketService.getInstance();
