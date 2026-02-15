<template>
  <Teleport to="body">
    <transition-group name="message-list" tag="div" class="message-container">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message-item', msg.type]"
        @mouseenter="clearTimer(msg.id)"
        @mouseleave="restartTimer(msg.id)"
      >
        <div class="message-content">
          <span class="message-icon" :class="getIconClass(msg.type)"></span>
          <span class="message-text">{{ msg.content }}</span>
        </div>
        <button class="message-close" @click="removeMessage(msg.id)">×</button>
      </div>
    </transition-group>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface Message {
  id: string;
  content: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

const messages = ref<Message[]>([]);
const timers = reactive(new Map<string, number>());

// 添加消息
const addMessage = (content: string, type: Message['type'] = 'info', duration: number = 3000) => {
  const id = generateId();
  const message: Message = {
    id,
    content,
    type,
    duration
  };

  messages.value.push(message);

  if (duration > 0) {
    startTimer(id, duration);
  }

  return id;
};

// 移除消息
const removeMessage = (id: string) => {
  const index = messages.value.findIndex(msg => msg.id === id);
  if (index !== -1) {
    messages.value.splice(index, 1);
    clearTimer(id);
  }
};

// 开始计时器
const startTimer = (id: string, duration: number) => {
  if (timers.has(id)) {
    clearTimer(id);
  }

  timers.set(id, window.setTimeout(() => {
    removeMessage(id);
  }, duration));
};

// 清除计时器
const clearTimer = (id: string) => {
  if (timers.has(id)) {
    clearTimeout(timers.get(id)!);
    timers.delete(id);
  }
};

// 重启计时器
const restartTimer = (id: string) => {
  const message = messages.value.find(msg => msg.id === id);
  if (message && message.duration > 0) {
    clearTimer(id);
    startTimer(id, message.duration);
  }
};

// 获取图标类
const getIconClass = (type: string) => {
  const iconMap: Record<string, string> = {
    success: 'success-icon',
    error: 'error-icon',
    warning: 'warning-icon',
    info: 'info-icon'
  };
  return iconMap[type] || 'info-icon';
};

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// 导出方法
defineExpose({
  addMessage,
  removeMessage
});
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  animation: slideInRight 0.3s ease;
  transition: opacity 0.3s ease;
}

.message-item.success {
  background-color: #d4edda;
  border-left: 4px solid #28a745;
  color: #155724;
}

.message-item.error {
  background-color: #f8d7da;
  border-left: 4px solid #dc3545;
  color: #721c24;
}

.message-item.warning {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  color: #856404;
}

.message-item.info {
  background-color: #d1ecf1;
  border-left: 4px solid #17a2b8;
  color: #0c5460;
}

.message-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.message-icon {
  margin-right: 8px;
  font-weight: bold;
}

.message-text {
  flex: 1;
}

.message-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 0;
  margin-left: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.message-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* 动画 */
.message-list-enter-active,
.message-list-leave-active {
  transition: all 0.3s ease;
}

.message-list-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>