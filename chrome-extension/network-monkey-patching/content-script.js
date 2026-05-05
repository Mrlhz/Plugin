// 监听来自 inject.js 的消息
window.addEventListener('message', (event) => {
    if (event.data.type === 'NET_LOG_DATA') {
        // 转发给 Service Worker
        chrome.runtime.sendMessage(event.data);
    }
});
