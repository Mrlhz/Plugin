// 1. 声明一个全局的控制器变量
let currentDownloadController = null;

async function startBatchDownload() {
  // 如果之前有没结束的任务，先清理
  if (currentDownloadController) {
    currentDownloadController.abort("新任务启动，自动取消旧任务");
  }

  // 初始化新的控制器
  currentDownloadController = new AbortController();
  const { signal } = currentDownloadController;

  const downloadTasks = urlsToDownload.map(item => 
    createDownloadTask({ url: item.url, filename: item.filename }, item.filename)
  );

  // 限制最大同时下载数为 2
  const pool = new AsyncPoolIterator(downloadTasks, 2, { signal });

  console.log('--- 批量并发下载已启动 ---');

  try {
    for await (const result of pool) {
      if (result.status === 'fulfilled') {
        console.log('🟢', result.value);
      } else {
        console.warn('🔴', result.reason.message);
      }
    }
    console.log('--- 所有下载任务处理完毕 ---');
  } catch (err) {
    console.error('迭代器异常:', err);
  } finally {
    // 任务自然结束或报错结束后，清空控制器引用
    currentDownloadController = null;
  }
}

// 2. 暴露一个一键取消的函数
function cancelAllDownloads() {
  if (currentDownloadController) {
    console.log('🛑 正在终止下载队列...');
    // 触发取消！这会瞬间做两件事：
    // 1. 让正在下载的文件调用 chrome.downloads.cancel() 强退下载进度
    // 2. 让 AsyncPoolIterator 迭代器瞬间跳出循环，不再向浏览器提交新的下载任务
    currentDownloadController.abort(new Error("用户点击了一键取消"));
    currentDownloadController = null;
    return true;
  } else {
    console.log('ℹ️ 当前没有正在运行的下载队列。');
    return false;
  }
}

// 3. 示例：监听前端 Popup 或 Content Script 发来的“一键取消”消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CANCEL_ALL') {
    const isCancelled = cancelAllDownloads();
    sendResponse({ success: isCancelled });
  }
});
