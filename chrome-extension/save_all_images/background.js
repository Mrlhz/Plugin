chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // 处理消息。
  // 在这个例子中， message === 'whatever value; 字符串，对象，随便'
})

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    'id': 'saveall',
    'type': 'normal',
    'title': '保存所有图片',
  })
})

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log(info, tab)
  if (info.menuItemId == 'saveall') {
    chrome.tabs.executeScript(tab.id, { file: 'js/javbus.js' }, onCall)
  }
})

const download = chrome.downloads.download

function onCall(results = []) {
  const result = results[0]
  if (!Array.isArray(result) || !result.length) {
    return
  }
  console.log(results)
  const commonConfig = { conflictAction: 'uniquify', saveAs: false }
  const downloadTask = result.map(item => download({ ...commonConfig, ...item }))
  console.log(downloadTask)
}
