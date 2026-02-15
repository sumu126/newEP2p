import { createApp, h } from 'vue';
import MessageComponent from '@/components/Message.vue';

// 创建消息实例
let messageInstance: any = null;
let messageContainer: HTMLElement | null = null;

interface MessageOptions {
  content: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const createMessageInstance = () => {
  if (messageContainer) {
    messageContainer.remove();
  }
  
  messageContainer = document.createElement('div');
  messageContainer.id = 'message-container';
  document.body.appendChild(messageContainer);
  
  const app = createApp({
    render: () => h(MessageComponent)
  });
  
  messageInstance = app.mount(messageContainer);
};

const showMessage = (options: MessageOptions) => {
  if (!messageInstance) {
    createMessageInstance();
  }
  
  // 调用组件的addMessage方法
  if (messageInstance.addMessage) {
    return messageInstance.addMessage(
      options.content,
      options.type || 'info',
      options.duration ?? 3000
    );
  }
};

export const message = {
  success(content: string, duration?: number) {
    return showMessage({ content, type: 'success', duration });
  },
  error(content: string, duration?: number) {
    return showMessage({ content, type: 'error', duration });
  },
  warning(content: string, duration?: number) {
    return showMessage({ content, type: 'warning', duration });
  },
  info(content: string, duration?: number) {
    return showMessage({ content, type: 'info', duration });
  },
  custom(content: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) {
    return showMessage({ content, type, duration });
  }
};