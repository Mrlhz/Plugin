// 监听来自 inject.js 的消息
window.addEventListener('message', (event) => {
  // 过滤非本插件的消息
  if (event.data && event.data.type === 'DOUYIN_DETAIL_DATA') {
    chrome.runtime.sendMessage(event.data);
  }
});
