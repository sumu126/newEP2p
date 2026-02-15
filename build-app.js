#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

// 构建脚本，用于打包Electron应用
async function buildApp() {
  console.log('开始构建Electron应用...');

  try {
    // 确保dist-app目录存在
    const distAppDir = join(__dirname, 'dist-app');
    if (!existsSync(distAppDir)) {
      mkdirSync(distAppDir, { recursive: true });
    }

    // 执行构建命令
    console.log('执行npm run build...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('构建Windows安装包...');
    execSync('electron-builder --win --config', { stdio: 'inherit' });

    console.log('✅ Windows安装包构建完成！');
    console.log('安装包位置: dist-app/Electron Vue3 Framework Setup 1.0.0.exe');
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

buildApp();