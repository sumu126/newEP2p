import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// 创建应用实例
const app = createApp(App);

// 使用Pinia状态管理
app.use(createPinia());

// 挂载应用
app.mount('#app');