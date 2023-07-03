

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, url, result } = request
  const { av, star } = result
  const filePath = Array.isArray(star) && star.length === 1 ? `${star[0].name}` : 'avatar'

  const filename = `${filePath}/${av}.json` || `${filePath}/${av}/${av}.json`;
  if (cmd === 'offscreen_to_background') {
    chrome.downloads.download({ url: url, filename }).then(downloadId => {
      return { downloadId }
    })
  }
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
