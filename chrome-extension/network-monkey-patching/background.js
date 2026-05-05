chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NET_LOG_DATA') {
      const { url, data, method } = message;

      // 1. 本地日志记录 (使用 chrome.storage)
      const logEntry = { url, method, time: Date.now() };
      chrome.storage.local.get({ logs: [] }, (result) => {
        const newLogs = [logEntry, ...result.logs].slice(0, 100); // 仅保留最近100条
        chrome.storage.local.set({ logs: newLogs });
      });

      // 2. 发送到自己的服务器
      // fetch('https://your-api-server.com', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //         source: sender.tab.url,
      //         payload: data,
      //         meta: logEntry
      //     })
      // }).catch(err => console.error('上传失败:', err));
  }
});
