import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join } from 'path';
import { builtinModules } from 'module';

// 渲染进程配置
const rendererConfig = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': join(__dirname, 'src/renderer'),
      '@shared': join(__dirname, 'src/shared'),
      '@main': join(__dirname, 'src/main'),
      '@preload': join(__dirname, 'src/preload'),
    },
  },
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
});

// 主进程配置
const mainConfig = defineConfig({
  resolve: {
    alias: {
      '@shared': join(__dirname, 'src/shared'),
      '@main': join(__dirname, 'src/main'),
      '@preload': join(__dirname, 'src/preload'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      input: {
        main: join(__dirname, 'src/main/index.ts'),
        preload: join(__dirname, 'src/preload/index.ts'),
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
    outDir: 'dist-electron',
    emptyOutDir: true,
  },
  define: {
    global: 'globalThis',
  },
});

// 合并配置
export default ({ mode }: { mode: string }) => {
  if (mode === 'electron') {
    return mainConfig;
  }
  return rendererConfig;
};