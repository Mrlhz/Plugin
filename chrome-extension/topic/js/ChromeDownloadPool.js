import { PromisePool } from './PromisePool.js';

export class ChromeDownloadPool extends PromisePool {
  constructor(max) {
    super(max);
    this._setupListener();
    this.pendingResolvers = new Map();
  }
  // 1. 全局监听下载状态变化
  _setupListener() {
    chrome.downloads.onChanged.addListener((delta) => {
      if (!this.pendingResolvers.has(delta.id)) return;

      const { resolve, reject, abortCleanup } = this.pendingResolvers.get(delta.id);

      if (delta.state?.current === 'complete') {
        this._cleanup(delta.id, abortCleanup);
        resolve({ id: delta.id, status: 'complete' });
      } 
      else if (delta.error?.current) {
        this._cleanup(delta.id, abortCleanup);
        reject(new Error(`Download ${delta.id} failed: ${delta.error.current}`));
      }
    });
  }

  _cleanup(id, abortCleanup) {
    this.pendingResolvers.delete(id);
    if (abortCleanup) {
      abortCleanup(); // 完美闭环：在这里移除 innerSignal 监听，防止内存泄漏
    }
  }
  /**
   * 重写/包装下载任务
   */
  async download(options, { priority = 0, signal = null } = {}) {
    // 接收 PromisePool 传进来的运行期 innerSignal
    return this.run(async (innerSignal) => {
      return new Promise((resolve, reject) => {
        
        // 运行前检查
        if (innerSignal?.aborted) {
          return reject(new Error('Download Aborted by User'));
        }

        let activeDownloadId = null;

        // 定义取消句柄
        const onAbort = () => {
          if (activeDownloadId !== null) {
            chrome.downloads.cancel(activeDownloadId);
            this.pendingResolvers.delete(activeDownloadId);
          }
          reject(new Error('Download Aborted by User'));
        };

        // 绑定运行期取消事件
        innerSignal?.addEventListener('abort', onAbort);
        const abortCleanup = () => innerSignal?.removeEventListener('abort', onAbort);

        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError) {
            abortCleanup();
            return reject(new Error(chrome.runtime.lastError.message));
          }

          activeDownloadId = downloadId;

          // 将清除函数传给监听器层，在下载完成/失败时调用
          this.pendingResolvers.set(downloadId, { resolve, reject, abortCleanup });

          // 边缘情况处理：若在调用 API 产生 downloadId 的微秒级间隙内用户点了取消
          if (innerSignal?.aborted) {
            onAbort();
          }
        });
      });
    }, { priority, signal });
  }
}
