
### 消息传递 API

```js
chrome.tabs.executeScript(tab.id, {file: 'content.js'}, function() {
  chrome.tabs.sendMessage(tab.id, 'whatever value; String, object,whatever')
})

// 在内容脚本（content.js）中，您可以使用chrome.runtime.onMessage事件监听这些消息，并处理这些消息：
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // 处理消息。
})
```