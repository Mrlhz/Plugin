

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

const RequestFilter = { urls: ["<all_urls>"] }
const extraInfoSpec = []
const callback = (details) => {
  console.log(details)
}

// chrome.webRequest.onCompleted.addListener(
//   callback,
//   RequestFilter,
//   extraInfoSpec
// )
