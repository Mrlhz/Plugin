// 1. 将单个 Chrome 下载任务包装为标准的 Promise 任务
function createDownloadTask(downloadOptions) {
  // 迭代器会自动传入 { signal }
  return ({ signal }) => {
    return new Promise((resolve, reject) => {
      let activeDownloadId = null;

      // 定义监听器：监测下载状态变化
      const onChangedListener = (delta) => {
        // 只关心我们启动的这个下载任务
        if (delta.id !== activeDownloadId) return;

        // 场景 A：下载完成
        if (delta.state && delta.state.current === 'complete') {
          cleanup();
          resolve(`下载成功: ${downloadOptions?.filename || activeDownloadId}`);
        }

        // 场景 B：下载被中断/失败
        if (delta.state && delta.state.current === 'interrupted') {
          cleanup();
          const errorType = delta.error ? delta.error.current : 'UNKNOWN_ERROR';
          reject(new Error(`下载失败 [${errorType}]: ${downloadOptions?.filename || downloadOptions?.url}`));
        }
      };

      // 清理函数：移除监听器，防止内存泄漏
      const cleanup = () => {
        chrome.downloads.onChanged.removeListener(onChangedListener);
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
      };

      // 响应外部的取消信号 (AbortSignal)
      const onAbort = () => {
        cleanup();
        if (activeDownloadId) {
          // 如果已经在下载中，直接调用 Chrome API 取消/强退该下载
          chrome.downloads.cancel(activeDownloadId, () => {
            reject(signal.reason || new Error('下载已被用户取消'));
          });
        } else {
          reject(signal.reason || new Error('下载已被用户取消'));
        }
      };

      // 如果启动时就已经取消了，直接终止
      if (signal?.aborted) {
        return reject(signal.reason || new Error('Aborted'));
      }

      if (signal) {
        signal.addEventListener('abort', onAbort);
      }

      // 先注册监听器，防止下载速度极快导致瞬间完成而漏掉事件
      chrome.downloads.onChanged.addListener(onChangedListener);

      // 调用 Chrome API 触发下载
      chrome.downloads.download(downloadOptions, (downloadId) => {
        // 如果调用失败（例如 URL 错误、权限问题）
        if (chrome.runtime.lastError) {
          cleanup();
          return reject(new Error(`触发下载失败: ${chrome.runtime.lastError.message}`));
        }
        
        activeDownloadId = downloadId;
      });
    });
  };
}


// 准备一组需要下载的资源
const urlsToDownload = [
  { url: 'https://example.com', filename: 'files/file1.zip' },
  { url: 'https://example.com', filename: 'files/file2.zip' },
  { url: 'https://example.com', filename: 'files/file3.zip' },
  { url: 'https://example.com', filename: 'files/file4.zip' },
];

// 将配置数组转化为迭代器需要的 tasks 数组
const downloadTasks = urlsToDownload.map(item => 
  createDownloadTask({ url: item.url, filename: item.filename }, item.filename)
);

async function startBatchDownload() {
  const controller = new AbortController();
  
  // 限制最大同时下载数为 2
  const maxConcurrency = 2; 
  const pool = new AsyncPoolIterator(downloadTasks, maxConcurrency, { signal: controller.signal });

  console.log('--- 开始批量控制并发下载 ---');

  try {
    for await (const result of pool) {
      if (result.status === 'fulfilled') {
        console.log('🟢', result.value); // 某文件下载成功
      } else {
        console.error('🔴', result.reason.message); // 某文件下载失败，但不会卡死后面的任务
      }
    }
    console.log('--- 所有下载任务处理完毕 ---');
  } catch (err) {
    console.error('迭代器异常:', err);
  }
}

// 触发下载
startBatchDownload();
