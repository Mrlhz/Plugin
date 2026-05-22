/**
 * 创建一个支持 AbortSignal 中止的 Chrome 下载任务
 * @param {Object} options - chrome.downloads.download 的配置项
 * @returns {Function} 契合 AsyncQueue 的任务函数
 */
const createDownloadTask = (options) => {
  return (signal) => {
    return new Promise((resolve, reject) => {
      let activeDownloadId = null;

      // 1. 监听下载状态变更的内部回调
      const statusListener = (delta) => {
        if (delta.id !== activeDownloadId) return;

        // 下载成功
        if (delta.state?.current === 'complete') {
          cleanup();
          resolve({ downloadId: activeDownloadId, status: 'complete' });
        }

        // 下载失败或被用户手动取消
        if (delta.state?.current === 'interrupted') {
          cleanup();
          reject(new Error(`Download interrupted: ${delta.error?.current || 'Unknown error'}`));
        }
      };

      // 清理函数：移除监听器，防止内存泄漏
      const cleanup = () => {
        chrome.downloads.onChanged.removeListener(statusListener);
        signal.removeEventListener('abort', abortListener);
      };

      // 2. 监听外部中止信号 (超时或手动取消)
      const abortListener = () => {
        cleanup();
        if (activeDownloadId !== null) {
          // 👈 核心：调用 Chrome API 真正掐断/取消浏览器底层的下载
          chrome.downloads.cancel(activeDownloadId, () => {
            reject(new Error('Download cancelled by AbortSignal'));
          });
        } else {
          reject(new Error('Download cancelled before starting'));
        }
      };

      // 绑定中止监听
      signal.addEventListener('abort', abortListener);
      // 绑定 Chrome 下载状态监听
      chrome.downloads.onChanged.addListener(statusListener);

      // 3. 触发 Chrome 核心下载
      chrome.downloads.download(options, (downloadId) => {
        // 如果在调用下载前就已经触发了中止
        if (signal.aborted) {
          cleanup();
          if (downloadId) chrome.downloads.cancel(downloadId);
          return reject(new Error('Download cancelled by AbortSignal'));
        }

        if (chrome.runtime.lastError) {
          cleanup();
          return reject(new Error(chrome.runtime.lastError.message));
        }

        // 记录当前的下载 ID，用于后续的中止操作
        activeDownloadId = downloadId;
      });
    });
  };
};
