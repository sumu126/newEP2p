import { ipcMain, dialog } from 'electron';
import { writeFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, tmpdir, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

export class FileSaveHandler {
  public setupHandlers(): void {
    // 文件保存对话框
    ipcMain.handle('file:save-dialog', async (event, data) => {
      try {
        const { fileName, fileData } = data;
        
        // 显示保存对话框
        const result = await dialog.showSaveDialog({
          title: '保存接收的文件',
          defaultPath: fileName,
          filters: [
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (result.canceled || !result.filePath) {
          return { success: false, error: '用户取消保存' };
        }
        
        // 将文件数据写入文件
        const buffer = Buffer.from(fileData);
        writeFileSync(result.filePath, buffer);
        
        return { 
          success: true, 
          filePath: result.filePath 
        };
        
      } catch (error) {
        console.error('文件保存失败:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        };
      }
    });
    
    // 临时文件创建 - 用于大文件传输
    ipcMain.handle('file:create-temp', async (event, data) => {
      try {
        const { fileName, fileData } = data;
        
        // 创建临时文件路径
        const tempFileName = `p2p_temp_${Date.now()}_${fileName}`;
        const tempFilePath = join(tmpdir(), tempFileName);
        
        // 将文件数据写入临时文件
        const buffer = Buffer.from(fileData);
        writeFileSync(tempFilePath, buffer);
        
        // 然后显示保存对话框让用户选择最终位置
        const result = await dialog.showSaveDialog({
          title: '保存接收的文件',
          defaultPath: fileName,
          filters: [
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (result.canceled || !result.filePath) {
          // 如果用户取消，则删除临时文件
          try {
            require('fs').unlinkSync(tempFilePath);
          } catch {}
          return { success: false, error: '用户取消保存' };
        }
        
        // 将临时文件移动到用户选择的位置
        const fs = require('fs');
        fs.renameSync(tempFilePath, result.filePath);
        
        return { 
          success: true, 
          filePath: result.filePath 
        };
        
      } catch (error) {
        console.error('临时文件处理失败:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        };
      }
    });
    
    // 保存文件到默认路径
    ipcMain.handle('file:save-to-default-path', async (event, data) => {
      try {
        const { fileName, fileData } = data;
        
        // 从配置模块获取默认下载路径
        // 由于不能直接使用invoke，我们使用默认路径
        const os = require('os');
        let downloadPath = join(os.homedir(), 'Downloads', 'P2PFiles');
        
        // 确保下载目录存在
        if (!existsSync(downloadPath)) {
          mkdirSync(downloadPath, { recursive: true });
        }
        
        // 构建完整文件路径
        const filePath = join(downloadPath, fileName);
        
        // 将文件数据写入文件
        const buffer = Buffer.from(fileData);
        writeFileSync(filePath, buffer);
        
        return { 
          success: true, 
          filePath: filePath 
        };
        
      } catch (error) {
        console.error('保存文件到默认路径失败:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        };
      }
    });
  }
}