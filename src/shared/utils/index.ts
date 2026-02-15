import { dialog, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/**
 * 检查路径是否存在
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保目录存在，如果不存在则创建
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!(await pathExists(dirPath))) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 获取用户数据目录下的指定路径
 */
export function getUserDataPath(...paths: string[]): string {
  return path.join(app.getPath('userData'), ...paths);
}

/**
 * 打开文件选择对话框
 */
export async function selectFile(options?: Electron.OpenDialogOptions): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    ...options,
  });
  
  return result.canceled ? null : result.filePaths[0];
}

/**
 * 打开目录选择对话框
 */
export async function selectDirectory(options?: Electron.OpenDialogOptions): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    ...options,
  });
  
  return result.canceled ? null : result.filePaths[0];
}

/**
 * 格式化字节大小为人类可读格式
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 深度合并对象
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}