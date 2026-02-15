#!/usr/bin/env node

// 延迟启动 Electron 应用的脚本
const { spawn } = require('child_process');

// 延迟时间（毫秒）
const delay = 3000;

console.log(`等待 ${delay}ms 后启动 Electron...`);

setTimeout(() => {
    console.log('启动 Electron 应用...');
    
    // 使用 spawn 而不是 exec 来避免 shell 问题
    const electronProcess = spawn('npx', ['electron', '.', '--no-sandbox'], {
        stdio: 'inherit',
        shell: true
    });
    
    electronProcess.on('error', (error) => {
        console.error('启动 Electron 失败:', error);
    });
    
    electronProcess.on('exit', (code) => {
        console.log(`Electron 进程退出，代码: ${code}`);
    });
    
}, delay);