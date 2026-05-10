import { PromisePool } from './PromisePool.js';

class ChromeDownloadPool extends PromisePool {
  constructor(max) {
    super(max);
    this._setupListener();
    this.pendingResolvers = new Map(); // 存储 downloadId 对应的 resolve/reject
  }

  // 1. 全局监听下载状态变化
  _setupListener() {
    chrome.downloads.onChanged.addListener((delta) => {
      if (!this.pendingResolvers.has(delta.id)) return;

      const { resolve, reject, signalListener } = this.pendingResolvers.get(delta.id);

      // 下载完成
      if (delta.state?.current === 'complete') {
        this._cleanup(delta.id, signalListener);
        resolve({ id: delta.id, status: 'complete' });
      } 
      // 下载失败或中断
      else if (delta.error?.current) {
        this._cleanup(delta.id, signalListener);
        reject(new Error(`Download ${delta.id} failed: ${delta.error.current}`));
      }
    });
  }

  _cleanup(id, signalListener) {
    this.pendingResolvers.delete(id);
    // 移除对应的信号监听，防止内存泄漏
    if (signalListener) {
      // 实际上 AbortSignal 监听通常在 run 层处理，这里做逻辑闭环
    }
  }

  /**
   * 重写/包装下载任务
   */
  async download(options, { priority = 0, signal = null } = {}) {
    return this.run(async (innerSignal) => {
      return new Promise((resolve, reject) => {
        
        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }

          // 核心：将 resolve 存起来，等待 onChanged 触发
          this.pendingResolvers.set(downloadId, { resolve, reject });

          // 处理手动取消：如果用户取消了任务，通知 Chrome 停止下载
          innerSignal?.addEventListener('abort', () => {
            chrome.downloads.cancel(downloadId);
            this.pendingResolvers.delete(downloadId);
            reject(new Error('Download Aborted by User'));
          });
        });
      });
    }, { priority, signal });
  }
}

// --- 使用方式 ---

const pool = new ChromeDownloadPool(3); // 限制同时只有 3 个文件在真正写入磁盘

const files = [
  { url: 'https://example.com', filename: 'file1.zip' },
  { url: 'https://example.com', filename: 'file2.zip' },
  { url: 'https://example.com', filename: 'file3.zip' },
  { url: 'https://example.com', filename: 'file4.zip' },
];

files.forEach(file => {
  pool.download({ url: file.url, filename: file.filename })
    .then(res => console.log(`文件 ${res.id} 下载完整 √`))
    .catch(err => console.error(`文件下载失败:`, err));
});
