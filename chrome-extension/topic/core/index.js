/**
 * 👑 Core Core SDK 统一出口
 */
export { cleanString } from './cleaner.js';
export { generateMediaTasks } from './namer.js';
export { metrics } from './metrics.js';
export { refreshVideoTokenOnline } from './tokenRefresher.js';
export { db, saveCapturedItemsToDB } from './db.js';

// 将所有的核心逻辑包装成统一的集成控制器，交给各框架的 background 驱动
import { generateMediaTasks } from './namer.js';
import { metrics } from './metrics.js';
import { refreshVideoTokenOnline } from './tokenRefresher.js';
import { createDownloadTask } from '../AsyncQueue/index.js';
import { downloadsLocation } from './globalConfig.js';
import { updateItemStatus } from './db.js';

export class GrabberCoreEngine {
  constructor(downloadQueueInstance, serverUrl = 'http://localhost:8080/pathExists') {
    this.queue = downloadQueueInstance; // 外部传入你之前编写的带自愈的异步并发队列
    this.serverUrl = serverUrl;
    this.downloadRegistry = new Map(); // filename => 'downloading'
  }

  /**
   * 宿主实体硬盘 O(1) 批量深度送检
   */
  async filterExistingFilesByServer(taskList) {
    if (taskList.length === 0) return [];
    try {
      const payload = taskList.map(t => ({
        filename: t.filename,
        downloadsLocation: downloadsLocation,
        exts: [".mp4", ".webp", ".jpeg", ".jpg", ".mp3", ".m4a"]
      }));

      const res = await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const missingFiles = new Set((data.result || []).map(r => r.filename));
        return taskList.filter(t => missingFiles.has(t.filename));
      }
    } catch {
      console.warn('[CoreEngine] 本地检测 Node 服务未启动，自动降级跳过硬盘校验。');
    }
    return taskList;
  }

  /**
   * 核心调度一键批量消费入口
   */
  async executeBatchDownload(items, options) {
    let rawTasks = [];
    let initialSkipped = 0;

    for (const item of items) {
      const tasks = generateMediaTasks(item, options);
      for (const task of tasks) {
        // 第一层与第二层：内存与 Chrome 运行时历史记录去重
        if (this.downloadRegistry.get(task.filename) === 'downloading') {
          initialSkipped++;
          continue;
        }
        // 任务多时太耗时
        // const isChromeExist = await isFileExistOnDisk({ url: task.urlCandidates[0], filename: task.filename });
        // if (isChromeExist) {
        //   initialSkipped++;
        //   continue;
        // }
        rawTasks.push(task);
      }
    }

    metrics.totalRequested += (rawTasks.length + initialSkipped);

    // 第三层：联动你策略模式的 server.js 批量物理送检
    const finalTasks = await this.filterExistingFilesByServer(rawTasks);
    const serverSkipped = rawTasks.length - finalTasks.length;
    
    metrics.skippedCount += (initialSkipped + serverSkipped);

    // 压入重试内核消费
    finalTasks.forEach(task => {
      console.log(`[CoreEngine] 压入下载队列:`, task);
      this.dispatchTask(task);
    });

    return {
      skipped: initialSkipped + serverSkipped,
      pushed: finalTasks.length
    };
  }

  /**
   * 带动态临门一脚 Token 换新、防双击排队的底层分发引擎
   */
  dispatchTask(taskOptions, attempt = 1) {
    const { url, filename, tid } = taskOptions;

    this.downloadRegistry.set(filename, 'downloading');

    // 符合 AsyncQueue 标准的任务执行函数封装
    const queueTaskRunner = (context) => {
      return new Promise(async (resolve, reject) => {
        // 临门一脚：出库发起 Chrome 下载的最后一毫秒再次检查磁盘
        const isExist = await isFileExistOnDisk({ url, filename });
        if (isExist) {
          metrics.skippedCount++;
          this.downloadRegistry.delete(filename);
          return resolve({ status: 'skipped_at_last_moment' });
        }

        // 绑定 AsyncQueue 的下载任务函数

        const realDownloadRunner = createDownloadTask({ url: url, filename: filename });
      
        realDownloadRunner(context)
          .then(resolve)
          .catch(reject);
        });

    };

    // 塞入外部注入的 AsyncQueue 队列中消费
    this.queue.push(queueTaskRunner, { timeout: 0, priority: taskOptions.priority })
      .then((res) => {
        if (res?.status === 'skipped_at_last_moment') return;
        metrics.markSuccess(filename);
        this.downloadRegistry.delete(filename);
        updateItemStatus(tid, 'completed', { download_path: filename }).catch(err => {
          console.log(`[DexieDB] 更新下载状态失败: tid=${tid}, error=${err.message}`);
        });
      })
      .catch(async (err) => {
        metrics.logError(filename, tid, err.message);

        if (err.message?.includes('cancelled')) {
          this.downloadRegistry.delete(filename);
          return;
        }
        // D 决策路径：彻底终结，登记负面流水
        this.downloadRegistry.delete(filename);
        metrics.markFinalFailure(filename);
      });
  }
}

async function isFileExistOnDisk(downloadOptions) {
  const { url, filename } = downloadOptions;
  // 1. 检查 Chrome 下载历史记录
  const isChromeExist = await Promise.all([
    chrome.downloads.search({ url, state: 'in_progress'}).then(res => res && res.length > 0),
    chrome.downloads.search({ url, state: 'complete', exists: true }).then(res => res && res.length > 0),
    // 性能太差，改为只检查文件名尾部匹配
    // chrome.downloads.search({ query: [filename.split('/').pop()], state: 'complete', exists: true }).then(res => res && res.length > 0),
    chrome.downloads.search({ state: 'complete', exists: true }).then((items) => {
      const targetName = filename.split('/').pop();
      // 在结果中进行严格的尾部匹配（判断文件名是否一致）
      const isDownloaded = items.some(item => item.filename.endsWith(targetName));
      return isDownloaded;
    })
  ]).then(([inProgressUrlExist, urlExists, filenameExists]) => inProgressUrlExist || urlExists || filenameExists);
  
  return isChromeExist;
}
