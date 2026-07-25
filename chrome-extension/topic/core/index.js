/**
 * 👑 Core Core SDK 统一出口
 */
// export { cleanString } from './cleaner.js';
// export { generateMediaTasks } from './namer.js';
export { metrics } from './metrics.js';
// export { refreshVideoTokenOnline } from './tokenRefresher.js';
// export { db, saveCapturedItemsToDB } from './db.js';

// 将所有的核心逻辑包装成统一的集成控制器，交给各框架的 background 驱动
import { generateMediaTasks } from './namer.js';
import { metrics } from './metrics.js';
// import { refreshVideoTokenOnline } from './tokenRefresher.js';
import { createDownloadTask } from '../downloads/createDownloadTask.js';
import { downloadsLocation } from './globalConfig.js';
// import { updateItemStatus } from './db.js';

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
    const safeItems = Array.isArray(items) ? items : (items ? [items] : []);
    let rawTasks = [];
    let initialSkipped = 0;

    for (const item of safeItems) {
      const tasks = typeof generateMediaTasks === 'function' ? generateMediaTasks(item, options) : [];
      for (const task of tasks) {
        // 第一层与第二层：内存与 Chrome 运行时历史记录去重
        if (this.downloadRegistry.get(task.filename) === 'downloading') {
          initialSkipped++;
          continue;
        }
        rawTasks.push(task);
      }
    }

    metrics.totalRequested += (rawTasks.length + initialSkipped);

    // 第三层：联动策略模式的 server.js 批量物理送检
    let finalTasks = [];
    try {
      finalTasks = await this.filterExistingFilesByServer(rawTasks);
    } catch (serverErr) {
      console.warn('[BatchDownload] 物理送检失败，降级使用全部原始任务:', serverErr);
      finalTasks = rawTasks;
    }
    const serverSkipped = rawTasks.length - finalTasks.length;
    metrics.skippedCount += (initialSkipped + serverSkipped);

    // 压入重试内核消费
    for (const task of finalTasks) {
      // 动态二次防御：防止 finalTasks 内部本身存在重复的文件名
      if (this.downloadRegistry.get(task.filename) === 'downloading') {
        metrics.skippedCount++;
        continue;
      }

      this.dispatchTask(task).catch(err => {
        console.warn(`[BatchDownload] 任务投递后台严重异常: ${task.filename}`, err);
      });
    }

    return {
      skipped: initialSkipped + serverSkipped,
      pushed: finalTasks.length
    };
  }

  /**
   * 带动态临门一脚 Token 换新、防双击排队的底层分发引擎
   */
  async dispatchTask(taskOptions, attempt = 1) {
    const { filename, itemId, platform, type, urlCandidates, currentUrlIndex = 0 } = taskOptions;
    const currentActiveUrl = urlCandidates[currentUrlIndex];

    this.downloadRegistry.set(filename, 'downloading');
    const safeCleanRegistry = () => {
      try {
        this.downloadRegistry.delete(filename);
      } catch (e) {
        console.warn(`[CoreEngine] 清理注册表异常:`, e);
      }
    };

    try {
      // 符合 AsyncQueue 标准的任务执行函数封装
      const queueTaskRunner = async (context) => {
        let targetUrl = currentActiveUrl;
        // 出库前最后一次磁盘校验
        const isExist = await isFileExistOnDisk({ url: targetUrl, filename });
        if (isExist) {
          // this.downloadRegistry.delete(filename);
          return { status: 'skipped_at_last_moment' };
        }

        const realDownloadRunner = createDownloadTask({
          url: targetUrl,
          filename: filename,
          conflictAction: taskOptions.conflictAction
        });

        return realDownloadRunner(context);
      };

      // 塞入外部注入的 AsyncQueue 队列中消费
      const res = await this.queue.push(queueTaskRunner, { timeout: 0, priority: taskOptions.priority });
      safeCleanRegistry();
      if (res?.status === 'skipped_at_last_moment') {
        metrics.skippedCount++;
        return;
      }

      metrics.markSuccess(filename);
      this.downloadRegistry.delete(filename);
        
      // 统一更新本地数据库
      // updateItemStatus(itemId, 'completed', { download_path: filename }).catch(err => {
      //   console.log(`[DexieDB] 更新下载状态失败: id=${itemId}, error=${err.message}`);
      // });
    } catch (err) {
      try {
        metrics.logError(filename, itemId, err.message);

        if (err.message?.includes('cancelled')) {
          this.downloadRegistry.delete(filename);
          return;
        }

        // A 决策路径：换备用 CDN 弹夹
        if (currentUrlIndex + 1 < urlCandidates.length) {
          metrics.cdnSwitched++;
          this.downloadRegistry.delete(filename);
          this.dispatchTask({ ...taskOptions, currentUrlIndex: currentUrlIndex + 1 }, 1);
          return;
        }
        // B 决策路径：触网进行 Token 刷新熔断自愈
        // else if (!taskOptions.hasTriedOnlineRefresh && tokenRefreshers[platform]) {
        //   this.downloadRegistry.delete(filename);
        //   this.dispatchTask({ ...taskOptions, currentUrlIndex: 0, isUrgentRefresh: true, hasTriedOnlineRefresh: true }, 1);
        // }
        // C 决策路径：挂起 5 秒硬重试
        if (attempt < 3) {
          this.downloadRegistry.delete(filename);
          setTimeout(() => {
            try {
              this.dispatchTask(taskOptions, attempt + 1);
            } catch (timeoutInnerErr) {
              console.warn(`[Fatal] 定时器触发递归调度崩溃:`, timeoutInnerErr);
            }
          }, 5000);
          return;
        }
        // D 决策路径：彻底终结，登记负面流水
        metrics.markFinalFailure(filename);
        // updateItemStatus(itemId, 'failed', { error: err.message }).catch(() => {});
      } catch (innerCriticalError) {
        console.warn(`[Fatal Critical] 调度器错误处理控制流自身崩溃! 文件: ${filename}, 错误:`, innerCriticalError);
        safeCleanRegistry();
      }
    }
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
