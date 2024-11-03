import { pathExists } from './pathExists.js'

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, url, result } = request
  if (cmd === 'offscreen_to_background') {
    const { av, star } = result
    const filePath = Array.isArray(star) && star.length === 1 ? `${star[0].name}` : 'a_common'
  
    const filename = `${filePath}/${av}.json` || `${filePath}/${av}/${av}.json`;
    const res = await pathExists([{ url, filename }])
    if (res[0]) {
      await downloadFile(res[0])
    }
  }
  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

function downloadFile(downloadOptions) {
  return chrome.downloads.download(downloadOptions).then(downloadId => {
    return { downloadId }
  })
}

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
